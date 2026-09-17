# Repository Pattern — Por Agregado

Contratos genéricos em `Domain/SeedWork`, interface específica em `Domain/Repositories`,
implementação EF Core em `Infra.Data/Repositories`. Só agregados têm repositório.

## Contratos

```csharp
// SeedWork/IGenericRepository.cs
public interface IGenericRepository<TAggregate> where TAggregate : AggregateRoot
{
    Task InsertAsync(TAggregate aggregate, CancellationToken cancellationToken);
    Task<TAggregate?> GetAsync(Guid id, CancellationToken cancellationToken);   // tracked, or null
    Task UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken);
    Task DeleteAsync(TAggregate aggregate, CancellationToken cancellationToken);
}

// SeedWork/SearchableRepository/ISearchableRepository.cs
public interface ISearchableRepository<TAggregate> where TAggregate : AggregateRoot
{
    Task<SearchOutput<TAggregate>> SearchAsync(SearchInput input, CancellationToken cancellationToken);
}

public enum SearchOrder { Asc, Desc }
public sealed record SearchInput(int Page, int Size, string Search, string OrderBy, SearchOrder Order);
public sealed record SearchOutput<TAggregate>(int Page, int Size, int Total, IReadOnlyList<TAggregate> Items)
    where TAggregate : AggregateRoot;

// SeedWork/IUnitOfWork.cs
public interface IUnitOfWork
{
    /// <summary>Persists changes and domain events (outbox) in a single transaction.</summary>
    Task CommitAsync(CancellationToken cancellationToken);
}

// Repositories/ICategoryRepository.cs
public interface ICategoryRepository : IGenericRepository<Category>, ISearchableRepository<Category>
{
    Task<IReadOnlyList<Guid>> GetIdsListByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken);
}
```

## Busca paginada

```csharp
// Infra.Data/Repositories/CategoryRepository.cs (trecho)
public async Task<SearchOutput<Category>> SearchAsync(SearchInput input, CancellationToken cancellationToken)
{
    var query = context.Categories.AsNoTracking();

    if (!string.IsNullOrWhiteSpace(input.Search))
        query = query.Where(category => category.Name.Contains(input.Search));

    var total = await query.CountAsync(cancellationToken);
    var items = await ApplyOrder(query, input.OrderBy, input.Order)
        .Skip((input.Page - 1) * input.Size)
        .Take(input.Size)
        .ToListAsync(cancellationToken);

    return new SearchOutput<Category>(input.Page, input.Size, total, items);
}

// Unknown sort field falls back to the default; ties always broken by Id.
private static IQueryable<Category> ApplyOrder(IQueryable<Category> query, string orderBy, SearchOrder order)
    => (orderBy.ToLowerInvariant(), order) switch
    {
        ("name", SearchOrder.Desc) => query.OrderByDescending(c => c.Name).ThenByDescending(c => c.Id),
        ("createdat", SearchOrder.Asc) => query.OrderBy(c => c.CreatedAt).ThenBy(c => c.Id),
        ("createdat", SearchOrder.Desc) => query.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id),
        _ => query.OrderBy(c => c.Name).ThenBy(c => c.Id)
    };
```

## Relação entre agregados

A tabela de junção (`GenresCategories`) é modelo de persistência em `Infra.Data/Models`, invisível
ao Domain. O repositório do agregado dono grava a junção no `InsertAsync`/`UpdateAsync` e a carrega
no `GetAsync` com um método de carga do agregado sem validação nem evento
(`genre.LoadCategories(categoryIds)`).

## Regras

- `GetAsync` retorna `null` e é rastreado (o `UnitOfWork` coleta eventos pelo `ChangeTracker`).
- Listagem usa `AsNoTracking`.
- Nunca lance exceção da Application no repositório.
- Não chame `SaveChangesAsync` no repositório.
- Consulta que devolve projeção (DTO) não entra no repositório do Domain: fica em
  `Application/Interfaces/IXxxQueries`, implementada em `Infra.Data/Queries` (`dotnet-performance`).
- Não crie `BaseRepository<T> where T : class` com `GetAllAsync` ou `Expression<>` genérico.
- Repositórios e `IUnitOfWork` são `Scoped`.
