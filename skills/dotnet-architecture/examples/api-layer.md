# Camada Api — Controllers, Envelope e Autorização

A Api só traduz HTTP para casos de uso. O contrato segue a skill `restful-api`: versão no path,
recursos no plural em kebab-case, paginação com `_page`/`_size`, erros em RFC 9457 e JSON em
camelCase (padrão do `System.Text.Json`; não configure outra naming policy).

## Estrutura

```text
ProjectName.Api/
├── Program.cs
├── Extensions/                     # dotnet-program-setup
├── Controllers/
│   └── CategoriesController.cs
├── ApiModels/
│   ├── Responses/
│   │   ├── ApiResponse.cs
│   │   ├── ApiResponseList.cs
│   │   └── PaginationMeta.cs
│   └── Categories/
│       └── UpdateCategoryApiInput.cs
├── Authorization/
│   ├── Policies.cs
│   └── Roles.cs
├── ExceptionHandlers/
│   └── GlobalExceptionHandler.cs   # error-handling.md
└── MessageHandlers/                # consumidores RabbitMQ que chamam casos de uso
```

## Envelope de resposta

```csharp
// ApiModels/Responses/ApiResponse.cs
public record ApiResponse<TData>(TData Data);

// ApiModels/Responses/PaginationMeta.cs
public sealed record PaginationMeta(int Page, int Size, int Total)
{
    public int TotalPages => Size == 0 ? 0 : (int)Math.Ceiling(Total / (double)Size);
}

// ApiModels/Responses/ApiResponseList.cs
public sealed record ApiResponseList<TItem>(IReadOnlyList<TItem> Data, PaginationMeta Pagination)
{
    public static ApiResponseList<TItem> From(PaginatedListOutput<TItem> output)
        => new(output.Items, new PaginationMeta(output.Page, output.Size, output.Total));
}
```

Resultado:

```json
{ "data": { "id": "…", "name": "Action" } }
{ "data": [ … ], "pagination": { "page": 1, "size": 10, "total": 42, "totalPages": 5 } }
```

## Input da Api quando a rota carrega parte dos dados

Quando o Id vem da rota e o resto do body, a Api tem seu próprio input e monta o do caso de uso:

```csharp
// ApiModels/Categories/UpdateCategoryApiInput.cs
public sealed record UpdateCategoryApiInput(string Name, string? Description = null, bool? IsActive = null);
```

## Controller

Actions **sem** sufixo `Async`: o ASP.NET Core remove esse sufixo do nome da action por padrão
(`SuppressAsyncSuffixInActionNames`), e `CreatedAtAction(nameof(GetByIdAsync), ...)` falha com
"No route matches the supplied values".

```csharp
[ApiController]
[Route("v1/categories")]
[Authorize(Policy = Policies.Classifiers)]
public sealed class CategoriesController : ControllerBase
{
    private readonly ICreateCategory _createCategory;
    private readonly IGetCategory _getCategory;
    private readonly IListCategories _listCategories;
    private readonly IUpdateCategory _updateCategory;
    private readonly IDeleteCategory _deleteCategory;

    public CategoriesController(
        ICreateCategory createCategory,
        IGetCategory getCategory,
        IListCategories listCategories,
        IUpdateCategory updateCategory,
        IDeleteCategory deleteCategory)
    {
        _createCategory = createCategory;
        _getCategory = getCategory;
        _listCategories = listCategories;
        _updateCategory = updateCategory;
        _deleteCategory = deleteCategory;
    }

    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CategoryModelOutput>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryInput input, CancellationToken cancellationToken)
    {
        var output = await _createCategory.ExecuteAsync(input, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = output.Id }, new ApiResponse<CategoryModelOutput>(output));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CategoryModelOutput>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var output = await _getCategory.ExecuteAsync(new GetCategoryInput(id), cancellationToken);
        return Ok(new ApiResponse<CategoryModelOutput>(output));
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponseList<CategoryModelOutput>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        CancellationToken cancellationToken,
        [FromQuery(Name = "_page")] int page = 1,
        [FromQuery(Name = "_size")] int size = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? sort = null,
        [FromQuery] SearchOrder dir = SearchOrder.Asc)
    {
        var input = new ListCategoriesInput(page, size, search ?? string.Empty, sort ?? string.Empty, dir);
        var output = await _listCategories.ExecuteAsync(input, cancellationToken);
        return Ok(ApiResponseList<CategoryModelOutput>.From(output));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CategoryModelOutput>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCategoryApiInput apiInput,
        CancellationToken cancellationToken)
    {
        var input = new UpdateCategoryInput(id, apiInput.Name, apiInput.Description, apiInput.IsActive);
        var output = await _updateCategory.ExecuteAsync(input, cancellationToken);
        return Ok(new ApiResponse<CategoryModelOutput>(output));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await _deleteCategory.ExecuteAsync(new DeleteCategoryInput(id), cancellationToken);
        return NoContent();
    }
}
```

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

O registro das policies (`AddAuthorization`) fica em `Extensions/AuthenticationExtensions.cs`
(`dotnet-program-setup`); controllers só referenciam `Policies.*`, nunca strings soltas.
