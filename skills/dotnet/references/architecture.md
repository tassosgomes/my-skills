# Arquitetura — domínio, casos de uso, API

Formas esperadas de cada peça. O que é DDD de livro (`Entity`, `AggregateRoot`, `DomainEvent` com
lista de eventos) não está aqui: escreva do jeito padrão. O que está aqui é o que este time decidiu
diferente ou fixou.

## Identificadores — UUIDv7

- Todo Id de entidade, agregado e evento é `Guid.CreateVersion7()`. `Guid.NewGuid()` quebra o build.
- O Id nasce no domínio; no EF a coluna é `uuid` com `ValueGeneratedNever()`.
- O `EventId` é o Id da linha do outbox **e** o `MessageId` publicado; por ser v7, o outbox pode ser
  ordenado pelo próprio Id.
- O timestamp embutido no Id não é regra de negócio; para datas use `CreatedAt`/`OccurredOn`.
- Em teste que depende de ordem, gere com `Guid.CreateVersion7(DateTimeOffset)`.
- Oracle (`RAW(16)`): o Id continua v7, mas a ordem dos bytes do .NET não preserva o ganho de
  índice ordenado.

## Agregado

- `ValueObject` fica em `SeedWork/` com igualdade por componentes; prefira `record` quando não
  precisar de igualdade customizada.
- Construtor privado sem parâmetros, **usado só pelo EF ao materializar**: sem validação, sem evento.
- Fábrica estática `Create(...)` que monta, chama `Validate()` e levanta o evento — nessa ordem.
- Limites como constante nomeada (`NameMaxLength`), nunca número mágico.
- Método de carga sem validação nem evento (`LoadCategories(ids)`) existe só para o repositório
  reidratar relação; não é API de negócio.
- Agregado referencia outro agregado somente pelo Id.

## Caso de uso

`Application/UseCases/{Agregados}/{CasoDeUso}/` com um arquivo por tipo. O validator só existe
quando o input tem regra de formato que o domínio não cobre.

```csharp
public interface IUseCase<in TInput, TOutput>
{
    Task<TOutput> ExecuteAsync(TInput input, CancellationToken cancellationToken);
}
public interface IUseCase<in TInput> { Task ExecuteAsync(TInput input, CancellationToken cancellationToken); }
```

**Ordem fixa:** validar input → carregar → aplicar regra no agregado → persistir → `CommitAsync` →
montar Output.

```csharp
public sealed class UpdateCategory(
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork,
    IValidator<UpdateCategoryInput> validator) : IUpdateCategory
{
    public async Task<CategoryModelOutput> ExecuteAsync(UpdateCategoryInput input, CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(input, cancellationToken);   // 400 before any side effect
        var category = await categoryRepository.GetAsync(input.Id, cancellationToken);
        NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

        category!.Update(input.Name, input.Description);                   // invariants → 422

        await categoryRepository.UpdateAsync(category, cancellationToken);
        await unitOfWork.CommitAsync(cancellationToken);                   // data + outbox
        return CategoryModelOutput.FromCategory(category);
    }
}
```

- `UseCaseException` é a base — **não** se chama `ApplicationException` (colide com `System`).
- Output mapeia com `static From{Entidade}` no próprio record; sem biblioteca de mapeamento.
- Ids de outro agregado são conferidos **em lote** antes de persistir; os ausentes viram
  `RelatedAggregateException` com a lista completa, não um erro por vez.
- Listagem: `PaginatedListInput`/`PaginatedListOutput<TItem>` em `Common/` — forma **interna** do
  caso de uso, independente do que vai no fio; o teto de página vem do contrato e é validado no input.

Registro na DI com Scrutor, pela interface de mesmo nome:

```csharp
services.Scan(scan => scan
    .FromAssemblyOf<ICreateCategory>()
    .AddClasses(classes => classes.AssignableToAny(typeof(IUseCase<,>), typeof(IUseCase<>)))
    .AsMatchingInterface()
    .WithScopedLifetime());
services.AddValidatorsFromAssemblyContaining<ICreateCategory>();
```

## Repositório

Contratos genéricos em `Domain/SeedWork`, interface específica em `Domain/Repositories`,
implementação em `Infra.Data/Repositories`. **Só agregados têm repositório.**

```csharp
public interface IGenericRepository<TAggregate> where TAggregate : AggregateRoot
{
    Task InsertAsync(TAggregate aggregate, CancellationToken cancellationToken);
    Task<TAggregate?> GetAsync(Guid id, CancellationToken cancellationToken);   // tracked, or null
    Task UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken);
    Task DeleteAsync(TAggregate aggregate, CancellationToken cancellationToken);
}

public interface IUnitOfWork
{
    /// <summary>Persists changes and domain events (outbox) in a single transaction.</summary>
    Task CommitAsync(CancellationToken cancellationToken);
}
```

- `GetAsync` retorna `null` e vem **rastreado** — o `UnitOfWork` coleta eventos pelo `ChangeTracker`.
- Listagem usa `AsNoTracking`. Ordenação com desempate por Id; campo de ordenação desconhecido cai
  no default em vez de estourar.
- Nunca lance exceção da Application no repositório; nunca chame `SaveChangesAsync` nele.
- Projeção (DTO) **não** entra no repositório: vai para `Application/Interfaces/I{Agregado}Queries`,
  implementada em `Infra.Data/Queries`.
- **Não crie `BaseRepository<T> where T : class`** com `GetAllAsync` ou `Expression<>` genérico.
- Tabela de junção é modelo de persistência em `Infra.Data/Models`, invisível ao Domain.

## Erros

| Exceção | Camada | Status | `type` |
|---|---|---|---|
| `FluentValidation.ValidationException` | Application | 400 | `/problems/validation-error` |
| `NotFoundException` | Application | 404 | `/problems/not-found` |
| `EntityValidationException` | Domain | 422 | `/problems/business-rule-violation` |
| `RelatedAggregateException` | Application | 422 | `/problems/related-aggregate-not-found` |
| qualquer outra | — | 500 | `/problems/unexpected-error` (detalhe genérico) |

`type` é estável por categoria; o cliente decide por `type`/`status`, nunca por `detail`.

Um único `GlobalExceptionHandler : IExceptionHandler` faz o `switch` e escreve via
`IProblemDetailsService`. Registro em `Extensions/ErrorHandlingExtensions.cs` com `AddProblemDetails`
preenchendo `Instance`; `app.UseExceptionHandler()` é o **primeiro** middleware do pipeline.

- Nunca devolva stack trace, nome de tabela ou mensagem de exceção inesperada — nem em Development.
- Rejeição esperada (400/404/422) é log `Information`; 500 é `Error`.
- Sem `IExceptionFilter` e sem `try/catch` em endpoint para traduzir exceção.
- `Result<T>` só em integração com sistema externo cuja falha faz parte do fluxo; nunca para
  invariante de domínio nem para "não encontrado".

## Camada Api

**Havendo `api-contract.yaml` aprovado, ele é a fonte de verdade** — paths, status, schemas e
formato de erro saem dele. Sem contrato, vale a norma em
`tsg-flow-contract-creator/references/http-conventions.md`. Em qualquer caso, JSON em camelCase
(padrão do `System.Text.Json`; não configure outra naming policy).

**O formato da resposta não é decisão desta skill.** Se o sistema usa envelope, isso vem do baseline
arquitetural, é refletido no `api-contract.yaml` e aqui só se implementa. Sem envelope, o Output do
caso de uso serializa direto.

Os tipos que produzem esse formato ficam em `ApiModels/Responses/`. Endpoint técnico — health check,
probe, métrica — não serve o negócio e pode seguir formato próprio, ainda que o resto do sistema
use envelope.

Um `{Agregado}Endpoints` por agregado, com `MapGroup`, `WithTags` e `RequireAuthorization(Policies.X)`
no grupo. Cada `Map*` declara os `ProducesProblem` que aquela operação realmente produz. O handler
recebe o input e a **interface** do caso de uso, chama e devolve `TypedResults`:

```csharp
private static async Task<Created<CategoryModelOutput>> CreateAsync(
    CreateCategoryInput input, ICreateCategory useCase, CancellationToken cancellationToken)
{
    var output = await useCase.ExecuteAsync(input, cancellationToken);
    return TypedResults.Created($"/v1/categories/{output.Id}", output);
}
```

O tipo de retorno acompanha o formato do contrato: com envelope, `Created<Envelope<CategoryModelOutput>>`
e o Output embrulhado; sem envelope, como acima.

`EndpointsExtensions.MapApiEndpoints` chama cada `Map{Agregado}Endpoints`.
