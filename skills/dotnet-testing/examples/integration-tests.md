# Testes de Integração — Casos de Uso e Repositórios com Testcontainers

Integração aqui significa: caso de uso + repositório + `UnitOfWork` + `DbContext` reais contra um
PostgreSQL real em container. Não sobe a Api (isso é end-to-end) e não usa banco em memória.

```bash
dotnet add tests/ProjectName.IntegrationTests package Testcontainers.PostgreSql
```

## Estrutura

```text
tests/ProjectName.IntegrationTests/
├── Base/
│   ├── DatabaseFixture.cs              # container + migrations + limpeza
│   └── DatabaseCollection.cs
├── Application/
│   └── UseCases/
│       └── Categories/
│           ├── Common/
│           │   └── CategoryUseCasesBaseFixture.cs
│           └── CreateCategory/
│               ├── CreateCategoryTest.cs
│               └── CreateCategoryTestFixture.cs
└── Infra.Data/
    ├── Repositories/
    │   └── CategoryRepository/
    │       ├── CategoryRepositoryTest.cs
    │       └── CategoryRepositoryTestFixture.cs
    └── UnitOfWork/
        └── UnitOfWorkTest.cs
```

## Container compartilhado

Um container por execução, compartilhado por todas as classes da collection. As migrations rodam
uma vez; cada teste limpa as tabelas.

```csharp
// Base/DatabaseFixture.cs
public sealed class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgres:18") // same major as local-infrastructure.md
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        await using var context = CreateDbContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();

    public ProjectNameDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<ProjectNameDbContext>()
            .UseNpgsql(ConnectionString)
            .Options);

    public async Task ResetDatabaseAsync()
    {
        await using var context = CreateDbContext();
        var tables = context.Model.GetEntityTypes()
            .Select(entityType => entityType.GetTableName())
            .Where(tableName => tableName is not null)
            .Distinct()
            .Select(tableName => $"\"{tableName}\"");

        await context.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE {string.Join(", ", tables)} CASCADE");
    }
}
```

```csharp
// Base/DatabaseCollection.cs
[CollectionDefinition(nameof(DatabaseCollection))]
public sealed class DatabaseCollection : ICollectionFixture<DatabaseFixture>;
```

Classes na mesma collection não rodam em paralelo entre si, o que evita que a limpeza de um teste
apague os dados de outro.

## Fixtures

```csharp
// Application/UseCases/Categories/Common/CategoryUseCasesBaseFixture.cs
public abstract class CategoryUseCasesBaseFixture : BaseFixture
{
    protected CategoryUseCasesBaseFixture() => Categories = new CategoryDataGenerator(Faker);

    public CategoryDataGenerator Categories { get; }

    public List<Category> GetCategoryList(int length)
        => Enumerable.Range(0, length).Select(_ => Categories.GetValidCategory()).ToList();
}

// Application/UseCases/Categories/CreateCategory/CreateCategoryTestFixture.cs
public sealed class CreateCategoryTestFixture : CategoryUseCasesBaseFixture
{
    public CreateCategoryInput GetValidInput()
        => new(Categories.GetValidName(), Categories.GetValidDescription(), GetRandomBoolean());
}
```

A classe de teste recebe o `DatabaseFixture` da collection e cria sua própria fixture de dados;
xUnit não injeta duas collection fixtures na mesma classe.

## Teste de caso de uso

```csharp
// Application/UseCases/Categories/CreateCategory/CreateCategoryTest.cs
[Collection(nameof(DatabaseCollection))]
public sealed class CreateCategoryTest : IAsyncLifetime
{
    private readonly DatabaseFixture _database;
    private readonly CreateCategoryTestFixture _fixture = new();

    public CreateCategoryTest(DatabaseFixture database) => _database = database;

    public Task InitializeAsync() => _database.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(DisplayName = nameof(CreateCategory))]
    [Trait("Integration/Application", "CreateCategory - Use Cases")]
    public async Task CreateCategory()
    {
        // Arrange
        await using var context = _database.CreateDbContext();
        var useCase = new UseCase.CreateCategory(new CategoryRepository(context), new UnitOfWork(context));
        var input = _fixture.GetValidInput();

        // Act
        var output = await useCase.ExecuteAsync(input, CancellationToken.None);

        // Assert — read with another DbContext to bypass the ChangeTracker cache
        await using var assertContext = _database.CreateDbContext();
        var dbCategory = await assertContext.Categories.AsNoTracking().SingleAsync(c => c.Id == output.Id);
        dbCategory.Name.Should().Be(input.Name);
        dbCategory.Description.Should().Be(input.Description);
        dbCategory.IsActive.Should().Be(input.IsActive);

        var outboxMessage = await assertContext.OutboxMessages.AsNoTracking().SingleAsync();
        outboxMessage.Type.Should().Be(nameof(CategoryCreatedEvent));
        outboxMessage.ProcessedOn.Should().BeNull();
    }

    [Fact(DisplayName = nameof(DoNotPersistWhenCategoryIsInvalid))]
    [Trait("Integration/Application", "CreateCategory - Use Cases")]
    public async Task DoNotPersistWhenCategoryIsInvalid()
    {
        await using var context = _database.CreateDbContext();
        var useCase = new UseCase.CreateCategory(new CategoryRepository(context), new UnitOfWork(context));
        var input = _fixture.GetValidInput() with { Name = "ab" };

        var action = () => useCase.ExecuteAsync(input, CancellationToken.None);

        await action.Should().ThrowAsync<EntityValidationException>();
        await using var assertContext = _database.CreateDbContext();
        (await assertContext.Categories.CountAsync()).Should().Be(0);
        (await assertContext.OutboxMessages.CountAsync()).Should().Be(0);
    }
}
```

## Teste de repositório

```csharp
[Collection(nameof(DatabaseCollection))]
public sealed class CategoryRepositoryTest : IAsyncLifetime
{
    private readonly DatabaseFixture _database;
    private readonly CategoryRepositoryTestFixture _fixture = new();

    public CategoryRepositoryTest(DatabaseFixture database) => _database = database;

    public Task InitializeAsync() => _database.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(DisplayName = nameof(GetReturnsNullWhenNotFound))]
    [Trait("Integration/Infra.Data", "CategoryRepository - Repositories")]
    public async Task GetReturnsNullWhenNotFound()
    {
        await using var context = _database.CreateDbContext();
        var repository = new CategoryRepository(context);

        var category = await repository.GetAsync(Guid.NewGuid(), CancellationToken.None);

        category.Should().BeNull();
    }

    [Theory(DisplayName = nameof(SearchReturnsPaginated))]
    [Trait("Integration/Infra.Data", "CategoryRepository - Repositories")]
    [InlineData(10, 1, 5, 5)]
    [InlineData(10, 2, 5, 5)]
    [InlineData(7, 2, 5, 2)]
    [InlineData(7, 3, 5, 0)]
    public async Task SearchReturnsPaginated(int quantity, int page, int size, int expectedItems)
    {
        await using (var seedContext = _database.CreateDbContext())
        {
            await seedContext.Categories.AddRangeAsync(_fixture.GetCategoryList(quantity));
            await seedContext.SaveChangesAsync();
        }

        await using var context = _database.CreateDbContext();
        var repository = new CategoryRepository(context);

        var output = await repository.SearchAsync(new SearchInput(page, size, "", "", SearchOrder.Asc), CancellationToken.None);

        output.Total.Should().Be(quantity);
        output.Items.Should().HaveCount(expectedItems);
    }
}
```

## Regras

- Nunca `UseInMemoryDatabase` ou SQLite: não validam SQL real, constraints, `jsonb`, `FOR UPDATE SKIP LOCKED` nem migrations.
- Aplique migrations no container; se a migration falhar, o teste deve falhar.
- Asserts sobre o banco usam um `DbContext` novo.
- Fixture de dados é instanciada por classe; o container é a única collection fixture.
- Consumidor RabbitMQ e inbox: use `Testcontainers.RabbitMq` com a mesma tag de
  `dotnet-dependency-config/examples/local-infrastructure.md` e publique a mensagem duas vezes para provar a idempotência.
