# State

**Categoria:** Comportamental

**Intenção:** Permitir que um objeto altere seu comportamento quando seu estado
interno muda, delegando a lógica para classes de estado discretas. Elimina cadeias
de if/else baseadas em strings de status.

## Quando usar

- O objeto tem um ciclo de vida com estados bem definidos e transições restritas,
  como pedido, pagamento ou ticket de suporte.
- Comportamentos diferentes dependem do estado atual.
- Regras de negócio proíbem certas transições, como não permitir ir de Criado
  diretamente para Concluído.

## Quando não usar

- O objeto tem apenas dois estados simples, como ativo/inativo; um boolean pode bastar.
- As transições não têm regras e qualquer estado pode ir para qualquer outro.

## Trade-offs

| Benefício | Custo |
|---|---|
| Transições controladas e explícitas | Uma classe por estado |
| Elimina primitive obsession | Mais complexo que um enum simples |
| Cada estado encapsula seu comportamento | Pode ser over-engineering para fluxos triviais |

## Esqueleto de implementação

~~~
interface OrderState:
    method next(order: Order)
    method cancel(order: Order)
    method getStatus(): string

class CreatedState implements OrderState:
    method next(order):
        order.setState(new PreparingState())

    method cancel(order):
        order.setState(new CancelledState())

    method getStatus(): return "Criado"

class PreparingState implements OrderState:
    method next(order):
        order.setState(new DeliveringState())

    method cancel(order):
        throw InvalidTransitionError("Não pode cancelar em preparação")

    method getStatus(): return "Preparando"

class DeliveringState implements OrderState:
    method next(order):
        order.setState(new DeliveredState())

    method cancel(order):
        throw InvalidTransitionError("Não pode cancelar em entrega")

    method getStatus(): return "Em entrega"

class DeliveredState implements OrderState:
    method next(order):
        throw InvalidTransitionError("Pedido já finalizado")

    method cancel(order):
        throw InvalidTransitionError("Pedido já finalizado")

    method getStatus(): return "Entregue"

class Order:
    private state: OrderState = new CreatedState()

    method setState(newState: OrderState):
        this.state = newState

    method next():
        this.state.next(this)

    method cancel():
        this.state.cancel(this)

    method getStatus(): string
        return this.state.getStatus()
~~~
