# Mensageria — RabbitMQ, outbox e inbox

`RabbitMQ.Client` 7 direto, sem wrapper. Garantia **at-least-once**: todo consumidor é idempotente
por natureza ou usa inbox.

A regra de negócio do consumo fica em `Api/MessageHandlers/{Evento}MessageHandler.cs`, que só chama
um caso de uso. A infraestrutura (`Infra.Messaging/`) separa `Configuration/`, `Connection/`,
`Topology/`, `Publishing/` e `Consuming/`.

## Decisões

| Tema | Decisão |
|---|---|
| Conexão | Uma por processo, singleton; `AutomaticRecoveryEnabled` e `TopologyRecoveryEnabled`; `ClientProvidedName` = nome do serviço; **nunca** `.GetAwaiter().GetResult()` |
| Canais | Um por consumidor e um para o publisher; canal não é compartilhado entre threads |
| Exchange | `{servico}.events`, tipo `topic`, durável |
| Dead letter | Exchange `{servico}.events.dlx` (`direct`) e fila `{fila}.dlq` por fila |
| Filas | Quorum, duráveis, nome `{servico}.{evento-em-kebab}` (`catalog.video-encoded`) |
| Poison message | `x-delivery-limit` = `RabbitMqOptions.DeliveryLimit` (padrão 5) |
| Routing key | `{servico}.{agregado}.{evento}.v{n}`, mapeada em `EventRoutes` — **nunca derivada do nome da classe** |
| Ordem de start | `RabbitMqTopologyInitializer` (`IHostedService`) antes do worker de outbox e dos consumidores |
| Publicação | Só pelo `OutboxPublisherWorker`; publisher confirms ligados; `mandatory: true`; `DeliveryMode.Persistent` |
| Propriedades | `MessageId` = Id do outbox (= `EventId`, UUIDv7), `Type` = nome do evento, `ContentType` `application/json`, header `traceparent` |
| Serialização | `System.Text.Json` com `JsonSerializerDefaults.Web` |
| Prefetch | `RabbitMqOptions.PrefetchCount` (padrão 10) |
| Consumo | `autoAck: false`; um escopo de DI por mensagem |
| Retry | `ResiliencePipeline` no consumidor: 3 tentativas, backoff exponencial com jitter a partir de 1 s |
| Erro permanente | `JsonException`, `EntityValidationException` e `MessageId` inválido **não** entram no retry |
| Falha final | Log `Error` e `BasicNackAsync(requeue: false)` → DLQ; nunca `requeue: true` em loop |
| DLQ | Tem alerta; mensagem em DLQ é incidente |

A fila e sua `.dlq` são declaradas juntas, a DLQ primeiro, com `x-queue-type: quorum` nas duas e
`x-dead-letter-exchange` / `x-dead-letter-routing-key` / `x-delivery-limit` na principal.

## Outbox

Evento gravado na **mesma transação** dos dados; um worker publica.

Tabela `outbox_messages`:

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | `DomainEvent.EventId` (UUIDv7) = `MessageId` publicado |
| `type` | `varchar(200)` | nome do evento |
| `payload` | `jsonb` | evento serializado |
| `occurred_on` | `timestamp` | `DomainEvent.OccurredOn` |
| `processed_on` | `timestamp null` | preenchido após confirm do broker |
| `attempts` | `int` | incrementado a cada falha |
| `last_error` | `varchar(2000)` | mensagem truncada |
| `trace_parent` | `varchar(55)` | `Activity.Current?.Id` do request que levantou o evento |

Índice parcial `ix_outbox_messages_pending` em `id` com filtro `processed_on IS NULL`: como o Id é
UUIDv7, ordenar por `id` é ordenar por criação.

O `UnitOfWork` coleta os eventos dos agregados **rastreados** pelo `ChangeTracker`, grava as linhas
de outbox e faz um único `SaveChangesAsync`; só então limpa os eventos dos agregados.

Worker (`OutboxOptions`: `PollingInterval` 2 s, `BatchSize` 50, `MaxAttempts` 10):

```sql
SELECT * FROM outbox_messages
WHERE processed_on IS NULL AND attempts < @maxAttempts
ORDER BY id
LIMIT @batchSize
FOR UPDATE SKIP LOCKED
```

- `FOR UPDATE SKIP LOCKED` permite várias réplicas sem publicar a mesma linha em paralelo.
- `PeriodicTimer` no loop; falha de um ciclo é logada e o worker continua.
- **Nunca cancele depois de publicar:** o `SaveChangesAsync` e o commit que marcam como processado
  usam `CancellationToken.None`, senão a mensagem é republicada.
- Falha de uma mensagem registra `attempts` e `last_error` e não derruba o lote.
- Consumidores não dependem de ordem; usam versão ou data do evento para descartar atualização antiga.
- Contrato público diferente do evento de domínio: converta para evento de integração **antes de
  gravar no outbox**, nunca no worker.
- Linhas com `attempts >= MaxAttempts` degradam o `OutboxHealthCheck` e geram alerta.
- Limpeza diária das processadas há mais de 7 dias (`ExecuteDeleteAsync`).

## Inbox

Só quando o efeito do consumidor não é idempotente por natureza:

| Efeito | Inbox? |
|---|---|
| Upsert por Id, status para valor fixo, "já existe? ignore" | Não |
| Somar/subtrair, enviar e-mail ou notificação, criar registro sem chave natural | Sim |
| Chamar API externa sem chave de idempotência | Sim |

Tabela `processed_messages` com PK composta (`message_id`, `consumer`) e `processed_on` — o mesmo
`MessageId` pode chegar a consumidores diferentes.

`InboxMessageHandler<TMessage>` decora o handler:

1. `consumer` é um nome **estável** do handler interno — renomear a classe faz mensagens antigas
   parecerem novas.
2. Se `(MessageId, consumer)` já existe, loga `Information` e retorna.
3. Abre transação no `DbContext` do escopo, chama o handler (cujo caso de uso usa o **mesmo**
   `DbContext`), grava `ProcessedMessage`, `SaveChangesAsync` e commit com `CancellationToken.None`.
4. `DbUpdateException` com `PostgresErrorCodes.UniqueViolation` significa que outra entrega concluiu
   antes: rollback e retorna **sem erro**.
5. Com `EnableRetryOnFailure`, envolva em `Database.CreateExecutionStrategy().ExecuteAsync(...)`.

Limpeza: registros mais antigos que a janela máxima de redelivery (30 dias).

## Checklist

- [ ] Nenhum caso de uso publica no broker.
- [ ] `CommitAsync` grava dados e outbox no mesmo `SaveChangesAsync`.
- [ ] `MessageId` publicado = `EventId` (UUIDv7).
- [ ] Worker com `FOR UPDATE SKIP LOCKED`, sem cancelar depois de publicar.
- [ ] Todo consumidor é idempotente por natureza ou decorado com inbox.
- [ ] Outbox e inbox têm limpeza e alerta.
