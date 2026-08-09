---
name: dotnet-testing
description: "Use quando a tarefa cria, revisa, diagnostica ou configura testes .NET: unitários com xUnit/Moq/AwesomeAssertions, integração com WebApplicationFactory/Testcontainers, E2E com Playwright ou Dev Containers. Não use apenas porque uma alteração de código precisa de validação manual."
metadata:
  group: dotnet
---

# Estratégia de Testes .NET

Esta skill é acionada pelo trabalho de teste, não automaticamente por toda implementação. Pode
bloquear uma entrega sem cobertura para comportamento relevante, mas o gate deve ser proporcional
ao risco.

## Padrões obrigatórios

- Testes unitários: xUnit + Moq + AwesomeAssertions, padrão AAA e naming
  `MethodName_Condition_ExpectedBehavior`.
- Teste o comportamento observável, não detalhes de implementação; use `[Theory]` para cenários
  parametrizados e exercite cancelamento quando a operação aceitar `CancellationToken`.
- Testes de integração: `WebApplicationFactory` + Testcontainers com PostgreSQL como padrão;
  use banco real para persistência crítica, não SQLite/InMemory como substituto.
- Testes E2E: Playwright para fluxos críticos e Page Object Model para manter seletores isolados.
- Dev Containers: ambiente reprodutível, fixture com ciclo de vida explícito, dados determinísticos
  e cleanup garantido.
- Cubra regras de negócio acima de 80% quando a métrica do projeto não definir um limite diferente;
  qualidade do cenário prevalece sobre cobertura artificial.

## Escolha da camada

| Mudança | Teste mínimo |
|---|---|
| regra pura, handler ou validator | unitário |
| endpoint, serialização, DI ou persistência | integração |
| fluxo crítico completo do usuário | E2E, além dos testes inferiores |
| dependência de banco/ambiente local | fixture/Dev Container |

Não crie E2E para cobrir cada regra interna. Não substitua teste regressivo por snapshot visual
quando a falha é de contrato ou comportamento.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| unitários, AAA, Moq e parâmetros | `examples/unit-tests.md` |
| API, banco e Testcontainers | `examples/integration-tests.md` |
| Playwright e Page Object Model | `examples/e2e-tests.md` |
| Docker Compose, fixture e cleanup | `examples/dev-containers.md` |

Leia somente o exemplo da camada que a tarefa altera.

## Checklist do diff

- [ ] Existe teste regressivo para o comportamento novo ou corrigido.
- [ ] O teste usa a camada adequada ao risco.
- [ ] Arrange/Act/Assert e naming são claros.
- [ ] Dependências externas são isoladas com o recurso correto.
- [ ] PostgreSQL/Testcontainers é usado para persistência crítica.
- [ ] Testes assíncronos aguardam tarefas e respeitam cancelamento.
- [ ] Fixtures limpam estado e não vazam dados entre testes.
- [ ] O comando focado e o gate relevante foram executados.
