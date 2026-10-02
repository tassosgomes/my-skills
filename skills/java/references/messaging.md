# Mensageria — RabbitMQ com Spring AMQP, outbox e inbox

Spring AMQP (`spring-boot-starter-amqp`) é o cliente: ele já é a camada fina sobre o
`amqp-client` — cache de canais, recuperação de conexão, declaração de topologia, containers de
listener. Não escreva sobre o `amqp-client` cru, e não adicione outra abstração por cima (Spring
Cloud Stream, wrappers próprios). Garantia **at-least-once**: todo consumidor é idempotente por
natureza ou usa inbox.

O consumo entra por `api.messaging.{Evento}Listener`, que só chama um caso de uso. A infraestrutura
(`infra-messaging`) separa `config`, `topology`, `publishing` e `consuming`.

## Decisões

| Tema | Decisão |
|---|---|
| Conexão | `CachingConnectionFactory` do Boot; `ConnectionNameStrategy` com o nome do serviço |
| Canais | Do cache do Spring AMQP; nunca guarde um `Channel` em campo nem o use fora do callback |
| Exchange | `{servico}.events`, tipo `topic`, durável |
| Dead letter | Exchange `{servico}.events.dlx` (`direct`) e fila `{fila}.dlq` por fila |
| Filas | Quorum, duráveis, nome `{servico}.{evento-em-kebab}` (`catalog.video-encoded`) |
| Poison message | `x-delivery-limit` explícito = `messaging.delivery-limit` (padrão 5) |
| Routing key | `{servico}.{agregado}.{evento}.v{n}`, mapeada em `EventRoutes` — **nunca derivada do nome da classe** |
| Topologia | Beans `Declarables` em `infra.messaging.topology`; o `RabbitAdmin` declara na conexão e redeclara na reconexão |
| Publicação | Só pelo `OutboxRelay`; `publisher-confirm-type: correlated`, `publisher-returns: true`, `template.mandatory: true`; entrega persistente |
| Propriedades | `messageId` = Id do outbox (= `eventId`, UUIDv7), `type` = nome do evento, `contentType` `application/json`, header `traceparent` |
| Serialização | Jackson 3: o relay publica o `payload` já serializado do outbox; o listener usa `JacksonJsonMessageConverter` (não o `Jackson2...`) |
| Prefetch | `spring.rabbitmq.listener.simple.prefetch` = 10 |
| Consumo | Ack do container (`AUTO`): sucesso → ack, exceção → reject; `default-requeue-rejected: false` |
| Retry | Retry stateless do container: 3 tentativas, backoff exponencial com jitter a partir de 1 s |
| Erro permanente | Falha de conversão, `DomainValidationException` e violação de validação **não** entram no retry |
| Falha final | Log `ERROR` e reject sem requeue → DLQ; nunca requeue em laço |
| DLQ | Tem alerta; mensagem em DLQ é incidente |

- **Default do RabbitMQ 4 mudou:** fila quorum sem `x-delivery-limit` declarado tem limite 20 e,
  sem DLX, **descarta** a mensagem ao atingi-lo. Declare o limite e a DLX sempre.
- A fila e sua `.dlq` são declaradas juntas, a DLQ primeiro, ambas com `QueueBuilder.durable(...)
  .quorum()`; a principal com `deadLetterExchange`, `deadLetterRoutingKey` e `deliveryLimit`.
- O retry do container roda **na thread do consumidor**, segurando a mensagem e o prefetch durante o
  backoff. Mantenha-o curto; espera longa é DLQ + reprocessamento, não retry em memória.
- Classifique as exceções permanentes no customizer de retry do listener do Boot. Sem isso, um
  `DomainValidationException` é tentado 3 vezes antes de ir para a DLQ.
- Ligue a observação (`spring.rabbitmq.listener.simple.observation-enabled`) para o consumo virar
  span filho do `traceparent` recebido.

## Outbox

Evento gravado na **mesma transação** dos dados; um relay publica.

Tabela `outbox_messages`:

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | `DomainEvent.eventId()` (UUIDv7) = `messageId` publicado |
| `type` | `varchar(200)` | nome do evento |
| `routing_key` | `varchar(255)` | de `EventRoutes`, resolvido na gravação |
| `payload` | `jsonb` | evento serializado |
| `occurred_on` | `timestamptz` | `DomainEvent.occurredOn()` |
| `processed_on` | `timestamptz null` | preenchido após o confirm do broker |
| `attempts` | `int` | incrementado a cada falha |
| `last_error` | `varchar(2000)` | mensagem truncada |
| `trace_parent` | `varchar(55)` | contexto W3C do request que levantou o evento |

Índice parcial `ix_outbox_messages_pending` em `id` com filtro `processed_on IS NULL`: como o Id é
UUIDv7, ordenar por `id` é ordenar por criação.

O `add`/`update` de cada adapter de repositório chama `pullEvents()` e insere as linhas pelo `OutboxWriter`
(package-private em `infra.persistence.outbox`) na transação do caso de uso. Não existe um "commit
que coleta eventos" — se o adapter não gravar, o evento não existe.

`OutboxRelay` (`@Scheduled(fixedDelayString = "${outbox.polling-interval:2s}")`, `batch-size` 50,
`max-attempts` 10), uma transação por lote via `TransactionTemplate`:

```sql
SELECT * FROM outbox_messages
WHERE processed_on IS NULL AND attempts < :maxAttempts
ORDER BY id
LIMIT :batchSize
FOR UPDATE SKIP LOCKED
```

- `FOR UPDATE SKIP LOCKED` permite várias réplicas sem publicar a mesma linha em paralelo — sem
  ShedLock, sem eleição de líder.
- Para cada linha: `rabbitTemplate.send(..., correlationData)`, depois
  `correlationData.getFuture().get(timeout)`. Só é sucesso com `ack` **e** `getReturned() == null`;
  mensagem devolvida por falta de rota é falha, não sucesso.
- O span de publish é filho do `trace_parent` gravado, não do ciclo do scheduler; o header
  `traceparent` sai do valor da coluna.
- Falha de uma mensagem registra `attempts` e `last_error` e não derruba o lote; falha do ciclo é
  logada e o próximo ciclo segue.
- `channelTransacted` fica `false`: transação AMQP e publisher confirms são mutuamente exclusivos.
- **Desligamento não interrompe um lote no meio:** `spring.task.scheduling.shutdown.await-termination
  =true` com `await-termination-period` maior que um lote. Publicado e não marcado vira duplicata.
- Consumidores não dependem de ordem; usam versão ou data do evento para descartar atualização
  antiga.
- Contrato público diferente do evento de domínio: converta para evento de integração **antes de
  gravar no outbox**, nunca no relay.
- Linhas com `attempts >= maxAttempts` não mexem no readiness — o Actuator não tem estado
  "degradado", e readiness fora tira o pod do balanceamento sem resolver nada. Viram o gauge
  `outbox.messages.exhausted` (e `outbox.messages.oldest.age`), com alerta.
- Limpeza diária das processadas há mais de 7 dias.

## Inbox

Só quando o efeito do consumidor não é idempotente por natureza:

| Efeito | Inbox? |
|---|---|
| Upsert por Id, status para valor fixo, "já existe? ignore" | Não |
| Somar/subtrair, enviar e-mail ou notificação, criar registro sem chave natural | Sim |
| Chamar API externa sem chave de idempotência | Sim |

Tabela `processed_messages` com PK composta (`message_id`, `consumer`) e `processed_on` — o mesmo
`messageId` pode chegar a consumidores diferentes.

O caso de uso chamado pelo listener recebe o `messageId` e o `consumer`, e dentro da **mesma**
transação:

1. `consumer` é um nome **estável** em constante — nunca `getClass().getName()`: renomear a classe
   faz mensagens antigas parecerem novas.
2. **Insere primeiro** a linha de `processed_messages` (`INSERT ... ON CONFLICT DO NOTHING` via
   `JdbcClient`), antes do efeito.
3. Zero linhas afetadas: outra entrega já concluiu ou está em curso — loga `INFO` e retorna sem
   erro. Uma entrega concorrente fica bloqueada no lock da PK até a outra terminar, e então vê o
   conflito.
4. Uma linha afetada: executa o efeito; o commit grava efeito e marca juntos.

Inserir depois do efeito e tratar `DataIntegrityViolationException` não funciona com
`@Transactional`: a violação marca a transação como rollback-only, e o efeito já executado (e-mail
enviado) não volta.

Limpeza: registros mais antigos que a janela máxima de redelivery (30 dias).

## Checklist

- [ ] Nenhum caso de uso publica no broker.
- [ ] Todo `add`/`update` de adapter grava o outbox na mesma transação.
- [ ] `messageId` publicado = `eventId` (UUIDv7).
- [ ] Relay com `FOR UPDATE SKIP LOCKED`, confirm **e** return conferidos, shutdown aguardando o lote.
- [ ] Toda fila quorum com `x-delivery-limit` e DLX declarados.
- [ ] Todo consumidor é idempotente por natureza ou usa inbox insert-first.
- [ ] Outbox e inbox têm limpeza e alerta.
