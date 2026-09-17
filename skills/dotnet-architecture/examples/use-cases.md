# Casos de Uso — Application

Cada caso de uso é uma classe com interface própria, em uma pasta com tudo o que ele precisa. O
controller injeta a interface diretamente: não há MediatR, dispatcher ou handler resolvido por
reflection.

## Estrutura

```text
ProjectName.Application/
├── Common/
│   ├── IUseCase.cs
│   ├── PaginatedListInput.cs
│   └── PaginatedListOutput.cs
├── Exceptions/
│   ├── UseCaseException.cs
│   ├── NotFoundException.cs
│   └── RelatedAggregateException.cs
├── Interfaces/                          # portas técnicas (IStorageService, IEmailSender)
└── UseCases/
    └── Categories/
        ├── Common/
        │   └── CategoryModelOutput.cs
        ├── CreateCategory/
        │   ├── ICreateCategory.cs
        │   ├── CreateCategory.cs
        │   └── CreateCategoryInput.cs
        ├── GetCategory/
        │   ├── IGetCategory.cs
        │   ├── GetCategory.cs
        │   └── GetCategoryInput.cs
        ├── UpdateCategory/
        │   ├── IUpdateCategory.cs
        │   ├── UpdateCategory.cs
        │   ├── UpdateCategoryInput.cs
        │   └── UpdateCategoryInputValidator.cs
        └── ListCategories/
            ├── IListCategories.cs
            ├── ListCategories.cs
            ├── ListCategoriesInput.cs
            └── ListCategoriesOutput.cs
```

- Um arquivo por tipo; o nome da pasta é o nome do caso de uso.
- `Common/` do agregado guarda só o que dois ou mais casos de uso compartilham.
- O validator existe apenas quando o input tem regra de formato que o domínio não cobre.

## Contratos base

```csharp
// Common/IUseCase.cs
namespace ProjectName.Application.Common;

public interface IUseCase<in TInput, TOutput>
{
    Task<TOutput> ExecuteAsync(TInput input, CancellationToken cancellationToken);
}

public interface IUseCase<in TInput>
{
    Task ExecuteAsync(TInput input, CancellationToken cancellationToken);
}
```

```csharp
// Exceptions/UseCaseException.cs
// Not named ApplicationException: it would clash with System.ApplicationException.
public abstract class UseCaseException : Exception
{
    protected UseCaseException(string message) : base(message) { }
}

// Exceptions/NotFoundException.cs
public sealed class NotFoundException : UseCaseException
{
    public NotFoundException(string message) : base(message) { }

    public static T ThrowIfNull<T>(T? value, string message) where T : class
        => value ?? throw new NotFoundException(message);
}

// Exceptions/RelatedAggregateException.cs
public sealed class RelatedAggregateException : UseCaseException
{
    public RelatedAggregateException(string message) : base(message) { }
}
```

## Output compartilhado com mapeamento manual

```csharp
// UseCases/Categories/Common/CategoryModelOutput.cs
namespace ProjectName.Application.UseCases.Categories.Common;

public sealed record CategoryModelOutput(
    Guid Id,
    string Name,
    string Description,
    bool IsActive,
    DateTime CreatedAt)
{
    public static CategoryModelOutput FromCategory(Category category)
        => new(category.Id, category.Name, category.Description, category.IsActive, category.CreatedAt);
}
```

## Criar

```csharp
// UseCases/Categories/CreateCategory/CreateCategoryInput.cs
public sealed record CreateCategoryInput(string Name, string? Description = null, bool IsActive = true);

// UseCases/Categories/CreateCategory/ICreateCategory.cs
public interface ICreateCategory : IUseCase<CreateCategoryInput, CategoryModelOutput>;

// UseCases/Categories/CreateCategory/CreateCategory.cs
public sealed class CreateCategory : ICreateCategory
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateCategory(ICategoryRepository categoryRepository, IUnitOfWork unitOfWork)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<CategoryModelOutput> ExecuteAsync(CreateCategoryInput input, CancellationToken cancellationToken)
    {
        var category = Category.Create(input.Name, input.Description ?? string.Empty, input.IsActive);

        await _categoryRepository.InsertAsync(category, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken); // data + outbox in the same transaction

        return CategoryModelOutput.FromCategory(category);
    }
}
```

## Buscar por Id

O repositório retorna `null`; o caso de uso decide que isso é um 404.

```csharp
public sealed record GetCategoryInput(Guid Id);

public interface IGetCategory : IUseCase<GetCategoryInput, CategoryModelOutput>;

public sealed class GetCategory : IGetCategory
{
    private readonly ICategoryRepository _categoryRepository;

    public GetCategory(ICategoryRepository categoryRepository) => _categoryRepository = categoryRepository;

    public async Task<CategoryModelOutput> ExecuteAsync(GetCategoryInput input, CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetAsync(input.Id, cancellationToken);
        NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

        return CategoryModelOutput.FromCategory(category!);
    }
}
```

O mesmo `null` serve para regras de pré-condição sem try/catch, por exemplo
`if (await _repository.GetByNameAsync(name, ct) is not null) throw new EntityValidationException(...)`.

## Atualizar com validator explícito

```csharp
public sealed record UpdateCategoryInput(Guid Id, string Name, string? Description = null, bool? IsActive = null);

public sealed class UpdateCategoryInputValidator : AbstractValidator<UpdateCategoryInput>
{
    public UpdateCategoryInputValidator()
    {
        RuleFor(input => input.Id).NotEmpty();
    }
}

public interface IUpdateCategory : IUseCase<UpdateCategoryInput, CategoryModelOutput>;

public sealed class UpdateCategory : IUpdateCategory
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<UpdateCategoryInput> _validator;

    public UpdateCategory(
        ICategoryRepository categoryRepository,
        IUnitOfWork unitOfWork,
        IValidator<UpdateCategoryInput> validator)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _validator = validator;
    }

    public async Task<CategoryModelOutput> ExecuteAsync(UpdateCategoryInput input, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(input, cancellationToken); // 400 before touching the database

        var category = await _categoryRepository.GetAsync(input.Id, cancellationToken);
        NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

        category!.Update(input.Name, input.Description);
        if (input.IsActive is true) category.Activate();
        if (input.IsActive is false) category.Deactivate();

        await _categoryRepository.UpdateAsync(category, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken);

        return CategoryModelOutput.FromCategory(category);
    }
}
```

## Validar agregados relacionados

```csharp
public sealed class CreateGenre : ICreateGenre
{
    // ... constructor with IGenreRepository, ICategoryRepository, IUnitOfWork

    public async Task<GenreModelOutput> ExecuteAsync(CreateGenreInput input, CancellationToken cancellationToken)
    {
        var genre = Genre.Create(input.Name, input.IsActive);

        if (input.CategoryIds is { Count: > 0 })
        {
            await EnsureCategoriesExistAsync(input.CategoryIds, cancellationToken);
            input.CategoryIds.ToList().ForEach(genre.AddCategory);
        }

        await _genreRepository.InsertAsync(genre, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken);

        return GenreModelOutput.FromGenre(genre);
    }

    private async Task EnsureCategoriesExistAsync(IReadOnlyList<Guid> categoryIds, CancellationToken cancellationToken)
    {
        var existingIds = await _categoryRepository.GetIdsListByIdsAsync(categoryIds, cancellationToken);
        var missingIds = categoryIds.Except(existingIds).ToList();

        if (missingIds.Count > 0)
            throw new RelatedAggregateException($"Related category id (or ids) not found: {string.Join(", ", missingIds)}");
    }
}
```

## Listar com paginação

```csharp
// Common/PaginatedListInput.cs
public abstract record PaginatedListInput(int Page, int Size, string Search, string Sort, SearchOrder Dir)
{
    public SearchInput ToSearchInput() => new(Page, Size, Search, Sort, Dir);
}

// Common/PaginatedListOutput.cs
public abstract record PaginatedListOutput<TItem>(int Page, int Size, int Total, IReadOnlyList<TItem> Items);

// UseCases/Categories/ListCategories/ListCategoriesInput.cs
public sealed record ListCategoriesInput(
    int Page = 1,
    int Size = 10,
    string Search = "",
    string Sort = "",
    SearchOrder Dir = SearchOrder.Asc)
    : PaginatedListInput(Page, Size, Search, Sort, Dir);

// UseCases/Categories/ListCategories/ListCategoriesOutput.cs
public sealed record ListCategoriesOutput(int Page, int Size, int Total, IReadOnlyList<CategoryModelOutput> Items)
    : PaginatedListOutput<CategoryModelOutput>(Page, Size, Total, Items);

// UseCases/Categories/ListCategories/ListCategories.cs
public sealed class ListCategories : IListCategories
{
    private readonly ICategoryRepository _categoryRepository;

    public ListCategories(ICategoryRepository categoryRepository) => _categoryRepository = categoryRepository;

    public async Task<ListCategoriesOutput> ExecuteAsync(ListCategoriesInput input, CancellationToken cancellationToken)
    {
        var result = await _categoryRepository.SearchAsync(input.ToSearchInput(), cancellationToken);

        return new ListCategoriesOutput(
            result.Page,
            result.Size,
            result.Total,
            result.Items.Select(CategoryModelOutput.FromCategory).ToList());
    }
}
```

## Registro na DI

Com Scrutor (MIT), cada classe é registrada pela interface de mesmo nome (`CreateCategory` →
`ICreateCategory`):

```csharp
// Api/Extensions/UseCasesExtensions.cs (see dotnet-program-setup)
public static class UseCasesExtensions
{
    public static IServiceCollection AddUseCasesConfiguration(this IServiceCollection services)
    {
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

Sem Scrutor, registre manualmente: `services.AddScoped<ICreateCategory, CreateCategory>();`.

## Por que não há dispatcher

- A interface específica (`ICreateCategory`) já dá desacoplamento e mock no teste do controller.
- Sem reflection nem lookup por tipo: o fluxo é navegável com "Go to implementation".
- O custo é não ter pipeline genérico; validação e log ficam explícitos no caso de uso. Se um
  comportamento transversal se repetir em muitos casos de uso, trate-o na borda (middleware,
  exception handler, filtro) antes de introduzir um mediator.
