# Casos de Uso — Application

## Estrutura

```text
ProjectName.Application/
├── Common/
│   ├── IUseCase.cs
│   ├── PaginatedListInput.cs
│   └── PaginatedListOutput.cs
├── Exceptions/
│   ├── UseCaseException.cs             # base; não se chama ApplicationException (colide com System)
│   ├── NotFoundException.cs
│   └── RelatedAggregateException.cs
├── Interfaces/
└── UseCases/
    └── Categories/
        ├── Common/
        │   └── CategoryModelOutput.cs
        ├── CreateCategory/
        │   ├── ICreateCategory.cs
        │   ├── CreateCategory.cs
        │   └── CreateCategoryInput.cs
        └── UpdateCategory/
            ├── IUpdateCategory.cs
            ├── UpdateCategory.cs
            ├── UpdateCategoryInput.cs
            └── UpdateCategoryInputValidator.cs
```

Um arquivo por tipo; o nome da pasta é o nome do caso de uso; o validator só existe quando o input
tem regra de formato que o domínio não cobre.

## Contratos base

```csharp
// Common/IUseCase.cs
public interface IUseCase<in TInput, TOutput>
{
    Task<TOutput> ExecuteAsync(TInput input, CancellationToken cancellationToken);
}

public interface IUseCase<in TInput>
{
    Task ExecuteAsync(TInput input, CancellationToken cancellationToken);
}

// Exceptions/NotFoundException.cs
public sealed class NotFoundException(string message) : UseCaseException(message)
{
    public static T ThrowIfNull<T>(T? value, string message) where T : class
        => value ?? throw new NotFoundException(message);
}
```

## Output com mapeamento manual

```csharp
// UseCases/Categories/Common/CategoryModelOutput.cs
public sealed record CategoryModelOutput(Guid Id, string Name, string Description, bool IsActive, DateTime CreatedAt)
{
    public static CategoryModelOutput FromCategory(Category category)
        => new(category.Id, category.Name, category.Description, category.IsActive, category.CreatedAt);
}
```

## Forma de um caso de uso

```csharp
// UseCases/Categories/UpdateCategory/UpdateCategoryInput.cs
public sealed record UpdateCategoryInput(Guid Id, string Name, string? Description = null, bool? IsActive = null);

// UseCases/Categories/UpdateCategory/IUpdateCategory.cs
public interface IUpdateCategory : IUseCase<UpdateCategoryInput, CategoryModelOutput>;

// UseCases/Categories/UpdateCategory/UpdateCategory.cs
public sealed class UpdateCategory(
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork,
    IValidator<UpdateCategoryInput> validator) : IUpdateCategory
{
    public async Task<CategoryModelOutput> ExecuteAsync(UpdateCategoryInput input, CancellationToken cancellationToken)
    {
        await validator.ValidateAndThrowAsync(input, cancellationToken);       // 400 before any side effect

        var category = await categoryRepository.GetAsync(input.Id, cancellationToken);
        NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

        category!.Update(input.Name, input.Description);                       // invariants → 422
        if (input.IsActive is true) category.Activate();
        if (input.IsActive is false) category.Deactivate();

        await categoryRepository.UpdateAsync(category, cancellationToken);
        await unitOfWork.CommitAsync(cancellationToken);                       // data + outbox

        return CategoryModelOutput.FromCategory(category);
    }
}
```

Ordem fixa: validar input → carregar → aplicar regra no agregado → persistir → `CommitAsync` →
montar Output.

## Agregados relacionados

Ids de outro agregado são conferidos em lote antes de persistir; os ausentes geram
`RelatedAggregateException` com a lista:

```csharp
var existingIds = await categoryRepository.GetIdsListByIdsAsync(input.CategoryIds, cancellationToken);
var missingIds = input.CategoryIds.Except(existingIds).ToList();
if (missingIds.Count > 0)
    throw new RelatedAggregateException($"Related category id (or ids) not found: {string.Join(", ", missingIds)}");
```

## Listagem paginada

```csharp
// Common/PaginatedListInput.cs
public abstract record PaginatedListInput(int Page, int Size, string Search, string Sort, SearchOrder Dir)
{
    public SearchInput ToSearchInput() => new(Page, Size, Search, Sort, Dir);
}

// Common/PaginatedListOutput.cs
public abstract record PaginatedListOutput<TItem>(int Page, int Size, int Total, IReadOnlyList<TItem> Items);

// UseCases/Categories/ListCategories/ListCategoriesOutput.cs
public sealed record ListCategoriesOutput(int Page, int Size, int Total, IReadOnlyList<CategoryModelOutput> Items)
    : PaginatedListOutput<CategoryModelOutput>(Page, Size, Total, Items);
```

O caso de uso de listagem chama `SearchAsync` do repositório e mapeia os itens com
`CategoryModelOutput.FromCategory`. `_size` tem limite máximo validado no input (ex.: 100).

## Registro na DI

```csharp
// Api/Extensions/UseCasesExtensions.cs
services.Scan(scan => scan
    .FromAssemblyOf<ICreateCategory>()
    .AddClasses(classes => classes.AssignableToAny(typeof(IUseCase<,>), typeof(IUseCase<>)))
    .AsMatchingInterface()
    .WithScopedLifetime());

services.AddValidatorsFromAssemblyContaining<ICreateCategory>();
```

Scrutor (MIT) registra cada classe pela interface de mesmo nome. Sem Scrutor, registre um a um com
`AddScoped<ICreateCategory, CreateCategory>()`.
