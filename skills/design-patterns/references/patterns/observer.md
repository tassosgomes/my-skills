# Observer

**Categoria:** Comportamental

**Intenção:** Definir uma dependência um-para-muitos entre objetos. Quando o objeto
observado muda de estado, os dependentes são notificados automaticamente.

## Quando usar

- Múltiplos componentes precisam reagir a uma mudança de estado sem acoplamento direto.
- Você está substituindo polling por notificação push.
- A arquitetura usa eventos de domínio, mensageria ou hooks para reagir a mudanças.

## Quando não usar

- Há apenas um observador fixo; uma chamada direta é mais simples.
- A ordem de notificação importa de forma estrita e não será controlada explicitamente.

## Trade-offs

| Benefício | Custo |
|---|---|
| Desacopla publisher e subscribers | Fluxo de execução pode ser difícil de rastrear |
| Adiciona observadores sem alterar o subject | Memory leaks se não houver deregistro |
| Escala para vários observadores | Cascatas podem causar loops |

## Estrutura

~~~
«interface» Observer
  + update(data)

«interface» Subject
  + subscribe(observer)
  + unsubscribe(observer)
  + notify()

ConcreteSubject implements Subject
  - observers: List<Observer>
  - state
  + notify() → para cada observer: observer.update(state)

ConcreteObserverA implements Observer
  + update(data) → reage à mudança
~~~

## Esqueleto de implementação

~~~
interface PriceObserver:
    method onPriceChange(asset: string, newPrice: decimal)

class Bitcoin:
    private observers: List<PriceObserver> = []
    private price: decimal

    method subscribe(observer: PriceObserver):
        this.observers.add(observer)

    method setPrice(newPrice: decimal):
        this.price = newPrice
        this.notifyAll()

    private method notifyAll():
        for observer in this.observers:
            observer.onPriceChange("BTC", this.price)

class LogObserver implements PriceObserver:
    method onPriceChange(asset, newPrice):
        log("Price of {asset} changed to {newPrice}")

class NotificationObserver implements PriceObserver:
    method onPriceChange(asset, newPrice):
        pushNotification("New price for {asset}: {newPrice}")
~~~
