# Tools — Execucao Docker das Ferramentas de Seguranca

Esta pasta contem o wrapper que executa as ferramentas de auditoria via imagens
Docker oficiais. O usuario nao precisa instalar Semgrep, Trivy, Gitleaks, etc.
na maquina — apenas Docker.

## Pre-requisitos

- **Docker** instalado e em execucao
  - Linux: `docker-ce` ou Docker Desktop
  - macOS: Docker Desktop
  - Windows: Docker Desktop (com WSL2 backend recomendado)
- **Python 3.8+** (apenas para executar `run.py`)

Validacao rapida:

```bash
docker info       # deve listar containers/images
python3 --version # deve ser >= 3.8
```

## Uso Basico

```bash
# Listar ferramentas disponiveis
python tools/run.py --list

# Executar uma ferramenta (passa args direto para a ferramenta)
python tools/run.py semgrep --config=p/owasp-top-ten src/

# Trivy filesystem scan
python tools/run.py trivy fs --severity HIGH,CRITICAL pom.xml

# Gitleaks
python tools/run.py gitleaks detect --report-format=sarif

# Hadolint
python tools/run.py hadolint Dockerfile

# Checkov para Kubernetes
python tools/run.py checkov --directory k8s/ --framework kubernetes
```

## Flags do Wrapper

| Flag | Efeito |
|------|--------|
| `--list` | Lista ferramentas disponiveis e sai |
| `--pinned` | Usa versao pinada (`image_pinned` no tools.json) — recomendado em CI/CD |
| `--dry-run` | Mostra o comando docker run que seria executado, sem rodar |
| `--quiet` | Suprime mensagens informativas (uteis em pipelines) |
| `--no-docker` | Fallback: usa CLI nativa instalada localmente |

Ordem importa: flags do wrapper vem **antes** do nome da ferramenta. Tudo apos
o nome da ferramenta e passado direto para a ferramenta.

```bash
# CORRETO
python tools/run.py --pinned --quiet semgrep --config=p/java src/

# INCORRETO (--pinned vai para semgrep, nao para o wrapper)
python tools/run.py semgrep --pinned --config=p/java src/
```

## Como Funciona

1. `run.py` le `tools.json` para encontrar a imagem Docker oficial da ferramenta
2. Constroi um comando `docker run` com:
   - Mounts apropriados (`$PWD` → `/src` por padrao)
   - User mapping em Linux/macOS (evita arquivos com owner=root)
   - Networking restrito quando possivel (`--network none` para tools offline)
   - Cache volumes nomeados (Trivy DB, OWASP DC NVD)
3. Executa e retorna o exit code da ferramenta

Exemplo (`--dry-run`):

```bash
$ python tools/run.py --dry-run semgrep --config=p/owasp-top-ten src/

docker run --rm --user 1000:1000 --network none \
  -v /home/user/proj:/src:ro \
  -w /src \
  returntocorp/semgrep:latest \
  --config=p/owasp-top-ten src/
```

## Compatibilidade Cross-Platform

| Plataforma | Status | Notas |
|-----------|--------|-------|
| Linux | OK | User mapping aplicado automaticamente |
| macOS | OK | User mapping aplicado |
| Windows + Docker Desktop + WSL2 | OK | Paths normalizados (`C:\` → `/c/`) |
| Windows + Docker Desktop nativo | OK | Mesmo tratamento de paths |
| Linux containers no Windows | OK | (default do Docker Desktop atual) |

## Versoes Pinadas vs Latest

`tools.json` tem dois campos por ferramenta:

- `image`: tag `:latest` — bom para desenvolvimento, sempre atualizado
- `image_pinned`: versao especifica — bom para CI/CD, reproducivel

Use `--pinned` em pipelines automatizados para garantir que uma atualizacao
da ferramenta nao quebre seu pipeline silenciosamente.

## Cache de Imagens e Dados

Algumas ferramentas baixam dados grandes na primeira execucao:

| Ferramenta | Dado | Tamanho | Volume |
|-----------|------|---------|--------|
| Trivy | Vulnerability DB | ~150MB | `trivy-cache` |
| OWASP DC | NVD CVE database | ~300MB | `dc-cache` |

Esses dados ficam em **volumes Docker nomeados** que persistem entre execucoes.
Para limpar:

```bash
docker volume rm trivy-cache dc-cache
```

## Avisos de Seguranca

Algumas ferramentas precisam de privilegios elevados que merecem atencao:

### Trivy image (escaneamento de imagens locais)

Para escanear uma imagem ja buildada localmente, Trivy precisa do socket
Docker do host:

```bash
python tools/run.py trivy-image my-app:latest
```

Isso monta `/var/run/docker.sock` no container Trivy. Implicacoes:

- Trivy passa a ter **acesso completo ao daemon Docker**
- Em ambientes hostis (CI compartilhado), preferir alternativa:

```bash
# Alternativa sem socket: exportar tarball e escanear
docker save my-app:latest -o /tmp/img.tar
python tools/run.py trivy fs --input /tmp/img.tar
```

### Dockle

Mesma situacao do Trivy image — precisa do socket Docker.

## Troubleshooting

### "Docker nao esta instalado"

Instale Docker Desktop (Mac/Windows) ou docker-ce (Linux).
Doc oficial: https://docs.docker.com/get-docker/

### "Docker daemon nao esta acessivel"

- Mac/Windows: abra o Docker Desktop
- Linux: `sudo systemctl start docker` e adicione seu usuario ao grupo
  `docker` para evitar `sudo` em todo comando

### Permissao negada em arquivos gerados

User mapping nao foi aplicado (ocorre em Windows). Solucao:
arquivos serao criados como user do container; pode ser necessario
ajustar permissoes manualmente apos execucao.

### Imagem nao encontrada / pull falhou

```bash
# Testar pull manualmente
docker pull returntocorp/semgrep:latest

# Se ha proxy/firewall, configurar Docker:
# https://docs.docker.com/network/proxy/
```

### Ferramenta lenta na primeira execucao

Normal para Trivy (~150MB) e OWASP DC (~300MB). Subsequentes sao rapidas
gracas aos volumes de cache.

### `--no-docker` para usar CLI local

Se voce ja tem a ferramenta instalada e quer usar a versao local:

```bash
python tools/run.py --no-docker semgrep --config=p/owasp-top-ten src/
```

Util para debug ou para evitar overhead de Docker em maquinas com
ferramenta ja configurada.

## Adicionando Novas Ferramentas

Edite `tools.json` e adicione uma entrada em `tools`:

```json
{
  "tools": {
    "minha-ferramenta": {
      "image": "vendor/ferramenta:latest",
      "image_pinned": "vendor/ferramenta:1.2.3",
      "default_args": [],
      "mounts": [
        {"src": "$PWD", "dst": "/src", "mode": "ro"}
      ],
      "workdir": "/src",
      "networking": "none",
      "supports_sarif": true,
      "sarif_flag": "--format sarif"
    }
  }
}
```

Campos disponiveis:

| Campo | Obrigatorio | Descricao |
|-------|-------------|-----------|
| `image` | sim | Imagem Docker (latest) |
| `image_pinned` | recomendado | Imagem com tag versionada |
| `entrypoint_override` | nao | Override do ENTRYPOINT da imagem |
| `default_args` | nao | Args adicionados antes dos args do usuario |
| `mounts` | nao | Lista de mounts. `$PWD` e expandido |
| `cache_volume` | nao | Volume nomeado para cache persistente |
| `workdir` | nao | WORKDIR dentro do container |
| `networking` | nao | `none` (offline) ou `default` |
| `supports_sarif` | nao | Documenta se ferramenta emite SARIF nativo |
| `first_run_warning` | nao | Mensagem mostrada antes da primeira execucao |
| `security_warning` | nao | Aviso de implicacao de seguranca |
