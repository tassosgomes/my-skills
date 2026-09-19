# Formatos de solution — Monolito Modular e Microsserviços

A API simples é o padrão e está descrita no `SKILL.md`. Estes dois formatos mudam a **fronteira**,
não a Clean Architecture interna, que continua a mesma.

Comece pela API simples e evolua quando a dor de acoplamento ou de deploy for real.

---

## Monolito Modular

Um host único compõe módulos. Cada módulo é uma Clean Architecture completa em miniatura e só expõe
`Contracts` para os demais.

```text
src/
├── Modules/
│   ├── Orders/
│   │   ├── ProjectName.Orders.Domain/
│   │   ├── ProjectName.Orders.Application/
│   │   ├── ProjectName.Orders.Infra.Data/   # DbContext, schema e outbox próprios
│   │   ├── ProjectName.Orders.Contracts/    # ÚNICO ponto visível a outros módulos
│   │   └── ProjectName.Orders.Api/          # endpoints + Add{Modulo}Module / Map{Modulo}Module
│   └── Billing/                             # mesma estrutura
├── ProjectName.SharedKernel/                # SeedWork e Result<T>; nenhuma regra de negócio
└── ProjectName.Host/                        # único processo; referencia só *.Api
```

### Regras de fronteira

1. Um módulo nunca referencia `Domain`, `Application`, `Infra.Data` ou `Api` de outro módulo — só
   `Contracts`.
2. `Contracts` não contém entidade, `DbContext` nem regra de negócio: interfaces de leitura, DTOs e
   eventos de integração.
3. `SharedKernel` não depende de nenhum módulo.
4. `Host` referencia apenas os `*.Api`; cada `*.Api` referencia o próprio `Contracts` e o próprio
   `Infra.*` para compor a DI.
5. **Síncrono entre módulos:** interface em `Contracts` resolvida pela DI, **nunca HTTP interno**.
6. **Assíncrono:** evento de integração no outbox do módulo de origem; o worker entrega aos handlers
   dos outros módulos (ou publica no RabbitMQ quando o módulo se prepara para virar serviço).
   **Nunca chame handler de outro módulo dentro da transação do caso de uso.**
7. Banco único com **schema por módulo** (`orders`, `billing`): cada `DbContext` usa
   `HasDefaultSchema` e sua própria migrations history table no schema do módulo.

Todas são verificadas no `ArchitectureTests` — ver [`testing.md`](testing.md).

### Registro

Cada módulo expõe `Add{Modulo}Module(IServiceCollection, IConfiguration)` e
`Map{Modulo}Module(IEndpointRouteBuilder)`; o `Program.cs` do Host só os encadeia, mantendo a mesma
regra de "só encadeia extensões".

### Quando não usar

Módulo que já precisa de deploy ou escala independentes vai para microsserviços. Domínio sem
fronteiras claras fica na API simples.

---

## Microsserviços

Cada serviço é uma solution independente, com deploy, banco e ciclo de vida próprios. O contrato
compartilhado vive fora das solutions:

```text
orders-service/   ProjectName.Orders.slnx + src/ + tests/   (mesma Clean Architecture)
contracts/        ProjectName.Contracts/                    # pacote NuGet interno
```

### Regras entre serviços

1. **Banco por serviço.** Nenhum serviço lê schema, view ou tabela de outro.
2. **Contrato é pacote NuGet versionado**, não projeto referenciado. Só DTOs e eventos de
   integração; nunca entidade ou `DbContext`.
3. **O `Domain` não referencia `Contracts`.** A conversão de evento de domínio para evento de
   integração acontece na Application, antes de gravar no outbox; o consumo acontece em
   `Api/MessageHandlers`, que chama um caso de uso.
4. **Síncrono:** cliente tipado atrás de porta em `Application/Interfaces`, com `IHttpClientFactory`
   e `AddStandardResilienceHandler`.
5. **Assíncrono:** RabbitMQ com outbox no produtor e consumidor idempotente ou com inbox — ver
   [`messaging.md`](messaging.md).
6. **Evolução aditiva do contrato:** campo novo opcional, ou nova versão do pacote e da routing key
   (`.v2`). **Nunca mude o significado de um campo existente.**
7. **Correlação:** `traceparent` propagado via OpenTelemetry; todo log e span tem `service.name`.

Cada serviço tem seu `ArchitectureTests` com as regras da API simples mais a regra 3 (`Domain` não
depende de `ProjectName.Contracts`).

### Quando não usar

Sem esteira de deploy independente por serviço, o resultado é um monolito distribuído — banco
compartilhado ou cadeia de chamadas síncronas. Nesse caso, monolito modular.
