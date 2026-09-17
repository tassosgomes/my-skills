# Testes End-to-End da API — WebApplicationFactory + Testcontainers

End-to-end em uma API é o teste HTTP contra o host real: rotas, model binding, serialização,
autorização, exception handler, casos de uso e banco. Só o banco (e o broker, quando necessário)
roda fora do processo, em container.

```bash
dotnet add tests/ProjectName.EndToEndTests package Microsoft.AspNetCore.Mvc.Testing
dotnet add tests/ProjectName.EndToEndTests package Testcontainers.PostgreSql
```

`Program.cs` com top-level statements precisa expor o tipo para o `WebApplicationFactory`:

```csharp
// Api/Program.cs (last line)
public partial class Program;
```

## Estrutura

```text
tests/ProjectName.EndToEndTests/
├── Base/
│   ├── ProjectNameWebApplicationFactory.cs
│   ├── ApiCollection.cs
│   └── ApiClient.cs
└── Api/
    └── Categories/
        ├── Common/
        │   ├── CategoryApiBaseFixture.cs
        │   └── CategoryPersistence.cs
        ├── CreateCategory/
        │   ├── CreateCategoryApiTest.cs
        │   ├── CreateCategoryApiTestFixture.cs
        │   └── CreateCategoryApiTestDataGenerator.cs
        └── ListCategories/
            └── ListCategoriesApiTest.cs
```

## Factory com banco em container

A connection string é sobrescrita por configuração; o registro do `DbContext` na Api não muda.

```csharp
// Base/ProjectNameWebApplicationFactory.cs
public sealed class ProjectNameWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder()
        .WithImage("postgres:18")
        .Build();

    public async Task InitializeAsync()
    {
        await _database.StartAsync();

        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>().Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("EndToEndTest");
        builder.UseSetting("ConnectionStrings:DefaultConnection", _database.GetConnectionString());

        builder.ConfigureTestServices(services =>
        {
            // No broker in this test project: assert the outbox row, not the publication.
            services.RemoveAll<IHostedService>();

            // Fake authentication to exercise the policies without a real identity provider.
            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>();
        var tables = context.Model.GetEntityTypes()
            .Select(entityType => entityType.GetTableName())
            .Where(tableName => tableName is not null)
            .Distinct()
            .Select(tableName => $"\"{tableName}\"");

        await context.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE {string.Join(", ", tables)} CASCADE");
    }
}

// Base/ApiCollection.cs
[CollectionDefinition(nameof(ApiCollection))]
public sealed class ApiCollection : ICollectionFixture<ProjectNameWebApplicationFactory>;
```

`TestAuthHandler` é um `AuthenticationHandler` que devolve um `ClaimsPrincipal` com as roles
necessárias; para testar 401/403, crie o client sem o header que o handler espera.

## ApiClient

Encapsula serialização e devolve resposta e corpo tipado, para os testes lerem só o cenário.

```csharp
// Base/ApiClient.cs
public sealed class ApiClient
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;

    public ApiClient(HttpClient httpClient) => _httpClient = httpClient;

    public Task<(HttpResponseMessage Response, TOutput? Output)> PostAsync<TOutput>(string route, object payload)
        => SendAsync<TOutput>(() => _httpClient.PostAsJsonAsync(route, payload, SerializerOptions));

    public Task<(HttpResponseMessage Response, TOutput? Output)> PutAsync<TOutput>(string route, object payload)
        => SendAsync<TOutput>(() => _httpClient.PutAsJsonAsync(route, payload, SerializerOptions));

    public Task<(HttpResponseMessage Response, TOutput? Output)> GetAsync<TOutput>(string route, IDictionary<string, string?>? query = null)
        => SendAsync<TOutput>(() => _httpClient.GetAsync(query is null ? route : QueryHelpers.AddQueryString(route, query)));

    public Task<(HttpResponseMessage Response, TOutput? Output)> DeleteAsync<TOutput>(string route)
        => SendAsync<TOutput>(() => _httpClient.DeleteAsync(route));

    private static async Task<(HttpResponseMessage, TOutput?)> SendAsync<TOutput>(Func<Task<HttpResponseMessage>> send)
    {
        var response = await send();
        var content = await response.Content.ReadAsStringAsync();
        var output = string.IsNullOrWhiteSpace(content)
            ? default
            : JsonSerializer.Deserialize<TOutput>(content, SerializerOptions);

        return (response, output);
    }
}
```

## Fixture e helper de persistência

```csharp
// Api/Categories/Common/CategoryPersistence.cs
public sealed class CategoryPersistence
{
    private readonly ProjectNameWebApplicationFactory _factory;

    public CategoryPersistence(ProjectNameWebApplicationFactory factory) => _factory = factory;

    public async Task<Category?> GetByIdAsync(Guid id)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>();
        return await context.Categories.AsNoTracking().SingleOrDefaultAsync(c => c.Id == id);
    }

    public async Task InsertListAsync(IEnumerable<Category> categories)
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>();
        await context.Categories.AddRangeAsync(categories);
        await context.SaveChangesAsync();
    }
}

// Api/Categories/Common/CategoryApiBaseFixture.cs
public abstract class CategoryApiBaseFixture : BaseFixture
{
    protected CategoryApiBaseFixture() => Categories = new CategoryDataGenerator(Faker);

    public CategoryDataGenerator Categories { get; }
}
```

## Testes

```csharp
// Api/Categories/CreateCategory/CreateCategoryApiTest.cs
[Collection(nameof(ApiCollection))]
public sealed class CreateCategoryApiTest : IAsyncLifetime
{
    private readonly ProjectNameWebApplicationFactory _factory;
    private readonly CreateCategoryApiTestFixture _fixture = new();
    private readonly ApiClient _apiClient;
    private readonly CategoryPersistence _persistence;

    public CreateCategoryApiTest(ProjectNameWebApplicationFactory factory)
    {
        _factory = factory;
        _apiClient = new ApiClient(factory.CreateClient());
        _persistence = new CategoryPersistence(factory);
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact(DisplayName = nameof(CreateCategory))]
    [Trait("EndToEnd/Api", "Categories/Create - Endpoints")]
    public async Task CreateCategory()
    {
        // Arrange
        var input = _fixture.GetValidInput();

        // Act
        var (response, output) = await _apiClient.PostAsync<ApiResponse<CategoryModelOutput>>("/v1/categories", input);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();
        output!.Data.Name.Should().Be(input.Name);

        var dbCategory = await _persistence.GetByIdAsync(output.Data.Id);
        dbCategory.Should().NotBeNull();
        dbCategory!.Name.Should().Be(input.Name);
    }

    [Theory(DisplayName = nameof(ReturnUnprocessableEntityWhenInvalid))]
    [Trait("EndToEnd/Api", "Categories/Create - Endpoints")]
    [MemberData(nameof(CreateCategoryApiTestDataGenerator.GetInvalidInputs), MemberType = typeof(CreateCategoryApiTestDataGenerator))]
    public async Task ReturnUnprocessableEntityWhenInvalid(CreateCategoryInput input, string expectedDetail)
    {
        var (response, problem) = await _apiClient.PostAsync<ProblemDetails>("/v1/categories", input);

        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        problem!.Type.Should().Be("/problems/business-rule-violation");
        problem.Detail.Should().Be(expectedDetail);
    }
}
```

```csharp
// Api/Categories/ListCategories/ListCategoriesApiTest.cs (trecho)
[Fact(DisplayName = nameof(ListCategoriesWithPagination))]
[Trait("EndToEnd/Api", "Categories/List - Endpoints")]
public async Task ListCategoriesWithPagination()
{
    await _persistence.InsertListAsync(_fixture.GetCategoryList(15));

    var (response, output) = await _apiClient.GetAsync<ApiResponseList<CategoryModelOutput>>(
        "/v1/categories",
        new Dictionary<string, string?> { ["_page"] = "2", ["_size"] = "10" });

    response.StatusCode.Should().Be(HttpStatusCode.OK);
    output!.Data.Should().HaveCount(5);
    output.Pagination.Should().BeEquivalentTo(new { Page = 2, Size = 10, Total = 15, TotalPages = 2 });
}
```

## Regras

- Um `WebApplicationFactory` por execução (collection fixture); criar um por classe multiplica o
  tempo de boot e de containers.
- Não substitua o `DbContext` por banco em memória no `ConfigureTestServices`.
- Asserts de contrato: status, header `Location`, `Content-Type` de erro, envelope `data`/`pagination`
  e `type` do ProblemDetails.
- Asserts de efeito: leia o banco por um escopo novo (`CategoryPersistence`).
- Eventos: sem broker, verifique a linha no outbox. Com fluxo que depende do consumo, suba
  `Testcontainers.RabbitMq` e mantenha os hosted services.
- Playwright e Page Object Model ficam para projetos com front-end.
