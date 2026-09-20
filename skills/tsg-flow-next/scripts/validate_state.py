#!/usr/bin/env python3
"""Gate de frescor e continuidade do fluxo TSG.

Responde mecanicamente a duas perguntas que hoje exigem reler todos os documentos:
"este artefato ainda reflete suas origens?" e "onde eu parei e o que falta?".

A verdade de versao, status e origem de cada artefato mora no frontmatter do
proprio arquivo. O flow-state.json guarda so o que nao cabe em documento algum:
quais artefatos sao esperados, o progresso por capacidade, as proximas acoes, as
decisoes em aberto e o estado da fundacao. Nada e duplicado entre os dois.

Uso:
    python3 scripts/validate_state.py                      # gate: 0 aprovado, 1 reprovado
    python3 scripts/validate_state.py --status             # onde o fluxo parou
    python3 scripts/validate_state.py --capability CAP-001 # veredito de uma capacidade
    python3 scripts/validate_state.py --strict             # avisos viram erros

Saida: 0 aprovado, 1 erros (ou avisos com --strict), 2 erro de uso.
"""

import argparse
import json
import re
import sys
from pathlib import Path

# cada tipo de artefato e as origens que ele e OBRIGADO a declarar.
# o que e opcional nao entra aqui: um PRD pode nao ter domain doc (dominio de
# uma capacidade so), e uma techspec de UI sem API nao tem contrato.
PIPELINE = {
    "vision": [],
    "domain-map": ["vision"],
    "architecture-baseline": ["vision", "domain-map"],
    "capability-backlog": ["vision", "domain-map", "architecture-baseline"],
    "domain": ["vision", "domain-map", "capability-backlog"],
    "prd": ["capability-backlog"],
    "contract": ["prd"],
    "techspec": ["prd"],
    "tasks": ["prd", "techspec"],
}

# artefatos de nivel produto, na ordem em que aparecem no fluxo
NIVEL_PRODUTO = ["vision", "domain-map", "architecture-baseline", "capability-backlog"]

STATUS_VALIDOS = ("draft", "in_review", "approved", "superseded")
CAMPOS_OBRIGATORIOS = ("tsg_artifact", "product", "version", "status", "updated")

CAP_CABECALHO = re.compile(r"^#### (CAP-\d{3}) — (.+)$", re.MULTILINE)
CAP_DOMINIO = re.compile(r"^### Domínio: (.+)$", re.MULTILINE)
CAP_DEPENDENCIA = re.compile(r"\*\*Dependências:\*\*(.+?)(?:\n\s*-|\n\n)", re.DOTALL)
CAP_FASE = re.compile(r"\*\*Fase:\*\*\s*\**([^*\n·(]+)")
CAP_REF = re.compile(r"CAP-\d{3}")


def ler_frontmatter(texto):
    """Extrai o frontmatter YAML simples (chave: valor) sem depender de pyyaml."""
    if not texto.startswith("---"):
        return {}
    fim = texto.find("\n---", 3)
    if fim == -1:
        return {}
    dados = {}
    for linha in texto[3:fim].splitlines():
        if linha.strip().startswith("#") or ":" not in linha:
            continue
        chave, _, valor = linha.partition(":")
        valor = valor.split(" #", 1)[0].strip()
        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in "\"'":
            valor = valor[1:-1]
        dados[chave.strip()] = valor
    return dados


def parse_sources(valor):
    """'vision.md@1.1, context/domain-map.md@1.0' -> [(caminho, versao)]"""
    itens = []
    for bruto in (valor or "").split(","):
        bruto = bruto.strip()
        if not bruto:
            continue
        caminho, _, versao = bruto.rpartition("@")
        itens.append((caminho.strip(), versao.strip()) if caminho else (bruto, ""))
    return itens


def chave_versao(versao):
    partes = re.findall(r"\d+", versao or "")
    return tuple(int(p) for p in partes) if partes else None


def parse_backlog(texto):
    """Le capabilities.md e devolve {id: {titulo, dominio, fase, deps}}."""
    caps = {}
    marcas = []
    for m in CAP_DOMINIO.finditer(texto):
        marcas.append((m.start(), "dominio", m.group(1).strip()))
    for m in CAP_CABECALHO.finditer(texto):
        marcas.append((m.start(), "cap", (m.group(1), m.group(2).strip(), m.end())))
    marcas.sort(key=lambda x: x[0])

    dominio_atual = None
    for i, (_, tipo, valor) in enumerate(marcas):
        if tipo == "dominio":
            dominio_atual = valor
            continue
        cid, titulo, inicio = valor
        fim = marcas[i + 1][0] if i + 1 < len(marcas) else len(texto)
        corpo = texto[inicio:fim]
        deps = []
        m = CAP_DEPENDENCIA.search(corpo)
        if m:
            deps = [d for d in CAP_REF.findall(m.group(1)) if d != cid]
        fase = CAP_FASE.search(corpo)
        caps[cid] = {
            "titulo": titulo,
            "dominio": dominio_atual,
            "fase": fase.group(1).strip() if fase else "?",
            "deps": deps,
        }
    return caps


def carregar_artefatos(raiz, estado, erros):
    """Le o frontmatter de cada artefato declarado. Retorna {caminho: dados}."""
    por_caminho = {}
    declarados = dict(estado.get("artifacts", {}))
    for cap in estado.get("capabilities", []):
        for tipo, caminho in (cap.get("artifacts") or {}).items():
            declarados.setdefault(f"{cap['id']}:{tipo}", caminho)

    for chave, rel in declarados.items():
        tipo = chave.split(":")[-1]
        alvo = raiz / rel
        if not alvo.is_file():
            erros.append(f"{rel}: declarado no flow-state.json como '{tipo}', nao existe no disco")
            continue
        fm = ler_frontmatter(alvo.read_text(encoding="utf-8"))
        if not fm:
            erros.append(f"{rel}: sem frontmatter TSG — nada aqui pode ser verificado")
            continue
        for campo in CAMPOS_OBRIGATORIOS:
            if not fm.get(campo):
                erros.append(f"{rel}: frontmatter sem '{campo}'")
        if fm.get("tsg_artifact") != tipo:
            erros.append(f"{rel}: frontmatter diz tsg_artifact '{fm.get('tsg_artifact')}', "
                         f"flow-state.json diz '{tipo}'")
        if fm.get("status") not in STATUS_VALIDOS:
            erros.append(f"{rel}: status '{fm.get('status')}' invalido "
                         f"(use {', '.join(STATUS_VALIDOS)})")
        fm["_path"] = rel
        por_caminho[rel] = fm
    return por_caminho


def checar_procedencia(artefatos, erros, avisos):
    """O coracao do gate: uma origem declarada com versao velha e dessincronia."""
    for rel, fm in artefatos.items():
        tipo = fm.get("tsg_artifact")
        tipos_declarados = set()

        for caminho, versao in parse_sources(fm.get("sources")):
            fonte = artefatos.get(caminho)
            if fonte is None:
                erros.append(f"{rel}: declara origem '{caminho}', que nao e um artefato "
                             f"conhecido do flow-state.json")
                continue
            tipos_declarados.add(fonte.get("tsg_artifact"))

            if not versao:
                erros.append(f"{rel}: origem '{caminho}' sem versao "
                             f"(use '{caminho}@{fonte.get('version')}')")
                continue

            atual, declarada = chave_versao(fonte.get("version")), chave_versao(versao)
            if declarada is None or atual is None:
                erros.append(f"{rel}: versao nao numerica em '{caminho}@{versao}'")
            elif declarada < atual:
                erros.append(f"DESATUALIZADO {rel} foi escrito sobre {caminho} v{versao}, "
                             f"mas {caminho} esta em v{fonte.get('version')} — "
                             f"revise e republique, ou corrija a procedencia")
            elif declarada > atual:
                erros.append(f"{rel}: declara {caminho} v{versao}, que nao existe "
                             f"({caminho} esta em v{fonte.get('version')})")

            if fm.get("status") == "approved" and fonte.get("status") == "draft":
                erros.append(f"{rel}: esta 'approved' sobre {caminho}, que ainda e 'draft'")
            elif fm.get("status") == "approved" and fonte.get("status") == "in_review":
                avisos.append(f"{rel}: esta 'approved' sobre {caminho}, que esta 'in_review'")

            if fm.get("updated") and fonte.get("updated") and fm["updated"] < fonte["updated"]:
                avisos.append(f"{rel}: updated {fm['updated']} e anterior ao de {caminho} "
                              f"({fonte['updated']}) — provavelmente nao foi revisitado")

        for exigido in PIPELINE.get(tipo, []):
            if exigido not in tipos_declarados:
                erros.append(f"{rel}: tipo '{tipo}' exige declarar origem do tipo "
                             f"'{exigido}' e nao declara")

        if tipo not in PIPELINE:
            avisos.append(f"{rel}: tsg_artifact '{tipo}' nao faz parte do pipeline conhecido")


def checar_capacidades(raiz, estado, artefatos, backlog, erros):
    rel = estado.get("artifacts", {}).get("capability-backlog")
    if not rel or rel not in artefatos:
        return
    no_estado = {c["id"] for c in estado.get("capabilities", [])}
    stages = set(estado.get("capability_stages", []))

    for cid in sorted(set(backlog) - no_estado):
        erros.append(f"{cid} existe em {rel} e nao esta no flow-state.json")
    for cid in sorted(no_estado - set(backlog)):
        erros.append(f"{cid} esta no flow-state.json e nao existe em {rel}")

    for cap in estado.get("capabilities", []):
        if stages and cap.get("stage") not in stages:
            erros.append(f"{cap['id']}: stage '{cap.get('stage')}' fora de capability_stages")
        for dep in backlog.get(cap["id"], {}).get("deps", []):
            if dep not in no_estado:
                erros.append(f"{cap['id']}: depende de {dep}, que nao esta no flow-state.json")


def checar_fundacao(raiz, estado, erros, avisos):
    fundacao = estado.get("foundation")
    if not fundacao:
        return
    for servico in fundacao.get("services", []):
        caminho = servico.get("path")
        if caminho and not (raiz / caminho).exists():
            if fundacao.get("status") == "ready":
                erros.append(f"fundacao declarada 'ready', mas o servico "
                             f"'{servico.get('name')}' nao existe em {caminho}")
            else:
                avisos.append(f"servico '{servico.get('name')}' ainda nao existe em {caminho}")


def checar_referencias(estado, erros):
    conhecidos = ({d["id"] for d in estado.get("open_decisions", [])} |
                  {a["id"] for a in estado.get("next_actions", [])})
    for acao in estado.get("next_actions", []):
        for dep in acao.get("blocked_by", []):
            if dep not in conhecidos:
                erros.append(f"next_action {acao['id']}: blocked_by '{dep}' nao existe")


def checar(raiz, estado):
    erros, avisos = [], []
    artefatos = carregar_artefatos(raiz, estado, erros)

    produtos = {fm.get("product") for fm in artefatos.values() if fm.get("product")}
    if len(produtos) > 1:
        avisos.append(f"produtos divergentes entre artefatos: {', '.join(sorted(produtos))}")

    rel = estado.get("artifacts", {}).get("capability-backlog")
    backlog = parse_backlog((raiz / rel).read_text(encoding="utf-8")) if rel and (raiz / rel).is_file() else {}

    checar_procedencia(artefatos, erros, avisos)
    checar_capacidades(raiz, estado, artefatos, backlog, erros)
    checar_fundacao(raiz, estado, erros, avisos)
    checar_referencias(estado, erros)
    return artefatos, backlog, erros, avisos


def imprimir_status(estado, artefatos, erros):
    desatualizados = {e.split()[1] for e in erros if e.startswith("DESATUALIZADO")}
    print(f"\nProduto: {estado.get('product')}  ·  estado atualizado em {estado.get('updated')}\n")

    print("Artefatos do fluxo")
    for tipo in NIVEL_PRODUTO:
        rel = estado.get("artifacts", {}).get(tipo)
        if not rel:
            continue
        fm = artefatos.get(rel, {})
        marca = "STALE" if rel in desatualizados else fm.get("status", "?")
        print(f"  {tipo:<24} v{fm.get('version','?'):<5} {marca:<11} "
              f"{fm.get('updated','?'):<11} {rel}")
    faltando = [t for t in NIVEL_PRODUTO if t not in estado.get("artifacts", {})]
    if faltando:
        print(f"  ainda nao produzidos: {', '.join(faltando)}")

    fundacao = estado.get("foundation")
    if fundacao:
        servicos = fundacao.get("services", [])
        print(f"\nFundacao (Fase 0)  ·  {fundacao.get('status', '?')}"
              f"  ·  {len(servicos)} servico(s) declarado(s)")

    caps = estado.get("capabilities", [])
    if caps:
        contagem = {}
        for cap in caps:
            contagem[cap.get("stage")] = contagem.get(cap.get("stage"), 0) + 1
        print(f"\nCapacidades ({len(caps)})\n  " +
              "  ".join(f"{s}: {n}" for s, n in contagem.items()))
        fila = sorted((c for c in caps if c.get("mvp_order") and c.get("stage") != "done"),
                      key=lambda c: (c["mvp_order"], c["id"]))
        if fila:
            proximos = [c["id"] for c in fila if c["mvp_order"] == fila[0]["mvp_order"]]
            print(f"  proxima da fila MVP (ordem {fila[0]['mvp_order']}): {', '.join(proximos)}")

    bloqueadas = {d["id"] for d in estado.get("open_decisions", [])}
    if estado.get("next_actions"):
        print("\nProximas acoes")
        for acao in estado["next_actions"]:
            travas = [d for d in acao.get("blocked_by", []) if d in bloqueadas]
            print(f"  {acao['id']}  {acao['what']}")
            print(f"        skill: {acao.get('skill','-')}"
                  f"{('  [travada por ' + ', '.join(travas) + ']') if travas else ''}")

    if estado.get("open_decisions"):
        print("\nDecisoes em aberto")
        for d in estado["open_decisions"]:
            print(f"  {d['id']}  ({d.get('owner','sem dono')})  {d['what']}")
            print(f"        ref: {d.get('ref','-')}  ·  bloqueia: "
                  f"{', '.join(d.get('blocks', [])) or '-'}")
    print()


def imprimir_capacidade(cid, estado, artefatos, backlog, erros):
    info = backlog.get(cid)
    if not info:
        print(f"{cid} nao existe no backlog.")
        return 2
    por_id = {c["id"]: c for c in estado.get("capabilities", [])}
    cap = por_id.get(cid, {})
    bloqueios = []

    print(f"\n{cid} — {info['titulo']}\n")
    print(f"  capacidade        {cap.get('stage', '?')} · fase {info['fase']}")
    print(f"  dominio           {info['dominio']}")

    irmas = sorted(c for c, v in backlog.items()
                   if v["dominio"] == info["dominio"] and c != cid)
    doc = (cap.get("artifacts") or {}).get("domain")
    if doc:
        print(f"    domain doc      {doc}")
    else:
        print(f"    domain doc      AUSENTE")
        # a regra e "2+ PRDs no horizonte visivel". o horizonte e julgamento de
        # quem le, entao o script mostra a fase de cada irma em vez de contar.
        if irmas:
            print(f"    outras capacidades deste dominio:")
            for irma in irmas:
                print(f"      {irma:<12} fase {backlog[irma]['fase']}")
            print(f"      → domain doc so se 2+ estiverem no horizonte visivel "
                  f"(rodada atual e a seguinte); com uma so, as regras vao no PRD")
        else:
            print(f"      unica capacidade deste dominio — regras vao no PRD, sem domain doc")

    if info["deps"]:
        print("  depende de")
        for dep in info["deps"]:
            estagio = por_id.get(dep, {}).get("stage", "?")
            print(f"    {dep:<15} {estagio}")
            if estagio != "done":
                bloqueios.append(f"{dep} esta em '{estagio}' e {cid} depende dela")

    fundacao = estado.get("foundation", {})
    if fundacao and fundacao.get("status") != "ready":
        bloqueios.append(f"fundacao (Fase 0) esta '{fundacao.get('status')}' — "
                         f"servicos e esteira precisam existir antes das tasks")

    for d in estado.get("open_decisions", []):
        alvos = d.get("blocks", [])
        if cid in alvos or any(a in alvos for a in info["deps"]):
            bloqueios.append(f"{d['id']} ({d.get('owner','sem dono')}): {d['what']}")

    for e in erros:
        if e.startswith("DESATUALIZADO"):
            bloqueios.append(e)

    print()
    if bloqueios:
        print("VEREDITO: NAO. Bloqueios:")
        for i, b in enumerate(bloqueios, 1):
            print(f"  {i}. {b}")
    else:
        print("VEREDITO: SIM. Nenhum bloqueio mecanico.")
    print()
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="Gate de frescor e continuidade do fluxo TSG")
    parser.add_argument("raiz", nargs="?", default=".", help="raiz do projeto (default: .)")
    parser.add_argument("--status", action="store_true", help="imprime onde o fluxo parou")
    parser.add_argument("--capability", metavar="CAP-XXX", help="veredito de uma capacidade")
    parser.add_argument("--strict", action="store_true", help="trata avisos como erros")
    args = parser.parse_args(argv)

    raiz = Path(args.raiz).resolve()
    arquivo = raiz / "flow-state.json"
    if not arquivo.is_file():
        print(f"validate_state: flow-state.json nao encontrado em {raiz}", file=sys.stderr)
        return 2
    try:
        estado = json.loads(arquivo.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"validate_state: flow-state.json invalido: {exc}", file=sys.stderr)
        return 2

    artefatos, backlog, erros, avisos = checar(raiz, estado)

    if args.capability:
        return imprimir_capacidade(args.capability.upper(), estado, artefatos, backlog, erros)
    if args.status:
        imprimir_status(estado, artefatos, erros)

    for aviso in avisos:
        print(f"  AVISO {aviso}")
    for erro in erros:
        print(f"  ERRO  {erro}")

    falhou = bool(erros) or (bool(avisos) and args.strict)
    print(f"\nvalidate_state: {len(erros)} erro(s), {len(avisos)} aviso(s) em {raiz.name}")
    print("REPROVADO — corrija antes de seguir para a proxima etapa." if falhou else "APROVADO")
    return 1 if falhou else 0


if __name__ == "__main__":
    sys.exit(main())
