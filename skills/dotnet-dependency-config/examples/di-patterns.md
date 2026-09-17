# Registro na DI — Casos de Uso, Persistência e Lifetimes

O composition root fica na Api, um arquivo de extensão por concern (`dotnet-program-setup`).
Controllers dependem só das interfaces dos casos de uso.

## Lifetimes

| Tipo | Lifetime | Motivo |
|---|---|---|
| `DbContext` | Scoped | Um por request/mensagem |
| Repositórios e `IUnitOfWork` | Scoped | Compartilham o `DbContext` do escopo |
| Casos de uso (`ICreateCategory`...) | Scoped | Dependem de repositórios |
| Validators do FluentValidation | Scoped (padrão do `AddValidatorsFrom...`) | Podem depender de serviços scoped |
| `RabbitMqConnectionProvider`, `RabbitMqPublisher` | Singleton | Uma conexão por processo |
| `IMessageHandler<T>` | Scoped | Resolvido em um escopo por mensagem |

Nunca injete um serviço scoped em um singleton ou `BackgroundService`; crie um escopo com
`IServiceScopeFactory.CreateAsyncScope()`.

## Casos de uso

```csharp
// Api/Extensions/UseCasesExtensions.cs
public static class UseCasesExtensions
{
    public static IServiceCollection AddUseCasesConfiguration(this IServiceCollection services)
    {
        // CreateCategory → ICreateCategory, GetCategory → IGetCategory...
        services.Scan(scan => scan
            .FromAssemblyOf<ICreateCategory>()
            .AddClasses(classes => classes.AssignableToAny(typeof(IUseCase<,>), typeof(IUseCase<>)))
            .AsMatchingInterface()
            .WithScopedLifetime());

        services.AddValidatorsFromAssemblyContaining<ICreateCategory>();

        return services;
    }
}
```

Sem Scrutor, registre cada caso de uso explicitamente:

```csharp
services.AddScoped<ICreateCategory, CreateCategory>();
services.AddScoped<IGetCategory, GetCategory>();
services.AddScoped<IListCategories, ListCategories>();
```

## Persistência

```csharp
// Api/Extensions/PersistenceExtensions.cs
public static class PersistenceExtensions
{
    public static IServiceCollection AddPersistenceConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ProjectNameDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history")));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IGenreRepository, GenreRepository>();

        return services;
    }
}
```

## Uso

```csharp
public sealed class CategoriesController : ControllerBase
{
    private readonly ICreateCategory _createCategory;

    public CategoriesController(ICreateCategory createCategory) => _createCategory = createCategory;

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryInput input, CancellationToken cancellationToken)
    {
        var output = await _createCategory.ExecuteAsync(input, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = output.Id }, new ApiResponse<CategoryModelOutput>(output));
    }
}
```

Não injete `IUnitOfWork`, repositórios ou `DbContext` em controllers: persistência é
responsabilidade do caso de uso.
