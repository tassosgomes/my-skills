# Índice do Catálogo de Design Patterns

O catálogo detalhado foi dividido em um arquivo por padrão para permitir leitura
progressiva. Leia primeiro este índice para localizar candidatos e, depois, somente
as referências necessárias para o caso analisado.

## Padrões disponíveis

| Padrão | Categoria | Pressão de design | Referência |
|---|---|---|---|
| Adapter | Estrutural | Integrar uma interface externa sem acoplá-la ao cliente | [Ler referência](patterns/adapter.md) |
| Decorator | Estrutural | Empilhar responsabilidades opcionalmente em runtime | [Ler referência](patterns/decorator.md) |
| Observer | Comportamental | Notificar vários dependentes sobre uma mudança | [Ler referência](patterns/observer.md) |
| Proxy | Estrutural | Controlar ou interceptar o acesso a um objeto | [Ler referência](patterns/proxy.md) |
| Simple Factory | Criacional | Centralizar decisões simples de criação | [Ler referência](patterns/simple-factory.md) |
| Singleton | Criacional | Garantir uma única instância em ambientes sem DI | [Ler referência](patterns/singleton.md) |
| State | Comportamental | Encapsular comportamento e transições por estado | [Ler referência](patterns/state.md) |
| Strategy | Comportamental | Tornar algoritmos intercambiáveis | [Ler referência](patterns/strategy.md) |
| Template Method | Comportamental | Compartilhar um fluxo com etapas variáveis | [Ler referência](patterns/template-method.md) |

## Como consultar

1. Identifique a pressão de design no código, sem começar pelo nome do padrão.
2. Leia a referência de cada candidato plausível.
3. Compare o padrão com manter o código atual e com uma refatoração mais simples.
4. Só recomende a aplicação quando o benefício compensar a indireção adicionada.

Este índice não substitui a análise do código. Os padrões são referências de decisão,
não uma lista de abstrações que deve ser aplicada automaticamente.
