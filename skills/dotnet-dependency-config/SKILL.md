---
name: dotnet-dependency-config
description: "Use quando uma tarefa .NET adiciona ou altera pacotes, EF Core, banco, cache, mensageria, configuração, DI, migrations ou uma biblioteca NuGet. Não use para criar apenas um endpoint ou revisar estilo."
metadata:
  group: dotnet
---

# Dependências e Configuração .NET

Esta skill define o baseline de infraestrutura. Leia somente a referência correspondente ao
componente alterado; os exemplos completos estão em `examples/`.

## Baseline oficial

- **Banco:** PostgreSQL para novos serviços; Oracle somente para legado, integração existente ou
  aprovação explícita.
- **ORM:** Entity Framework Core; configure entidades com Fluent API e registre o contexto via DI.
- **Mapeamento:** Mapster ou mapeamento manual; AutoMapper não é o padrão deste catálogo.
- **Validação:** FluentValidation.
- **Resiliência HTTP:** `IHttpClientFactory` com Polly e timeouts explícitos.
- **Mensageria:** `Rmq.CloudEvents` quando RabbitMQ for adotado.
- **Observabilidade:** OpenTelemetry/OTLP quando a tarefa configurar telemetria.
- **Configuração:** opções tipadas (`IOptions<T>`), secrets por ambiente e nenhuma credencial
  hardcoded.

Use versões estáveis suportadas pelo projeto e confirme o baseline existente antes de atualizar
pacotes; não introduza upgrade amplo como efeito colateral de uma mudança localizada.

## Regras por componente

### Entity Framework Core

- Use `IEntityTypeConfiguration<T>` e `ApplyConfigurationsFromAssembly`.
- Registre `AddDbContext` ou `AddDbContextPool` com o provider correto.
- Mantenha migrations versionadas e executáveis pelo pipeline.
- Use Unit of Work explícito; queries de leitura devem considerar `AsNoTracking`.
- Use interceptors de auditoria apenas quando o requisito exigir rastreabilidade.

### DI e mapeamento

- Registre dependências por interface e mantenha composition root na API/Infrastructure.
- Centralize configurações Mapster e não exponha entidades de persistência nos contratos HTTP.

### RabbitMQ

- Use CloudEvents, ACK em sucesso e NACK sem requeue após falha final.
- Configure retry com backoff e DLQ; não esconda falhas de consumo em loops infinitos.

### Bibliotecas NuGet

- Prefira SDK-style, `Nullable` e `TreatWarningsAsErrors`.
- Defina metadata, SemVer, compatibilidade de API, SourceLink/símbolos e documentação.
- APIs públicas assíncronas devem aceitar `CancellationToken` quando aplicável.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| EF Core, providers, migrations e interceptors | `examples/entity-framework-core.md` |
| DI e Mapster | `examples/di-patterns.md` |
| RabbitMQ, retry e DLQ | `examples/messaging-rabbitmq.md` |
| empacotamento e publicação NuGet | `examples/nuget-library.md` |

## Checklist do diff

- [ ] Pacote e versão são necessários para o requisito.
- [ ] PostgreSQL/Oracle foi escolhido conforme a política.
- [ ] Connection strings e secrets não estão no código.
- [ ] Registro DI, options e migrations estão coerentes.
- [ ] Queries de leitura e Unit of Work respeitam o padrão.
- [ ] Retry, timeout, DLQ e idempotência foram considerados nas integrações.
- [ ] A alteração não atualiza dependências não relacionadas.
