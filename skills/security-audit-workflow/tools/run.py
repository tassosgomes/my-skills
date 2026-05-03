#!/usr/bin/env python3
"""
run.py - Wrapper multiplataforma para executar ferramentas de seguranca via Docker.

Uso:
    python run.py <tool> [args...]

Exemplos:
    python run.py semgrep --config=p/owasp-top-ten src/
    python run.py trivy fs --severity HIGH,CRITICAL pom.xml
    python run.py gitleaks detect --report-format=sarif

Funcionalidades:
    - Resolve imagem Docker oficial a partir de tools/tools.json
    - Normaliza paths para Linux/macOS/Windows
    - Aplica user mapping condicional (Linux/Mac apenas)
    - Valida Docker disponivel antes de executar
    - Suporta cache de imagens via volumes nomeados
    - Fallback para CLI nativa via flag --no-docker

Compativel com: Python 3.8+, Linux, macOS, Windows (com Docker Desktop).
"""

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional


SCRIPT_DIR = Path(__file__).resolve().parent
TOOLS_JSON = SCRIPT_DIR / "tools.json"


# ---------------------------------------------------------------------------
# Plataforma e ambiente
# ---------------------------------------------------------------------------

def is_windows() -> bool:
    return platform.system() == "Windows"


def is_macos() -> bool:
    return platform.system() == "Darwin"


def is_linux() -> bool:
    return platform.system() == "Linux"


def normalize_path_for_docker(path: Path) -> str:
    """
    Normaliza path para uso em Docker.

    Linux/macOS: usa POSIX direto.
    Windows: Docker Desktop aceita C:\\path ou /c/path; usamos POSIX (mais portavel
    entre Docker Desktop com WSL2 e versoes mais antigas).
    """
    abs_path = path.resolve()
    if is_windows():
        # Converte C:\Users\... para /c/Users/... (formato Docker Desktop)
        # PurePosixPath nao funciona aqui pois Path absoluto em Windows tem drive
        posix = abs_path.as_posix()
        if len(posix) >= 2 and posix[1] == ":":
            drive = posix[0].lower()
            rest = posix[2:]
            return f"/{drive}{rest}"
        return posix
    return str(abs_path)


# ---------------------------------------------------------------------------
# Validacao de Docker
# ---------------------------------------------------------------------------

def docker_available() -> tuple[bool, str]:
    """Retorna (disponivel, mensagem). Mensagem e vazia se ok."""
    docker_bin = shutil.which("docker")
    if docker_bin is None:
        return False, (
            "Docker nao esta instalado ou nao esta no PATH.\n"
            "Instale Docker Desktop (Mac/Windows) ou docker-ce (Linux) e tente novamente.\n"
            "Documentacao: https://docs.docker.com/get-docker/"
        )

    try:
        result = subprocess.run(
            ["docker", "info"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return False, (
                "Docker esta instalado mas o daemon nao esta acessivel.\n"
                f"Saida do erro: {result.stderr.strip()}\n"
                "Verifique se o Docker Desktop esta em execucao (Mac/Windows) "
                "ou o servico docker esta ativo (Linux: 'systemctl status docker')."
            )
    except subprocess.TimeoutExpired:
        return False, "Docker daemon nao respondeu em 10s. Verifique se esta em execucao."
    except Exception as e:
        return False, f"Erro ao validar Docker: {e}"

    return True, ""


# ---------------------------------------------------------------------------
# Configuracao de ferramentas
# ---------------------------------------------------------------------------

def load_tools_config() -> dict:
    if not TOOLS_JSON.exists():
        sys.exit(f"ERRO: tools.json nao encontrado em {TOOLS_JSON}")
    try:
        with open(TOOLS_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        sys.exit(f"ERRO: tools.json invalido: {e}")


def get_tool_config(tools_config: dict, tool_name: str) -> dict:
    tools = tools_config.get("tools", {})
    if tool_name not in tools:
        available = ", ".join(sorted(tools.keys()))
        sys.exit(
            f"ERRO: ferramenta '{tool_name}' nao encontrada em tools.json.\n"
            f"Ferramentas disponiveis: {available}"
        )
    return tools[tool_name]


def resolve_image(tool_cfg: dict, pinned: bool) -> str:
    """Retorna imagem pinada se pinned=True (modo CI/CD) ou latest caso contrario."""
    if pinned and "image_pinned" in tool_cfg:
        return tool_cfg["image_pinned"]
    return tool_cfg["image"]


# ---------------------------------------------------------------------------
# Construcao do comando docker run
# ---------------------------------------------------------------------------

def build_docker_command(
    tool_cfg: dict,
    image: str,
    tool_args: list[str],
    workdir_override: Optional[str] = None,
) -> list[str]:
    """
    Constroi comando docker run a partir do config da ferramenta + args do usuario.
    """
    cmd = ["docker", "run", "--rm"]

    # User mapping (Linux/Mac apenas; Windows Docker Desktop ja usa user do host)
    user_mapping = tool_cfg.get("user_mapping", "auto")
    if user_mapping == "auto":
        if is_linux() or is_macos():
            try:
                uid = os.getuid()
                gid = os.getgid()
                cmd.extend(["--user", f"{uid}:{gid}"])
            except AttributeError:
                # os.getuid nao existe em Windows; ja filtramos acima mas defensivo
                pass
    elif user_mapping == "host":
        if hasattr(os, "getuid"):
            cmd.extend(["--user", f"{os.getuid()}:{os.getgid()}"])

    # Networking
    networking = tool_cfg.get("networking", "default")
    if networking == "none":
        cmd.extend(["--network", "none"])
    # 'default' = sem flag, usa bridge default

    # Mounts
    pwd = Path.cwd()
    pwd_normalized = normalize_path_for_docker(pwd)

    for mount in tool_cfg.get("mounts", []):
        src = mount["src"]
        dst = mount["dst"]
        mode = mount.get("mode", "rw")

        # Substituir $PWD pela pasta atual normalizada
        if "$PWD" in src:
            src = src.replace("$PWD", pwd_normalized)
        elif src.startswith("/var/run/docker.sock"):
            # Docker socket mount - precisa adaptacao em Windows/Mac
            if is_windows():
                # Docker Desktop em Windows expoe via npipe; mount diferente
                src = "//./pipe/docker_engine"
                dst = "//./pipe/docker_engine"
            # Linux/Mac usa /var/run/docker.sock direto
        elif not Path(src).is_absolute():
            # Path relativo - resolver contra cwd
            src = normalize_path_for_docker(Path(src))

        cmd.extend(["-v", f"{src}:{dst}:{mode}"])

    # Cache volumes (volumes nomeados, persistem entre execucoes)
    cache_volume = tool_cfg.get("cache_volume")
    if cache_volume:
        cmd.extend(["-v", cache_volume])

    # Workdir
    workdir = workdir_override or tool_cfg.get("workdir")
    if workdir:
        cmd.extend(["-w", workdir])

    # Entrypoint override
    entrypoint = tool_cfg.get("entrypoint_override")
    if entrypoint:
        cmd.extend(["--entrypoint", entrypoint])

    # Imagem
    cmd.append(image)

    # Default args + args do usuario
    cmd.extend(tool_cfg.get("default_args", []))
    cmd.extend(tool_args)

    return cmd


# ---------------------------------------------------------------------------
# Execucao
# ---------------------------------------------------------------------------

def run_with_docker(
    tool_name: str,
    tool_args: list[str],
    pinned: bool,
    dry_run: bool,
    quiet: bool,
) -> int:
    tools_config = load_tools_config()
    tool_cfg = get_tool_config(tools_config, tool_name)

    image = resolve_image(tool_cfg, pinned)
    cmd = build_docker_command(tool_cfg, image, tool_args)

    # Dry-run: nao valida Docker, apenas mostra o comando que seria executado
    if dry_run:
        print(" ".join(cmd))
        return 0

    # Validar Docker antes de executar
    ok, msg = docker_available()
    if not ok:
        sys.stderr.write(f"\n[run.py] {msg}\n\n")
        return 127

    # Avisos e notas
    if not quiet:
        for note_key in ("first_run_notes", "first_run_warning", "security_warning"):
            if note_key in tool_cfg:
                sys.stderr.write(f"[run.py] {note_key}: {tool_cfg[note_key]}\n")
        sys.stderr.write(f"[run.py] Executando: {tool_name} (image={image})\n")

    try:
        result = subprocess.run(cmd)
        return result.returncode
    except KeyboardInterrupt:
        sys.stderr.write("\n[run.py] Interrompido pelo usuario\n")
        return 130
    except Exception as e:
        sys.stderr.write(f"[run.py] Erro ao executar Docker: {e}\n")
        return 1


def run_native(tool_name: str, tool_args: list[str]) -> int:
    """Fallback: executa CLI nativa se instalada (modo --no-docker)."""
    bin_path = shutil.which(tool_name)
    if bin_path is None:
        sys.stderr.write(
            f"[run.py] --no-docker passado mas '{tool_name}' nao esta instalado nativamente.\n"
            f"Instale a ferramenta ou remova --no-docker para usar Docker.\n"
        )
        return 127

    sys.stderr.write(f"[run.py] Modo no-docker: usando {bin_path}\n")
    try:
        result = subprocess.run([bin_path] + tool_args)
        return result.returncode
    except Exception as e:
        sys.stderr.write(f"[run.py] Erro: {e}\n")
        return 1


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> tuple[argparse.Namespace, list[str]]:
    parser = argparse.ArgumentParser(
        description="Wrapper Docker para ferramentas de seguranca",
        usage="%(prog)s [options] <tool> [tool_args...]",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Exemplos:\n"
            "  python run.py semgrep --config=p/owasp-top-ten src/\n"
            "  python run.py trivy fs --severity HIGH,CRITICAL pom.xml\n"
            "  python run.py --pinned trivy fs pom.xml  # versao pinada\n"
            "  python run.py --dry-run gitleaks detect  # so mostra comando\n"
            "  python run.py --no-docker semgrep ...    # CLI nativa\n"
            "  python run.py --list                      # lista ferramentas\n"
        ),
    )
    parser.add_argument(
        "--no-docker",
        action="store_true",
        help="Usar CLI nativa em vez de Docker (requer ferramenta instalada localmente)",
    )
    parser.add_argument(
        "--pinned",
        action="store_true",
        help="Usar versao pinada (image_pinned) em vez de latest. Recomendado em CI/CD.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostrar comando sem executar",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suprimir mensagens informativas",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Listar ferramentas disponiveis e sair",
    )

    # tool e args do tool sao posicionais; usamos parse_known_args para tratar
    # flags da ferramenta (que comecam com --) sem conflito com flags do wrapper
    args, remaining = parser.parse_known_args()

    if args.list:
        return args, []

    if not remaining:
        parser.print_help()
        sys.exit(0 if args.list else 1)

    return args, remaining


def list_tools() -> int:
    cfg = load_tools_config()
    tools = cfg.get("tools", {})
    print(f"Ferramentas disponiveis ({len(tools)}):\n")
    for name in sorted(tools.keys()):
        tcfg = tools[name]
        image = tcfg.get("image", "?")
        stacks = tcfg.get("supports_stacks", ["all"])
        print(f"  {name:30s}  image={image}")
        print(f"  {' ':30s}  stacks={', '.join(stacks)}")
        if "first_run_warning" in tcfg:
            print(f"  {' ':30s}  warning={tcfg['first_run_warning']}")
        print()
    return 0


def main() -> int:
    args, remaining = parse_args()

    if args.list:
        return list_tools()

    tool_name = remaining[0]
    tool_args = remaining[1:]

    if args.no_docker:
        return run_native(tool_name, tool_args)

    return run_with_docker(
        tool_name=tool_name,
        tool_args=tool_args,
        pinned=args.pinned,
        dry_run=args.dry_run,
        quiet=args.quiet,
    )


if __name__ == "__main__":
    sys.exit(main())
