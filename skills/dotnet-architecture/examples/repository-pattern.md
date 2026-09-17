# Repository Pattern — Por Agregado

Um repositório por agregado. Os contratos genéricos ficam em `Domain/SeedWork`, a interface
específica em `Domain/Repositories` e a implementação EF Core em `Infra.Data/Repositories`.
Não existe `Repository<T>` genérico para qualquer classe: só agregados têm repositório.

## Contratos no Domain

```csharp
// SeedWork/IGenericRepository.cs
namespace ProjectName.Domain.SeedWork;

public interface IGenericRepository<TAggregate> where TAggregate : AggregateRoot
{
    Task InsertAsync(TAggregate aggregate, CancellationToken cancellationToken);

    /// <returns>The tracked aggregate, or <c>null</c> when it does not exist.</returns>
    Task<TAggregate?> GetAsync(Guid id, CancellationToken cancellationToken);

    Task UpdateAsync(TAggregate aggregate, CancellationToken cancellationToken);

    Task DeleteAsync(TAggregate aggregate, CancellationToken cancellationToken);
}
```

```csharp
// SeedWork/SearchableRepository/ISearchableRepository.cs
public interface ISearchableRepository<TAggregate> where TAggregate : AggregateRoot
{
    Task<SearchOutput<TAggregate>> SearchAsync(SearchInput input, CancellationToken cancellationToken);
}

// SeedWork/SearchableRepository/SearchOrder.cs
public enum SearchOrder { Asc, Desc }

// SeedWork/SearchableRepository/SearchInput.cs
public sealed record SearchInput(int Page, int Size, string Search, string OrderBy, SearchOrder Order);

// SeedWork/SearchableRepository/SearchOutput.cs
public sealed record SearchOutput<TAggregate>(int Page, int Size, int Total, IReadOnlyList<TAggregate> Items)
    where TAggregate : AggregateRoot;
```

```csharp
// SeedWork/IUnitOfWork.cs
public interface IUnitOfWork
{
    /// <summary>Persists changes and domain events (outbox) in a single transaction.</summary>
    Task CommitAsync(CancellationToken cancellationToken);
}
```

```csharp
// Repositories/ICategoryRepository.cs
namespace ProjectName.Domain.Repositories;

public interface ICategoryRepository : IGenericRepository<Category>, ISearchableRepository<Category>
{
    Task<IReadOnlyList<Guid>> GetIdsListByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken);
}
```

## Implementação EF Core

```csharp
// Infra.Data/Repositories/CategoryRepository.cs
public sealed class CategoryRepository : ICategoryRepository
{
    private readonly ProjectNameDbContext _context;

    public CategoryRepository(ProjectNameDbContext context) => _context = context;

    private DbSet<Category> Categories => _context.Categories;

    public async Task InsertAsync(Category aggregate, CancellationToken cancellationToken)
        => await Categories.AddAsync(aggregate, cancellationToken);

    // Tracked: the UnitOfWork finds the aggregate events through the ChangeTracker.
    public Task<Category?> GetAsync(Guid id, CancellationToken cancellationToken)
        => Categories.FirstOrDefaultAsync(category => category.Id == id, cancellationToken);

    public Task UpdateAsync(Category aggregate, CancellationToken cancellationToken)
    {
        Categories.Update(aggregate);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Category aggregate, CancellationToken cancellationToken)
    {
        Categories.Remove(aggregate);
        return Task.CompletedTask;
    }

    public async Task<SearchOutput<Category>> SearchAsync(SearchInput input, CancellationToken cancellationToken)
    {
        var query = Categories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(input.Search))
            query = query.Where(category => category.Name.Contains(input.Search));

        var total = await query.CountAsync(cancellationToken);

        var items = await ApplyOrder(query, input.OrderBy, input.Order)
            .Skip((input.Page - 1) * input.Size)
            .Take(input.Size)
            .ToListAsync(cancellationToken);

        return new SearchOutput<Category>(input.Page, input.Size, total, items);
    }

    public async Task<IReadOnlyList<Guid>> GetIdsListByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken cancellationToken)
        => await Categories
            .AsNoTracking()
            .Where(category => ids.Contains(category.Id))
            .Select(category => category.Id)
            .ToListAsync(cancellationToken);

    // Always break ties by Id so pagination is stable.
    private static IQueryable<Category> ApplyOrder(IQueryable<Category> query, string orderBy, SearchOrder order)
        => (orderBy.ToLowerInvariant(), order) switch
        {
            ("name", SearchOrder.Asc) => query.OrderBy(c => c.Name).ThenBy(c => c.Id),
            ("name", SearchOrder.Desc) => query.OrderByDescending(c => c.Name).ThenByDescending(c => c.Id),
            ("createdat", SearchOrder.Asc) => query.OrderBy(c => c.CreatedAt).ThenBy(c => c.Id),
            ("createdat", SearchOrder.Desc) => query.OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id),
            _ => query.OrderBy(c => c.Name).ThenBy(c => c.Id)
        };
}
```

## Relação entre agregados

Quando um agregado guarda Ids de outro (`Genre.Categories`), a tabela de junção é um modelo de
persistência em `Infra.Data/Models`, invisível para o Domain. O repositório sincroniza a junção:

```csharp
// Infra.Data/Models/GenresCategories.cs
public sealed class GenresCategories
{
    public GenresCategories(Guid categoryId, Guid genreId)
    {
        CategoryId = categoryId;
        GenreId = genreId;
    }

    public Guid CategoryId { get; private set; }
    public Guid GenreId { get; private set; }
}

// Infra.Data/Repositories/GenreRepository.cs (trecho)
public async Task InsertAsync(Genre genre, CancellationToken cancellationToken)
{
    await _context.Genres.AddAsync(genre, cancellationToken);

    var relations = genre.Categories.Select(categoryId => new GenresCategories(categoryId, genre.Id));
    await _context.GenresCategories.AddRangeAsync(relations, cancellationToken);
}

public async Task<Genre?> GetAsync(Guid id, CancellationToken cancellationToken)
{
    var genre = await _context.Genres.FirstOrDefaultAsync(g => g.Id == id, cancellationToken);
    if (genre is null)
        return null;

    var categoryIds = await _context.GenresCategories
        .AsNoTracking()
        .Where(relation => relation.GenreId == id)
        .Select(relation => relation.CategoryId)
        .ToListAsync(cancellationToken);

    genre.LoadCategories(categoryIds); // no validation, no events
    return genre;
}
```

## Regras

- `GetAsync` retorna `null`; nunca lance `NotFoundException` (ou qualquer exceção da Application)
  dentro do repositório. Isso mantém a Infra sem dependência da Application e permite usar o
  retorno em regras de pré-condição.
- Leitura para alteração é rastreada; leitura só para listagem usa `AsNoTracking`.
- Consulta que devolve projeção (DTO) em vez de agregado não entra no repositório do Domain: fica em
  uma interface de consulta em `Application/Interfaces` (ex.: `IVideoQueries`), implementada em
  `Infra.Data` (`dotnet-performance/references/full-guide.md`).
- Todo método assíncrono recebe e repassa `CancellationToken`, inclusive `CountAsync`/`ToListAsync`.
- O repositório não chama `SaveChangesAsync`; quem confirma é o `IUnitOfWork`.
- A implementação do `UnitOfWork` com outbox está em
  `dotnet-dependency-config/examples/outbox-inbox.md`.
- Registre repositórios e `IUnitOfWork` como `Scoped`, compartilhando o `DbContext` do request.
