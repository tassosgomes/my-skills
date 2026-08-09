---
name: java-testing
description: "Use quando a tarefa cria, revisa, diagnostica ou configura testes Java/Spring: unitários com JUnit 5/AssertJ/Mockito, integração com Spring Boot Test/Testcontainers, E2E com Playwright ou Dev Containers. Não use apenas porque uma alteração de código precisa de validação manual."
metadata:
  group: java
---

# Estratégia de Testes Java

Esta skill é acionada pelo trabalho de teste, não automaticamente por toda implementação. O gate
deve ser proporcional ao risco e à camada alterada.

## Padrões obrigatórios

- Unitários: JUnit 5 + AssertJ + Mockito, padrão AAA e naming
  `methodName_Condition_ExpectedBehavior`.
- Use testes parametrizados e fixtures reutilizáveis; teste cancelamento/assíncrono quando a API
  oferecer esse comportamento.
- Integração: Spring Boot Test + Testcontainers, PostgreSQL para persistência crítica e dados
  isolados entre testes; H2 só quando a diferença de dialeto for aceitável.
- E2E: Playwright para fluxos críticos, preferencialmente headless no CI.
- Dev Containers: ambiente reprodutível, healthcheck, dados determinísticos e cleanup garantido.
- Cobertura de lógica de negócio acima de 70% quando o projeto não definir limite diferente;
  cenários relevantes importam mais que cobertura artificial.

## Escolha da camada

| Mudança | Teste mínimo |
|---|---|
| regra de domínio, use case ou validator | unitário |
| repository, JPA, endpoint ou configuração Spring | integração |
| fluxo crítico completo do usuário | E2E, além dos testes inferiores |
| banco/ambiente local necessário | fixture ou Dev Container |

Não use E2E para cobrir cada regra interna e não altere testes para forçar aprovação.

## Referência sob demanda

Leia [o guia completo de testes](references/full-guide.md) somente quando precisar de receitas
unitárias, integração, E2E, Testcontainers ou Dev Containers.

## Checklist do diff

- [ ] Existe teste regressivo para o comportamento novo ou corrigido.
- [ ] A camada de teste corresponde ao risco.
- [ ] AAA, naming e asserts descrevem comportamento observável.
- [ ] Persistência crítica usa PostgreSQL/Testcontainers.
- [ ] Fixtures isolam dados e fazem cleanup.
- [ ] Testes assíncronos aguardam operações corretamente.
- [ ] O comando focado e o gate relevante foram executados.
