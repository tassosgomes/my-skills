---
name: design-patterns
description: >
  Skill de review e aplicação de Design Patterns (GoF e auxiliares), com catálogo e guia
  de decisão. Use esta skill sempre que o usuário pedir uma revisão para descobrir se um
  padrão melhoraria o design, perguntar qual padrão usar, mencionar explicitamente um
  padrão, pedir para refatorar usando padrões, ou implementar uma funcionalidade que
  envolva variações de algoritmos, estados, criação de objetos, integrações externas,
  notificações, responsabilidades empilháveis, controle de acesso, cache ou fluxos
  duplicados. Também use quando houver sinais como cadeias condicionais que crescem,
  classes com muitas variações, acoplamento a bibliotecas externas ou comportamentos
  que mudam por estado. Não a use para revisão genérica de estilo, bugs isolados ou
  otimização de performance sem uma questão real de design. Os princípios são
  agnósticos de stack, mas a recomendação deve respeitar os recursos nativos da
  linguagem e do framework.
---

# Design Patterns — Review e Aplicação

## Propósito

Avalie primeiro o problema de design e só depois o padrão. Um padrão é uma solução
nomeada para uma pressão recorrente de design; ele não é uma meta, um selo de qualidade
nem uma substituição para código simples.

O resultado válido de um review pode ser não aplicar padrão algum. Nesse caso, explique
qual solução simples é suficiente e em que sinal futuro valeria reavaliar a decisão.

## Quando e como usar

Use esta skill principalmente em quatro momentos:

1. **Review de código existente** — antes de uma refatoração, durante um code review ou
   quando uma classe começou a acumular condicionais e responsabilidades.
2. **Check de design antes de implementar** — quando a funcionalidade já apresenta duas
   ou mais variações reais, integrações substituíveis, estados com transições ou um
   fluxo comum com etapas variáveis.
3. **Reavaliação após a primeira implementação** — quando surge uma segunda implementação
   semelhante ou a primeira alteração começa a exigir condicionais espalhadas.
4. **Aplicação orientada** — quando o usuário escolhe um padrão ou aprova a recomendação.

Não trate toda implementação nova como candidata a uma hierarquia de classes. Se existe
apenas uma implementação, uma única regra e nenhuma pressão concreta de mudança, prefira
o design mais simples e registre apenas o ponto de reavaliação, se isso for útil.

## Modos de operação

### 1. Modo Review — padrão

Este é o modo padrão quando o usuário pede para analisar código ou pergunta se um padrão
seria adequado. Não altere arquivos.

1. Delimite o escopo: arquivos, fluxo, dependências e objetivo da mudança.
2. Leia o código relacionado e registre evidências concretas, preferencialmente com
   arquivo e linha.
3. Identifique a pressão de design: variação, acoplamento, ciclo de vida, criação,
   duplicação, cross-cutting concern ou dificuldade de teste.
4. Compare pelo menos estas alternativas quando forem plausíveis:
   - manter o código atual;
   - uma refatoração simples, sem padrão nomeado;
   - um ou mais padrões do catálogo.
5. Recomende uma decisão: aplicar agora, adiar, ou não aplicar.
6. Explique benefício, custo, risco, impacto nos testes e o gatilho para reavaliar.

Use este formato de saída:

~~~markdown
# Review de Design

## Diagnóstico
## Evidências
## Alternativas consideradas
## Recomendação
## Trade-offs e riscos
## Próximo passo
~~~

O review deve separar fatos observados de inferências e indicar quando a evidência é
insuficiente para recomendar uma abstração.

### 2. Modo Check de implementação

Quando o usuário pede uma implementação sem mencionar um padrão, faça uma verificação
curta antes de escrever o código:

- há mais de uma variação existente ou exigida pelo requisito?
- a seleção entre variações tende a se espalhar?
- uma integração externa está vazando para o domínio?
- existe um ciclo de vida com transições e regras diferentes?
- há um fluxo comum com etapas variáveis?

Se a resposta for não, implemente a solução simples. Se for sim, faça uma recomendação
breve e aguarde aprovação quando a escolha introduzir uma mudança estrutural relevante.

### 3. Modo Executivo

Quando o usuário pedir diretamente a aplicação de um padrão, ou aprovar a recomendação:

1. Leia somente o arquivo de referência do padrão relevante.
2. Mapeie os papéis do padrão para os conceitos reais do domínio.
3. Implemente a menor estrutura que resolva a pressão identificada.
4. Preserve as convenções da linguagem, do framework e do projeto.
5. Atualize ou crie testes que demonstrem a variação e as regras importantes.
6. Explique a intenção do padrão, as mudanças e os trade-offs.

Se durante a implementação ficar claro que o padrão não se justifica, pare a abstração,
comunique a evidência e proponha a alternativa mais simples.

## Tabela de Decisão Rápida

Use esta tabela para identificar qual padrão se aplica ao cenário:

| Sintoma / Necessidade | Padrão | Categoria |
|---|---|---|
| Integrar lib externa sem acoplar | [Adapter](references/patterns/adapter.md) | Estrutural |
| Empilhar comportamentos em runtime | [Decorator](references/patterns/decorator.md) | Estrutural |
| Reagir a mudanças de estado de outro objeto | [Observer](references/patterns/observer.md) | Comportamental |
| Interceptar acesso (cache, log, auth) | [Proxy](references/patterns/proxy.md) | Estrutural |
| Centralizar criação de objetos por parâmetro | [Simple Factory](references/patterns/simple-factory.md) | Criacional |
| Garantir instância única global | [Singleton](references/patterns/singleton.md) | Criacional |
| Comportamento muda conforme estado interno | [State](references/patterns/state.md) | Comportamental |
| Algoritmos intercambiáveis sem if/else | [Strategy](references/patterns/strategy.md) | Comportamental |
| Fluxo comum com etapas variáveis | [Template Method](references/patterns/template-method.md) | Comportamental |

## Navegação do catálogo

O arquivo 'references/patterns-catalog.md' é apenas um índice. Depois de identificar
um candidato, leia somente o arquivo do padrão correspondente em 'references/patterns/'.
Quando houver dúvida entre dois padrões, leia apenas os dois arquivos candidatos e
compare-os explicitamente.

## Princípios Transversais

- **Não force padrões** — Um padrão só se justifica se resolve um problema real.
  Código simples que funciona é melhor que código "padrão" desnecessariamente complexo.
- **Prefira composição a herança** — Exceto onde herança é a essência do padrão
  (Template Method).
- **Nomeie com intenção** — Classes e interfaces devem refletir o papel no padrão
  (ex.: ImageProcessor → WatermarkDecorator, não Decorator1).
- **Um padrão de cada vez** — Ao refatorar, aplique um padrão, estabilize, depois avalie
  se outro é necessário. Não empilhe três padrões numa única refatoração.
- **Considere o Singleton com cautela** — Hoje é amplamente considerado um anti-padrão.
  Prefira injeção de dependência. Só use se o framework não oferecer container de DI.
- **Use recursos nativos primeiro** — Middleware, interceptors, decorators da linguagem,
  funções, pattern matching e containers de DI podem ser mais claros que uma implementação
  manual do padrão.
- **Documente a decisão, não o rótulo** — Explique a pressão resolvida e o trade-off.
  Nomear o padrão é útil quando cria vocabulário comum, mas não substitui a intenção.
