# Camada Api — Endpoints Minimal API, Envelope e Autorização

A Api só traduz HTTP para caso de uso. **Havendo `api-contract.yaml` aprovado, ele é a fonte de
verdade** do contrato — paths, status, schemas e formato de erro saem dele, não de convenção
reescrita aqui. Sem contrato, aplique a norma em
`tsg-flow-contract-creator/references/http-conventions.md`: versão na URL base ou no path,
recursos no plural em kebab-case, paginação `_page`/`_size` e erros RFC 9457. Em qualquer dos
casos, JSON em camelCase (padrão do `System.Text.Json`; não configure outra naming policy).

## Estrutura

```text
ProjectName.Api/
├── Program.cs
├── Extensions/                         # dotnet-program-setup
├── Endpoints/
│   ├── EndpointsExtensions.cs          # MapApiEndpoints: chama cada Map{Agregado}Endpoints
│   └── Categories/
│       ├── CategoryEndpoints.cs
│       └── UpdateCategoryApiInput.cs
├── ApiModels/
│   └── Responses/
│       ├── ApiResponse.cs
│       ├── ApiResponseList.cs
│       └── PaginationMeta.cs
├── Authorization/
│   ├── Policies.cs
│   └── Roles.cs
├── ExceptionHandlers/
│   └── GlobalExceptionHandler.cs
└── MessageHandlers/
```

## Envelope de resposta

```csharp
public sealed record ApiResponse<TData>(TData Data);

public sealed record PaginationMeta(int Page, int Size, int Total)
{
    public int TotalPages => Size == 0 ? 0 : (int)Math.Ceiling(Total / (double)Size);
}

public sealed record ApiResponseList<TItem>(IReadOnlyList<TItem> Data, PaginationMeta Pagination)
{
    public static ApiResponseList<TItem> From(PaginatedListOutput<TItem> output)
        => new(output.Items, new PaginationMeta(output.Page, output.Size, output.Total));
}
```

```json
{ "data": { "id": "0199a3c2-…", "name": "Action" } }
{ "data": [ … ], "pagination": { "page": 1, "size": 10, "total": 42, "totalPages": 5 } }
```

## Endpoints de um agregado

```csharp
// Endpoints/Categories/CategoryEndpoints.cs
public static class CategoryEndpoints
{
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("v1/categories")
            .WithTags("Categories")
            .RequireAuthorization(Policies.Classifiers);

        group.MapPost("/", CreateAsync)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapGet("/{id:guid}", GetByIdAsync)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/", ListAsync);

        group.MapPut("/{id:guid}", UpdateAsync)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status422UnprocessableEntity);

        group.MapDelete("/{id:guid}", DeleteAsync)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<Created<ApiResponse<CategoryModelOutput>>> CreateAsync(
        CreateCategoryInput input, ICreateCategory useCase, CancellationToken cancellationToken)
    {
        var output = await useCase.ExecuteAsync(input, cancellationToken);
        return TypedResults.Created($"/v1/categories/{output.Id}", new ApiResponse<CategoryModelOutput>(output));
    }

    private static async Task<Ok<ApiResponse<CategoryModelOutput>>> GetByIdAsync(
        Guid id, IGetCategory useCase, CancellationToken cancellationToken)
        => TypedResults.Ok(new ApiResponse<CategoryModelOutput>(
            await useCase.ExecuteAsync(new GetCategoryInput(id), cancellationToken)));

    private static async Task<Ok<ApiResponseList<CategoryModelOutput>>> ListAsync(
        IListCategories useCase,
        CancellationToken cancellationToken,
        [FromQuery(Name = "_page")] int page = 1,
        [FromQuery(Name = "_size")] int size = 10,
        string? search = null,
        string? sort = null,
        SearchOrder dir = SearchOrder.Asc)
    {
        var input = new ListCategoriesInput(page, size, search ?? string.Empty, sort ?? string.Empty, dir);
        return TypedResults.Ok(ApiResponseList<CategoryModelOutput>.From(await useCase.ExecuteAsync(input, cancellationToken)));
    }

    private static async Task<Ok<ApiResponse<CategoryModelOutput>>> UpdateAsync(
        Guid id, UpdateCategoryApiInput apiInput, IUpdateCategory useCase, CancellationToken cancellationToken)
    {
        var input = new UpdateCategoryInput(id, apiInput.Name, apiInput.Description, apiInput.IsActive);
        return TypedResults.Ok(new ApiResponse<CategoryModelOutput>(await useCase.ExecuteAsync(input, cancellationToken)));
    }

    private static async Task<NoContent> DeleteAsync(Guid id, IDeleteCategory useCase, CancellationToken cancellationToken)
    {
        await useCase.ExecuteAsync(new DeleteCategoryInput(id), cancellationToken);
        return TypedResults.NoContent();
    }
}
```

```csharp
// Endpoints/EndpointsExtensions.cs
public static class EndpointsExtensions
{
    public static IEndpointRouteBuilder MapApiEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapCategoryEndpoints();
        endpoints.MapGenreEndpoints();
        return endpoints;
    }
}
```

## Regras

- Um `{Agregado}Endpoints` estático por agregado, com um `MapGroup("v1/{recurso}")`, `WithTags` e
  `RequireAuthorization(Policies.X)` no grupo.
- Handler é método `private static` nomeado (`CreateAsync`, `GetByIdAsync`...), nunca lambda inline:
  fica legível, navegável e segue o sufixo `Async` normal.
- Retorno sempre com `TypedResults` e tipo concreto (`Created<T>`, `Ok<T>`, `NoContent`): o OpenAPI
  infere status e schema. Não use `Results.Ok`/`IResult` sem tipo.
- Erros não entram no tipo de retorno: saem do `GlobalExceptionHandler` e são declarados com
  `ProducesProblem`.
- O caso de uso é recebido como parâmetro do handler (resolvido da DI); nada de `IServiceProvider`.
- Inputs não têm DataAnnotations e `AddValidation()` não é registrado; o 400 vem do validator
  chamado no caso de uso.
- Quando a rota carrega parte dos dados (Id), a Api tem seu próprio `{CasoDeUso}ApiInput` em
  `Endpoints/{Agregados}/` e monta o Input do caso de uso.
- Endpoint filter só para concern transversal de borda (ex.: idempotency key), nunca regra de negócio.

## Autorização por constantes

```csharp
// Authorization/Roles.cs
public static class Roles
{
    public const string Admin = "catalog_admin";
    public const string Categories = "catalog_categories";
}

// Authorization/Policies.cs
public static class Policies
{
    public const string Admin = "Admin";
    public const string Classifiers = "Classifiers";
}
```

As policies são registradas em `Extensions/AuthenticationExtensions.cs` (`dotnet-program-setup`)
usando `Roles.*`; endpoints só referenciam `Policies.*`, nunca strings soltas.
