---
name: security-audit-workflow
description: "Workflow de auditoria de seguranca stack-agnostico orientado por sub-agents reais com execucao em Docker. Detecta linguagem, framework e superficie de ataque (Fase 0); resolve escopo via PRD/TechSpec/OpenAPI quando fornecidos ou audita superficie completa como fallback (Fase 1); monta matriz de casos de teste de seguranca aplicaveis baseada em OWASP Top 10 2021 (Fase 2); orquestra sub-agents especializados em paralelo (SAST, SCA, secrets, container, auth, crypto, IaC) executando ferramentas open-source via imagens Docker oficiais (Semgrep, Trivy, Gitleaks, Hadolint, OWASP Dependency-Check, Checkov, gosec, cargo-audit); consolida achados em SARIF e relatorio markdown priorizado. Suporta Java, Node, Python, Go, Rust, .NET. Usar quando: auditar seguranca de projeto; pre-deploy; pre-merge de mudancas sensiveis; security review periodico; escopo via PRD/TechSpec ou auditoria completa."
---

# Security Audit Workflow (Stack-Agnostic, Docker-Based)

Documento normativo para orquestracao de auditoria de seguranca por agentes LLM.
Define o workflow de descoberta, planejamento e execucao via sub-agents reais.
Skill agnostica de linguagem — suporta Java, Node, Python, Go, Rust, .NET, containers e IaC.

Principios fundadores:
- **Escopo orientado a documento**: PRD/TechSpec quando disponiveis, fallback para superficie completa
- **Test cases antes de execucao**: nao spinar sub-agents sem matriz de casos aprovada
- **Sub-agents reais**: contratos padronizados executaveis em Claude / Codex / Copilot
- **Output normalizado**: SARIF como formato canonico de findings
- **Zero install**: ferramentas executadas via imagens Docker oficiais — usuario so precisa de Docker

---

# 1. Visao Geral do Workflow

```
Fase 0 — Reconhecimento
  ├─ Detectar stack(s) por marcadores de arquivo
  ├─ Detectar superficie de ataque
  ├─ Ler docs opcionais (PRD/TechSpec/OpenAPI)
  └─ Produzir security_profile.json

Fase 1 — Scope Resolution
  ├─ Se docs presentes: extrair ativos criticos, fluxos sensiveis, endpoints
  ├─ Se ausentes: scope = profile completo (com aviso explicito)
  └─ Produzir scope.json

Fase 2 — Test Case Design
  ├─ Cruzar scope x catalogo de vetores OWASP Top 10
  ├─ Gerar matriz de casos aplicaveis
  ├─ Apresentar test_plan.md ao humano (dry-run)
  └─ Aguardar aprovacao ou edicao

Fase 3 — Sub-agent Dispatch (paralelo, via Docker)
  ├─ sast-agent       → Semgrep (returntocorp/semgrep)
  ├─ sca-agent        → Trivy (aquasec/trivy) / OWASP DC (owasp/dependency-check)
  ├─ secrets-agent    → Gitleaks (zricethezav/gitleaks)
  ├─ container-agent  → Hadolint (hadolint/hadolint) + Trivy image
  ├─ auth-agent       → Semgrep + revisao guiada
  ├─ crypto-agent     → Semgrep + grep patterns
  └─ iac-agent        → Checkov (bridgecrew/checkov) / kubesec

Fase 4 — Consolidacao
  ├─ Normalizar saidas para SARIF
  ├─ Deduplicar achados cross-tool
  ├─ Priorizar (severidade x explorabilidade x criticidade do ativo)
  └─ Gerar security_report.md
```

---

# 2. Estrutura de Arquivos da Skill

```
security-audit-workflow/
├── SKILL.md                          # este documento (workflow normativo)
├── templates/
│   ├── contracts/                    # contratos YAML por sub-agent
│   │   ├── sast-agent.yaml
│   │   ├── sca-agent.yaml
│   │   ├── secrets-agent.yaml
│   │   ├── container-agent.yaml
│   │   ├── auth-agent.yaml
│   │   ├── crypto-agent.yaml
│   │   └── iac-agent.yaml
│   └── outputs/                      # exemplos de artefatos produzidos
│       ├── security_profile.example.json
│       ├── scope.example.json
│       ├── test_plan.template.md
│       └── security_report.template.md
└── tools/                            # execucao Docker
    ├── README.md                     # como usar o wrapper
    ├── tools.json                    # mapping tool → image → comando
    └── run.py                        # wrapper Python multiplataforma
```

Cada artefato e referenciado por caminho relativo ao longo deste documento.

---

# 3. Inputs Aceitos

## Obrigatorios

* Repositorio ou diretorio de trabalho (caminho absoluto)
* Docker instalado e em execucao (validado pelo wrapper antes da Fase 3)

## Opcionais (mas recomendados)

| Input | Caminho convencional | Efeito |
|-------|---------------------|--------|
| PRD | `docs/prd.md` | Define ativos criticos do ponto de vista de negocio |
| TechSpec | `docs/techspec.md` | Define onde estao os componentes (endpoints, integracoes) |
| OpenAPI | `api-contract.yaml` | Lista exata de endpoints para matriz auth/authz/injection |
| Escopo manual | parametro `--scope=src/payment/**` | Glob/path filter explicito |
| QA report previo | `qa_report.md` | Contexto de validacoes funcionais ja realizadas |

## Regra de Precedencia

1. Se `--scope` for passado explicitamente, **tem prioridade absoluta**
2. Se PRD + TechSpec presentes, escopo = uniao dos componentes citados + dependencias diretas
3. Se apenas PRD presente, escopo = ativos do PRD mapeados para paths via heuristica
4. Se apenas TechSpec presente, escopo = todos os componentes do TechSpec
5. Se OpenAPI presente, todos os endpoints entram na matriz (mesmo sem PRD)
6. Se nada presente, **fallback**: superficie completa detectada na Fase 0, com aviso

---

# 4. Fase 0 — Reconhecimento

## 4.1 Deteccao de Stack

Sub-agent `recon-agent` deve detectar **multiplas stacks** (monorepos sao comuns):

| Marcador | Stack |
|----------|-------|
| `pom.xml`, `build.gradle`, `build.gradle.kts` | Java/JVM |
| `package.json`, `tsconfig.json` | Node.js / TypeScript |
| `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `*.csproj`, `*.sln`, `Directory.Build.props` | .NET |
| `Dockerfile`, `*.dockerfile` | Container |
| `*.tf`, `*.tfvars` | Terraform |
| `kubernetes/*.yaml`, `k8s/*.yaml`, `helm/` | Kubernetes |
| `.github/workflows/`, `.gitlab-ci.yml` | CI/CD |

## 4.2 Deteccao de Superficie de Ataque

| Categoria | Indicadores |
|-----------|-------------|
| **API REST publica** | `@RestController`, `app.get/post`, `@app.route`, `gin.Engine`, `actix_web`, `[ApiController]` |
| **Worker/consumer** | `@KafkaListener`, `@RabbitListener`, `bull`, `celery`, `sarama` |
| **CLI** | `main.go` com `cobra/cli`, `argparse`, `clap`, `commander` |
| **Lib publicada** | `package.json` com `"main"`, `pom.xml` sem `spring-boot-starter-web` |
| **Persistencia** | JPA (`@Entity`), Mongoose, SQLAlchemy, GORM, sqlx, EF Core |
| **Auth** | Spring Security, Passport, FastAPI deps, golang-jwt, axum auth, ASP.NET Identity |
| **Cripto manual** | uso direto de `Cipher`, `crypto.createCipher`, `cryptography.fernet`, `crypto/aes`, `aes-gcm`, `System.Security.Cryptography` |
| **HTTP outbound** | WebClient, axios, httpx, net/http, reqwest, HttpClient |
| **Secrets em config** | strings com `password=`, `api_key=`, `token=` em arquivos commitados |

## 4.3 Output da Fase 0

Ver template completo em `templates/outputs/security_profile.example.json`.

---

# 5. Fase 1 — Scope Resolution

## 5.1 Com PRD/TechSpec Presentes

Sub-agent `scope-resolver` extrai dos documentos:

* **Ativos criticos** (do PRD): "dados de cartao", "credenciais de usuario", "PII de cliente"
* **Fluxos sensiveis** (do PRD): "checkout", "login", "reset de senha"
* **Componentes envolvidos** (do TechSpec): modulos, pacotes, servicos
* **Endpoints expostos** (do OpenAPI): rotas + metodos + auth requirements
* **Integracoes externas** (do TechSpec): URLs, SDKs, MCP, terceiros

Output: `scope.json` no formato de `templates/outputs/scope.example.json`.

## 5.2 Sem Docs (Fallback Protocol)

Quando nenhum documento e fornecido, sub-agent gera `scope.json` em modo `full` e **avisa explicitamente** no relatorio final que a auditoria foi executada sem escopo dirigido.

## 5.3 Regras Obrigatorias

* NAO gerar test plan sem `scope.json` produzido
* NAO inventar ativos criticos quando PRD ausente — usar fallback
* SEMPRE incluir `rationale` explicando como o escopo foi derivado
* Quando ha conflito entre `--scope` manual e docs, priorizar `--scope` e registrar a divergencia

---

# 6. Fase 2 — Test Case Design

## 6.1 Catalogo de Vetores (OWASP Top 10 2021)

A matriz de casos de teste deve mapear achados a uma das 10 categorias canonicas:

| ID | Categoria OWASP | Foco |
|----|-----------------|------|
| **A01** | Broken Access Control | Authz, IDOR, path traversal, CORS permissivo |
| **A02** | Cryptographic Failures | Algos fracos, chaves hardcoded, TLS desabilitado, hashing inadequado |
| **A03** | Injection | SQL, NoSQL, OS command, LDAP, SpEL, template injection |
| **A04** | Insecure Design | Falta de rate limit, secrets em logs, ausencia de validacao |
| **A05** | Security Misconfiguration | Headers ausentes, CSRF off, Actuator/Swagger expostos, container root |
| **A06** | Vulnerable Components | CVEs em dependencias diretas e transitivas |
| **A07** | Identification & Auth Failures | JWT `alg=none`, sessao fraca, brute force sem protecao |
| **A08** | Software & Data Integrity Failures | Deserializacao insegura, supply chain, CI sem assinatura |
| **A09** | Security Logging & Monitoring Failures | Ausencia de log de eventos de seguranca, dados sensiveis em log |
| **A10** | SSRF | Requisicoes outbound com URL controlada por usuario |

## 6.2 Mapa Categoria → Sub-agent → Ferramenta Docker

| OWASP | Sub-agent | Imagem Docker default |
|-------|-----------|----------------------|
| A01 | auth-agent | `returntocorp/semgrep` |
| A02 | crypto-agent | `returntocorp/semgrep` |
| A03 | sast-agent | `returntocorp/semgrep` |
| A04 | sast-agent + auth-agent | `returntocorp/semgrep` |
| A05 | container-agent + iac-agent | `hadolint/hadolint`, `bridgecrew/checkov` |
| A06 | sca-agent | `aquasec/trivy`, `owasp/dependency-check` |
| A07 | auth-agent | `returntocorp/semgrep` |
| A08 | sca-agent + sast-agent | `aquasec/trivy`, `returntocorp/semgrep` |
| A09 | sast-agent | `returntocorp/semgrep` |
| A10 | sast-agent | `returntocorp/semgrep` |

## 6.3 Regras de Aplicabilidade

Cada caso so e incluido na matriz se o **trigger** correspondente for verdadeiro:

| Caso | Trigger de inclusao |
|------|---------------------|
| A01 - Authz | Existe controller HTTP detectado |
| A02 - Crypto | `attack_surface.manual_crypto` OU stack tem auth |
| A03 - SQL Injection | Persistencia detectada (qualquer DB) |
| A03 - NoSQL Injection | Mongoose, pymongo, mongo-go-driver detectados |
| A03 - OS Command | Uso de `Runtime.exec`, `child_process`, `subprocess`, `os/exec`, `Command::new`, `Process.Start` |
| A03 - SpEL | Spring Framework presente |
| A04 - Rate limit | Endpoint publico sem auth detectado |
| A05 - Container | Dockerfile presente |
| A05 - K8s | Manifests k8s presentes |
| A05 - Actuator | Spring Boot Actuator no classpath |
| A06 - CVE | Sempre (qualquer stack tem deps) |
| A07 - JWT | Lib JWT detectada |
| A08 - Deserializacao | Uso de `ObjectInputStream`, `pickle`, `unserialize`, `BinaryFormatter`, `gob` |
| A09 - Logging | Sempre (toda app loga) |
| A10 - SSRF | HTTP outbound + endpoint que aceita URL como input |

Casos **nao aplicaveis** ficam documentados como `skipped` com justificativa, **nao removidos**. Isso garante auditabilidade.

## 6.4 Output: test_plan.md

Output da Fase 2 produzido por `test-case-designer-agent`. Ver template completo em `templates/outputs/test_plan.template.md`.

## 6.5 Dry-Run e Aprovacao Humana

* Sub-agents da Fase 3 NAO devem ser disparados sem `test_plan.md` aprovado
* O agente orquestrador deve apresentar o plano e **aguardar confirmacao explicita**
* Edicoes no plano (adicionar/remover casos) devem ser aplicadas antes de executar
* Em modo `--auto-approve` (CI/CD), o plano e gerado e executado sem pausa, mas registrado integralmente no relatorio final

---

# 7. Fase 3 — Sub-agents

## 7.1 Contratos Padronizados

Cada sub-agent recebe um contrato YAML estruturado. Os contratos sao **portaveis** entre Claude Subagents, OpenAI Codex e GitHub Copilot Agents.

Templates disponiveis em `templates/contracts/`:

| Sub-agent | Template | OWASP cobertos |
|-----------|----------|----------------|
| sast-agent | `templates/contracts/sast-agent.yaml` | A01, A03, A04, A09, A10 |
| sca-agent | `templates/contracts/sca-agent.yaml` | A06, A08 |
| secrets-agent | `templates/contracts/secrets-agent.yaml` | A02, A05 |
| container-agent | `templates/contracts/container-agent.yaml` | A05, A06 |
| auth-agent | `templates/contracts/auth-agent.yaml` | A01, A07 |
| crypto-agent | `templates/contracts/crypto-agent.yaml` | A02 |
| iac-agent | `templates/contracts/iac-agent.yaml` | A05 |

## 7.2 Regras Obrigatorias do Contrato

* `case_id` deve corresponder a um item do `test_plan.md`
* `output.format` deve ser `sarif` para todos os agents que produzem findings (cross-tool dedup depende disso)
* `failure_protocol` e obrigatorio — agente nunca trava o pipeline
* `reporting.back_to_dispatcher` define o handshake com a Fase 4

## 7.3 Execucao via Docker (Wrapper `tools/run.py`)

Sub-agents executam ferramentas via wrapper Python multiplataforma (Linux/macOS/Windows):

```bash
# Em vez de:
semgrep --config=p/owasp-top-ten src/

# Sub-agent invoca:
python tools/run.py semgrep --config=p/owasp-top-ten src/

# Que internamente executa:
docker run --rm -v $(pwd):/src -w /src returntocorp/semgrep:latest \
  semgrep --config=p/owasp-top-ten src/
```

Vantagens:
- Zero install na maquina do usuario (so Docker)
- Versoes pinadas em `tools/tools.json`
- Cache de imagens persistente
- Reproducivel em CI/CD

Detalhes de uso e configuracao: `tools/README.md`.

## 7.4 Fallback Quando Docker Indisponivel

* Wrapper detecta Docker ausente e informa claramente
* Modo `--no-docker` permite usar CLI nativa quando instalada (uso avancado)
* Sub-agent marca caso como `NOT_EXECUTED` se nem Docker nem CLI nativa disponivel
* Pipeline NUNCA trava — segue para os proximos casos

---

# 8. Output Normalization (SARIF)

## 8.1 Por Que SARIF

* Formato OASIS padrao
* Suportado nativamente por Semgrep, Trivy, CodeQL, GitHub Security
* Schema versionado (atual: 2.1.0)
* Permite deduplicacao cross-tool por `partialFingerprints`

## 8.2 Adapter para Ferramentas Sem Suporte SARIF

A maioria das ferramentas modernas emite SARIF nativamente via flag (`--sarif`, `-f sarif`, `--format=sarif`). Quando nao emite, sub-agent converte:

```bash
# gosec emite SARIF nativamente
gosec -fmt=sarif -out=findings.sarif ./...

# bandit emite SARIF nativamente (versoes recentes)
bandit -r src/ -f sarif -o findings.sarif

# cargo-audit JSON → SARIF (conversao manual no sub-agent)
cargo audit --json | jq '...' > findings.sarif
```

## 8.3 Campos Obrigatorios em Cada Finding

```json
{
  "ruleId": "java.spring.security.audit.spel-injection",
  "level": "error",
  "message": {"text": "Possible SpEL injection from user input"},
  "locations": [{
    "physicalLocation": {
      "artifactLocation": {"uri": "src/payment/PaymentController.java"},
      "region": {"startLine": 42, "startColumn": 12}
    }
  }],
  "properties": {
    "owasp_id": "A03",
    "case_id": "SEC-001",
    "asset_classification": "PCI-DSS",
    "tool": "semgrep"
  },
  "partialFingerprints": {
    "primaryLocationLineHash": "abc123..."
  }
}
```

---

# 9. Fase 4 — Consolidacao

## 9.1 Deduplicacao Cross-Tool

E comum que Semgrep, SpotBugs e ferramentas nativas reportem o mesmo bug. O `consolidator-agent` deve deduplicar usando:

1. **Fingerprint primario**: `{file_path}:{line_number}:{rule_category}` — match exato
2. **Fingerprint secundario**: `{file_path}:{snippet_hash}` — para casos onde a linha mudou mas o codigo e o mesmo
3. **Cross-tool merge**: quando dois finds tem mesmo fingerprint, mergear preservando:
   - Maior severidade entre as ferramentas
   - Lista de todas as ferramentas que reportaram
   - Lista de rule IDs originais

## 9.2 Priorizacao

A severidade final de cada finding e calculada por:

```
severity_final = base_severity x asset_multiplier x exploitability_factor
```

### Asset Multiplier (do PRD)

| Classificacao | Multiplier |
|---------------|------------|
| PCI-DSS, HIPAA, dados de saude | 2.0 |
| LGPD/PII, credenciais | 1.5 |
| Dados internos | 1.0 |
| Dados publicos | 0.5 |

### Exploitability Factor

| Contexto | Factor |
|----------|--------|
| Endpoint publico sem auth | 1.5 |
| Endpoint autenticado | 1.0 |
| Codigo interno (worker, batch) | 0.7 |
| Codigo de teste | 0.3 |

### Tiers Finais

| Score | Tier |
|-------|------|
| >= 9.0 | CRITICAL — bloqueia merge/deploy |
| 7.0 - 8.9 | HIGH — bloqueia deploy de producao |
| 4.0 - 6.9 | MEDIUM — corrigir em sprint |
| < 4.0 | LOW — backlog |

## 9.3 Output: security_report.md

Ver template completo em `templates/outputs/security_report.template.md`.

---

# 10. Integracao com Outras Skills

## Com qa-workflow

* `security_report.md` deve ser anexado/referenciado no `qa_report.md` quando ambos existem
* Findings CRITICAL/HIGH viram entrada automatica em `qa_report.md` como QA-blocker

## Com java-production-readiness

* A secao "Seguranca Minima" do `java-production-readiness` deve apontar para esta skill
* Pre-deploy deve exigir `security_report.md` com zero CRITICAL

## Com java-observability

* Findings de A09 (Logging Failures) devem cruzar com a sanitizacao definida em `java-observability`
* Se sanitizacao esta documentada mas nao implementada, finding e elevado em severidade

---

# 11. HARD RULES da Skill

## Workflow

**WF-01** Fase 0 e Fase 1 sao obrigatorias antes de Fase 2.
**WF-02** Fase 3 NAO executa sem `test_plan.md` aprovado (exceto modo `--auto-approve`).
**WF-03** Sub-agents NUNCA travam o pipeline — em caso de falha, marcar como NOT_EXECUTED e prosseguir.
**WF-04** Output canonico de findings e SARIF 2.1.0.
**WF-05** Toda execucao deve produzir `security_report.md`.

## Escopo

**SC-01** Quando PRD/TechSpec presentes, escopo e derivado deles.
**SC-02** Sem docs, fallback para superficie completa COM AVISO explicito no relatorio.
**SC-03** `--scope` manual tem precedencia sobre tudo.
**SC-04** Casos nao aplicaveis sao `skipped`, nao removidos.

## Sub-agents

**SA-01** Cada sub-agent recebe contrato YAML estruturado de `templates/contracts/`.
**SA-02** Contrato contem `failure_protocol` obrigatorio.
**SA-03** Sub-agents sao executados em paralelo quando possivel.
**SA-04** Cada sub-agent reporta `status` ao dispatcher.

## Ferramentas

**TL-01** Ferramentas executadas via Docker por padrao (imagens oficiais).
**TL-02** Versoes pinadas em `tools/tools.json` para reprodutibilidade.
**TL-03** Wrapper `tools/run.py` valida disponibilidade do Docker antes de executar.
**TL-04** Fallback para CLI nativa apenas com flag `--no-docker` explicita.
**TL-05** Caso Docker e CLI nativa indisponiveis, marcar caso como NOT_EXECUTED.

## Reporting

**RP-01** Findings devem ter `partialFingerprints` para deduplicacao.
**RP-02** Severidade final considera asset_multiplier do PRD.
**RP-03** Mapeamento Asset → Achado e obrigatorio quando PRD presente.
**RP-04** Casos NOT_EXECUTED sao listados explicitamente.

---

# 12. Checklist Final

## Fase 0 — Reconhecimento
- [ ] Stacks detectadas e versionadas
- [ ] Superficie de ataque mapeada
- [ ] Docs opcionais carregados (PRD/TechSpec/OpenAPI)
- [ ] `security_profile.json` produzido (formato em `templates/outputs/`)

## Fase 1 — Scope Resolution
- [ ] `scope.json` produzido com `mode` claro (scoped|full)
- [ ] Ativos criticos extraidos quando PRD presente
- [ ] Endpoints extraidos quando OpenAPI presente
- [ ] `rationale` documentado
- [ ] Aviso explicito quando em modo `full`

## Fase 2 — Test Case Design
- [ ] Matriz de casos cobre OWASP Top 10 aplicavel
- [ ] Cada caso tem sub-agent + ferramenta + criterio
- [ ] Casos skipped justificados
- [ ] `test_plan.md` apresentado para aprovacao
- [ ] Aprovacao registrada (humana ou auto-approve)

## Fase 3 — Execucao
- [ ] Docker validado disponivel pelo wrapper
- [ ] Cada sub-agent recebeu contrato valido de `templates/contracts/`
- [ ] Execucao paralela quando possivel
- [ ] Falhas tratadas via `failure_protocol`
- [ ] Outputs em SARIF gerados em `.security/findings/`
- [ ] Status reportado ao dispatcher por todos os agents

## Fase 4 — Consolidacao
- [ ] Findings deduplicados via fingerprint
- [ ] Severidade ajustada por asset_multiplier
- [ ] Mapeamento Asset → Achado produzido
- [ ] Cobertura OWASP documentada
- [ ] `security_report.md` gerado
- [ ] Decisao recomendada clara (bloquear/aprovar)

## Integracao
- [ ] Referenciado em `qa_report.md` quando aplicavel
- [ ] Pre-merge/pre-deploy validado contra criterio CRITICAL=0
- [ ] Findings de logging cruzados com `java-observability`

## Rastreabilidade
- [ ] Versoes de imagens Docker registradas (`tools/tools.json`)
- [ ] Docs de origem do escopo registrados
- [ ] Casos NOT_EXECUTED documentados
- [ ] Re-execucao reproduzivel via parametros gravados
