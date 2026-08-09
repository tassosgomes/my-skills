# Strategy

**Categoria:** Comportamental

**Intenção:** Encapsular famílias de algoritmos em classes separadas e torná-los
intercambiáveis. O cliente delega o cálculo ou processamento à estratégia recebida,
eliminando cadeias de if/else.

## Quando usar

- Existem múltiplas variações de uma regra de negócio, como cálculo de imposto,
  desconto, frete ou scoring, e elas mudam com frequência.
- Novas variações são adicionadas regularmente.
- Você quer testar cada algoritmo isoladamente.

## Quando não usar

- Há apenas um algoritmo que nunca muda; a abstração não se paga.
- A variação é tão simples que uma função ou lambda resolve.

## Trade-offs

| Benefício | Custo |
|---|---|
| Cada algoritmo é testável isoladamente | Uma classe por estratégia |
| Facilita adicionar variações | Cliente precisa saber qual estratégia selecionar |
| Responsabilidade única por classe | Pode precisar de Factory para selecionar |

## Esqueleto de implementação

~~~
interface TaxStrategy:
    method calculate(amount: decimal): decimal

class IcmsStrategy implements TaxStrategy:
    method calculate(amount):
        return amount * 0.18

class IssStrategy implements TaxStrategy:
    method calculate(amount):
        return amount * 0.05

class IpiStrategy implements TaxStrategy:
    method calculate(amount):
        return amount * 0.12

class TaxCalculator:
    method calculate(amount: decimal, strategy: TaxStrategy): decimal
        return strategy.calculate(amount)

// Uso:
// calculator = new TaxCalculator()
// tax = calculator.calculate(1000, new IcmsStrategy())  // 180
~~~
