# Security Test Plan

**Projeto**: {{ PROJECT_NAME }}
**Modo de escopo**: {{ SCOPE_MODE }} ({{ SOURCE_DOCS }})
**Stacks detectadas**: {{ STACKS }}
**Total de casos**: {{ APPLICABLE_COUNT }} aplicaveis, {{ SKIPPED_COUNT }} skipped
**Gerado em**: {{ TIMESTAMP }}
**Designer agent**: test-case-designer-agent v1.0.0

---

## Ativos Criticos (do PRD)

{{ CRITICAL_ASSETS_LIST }}

Exemplo:
1. credit_card_data (PCI-DSS, multiplier 2.0) → src/payment/**
2. user_credentials (auth, multiplier 1.5) → src/auth/**
3. user_pii (LGPD, multiplier 1.5) → src/user/**

---

## Casos de Teste Aplicaveis

### SEC-001 — A03 SQL Injection em payment-service

- **Sub-agent**: sast-agent
- **Contrato**: `templates/contracts/sast-agent.yaml`
- **Ferramenta**: Semgrep (image: `returntocorp/semgrep:latest`)
- **Config**: `p/owasp-top-ten`, `p/java`
- **Escopo**: `src/payment/**`
- **Asset impactado**: credit_card_data
- **Severidade base**: HIGH
- **Severidade ajustada (com multipliers)**: CRITICAL (HIGH x 2.0)
- **Criterio de aprovacao**: zero findings de severidade HIGH ou CRITICAL
- **Comando**:
  ```bash
  python tools/run.py semgrep \
    --config=p/owasp-top-ten --config=p/java \
    --sarif --output=.security/findings/SEC-001.sarif \
    src/payment/
  ```

### SEC-002 — A06 CVEs em dependencias Java

- **Sub-agent**: sca-agent
- **Contrato**: `templates/contracts/sca-agent.yaml`
- **Ferramentas**: Trivy fs (`aquasec/trivy:latest`) + OWASP DC (`owasp/dependency-check:latest`)
- **Escopo**: pom.xml (todos os modulos)
- **Asset impactado**: todos
- **Severidade base**: HIGH
- **Criterio de aprovacao**: zero CVEs com CVSS >= 7.0
- **Comando**:
  ```bash
  python tools/run.py trivy fs \
    --scanners vuln --severity HIGH,CRITICAL \
    --format sarif --output=.security/findings/SEC-002-trivy.sarif \
    pom.xml
  ```

### SEC-003 — A07 Configuracao JWT

- **Sub-agent**: auth-agent
- **Contrato**: `templates/contracts/auth-agent.yaml`
- **Ferramentas**: Semgrep + revisao guiada
- **Escopo**: `src/auth/**`
- **Asset impactado**: user_credentials
- **Severidade base**: HIGH
- **Severidade ajustada**: CRITICAL (HIGH x 1.5 x 1.5 endpoint publico)
- **Criterio de aprovacao**:
  - alg != none aceito
  - secret nao hardcoded
  - exp claim validado
  - refresh token com rotacao
- **Comando**: ver contrato

### SEC-004 — A05 Container Hardening

- **Sub-agent**: container-agent
- **Contrato**: `templates/contracts/container-agent.yaml`
- **Ferramentas**: Hadolint (`hadolint/hadolint:latest`) + Trivy image
- **Escopo**: Dockerfile + imagem final
- **Severidade base**: MEDIUM
- **Criterio de aprovacao**:
  - zero CRITICAL/HIGH no Trivy
  - zero rules DL3xxx error no Hadolint
  - USER nao-root
- **Comando**: ver contrato

### SEC-005 — A05 Kubernetes Misconfiguration

- **Sub-agent**: iac-agent
- **Contrato**: `templates/contracts/iac-agent.yaml`
- **Ferramentas**: Checkov (`bridgecrew/checkov:latest`) + kubesec
- **Escopo**: `k8s/**`
- **Severidade base**: MEDIUM
- **Criterio de aprovacao**: zero CKV_K8S_xxx CRITICAL
- **Comando**: ver contrato

### SEC-006 — Secrets em codigo/historico

- **Sub-agent**: secrets-agent
- **Contrato**: `templates/contracts/secrets-agent.yaml`
- **Ferramenta**: Gitleaks (`zricethezav/gitleaks:latest`)
- **Escopo**: repositorio completo
- **Severidade base**: HIGH
- **Criterio de aprovacao**: zero secrets detectados
- **Comando**: ver contrato

### SEC-007 — A07 Login sem rate limit

- **Sub-agent**: auth-agent
- **Foco**: endpoint POST /api/auth/login
- **Ferramentas**: Semgrep + revisao guiada (rate limit)
- **Severidade base**: HIGH
- **Severidade ajustada**: CRITICAL (HIGH x 1.5)
- **Criterio de aprovacao**: rate limit configurado por IP e por user

[... outros casos SEC-008 a SEC-NNN ...]

---

## Casos Skipped (Nao Aplicaveis)

| ID | Caso | OWASP | Motivo |
|----|------|-------|--------|
| SEC-S01 | NoSQL Injection | A03 | Nenhum driver NoSQL detectado |
| SEC-S02 | SSRF | A10 | Nenhum endpoint aceita URL como input |
| SEC-S03 | Deserializacao binaria | A08 | Nenhum uso de ObjectInputStream detectado |
| SEC-S04 | Terraform misconfig | A05 | Sem arquivos .tf no projeto |

---

## Cobertura OWASP Top 10

| Categoria | Casos planejados |
|-----------|------------------|
| A01 Broken Access Control | SEC-008, SEC-009 |
| A02 Cryptographic Failures | SEC-010 |
| A03 Injection | SEC-001 |
| A04 Insecure Design | SEC-011 |
| A05 Misconfiguration | SEC-004, SEC-005 |
| A06 Vulnerable Components | SEC-002 |
| A07 Auth Failures | SEC-003, SEC-007 |
| A08 Integrity Failures | SEC-012 |
| A09 Logging Failures | SEC-013 |
| A10 SSRF | SKIPPED |

---

## Execucao

### Validacoes Pre-execucao

- [ ] Docker em execucao (verificavel via `docker info`)
- [ ] Imagens necessarias acessiveis (registry publico ou cache local)
- [ ] Espaco em disco para findings (~100MB recomendado)

### Comando de Execucao

```bash
# Modo interativo (aprovacao manual)
security-audit --execute --plan=.security/test_plan.md

# Modo CI/CD (sem aprovacao manual)
security-audit --execute --plan=.security/test_plan.md --auto-approve
```

### Execucao Paralela

Sub-agents listados podem rodar em paralelo:
- Grupo 1 (paralelo): sast-agent, sca-agent, secrets-agent, container-agent, iac-agent
- Grupo 2 (depende de 1): auth-agent (pode usar findings de sast-agent)
- Grupo 3 (depende de 1+2): consolidator-agent

---

## Aprovacao

- [ ] Plano revisado por: ____________________
- [ ] Casos adicionais necessarios? Listar abaixo:
- [ ] Casos a remover? Listar abaixo:
- [ ] Aprovado para execucao em: ____________________

Apos aprovacao, executar Fase 3 com:
```bash
security-audit --execute --plan=.security/test_plan.md
```
