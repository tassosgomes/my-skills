# Dev Containers para Testes de Integracao — Exemplos

Ambiente PostgreSQL isolado e reproduzivel para testes de integracao, com cleanup automatico.

## Estrutura de Arquivos

```
tests/
├── IntegrationTests/
│   ├── .devcontainer/
│   │   ├── devcontainer.json
│   │   ├── docker-compose.yml
│   │   └── test-data/
│   │       ├── 01-schema.sql
│   │       └── 02-test-data.sql
│   ├── Infrastructure/
│   │   ├── PostgresTestFixture.cs
│   │   └── TestDatabaseFactory.cs
│   └── Tests/
│       ├── UserRepositoryTests.cs
│       └── OrderServiceTests.cs
```

## docker-compose.yml (PostgreSQL Padrao)

```yaml
version: '3.8'

services:
  test-runner:
    build: 
      context: ../..
      dockerfile: tests/IntegrationTests/.devcontainer/Dockerfile
    volumes:
      - ../../:/workspace:cached
    working_dir: /workspace/tests/IntegrationTests
    command: sleep infinity
    depends_on:
      postgres-test-db:
        condition: service_healthy
    environment:
      - POSTGRES_TEST_CONNECTION=Host=postgres-test-db;Port=5432;Database=testdb;Username=testuser;Password=Test123;

  postgres-test-db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=Test123
      - POSTGRES_DB=testdb
    volumes:
      - ./test-data:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data
```

## Infraestrutura de Testes

```csharp
using Npgsql;
using Xunit;

namespace IntegrationTests.Infrastructure;

public class PostgresTestFixture : IAsyncLifetime
{
    private readonly string _connectionString;
    
    public PostgresTestFixture()
    {
        _connectionString = Environment.GetEnvironmentVariable("POSTGRES_TEST_CONNECTION") 
            ?? "Host=localhost;Port=5432;Database=testdb;Username=testuser;Password=Test123;";
    }

    public NpgsqlConnection CreateConnection()
    {
        var connection = new NpgsqlConnection(_connectionString);
        connection.Open();
        return connection;
    }

    public async Task InitializeAsync()
    {
        await using var connection = CreateConnection();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Users";
        var count = await command.ExecuteScalarAsync();
        
        if (count == null)
            throw new InvalidOperationException("Test database is not properly initialized");
    }

    public async Task DisposeAsync()
    {
        await Task.CompletedTask;
    }

    public async Task CleanupDataAsync()
    {
        await using var connection = CreateConnection();
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            DELETE FROM Orders WHERE Id > 3;
            DELETE FROM Users WHERE Id > 3;
        ";
        await command.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition("PostgreSQL Integration Tests")]
public class PostgresTestCollection : ICollectionFixture<PostgresTestFixture>
{
}
```

## Exemplo de Teste de Integracao com Fixture

```csharp
using IntegrationTests.Infrastructure;
using AwesomeAssertions;
using Xunit;

namespace IntegrationTests.Tests;

[Collection("PostgreSQL Integration Tests")]
public class UserRepositoryTests
{
    private readonly PostgresTestFixture _fixture;
    private readonly UserRepository _repository;

    public UserRepositoryTests(PostgresTestFixture fixture)
    {
        _fixture = fixture;
        _repository = new UserRepository(_fixture.CreateConnection());
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnTestUsers()
    {
        // Arrange
        var cancellationToken = CancellationToken.None;

        // Act
        var users = await _repository.GetAllAsync(cancellationToken);

        // Assert
        users.Should().NotBeNull();
        users.Should().HaveCountGreaterOrEqualTo(3);
        users.Should().Contain(u => u.Email == "test1@example.com");
    }

    [Fact]
    public async Task CreateAsync_WithValidUser_ShouldPersistToDatabase()
    {
        // Arrange
        var cancellationToken = CancellationToken.None;
        var newUser = new User 
        { 
            Name = "Integration Test User", 
            Email = $"integration.{Guid.NewGuid()}@test.com" 
        };

        try
        {
            // Act
            var createdUser = await _repository.AddAsync(newUser, cancellationToken);

            // Assert
            createdUser.Should().NotBeNull();
            createdUser.Id.Should().BeGreaterThan(0);
            createdUser.Name.Should().Be("Integration Test User");

            var retrievedUser = await _repository.GetByIdAsync(createdUser.Id, cancellationToken);
            retrievedUser.Should().NotBeNull();
            retrievedUser!.Email.Should().Be(newUser.Email);
        }
        finally
        {
            await _fixture.CleanupDataAsync();
        }
    }
}
```
