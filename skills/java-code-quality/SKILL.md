---
name: java-code-quality
description: "Use ao revisar ou refatorar um diff Java/Spring para naming, métodos, classes, DI, null safety, exceções, collections, records, MapStruct, Bean Validation, logging e limites arquiteturais. Não acione apenas porque uma tarefa gera código; aplique ao diff quando qualidade for parte do objetivo ou do gate."
metadata:
  group: java
---

# Qualidade de Código Java

Use esta skill sobre o diff relevante, não como auditoria global automática. As regras detalhadas
e exemplos permanecem em `references/full-guide.md` e devem ser consultados apenas para o tópico
que o diff toca.

## Hard rules

- Use Java 17+ e recursos modernos quando melhorarem clareza: records, sealed classes e switch
  expressions.
- Código fica em inglês, exceto termos da linguagem ubíqua do domínio documentados no glossário.
- Use `PascalCase` para tipos, `camelCase` para métodos/variáveis e `UPPER_SNAKE_CASE` para
  constantes; não use prefixo `I` em interfaces.
- Métodos têm uma responsabilidade, começam com verbo, evitam flag parameters, no máximo três
  parâmetros e dois níveis de aninhamento.
- Use constructor injection; field injection e `@Autowired` em campo/setter são proibidos.
- Não retorne `null` em APIs; use `Optional` em retornos possivelmente ausentes, não em campos ou
  parâmetros.
- Use exceções específicas e `DomainException` quando aplicável; não lance `Exception` ou
  `RuntimeException` genérica diretamente.
- Use SLF4J com placeholders; não concatene strings nem registre secrets ou dados sensíveis.
- Use records para DTOs imutáveis, MapStruct para mapeamento e Bean Validation nos requests.
- Controllers não contêm regra de negócio; o domínio não depende de framework.

## Referência sob demanda

Leia [o guia completo de qualidade](references/full-guide.md) somente quando precisar de regras
detalhadas de collections/streams, null handling, records, sealed classes, logging ou checklist.

## Checklist do diff

- [ ] Naming e idioma seguem as convenções.
- [ ] Não há field injection, null return, flag parameter ou exceção genérica.
- [ ] Métodos e classes têm responsabilidade e tamanho controlados.
- [ ] DTOs, mapeamento e validação usam as ferramentas do baseline.
- [ ] Logs usam placeholders e não vazam dados sensíveis.
- [ ] Limites Domain/Application/API/Infra continuam respeitados.
