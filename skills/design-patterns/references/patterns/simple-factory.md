# Simple Factory

**Categoria:** Criacional. Não é um padrão GoF oficial, mas é precursor de Factory
Method e Abstract Factory.

**Intenção:** Centralizar a lógica de instanciação de objetos, removendo blocos de
if/else espalhados que apenas decidem qual classe criar.

## Quando usar

- Múltiplos pontos do sistema criam objetos com a mesma lógica condicional.
- Você quer um único lugar para adicionar novos tipos sem varrer o codebase.
- Os objetos criados compartilham uma interface comum.

## Quando não usar

- Só existe um tipo concreto; a factory será overhead.
- A criação envolve lógicas complexas e hierárquicas; considere Factory Method ou
  Abstract Factory.

## Trade-offs

| Benefício | Custo |
|---|---|
| Lógica de criação centralizada | Pode virar um god method |
| Código cliente mais limpo | Adicionar tipo exige alterar a factory |
| Um ponto único para validar o tipo | Não resolve sozinho o Open/Closed |

## Esqueleto de implementação

~~~
interface Notification:
    method send(message: string)

class EmailNotification implements Notification:
    method send(message): // envia por e-mail

class SmsNotification implements Notification:
    method send(message): // envia por SMS

class SlackNotification implements Notification:
    method send(message): // envia por Slack

class NotificationFactory:
    static method create(channel: string): Notification
        switch channel:
            case "email":  return new EmailNotification()
            case "sms":    return new SmsNotification()
            case "slack":  return new SlackNotification()
            default:       throw UnknownChannelError(channel)
~~~
