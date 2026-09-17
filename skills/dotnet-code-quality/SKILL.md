---
name: dotnet-code-quality
description: "Use ao revisar ou refatorar um diff C#/.NET contra as convenções do time: idioma, pastas e namespaces, sufixo Async, limites de tamanho, construtores, cancelamento e exceções. Não acione apenas porque uma tarefa gera código; aplique ao diff quando a qualidade for parte do objetivo ou do gate."
metadata:
  group: dotnet
---

# Qualidade de Código .NET — Convenções do Time

Só as convenções próprias deste time. Boas práticas universais de C# (naming padrão da Microsoft,
async sem bloqueio, SOLID, constructor injection) são pressupostas e não repetidas aqui.

## Idioma

- Código, nomes, comentários, mensagens de log e de exceção em inglês.
- Exceção: termos da linguagem ubíqua do domínio registrados no glossário do projeto.

## Pastas, namespaces e arquivos

- Pastas em PascalCase; cada pasta é um segmento do namespace (`IDE0130` como erro via
  `EnforceCodeStyleInBuild`). Nunca kebab-case em projeto .NET.
- Pastas que agrupam tipos no plural (`Entities`, `UseCases/Categories`) para o namespace não
  colidir com a classe.
- Um tipo por arquivo, com o nome do tipo.
- Namespace file-scoped.

## Tipos e membros

- Classes concretas são `sealed` por padrão; abra só quando houver herança real.
- Classe com um único construtor que só recebe dependências da DI (casos de uso, repositórios,
  handlers, workers) usa primary constructor.
- Construtor clássico com campos `readonly` quando: há mais de um construtor, o construtor tem
  comportamento (validação, transformação, inicialização) ou a dependência não pode ser reatribuída.
- Entidades e agregados mantêm construtor privado sem parâmetros e fábrica estática (`Create`).
- Em `record` (Inputs, Outputs, eventos), o primary constructor define as propriedades do contrato.
- Métodos assíncronos terminam em `Async`, inclusive handlers de Minimal API. Exceção: métodos de
  teste.
- `CancellationToken` é o último parâmetro, obrigatório (sem `= default`) em código interno; opcional
  só na API pública de biblioteca.
- Limites: até 3 parâmetros (acima disso, record de input), método até ~50 linhas, classe até ~300
  linhas, no máximo 2 níveis de aninhamento.
- Sem flag parameter que alterna comportamento: separe métodos ou use objeto de filtro.
- Constantes nomeadas no lugar de números mágicos (`NameMaxLength`).
- Datas sempre UTC; `DateTime.Now` e `Guid.NewGuid()` estão banidos (`BannedSymbols.txt`).

## Cancelamento e exceções

- Depois do `CommitAsync`, efeitos de limpeza (invalidar cache, marcar outbox) usam
  `CancellationToken.None`: o request abortado não pode deixar estado pela metade.
- Exceção de negócio usa os tipos do projeto (`EntityValidationException`, `NotFoundException`,
  `RelatedAggregateException`); não lance `Exception`, `ArgumentException` ou
  `InvalidOperationException` para regra de negócio.
- Endpoints, casos de uso e repositórios não fazem `try/catch` para traduzir erro; o
  `GlobalExceptionHandler` faz.
- `catch` só com tipo específico e ação concreta (retry, contexto, conversão para exceção do
  projeto com a original como inner).

## Comentários

- Comente o porquê não óbvio (restrição de framework, decisão de consistência); nunca o que o código
  já diz.

## Checklist do diff

- [ ] Inglês em código, logs e exceções (fora do glossário).
- [ ] Pasta = namespace, pastas de agrupamento no plural, um tipo por arquivo.
- [ ] Classes `sealed`; primary constructor só para construtor único de DI; sufixo `Async`; `CancellationToken` por último.
- [ ] Limites de parâmetros, tamanho e aninhamento respeitados; sem flag parameter.
- [ ] Sem `try/catch` de tradução fora do exception handler.
- [ ] Limpeza pós-commit com `CancellationToken.None`.
