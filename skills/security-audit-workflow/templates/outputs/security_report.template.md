# Security Audit Report

**Projeto**: {{ PROJECT_NAME }}
**Gerado em**: {{ TIMESTAMP }}
**Modo de escopo**: {{ SCOPE_MODE }} ({{ SOURCE_DOCS }})
**Stacks auditadas**: {{ STACKS }}
**Total de casos executados**: {{ EXECUTED_COUNT }} / {{ PLANNED_COUNT }}
**Casos NOT_EXECUTED**: {{ NOT_EXECUTED_COUNT }}
**Tempo total**: {{ TOTAL_DURATION }}

---

## Sumario Executivo

| Tier | Quantidade | Acao |
|------|------------|------|
| CRITICAL | {{ CRITICAL_COUNT }} | Bloqueia merge/deploy |
| HIGH | {{ HIGH_COUNT }} | Bloqueia deploy de producao |
| MEDIUM | {{ MEDIUM_COUNT }} | Corrigir em sprint atual |
| LOW | {{ LOW_COUNT }} | Backlog |

**Decisao recomendada**: {{ DECISION }}
- BLOCK: ha CRITICAL ou HIGH em ativos sensiveis
- WARN: ha MEDIUM em ativos sensiveis
- APPROVE: zero CRITICAL/HIGH

---

## Achados CRITICAL

### CONS-0001 — A07 JWT com alg=none aceito

- **Localizacao**: `src/auth/JwtValidator.java:78`
- **Asset impactado**: user_credentials (multiplier 1.5)
- **Endpoint relacionado**: POST /api/auth/login (publico, factor 1.5)
- **Score final**: 9.5 (HIGH base x 1.5 asset x 1.5 endpoint = 9.5 → CRITICAL)
- **Reportado por**:
  - semgrep (rule: `p/jwt-security:no-alg-none`)
  - guided review (auth-agent checklist: "alg=none e explicitamente rejeitado")
- **Caso de origem**: SEC-003
- **Evidencia**:
  ```java
  // src/auth/JwtValidator.java:78
  Algorithm algorithm = Algorithm.fromString(jwt.getAlgorithm()); // accepts "none"
  ```
- **Remediacao**: Forcar `HS256` ou `RS256`, rejeitar `none` explicitamente:
  ```java
  if ("none".equalsIgnoreCase(jwt.getAlgorithm())) {
      throw new InvalidTokenException("Algorithm 'none' not allowed");
  }
  ```
- **Referencias**:
  - CWE-327: Use of a Broken or Risky Cryptographic Algorithm
  - OWASP JWT Security Cheat Sheet

### CONS-0002 — A03 SQL Injection em payment query

[... mesma estrutura ...]

---

## Achados HIGH

[... lista similar ...]

---

## Achados MEDIUM

[... lista similar ...]

---

## Achados LOW

| ID | Categoria | Localizacao | Descricao |
|----|-----------|-------------|-----------|
| CONS-0030 | A09 | src/user/UserService.java:42 | Log de email completo (parcialmente PII) |
| CONS-0031 | A05 | k8s/deployment.yaml | resources.limits ausente |
[...]

---

## Casos Skipped (durante planejamento)

| ID | Caso | OWASP | Motivo |
|----|------|-------|--------|
| SEC-S01 | NoSQL Injection | A03 | Sem driver NoSQL |
| SEC-S02 | SSRF | A10 | Sem endpoints com URL input |

---

## Casos NOT_EXECUTED

{{ NOT_EXECUTED_LIST }}

Exemplo:
| ID | Caso | Motivo |
|----|------|--------|
| SEC-005 | K8s Misconfig | Imagem `bridgecrew/checkov` falhou no pull (timeout) — re-tentar |

---

## Mapeamento Asset → Achado

### credit_card_data (PCI-DSS, multiplier 2.0)
- CONS-0002 (CRITICAL) - SQL Injection em payment query
- CONS-0007 (HIGH) - Logging de payment details com PAN parcial
- CONS-0015 (MEDIUM) - Falta TLS em comunicacao interna payment-service ↔ db

### user_credentials (auth, multiplier 1.5)
- CONS-0001 (CRITICAL) - JWT alg=none
- CONS-0003 (HIGH) - Refresh token sem rotacao
- CONS-0009 (HIGH) - Login sem rate limit

### user_pii (LGPD, multiplier 1.5)
- CONS-0011 (MEDIUM) - GET /api/users/{id} sem checagem de owner (IDOR)

---

## Cobertura OWASP Top 10

| Categoria | Casos | Findings | Status |
|-----------|-------|----------|--------|
| A01 Broken Access Control | 2 | 1 HIGH, 2 MEDIUM | NEEDS_FIX |
| A02 Cryptographic Failures | 1 | 0 | OK |
| A03 Injection | 1 | 1 CRITICAL | BLOCK |
| A04 Insecure Design | 1 | 1 MEDIUM | NEEDS_FIX |
| A05 Misconfiguration | 2 | 5 MEDIUM, 2 LOW | NEEDS_FIX |
| A06 Vulnerable Components | 1 | 1 HIGH, 8 MEDIUM | NEEDS_FIX |
| A07 Auth Failures | 2 | 1 CRITICAL, 2 HIGH | BLOCK |
| A08 Integrity Failures | 1 | 0 | OK |
| A09 Logging Failures | 1 | 1 HIGH, 3 LOW | NEEDS_FIX |
| A10 SSRF | SKIPPED | - | N/A |

---

## Ferramentas Utilizadas

| Sub-agent | Ferramenta | Imagem Docker | Versao | Findings |
|-----------|-----------|---------------|--------|----------|
| sast-agent | Semgrep | returntocorp/semgrep:latest | 1.45.0 | 12 |
| sca-agent | Trivy | aquasec/trivy:latest | 0.49.0 | 9 |
| sca-agent | OWASP DC | owasp/dependency-check:latest | 9.0.7 | 9 (merged) |
| secrets-agent | Gitleaks | zricethezav/gitleaks:latest | 8.18.0 | 0 |
| container-agent | Hadolint | hadolint/hadolint:latest | 2.12.0 | 3 |
| container-agent | Trivy image | aquasec/trivy:latest | 0.49.0 | 5 |
| auth-agent | Semgrep + review | returntocorp/semgrep:latest | 1.45.0 | 4 |
| crypto-agent | Semgrep | returntocorp/semgrep:latest | 1.45.0 | 0 |
| iac-agent | Checkov | bridgecrew/checkov:latest | 3.1.0 | 7 |

---

## Avisos e Limitacoes

{{ WARNINGS_LIST }}

Exemplos:
- Auditoria executada sem PRD/TechSpec — escopo full pode ter ruido
- Trivy image precisa do socket Docker — risco local documentado
- Primeira execucao de OWASP DC baixou NVD database (300MB)

---

## Proximos Passos Sugeridos

1. **Imediato (bloqueante)**:
   - Corrigir CONS-0001 (JWT alg=none)
   - Corrigir CONS-0002 (SQL Injection)
2. **Sprint atual**:
   - Triagem dos 5 HIGH — atribuir owners
   - Re-executar auditoria apos correcoes
3. **Curto prazo**:
   - Atualizar PRD com novos ativos identificados
   - Adicionar regras Semgrep customizadas para padroes do projeto
   - Configurar `gitleaks-precommit` no repo
4. **Longo prazo**:
   - Integrar `security-audit` ao pipeline CI (modo `--auto-approve`)
   - Setar criterio de bloqueio: `--block-on=CRITICAL`

---

## Reproducibilidade

Para re-executar esta auditoria com os mesmos parametros:

```bash
security-audit \
  --scope-from-docs=docs/prd.md,docs/techspec.md \
  --openapi=api-contract.yaml \
  --tools-pinned=tools/tools.json \
  --plan=.security/test_plan.md \
  --auto-approve
```

Hash do plano executado: `{{ PLAN_HASH }}`
Hash do scope: `{{ SCOPE_HASH }}`

---

## Anexos

- SARIF consolidado: `.security/findings/consolidated.sarif`
- Findings individuais: `.security/findings/SEC-*.sarif`
- Logs de execucao: `.security/logs/`
- test_plan.md original: `.security/test_plan.md`
- security_profile.json: `.security/security_profile.json`
- scope.json: `.security/scope.json`
