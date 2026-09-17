# Testes End-to-End da API — WebApplicationFactory + Testcontainers

Teste HTTP contra o host real: rotas, binding, serialização, autorização, exception handler,
casos de uso e banco. Só o banco (e o broker, se o fluxo exigir) roda fora do processo.

## Estrutura

```text
tests/ProjectName.EndToEndTests/
├── Base/
│   ├── ProjectNameWebApplicationFactory.cs
│   ├── ApiCollection.cs
│   ├── ApiClient.cs
│   └── TestAuthHandler.cs
└── Api/Categories/
    ├── Common/
    │   ├── CategoryApiBaseFixture.cs
    │   └── CategoryPersistence.cs
    └── CreateCategory/
        ├── CreateCategoryApiTest.cs
        ├── CreateCategoryApiTestFixture.cs
        └── CreateCategoryApiTestDataGenerator.cs
```

## Factory

```csharp
// Base/ProjectNameWebApplicationFactory.cs
public sealed class ProjectNameWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:18").Build();

    public async ValueTask InitializeAsync()
    {
        await _database.StartAsync();

        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>().Database.MigrateAsync();
    }

    public override async ValueTask DisposeAsync()
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
            // No broker in this project: assert the outbox row, not the publication.
            services.RemoveAll<IHostedService>();

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
        });
    }

    public Task ResetDatabaseAsync() { /* same TRUNCATE as integration-tests.md */ }
}

// Base/ApiCollection.cs
[CollectionDefinition(nameof(ApiCollection))]
public sealed class ApiCollection : ICollectionFixture<ProjectNameWebApplicationFactory>;
```

- `Program.cs` termina com `public partial class Program;`.
- `TestAuthHandler` devolve um `ClaimsPrincipal` com as `Roles.*` pedidas por header; sem o header,
  a requisição é anônima (para testar 401/403).

## ApiClient e persistência

- `ApiClient` recebe o `HttpClient` da factory e expõe `PostAsync<TOutput>`, `PutAsync<TOutput>`,
  `GetAsync<TOutput>(route, query)` e `DeleteAsync<TOutput>`, devolvendo
  `(HttpResponseMessage Response, TOutput? Output)` com `JsonSerializerDefaults.Web`.
- `{Agregado}Persistence` lê e insere direto no `DbContext` em um escopo novo da factory.

## Teste

```csharp
[Collection(nameof(ApiCollection))]
public sealed class CreateCategoryApiTest(ProjectNameWebApplicationFactory factory) : IAsyncLifetime
{
    private readonly CreateCategoryApiTestFixture _fixture = new();
    private readonly ApiClient _apiClient = new(factory.CreateClient());
    private readonly CategoryPersistence _persistence = new(factory);

    public async ValueTask InitializeAsync() => await factory.ResetDatabaseAsync();

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

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
        response.Headers.Location!.ToString().Should().Be($"/v1/categories/{output!.Data.Id}");
        (await _persistence.GetByIdAsync(output.Data.Id))!.Name.Should().Be(input.Name);
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

## Regras

- Uma factory por execução (collection fixture).
- Nunca substituir o `DbContext` por banco em memória em `ConfigureTestServices`.
- Asserts de contrato: status, `Location`, `Content-Type` de erro, envelope `data`/`pagination`,
  `type` do ProblemDetails.
- Asserts de efeito: leitura do banco em escopo novo.
- Eventos: sem broker, confira a linha no outbox; fluxo que depende do consumo sobe
  `Testcontainers.RabbitMq` e mantém os hosted services.
