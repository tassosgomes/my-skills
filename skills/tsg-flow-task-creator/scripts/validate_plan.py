#!/usr/bin/env python3
"""Gate estrutural do plano TSG Flow.

Verifica invariantes que antes viviam como checkbox em cada arquivo de task:
frontmatter completo, contrato de gate coerente com o tipo da fatia, dependências
sem ciclo nem referência futura, paridade entre tasks.md e os arquivos, e cobertura
de todo requisito do plano.

Uso:
    python3 <skill-dir>/scripts/validate_plan.py tasks/prd-<slug>/
    python3 <skill-dir>/scripts/validate_plan.py tasks/prd-<slug>/ --strict

Saída: 0 aprovado, 1 erros (ou avisos com --strict), 2 erro de uso.
"""

import argparse
import re
import sys
from pathlib import Path

STATUS_VALIDOS = {"pending", "in_progress", "validating", "blocked", "done"}
KINDS_VALIDOS = {"vertical", "enabling"}
CAMPOS_OBRIGATORIOS = ("status", "task_kind", "blocked_by", "gate", "gate_expect")
PLACEHOLDER = re.compile(r"\[(?:seletor|comando|caminho|resultado|título|titulo|N|V-XX|X\.0|"
                         r"RF-XX|ADR-NNN|nome|idem|o que muda|justificativa concreta)[^\]]*\]",
                         re.IGNORECASE)
# gate_expect de fatia vertical precisa de um numero diferente de zero
QUANTIDADE = re.compile(r"\b[1-9]\d*\b")
# heuristica: o comando parece executar testes
COMANDO_DE_TESTE = re.compile(r"\b(test|tests|spec|specs|pytest|jest|vitest|rspec|phpunit|mocha|"
                              r"ginkgo|nunit|xunit)\b", re.IGNORECASE)
# comando que so diagnostica nunca comprova conclusao
DIAGNOSTICO = re.compile(r"--(?:dry-run|skip-tests|no-tests|collect-only|list-tests)\b|"
                         r"--passWithNoTests\b", re.IGNORECASE)


def ler_frontmatter(texto):
    """Extrai o frontmatter YAML simples (chave: valor) sem depender de pyyaml."""
    if not texto.startswith("---"):
        return {}, texto
    fim = texto.find("\n---", 3)
    if fim == -1:
        return {}, texto
    bloco = texto[3:fim]
    corpo = texto[fim + 4:]
    dados = {}
    for linha in bloco.splitlines():
        linha = linha.split("#", 1)[0].rstrip() if not linha.strip().startswith("#") else ""
        if not linha.strip() or ":" not in linha:
            continue
        chave, _, valor = linha.partition(":")
        valor = valor.strip()
        # só remove aspas que envolvem o valor inteiro; um comando pode terminar em aspas
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        dados[chave.strip()] = valor
    return dados, corpo


def parse_lista(valor):
    valor = (valor or "").strip()
    if valor in ("", "[]", "-"):
        return []
    valor = valor.strip("[]")
    return [item.strip().strip('"').strip("'") for item in valor.split(",") if item.strip()]


def id_da_task(caminho, corpo):
    cabecalho = re.search(r"^#\s+([0-9]+(?:\.[0-9]+)?)", corpo, re.MULTILINE)
    if cabecalho:
        return cabecalho.group(1)
    numero = re.match(r"(\d+)", caminho.name)
    return f"{numero.group(1)}.0" if numero else caminho.stem


def ordem(task_id):
    try:
        return tuple(int(p) for p in task_id.split("."))
    except ValueError:
        return (10**6,)


def detectar_ciclo(grafo):
    estado, ciclo = {}, []

    def visitar(no, caminho):
        if estado.get(no) == "fechado":
            return False
        if estado.get(no) == "aberto":
            ciclo.extend(caminho[caminho.index(no):] + [no])
            return True
        estado[no] = "aberto"
        for vizinho in grafo.get(no, []):
            if vizinho in grafo and visitar(vizinho, caminho + [no]):
                return True
        estado[no] = "fechado"
        return False

    for no in grafo:
        if visitar(no, []):
            return ciclo
    return None


def checar(prd_dir):
    erros, avisos = [], []
    arquivos = sorted(prd_dir.glob("*_task.md"))
    tasks_md = prd_dir / "tasks.md"

    if not arquivos:
        erros.append(f"nenhum arquivo *_task.md em {prd_dir}")
        return erros, avisos
    if not tasks_md.exists():
        erros.append("tasks.md ausente")

    tasks, grafo = {}, {}

    for arquivo in arquivos:
        texto = arquivo.read_text(encoding="utf-8")
        fm, corpo = ler_frontmatter(texto)
        tid = id_da_task(arquivo, corpo)
        rotulo = f"{arquivo.name} ({tid})"
        tasks[tid] = arquivo

        faltando = [c for c in CAMPOS_OBRIGATORIOS if c not in fm]
        if faltando:
            erros.append(f"{rotulo}: frontmatter sem {', '.join(faltando)}")

        if fm.get("status") not in STATUS_VALIDOS:
            erros.append(f"{rotulo}: status '{fm.get('status')}' inválido")

        if "kind" in fm:
            erros.append(f"{rotulo}: use task_kind; kind é reservado para o agente")

        task_kind = fm.get("task_kind")
        if task_kind not in KINDS_VALIDOS:
            erros.append(f"{rotulo}: task_kind '{task_kind}' inválido (vertical|enabling)")

        gate = fm.get("gate", "")
        gate_expect = fm.get("gate_expect", "")

        if not gate.strip() or PLACEHOLDER.search(gate):
            erros.append(f"{rotulo}: gate vazio ou placeholder")

        if not gate_expect.strip() or PLACEHOLDER.search(gate_expect):
            erros.append(f"{rotulo}: gate_expect vazio ou placeholder")
        elif task_kind == "vertical" and not QUANTIDADE.search(gate_expect):
            # Uma expectativa sem numero nao distingue "3 testes passam" de "0 testes rodaram".
            # Quantificar e o que substitui o parse de saida do gate antigo.
            erros.append(f"{rotulo}: gate_expect de fatia vertical precisa quantificar os testes "
                         f"(ex.: \"3 testes passam\"): {gate_expect!r}")

        if gate.strip() and task_kind == "vertical" and not COMANDO_DE_TESTE.search(gate):
            avisos.append(f"{rotulo}: gate da fatia vertical não parece rodar testes — "
                          f"confirme que o comando executa a suíte focalizada: {gate!r}")

        if DIAGNOSTICO.search(gate):
            erros.append(f"{rotulo}: gate usa comando de diagnóstico, que não comprova conclusão")

        if PLACEHOLDER.search(corpo):
            achados = {m.group(0) for m in PLACEHOLDER.finditer(corpo)}
            avisos.append(f"{rotulo}: placeholders do template não substituídos: "
                          f"{', '.join(sorted(achados)[:4])}")

        for secao in ("## Comportamento", "## Pronto quando"):
            if secao not in corpo:
                erros.append(f"{rotulo}: seção obrigatória ausente: {secao}")

        grafo[tid] = parse_lista(fm.get("blocked_by", ""))

    for tid, deps in grafo.items():
        for dep in deps:
            if dep not in tasks:
                erros.append(f"task {tid}: blocked_by aponta para '{dep}', que não existe")
            elif ordem(dep) > ordem(tid):
                erros.append(f"task {tid}: dependência futura de {dep} "
                             f"(só pode depender de task anterior)")

    ciclo = detectar_ciclo(grafo)
    if ciclo:
        erros.append(f"ciclo de dependências: {' → '.join(ciclo)}")

    if tasks_md.exists():
        resumo = tasks_md.read_text(encoding="utf-8")
        listadas = set(re.findall(r"^\s*-\s*\[[ xX]\]\s*([0-9]+\.[0-9]+)", resumo, re.MULTILINE))
        for tid in sorted(set(tasks) - listadas, key=ordem):
            erros.append(f"task {tid} tem arquivo mas não está listada em tasks.md")
        for tid in sorted(listadas - set(tasks), key=ordem):
            erros.append(f"task {tid} listada em tasks.md mas sem arquivo <num>_task.md")

        requisitos = re.findall(r"^\|\s*((?:RF|RN|US)-\d+)\s*\|([^|]*)\|",
                                resumo, re.MULTILINE)
        if not requisitos:
            avisos.append("tasks.md sem tabela de cobertura (RF/RN/US → task)")
        for req, coluna in requisitos:
            referidas = re.findall(r"[0-9]+\.[0-9]+", coluna)
            if not referidas:
                erros.append(f"requisito {req} não está coberto por nenhuma task")
            for tid in referidas:
                if tid not in tasks:
                    erros.append(f"requisito {req} aponta para task {tid}, que não existe")

    return erros, avisos


def main(argv=None):
    parser = argparse.ArgumentParser(description="Gate estrutural do plano TSG Flow")
    parser.add_argument("prd_dir", help="diretório tasks/prd-<slug>/")
    parser.add_argument("--strict", action="store_true", help="trata avisos como erros")
    args = parser.parse_args(argv)

    prd_dir = Path(args.prd_dir)
    if not prd_dir.is_dir():
        print(f"validate_plan: diretório não encontrado: {prd_dir}", file=sys.stderr)
        return 2

    erros, avisos = checar(prd_dir)
    for aviso in avisos:
        print(f"  AVISO {aviso}")
    for erro in erros:
        print(f"  ERRO  {erro}")

    falhou = bool(erros) or (bool(avisos) and args.strict)
    print(f"\nvalidate_plan: {len(erros)} erro(s), {len(avisos)} aviso(s) em {prd_dir}")
    print("REPROVADO — corrija antes do handoff." if falhou else "APROVADO")
    return 1 if falhou else 0


if __name__ == "__main__":
    sys.exit(main())
