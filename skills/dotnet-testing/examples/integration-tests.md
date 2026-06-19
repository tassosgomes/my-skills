# Testes de Integracao — Exemplos

`WebApplicationFactory` customizada com Testcontainers (PostgreSQL padrao oficial) e testes de API end-to-end via `HttpClient`.

## WebApplicationFactory Customizada — PostgreSQL (Padrao)

```csharp
public class CustomWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    public async Task InitializeAsync()
    {
        await _dbContainer.StartAsync();
        
        await using var connection = new NpgsqlConnection(_dbContainer.GetConnectionString());
        await connection.OpenAsync();
        
        var createTablesSql = @"
            CREATE TABLE Users (
                Id SERIAL PRIMARY KEY,
                Name VARCHAR(100) NOT NULL,
                Email VARCHAR(255) NOT NULL UNIQUE,
                IsActive BOOLEAN DEFAULT TRUE NOT NULL,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
            
            CREATE TABLE Products (
                Id SERIAL PRIMARY KEY,
                Name VARCHAR(200) NOT NULL,
                Price DECIMAL(18,2) NOT NULL,
                IsActive BOOLEAN DEFAULT TRUE NOT NULL
            );";
        
        await connection.ExecuteAsync(createTablesSql);
        await SeedTestDataAsync(connection);
    }

    public new async Task DisposeAsync()
    {
        await _dbContainer.StopAsync();
        await base.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureTestServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_dbContainer.GetConnectionString()));
        });
    }

    private static async Task SeedTestDataAsync(NpgsqlConnection connection)
    {
        var users = new[]
        {
            new { Name = "Test User", Email = "test@example.com" },
            new { Name = "Admin User", Email = "admin@example.com" }
        };

        var products = new[]
        {
            new { Name = "Product 1", Price = 10.99m },
            new { Name = "Product 2", Price = 25.50m }
        };

        await connection.ExecuteAsync(
            "INSERT INTO Users (Name, Email) VALUES (@Name, @Email)", users);
        
        await connection.ExecuteAsync(
            "INSERT INTO Products (Name, Price) VALUES (@Name, @Price)", products);
    }
}
```

## Testes de API

```csharp
[Collection("IntegrationTests")]
public class UsersControllerTests : IAsyncLifetime
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public UsersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ShouldReturnAllUsers()
    {
        // Act
        var response = await _client.GetAsync("/api/users");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        
        var users = await response.Content.ReadFromJsonAsync<List<User>>();
        users.Should().HaveCount(2);
        users.Should().Contain(u => u.Name == "Test User");
    }

    [Fact]
    public async Task CreateUser_WithValidData_ShouldReturnCreatedUser()
    {
        // Arrange
        var newUser = new CreateUserRequest
        {
            Name = "New User",
            Email = "newuser@example.com"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/users", newUser);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        
        var createdUser = await response.Content.ReadFromJsonAsync<User>();
        createdUser.Should().NotBeNull();
        createdUser!.Name.Should().Be("New User");
        createdUser.Email.Should().Be("newuser@example.com");
    }

    public Task InitializeAsync() => Task.CompletedTask;
    public Task DisposeAsync() => Task.CompletedTask;
}

[CollectionDefinition("IntegrationTests")]
public class IntegrationTestCollection : ICollectionFixture<CustomWebApplicationFactory>
{
}
```
