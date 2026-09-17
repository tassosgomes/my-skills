# Testes de Integração — Testcontainers

Caso de uso + repositório + `UnitOfWork` + `DbContext` reais contra PostgreSQL em container. Não
sobe a Api.

## Estrutura

```text
tests/ProjectName.IntegrationTests/
├── Base/
│   ├── DatabaseFixture.cs              # container + migrations + limpeza
│   └── DatabaseCollection.cs
├── Application/UseCases/Categories/CreateCategory/
│   ├── CreateCategoryTest.cs
│   └── CreateCategoryTestFixture.cs
└── Infra.Data/
    ├── Repositories/CategoryRepository/
    └── UnitOfWork/
```

## Container compartilhado

```csharp
// Base/DatabaseFixture.cs
public sealed class DatabaseFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:18").Build();

    public string ConnectionString => _container.GetConnectionString();

    public async ValueTask InitializeAsync()
    {
        await _container.StartAsync();
        await using var context = CreateDbContext();
        await context.Database.MigrateAsync();
    }

    public ValueTask DisposeAsync() => _container.DisposeAsync();

    public ProjectNameDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<ProjectNameDbContext>().UseNpgsql(ConnectionString).Options);

    public async Task ResetDatabaseAsync()
    {
        await using var context = CreateDbContext();
        var tables = context.Model.GetEntityTypes()
            .Select(entityType => entityType.GetTableName())
            .OfType<string>()
            .Distinct()
            .Select(tableName => $"\"{tableName}\"");

        await context.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE {string.Join(", ", tables)} CASCADE");
    }
}

// Base/DatabaseCollection.cs
[CollectionDefinition(nameof(DatabaseCollection))]
public sealed class DatabaseCollection : ICollectionFixture<DatabaseFixture>;
```

## Caso de uso com banco real

```csharp
[Collection(nameof(DatabaseCollection))]
public sealed class CreateCategoryTest(DatabaseFixture database) : IAsyncLifetime
{
    private readonly CreateCategoryTestFixture _fixture = new();

    public async ValueTask InitializeAsync() => await database.ResetDatabaseAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    [Fact(DisplayName = nameof(CreateCategory))]
    [Trait("Integration/Application", "CreateCategory - Use Cases")]
    public async Task CreateCategory()
    {
        // Arrange
        await using var context = database.CreateDbContext();
        var useCase = new UseCase.CreateCategory(new CategoryRepository(context), new UnitOfWork(context));
        var input = _fixture.GetValidInput();

        // Act
        var output = await useCase.ExecuteAsync(input, TestContext.Current.CancellationToken);

        // Assert — a new DbContext bypasses the ChangeTracker
        await using var assertContext = database.CreateDbContext();
        var dbCategory = await assertContext.Categories.AsNoTracking()
            .SingleAsync(c => c.Id == output.Id, TestContext.Current.CancellationToken);
        dbCategory.Name.Should().Be(input.Name);

        var outboxMessage = await assertContext.OutboxMessages.AsNoTracking().SingleAsync(TestContext.Current.CancellationToken);
        outboxMessage.Type.Should().Be(nameof(CategoryCreatedEvent));
        outboxMessage.ProcessedOn.Should().BeNull();
    }
}
```

## Regras

- Um container por execução como collection fixture; fixture de dados instanciada por classe (o
  xUnit não injeta duas collection fixtures na mesma classe).
- Classes na mesma collection não rodam em paralelo: a limpeza de uma não apaga dados de outra.
- Asserts sobre o banco usam `DbContext` novo.
- Repositório: testar `null` quando não encontra, paginação (`Theory` com quantidade/página/tamanho)
  e ordenação com desempate por Id.
- Todo teste de caso de uso que levanta evento confere a linha no outbox; cenário de falha confere
  que nem dados nem outbox foram gravados.
- Consumidor e inbox: `Testcontainers.RabbitMq` com a mesma tag do compose; entregar a mesma
  mensagem duas vezes e conferir um único efeito.
