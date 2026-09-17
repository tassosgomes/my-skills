# Testes Unitários — Fixtures, Geradores e Casos de Uso

xUnit + AwesomeAssertions + Moq + Bogus. Sem banco, sem DI container, sem rede.

## Estrutura

```text
tests/
├── ProjectName.Tests.Common/
│   ├── BaseFixture.cs
│   └── DataGenerators/
│       └── CategoryDataGenerator.cs
└── ProjectName.UnitTests/
    ├── Domain/
    │   └── Entities/
    │       └── Categories/
    │           ├── CategoryTest.cs
    │           └── CategoryTestFixture.cs
    └── Application/
        └── UseCases/
            └── Categories/
                ├── Common/
                │   └── CategoryUseCasesBaseFixture.cs
                └── CreateCategory/
                    ├── CreateCategoryTest.cs
                    ├── CreateCategoryTestFixture.cs
                    └── CreateCategoryTestDataGenerator.cs
```

## Dados compartilhados (Tests.Common)

Os geradores ficam em um só lugar e são reutilizados pelos três projetos de teste.

```csharp
// Tests.Common/BaseFixture.cs
namespace ProjectName.Tests.Common;

public abstract class BaseFixture
{
    protected BaseFixture() => Faker = new Faker("pt_BR");

    public Faker Faker { get; }

    public bool GetRandomBoolean() => Faker.Random.Bool();
}
```

```csharp
// Tests.Common/DataGenerators/CategoryDataGenerator.cs
namespace ProjectName.Tests.Common.DataGenerators;

public sealed class CategoryDataGenerator
{
    private readonly Faker _faker;

    public CategoryDataGenerator(Faker faker) => _faker = faker;

    public string GetValidName()
    {
        var name = string.Empty;
        while (name.Length < 3)
            name = _faker.Commerce.Categories(1)[0];

        return name.Length > 255 ? name[..255] : name;
    }

    public string GetValidDescription()
    {
        var description = _faker.Commerce.ProductDescription();
        return description.Length > 10_000 ? description[..10_000] : description;
    }

    public string GetTooLongName() => _faker.Random.String2(256);

    public string GetTooLongDescription() => _faker.Random.String2(10_001);

    public Category GetValidCategory(bool? isActive = null)
        => Category.Create(GetValidName(), GetValidDescription(), isActive ?? _faker.Random.Bool());
}
```

## Fixtures em camadas

```csharp
// UnitTests/Application/UseCases/Categories/Common/CategoryUseCasesBaseFixture.cs
public abstract class CategoryUseCasesBaseFixture : BaseFixture
{
    protected CategoryUseCasesBaseFixture() => Categories = new CategoryDataGenerator(Faker);

    public CategoryDataGenerator Categories { get; }

    public Mock<ICategoryRepository> GetRepositoryMock() => new();

    public Mock<IUnitOfWork> GetUnitOfWorkMock() => new();
}
```

```csharp
// UnitTests/Application/UseCases/Categories/CreateCategory/CreateCategoryTestFixture.cs
[CollectionDefinition(nameof(CreateCategoryTestFixture))]
public sealed class CreateCategoryTestFixtureCollection : ICollectionFixture<CreateCategoryTestFixture>;

public sealed class CreateCategoryTestFixture : CategoryUseCasesBaseFixture
{
    public CreateCategoryInput GetValidInput()
        => new(Categories.GetValidName(), Categories.GetValidDescription(), GetRandomBoolean());

    public CreateCategoryInput GetInputWithShortName() => GetValidInput() with { Name = "ab" };

    public CreateCategoryInput GetInputWithTooLongName() => GetValidInput() with { Name = Categories.GetTooLongName() };

    public CreateCategoryInput GetInputWithTooLongDescription()
        => GetValidInput() with { Description = Categories.GetTooLongDescription() };
}
```

## Gerador de casos parametrizados

```csharp
// UnitTests/Application/UseCases/Categories/CreateCategory/CreateCategoryTestDataGenerator.cs
public static class CreateCategoryTestDataGenerator
{
    public static TheoryData<CreateCategoryInput, string> GetInvalidInputs()
    {
        var fixture = new CreateCategoryTestFixture();

        return new TheoryData<CreateCategoryInput, string>
        {
            { fixture.GetInputWithShortName(), "Name should be at least 3 characters long" },
            { fixture.GetInputWithTooLongName(), "Name should be less or equal 255 characters long" },
            { fixture.GetInputWithTooLongDescription(), "Description should be less or equal 10000 characters long" }
        };
    }
}
```

## Teste de caso de uso

```csharp
// UnitTests/Application/UseCases/Categories/CreateCategory/CreateCategoryTest.cs
[Collection(nameof(CreateCategoryTestFixture))]
public sealed class CreateCategoryTest
{
    private readonly CreateCategoryTestFixture _fixture;

    public CreateCategoryTest(CreateCategoryTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = nameof(CreateCategory))]
    [Trait("Application", "CreateCategory - Use Cases")]
    public async Task CreateCategory()
    {
        // Arrange
        var repositoryMock = _fixture.GetRepositoryMock();
        var unitOfWorkMock = _fixture.GetUnitOfWorkMock();
        var useCase = new UseCase.CreateCategory(repositoryMock.Object, unitOfWorkMock.Object);
        var input = _fixture.GetValidInput();

        // Act
        var output = await useCase.ExecuteAsync(input, CancellationToken.None);

        // Assert
        repositoryMock.Verify(r => r.InsertAsync(It.IsAny<Category>(), It.IsAny<CancellationToken>()), Times.Once);
        unitOfWorkMock.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);

        output.Id.Should().NotBeEmpty();
        output.Name.Should().Be(input.Name);
        output.Description.Should().Be(input.Description);
        output.IsActive.Should().Be(input.IsActive);
        output.CreatedAt.Should().NotBe(default);
    }

    [Theory(DisplayName = nameof(ThrowWhenInputIsInvalid))]
    [Trait("Application", "CreateCategory - Use Cases")]
    [MemberData(nameof(CreateCategoryTestDataGenerator.GetInvalidInputs), MemberType = typeof(CreateCategoryTestDataGenerator))]
    public async Task ThrowWhenInputIsInvalid(CreateCategoryInput input, string expectedMessage)
    {
        var repositoryMock = _fixture.GetRepositoryMock();
        var unitOfWorkMock = _fixture.GetUnitOfWorkMock();
        var useCase = new UseCase.CreateCategory(repositoryMock.Object, unitOfWorkMock.Object);

        var action = () => useCase.ExecuteAsync(input, CancellationToken.None);

        await action.Should().ThrowAsync<EntityValidationException>().WithMessage(expectedMessage);
        unitOfWorkMock.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
```

`using UseCase = ProjectName.Application.UseCases.Categories.CreateCategory;` resolve o conflito
entre a classe de teste e o caso de uso de mesmo nome.

## Teste de "não encontrado"

```csharp
[Fact(DisplayName = nameof(ThrowNotFoundWhenCategoryDoesNotExist))]
[Trait("Application", "GetCategory - Use Cases")]
public async Task ThrowNotFoundWhenCategoryDoesNotExist()
{
    var repositoryMock = _fixture.GetRepositoryMock();
    repositoryMock
        .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
        .ReturnsAsync((Category?)null);
    var useCase = new UseCase.GetCategory(repositoryMock.Object);
    var id = Guid.NewGuid();

    var action = () => useCase.ExecuteAsync(new GetCategoryInput(id), CancellationToken.None);

    await action.Should().ThrowAsync<NotFoundException>().WithMessage($"Category '{id}' not found");
}
```

## Teste de agregado

```csharp
// UnitTests/Domain/Entities/Categories/CategoryTestFixture.cs
[CollectionDefinition(nameof(CategoryTestFixture))]
public sealed class CategoryTestFixtureCollection : ICollectionFixture<CategoryTestFixture>;

public sealed class CategoryTestFixture : BaseFixture
{
    public CategoryTestFixture() => Categories = new CategoryDataGenerator(Faker);

    public CategoryDataGenerator Categories { get; }
}
```

```csharp
// UnitTests/Domain/Entities/Categories/CategoryTest.cs
[Collection(nameof(CategoryTestFixture))]
public sealed class CategoryTest
{
    private readonly CategoryTestFixture _fixture;

    public CategoryTest(CategoryTestFixture fixture) => _fixture = fixture;

    [Fact(DisplayName = nameof(CreateRaisesCategoryCreatedEvent))]
    [Trait("Domain", "Category - Aggregates")]
    public void CreateRaisesCategoryCreatedEvent()
    {
        var category = _fixture.Categories.GetValidCategory();

        category.Events.Should().ContainSingle()
            .Which.Should().BeOfType<CategoryCreatedEvent>()
            .Which.CategoryId.Should().Be(category.Id);
    }

    [Theory(DisplayName = nameof(ThrowWhenNameIsEmpty))]
    [Trait("Domain", "Category - Aggregates")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void ThrowWhenNameIsEmpty(string? name)
    {
        var action = () => Category.Create(name!, _fixture.Categories.GetValidDescription());

        action.Should().Throw<EntityValidationException>().WithMessage("Name should not be empty or null");
    }
}
```

## Regras

- `async Task` sempre; `async void` faz o xUnit terminar o teste antes da falha.
- Datas: compare com tolerância (`BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1))`), nunca
  igualdade exata com `DateTime.UtcNow`.
- `Verify` apenas das interações que fazem parte do comportamento (commit feito ou não feito);
  não verifique cada chamada interna.
- Um gerador de dados por agregado em `Tests.Common`; fixtures específicas só combinam geradores.
