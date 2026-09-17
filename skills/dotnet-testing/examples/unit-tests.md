# Testes Unitários — Fixtures, Geradores e Casos de Uso

Sem banco, sem container de DI, sem rede.

## Estrutura

```text
tests/
├── ProjectName.Tests.Common/
│   ├── BaseFixture.cs
│   └── DataGenerators/
│       └── CategoryDataGenerator.cs
└── ProjectName.UnitTests/
    ├── Domain/Entities/Categories/
    │   ├── CategoryTest.cs
    │   └── CategoryTestFixture.cs
    └── Application/UseCases/Categories/
        ├── Common/
        │   └── CategoryUseCasesBaseFixture.cs
        └── CreateCategory/
            ├── CreateCategoryTest.cs
            ├── CreateCategoryTestFixture.cs
            └── CreateCategoryTestDataGenerator.cs
```

## Dados compartilhados

```csharp
// Tests.Common/BaseFixture.cs
public abstract class BaseFixture
{
    protected BaseFixture() => Faker = new Faker("pt_BR");

    public Faker Faker { get; }

    public bool GetRandomBoolean() => Faker.Random.Bool();
}

// Tests.Common/DataGenerators/CategoryDataGenerator.cs — respects the aggregate limits
public sealed class CategoryDataGenerator(Faker faker)
{
    public string GetValidName() { /* 3..255 chars */ }
    public string GetValidDescription() { /* ..10_000 chars */ }
    public string GetTooLongName() => faker.Random.String2(256);
    public Category GetValidCategory(bool? isActive = null)
        => Category.Create(GetValidName(), GetValidDescription(), isActive ?? faker.Random.Bool());
}
```

## Fixtures em camadas

```csharp
// Application/UseCases/Categories/Common/CategoryUseCasesBaseFixture.cs
public abstract class CategoryUseCasesBaseFixture : BaseFixture
{
    protected CategoryUseCasesBaseFixture() => Categories = new CategoryDataGenerator(Faker);

    public CategoryDataGenerator Categories { get; }

    public Mock<ICategoryRepository> GetRepositoryMock() => new();

    public Mock<IUnitOfWork> GetUnitOfWorkMock() => new();
}

// Application/UseCases/Categories/CreateCategory/CreateCategoryTestFixture.cs
[CollectionDefinition(nameof(CreateCategoryTestFixture))]
public sealed class CreateCategoryTestFixtureCollection : ICollectionFixture<CreateCategoryTestFixture>;

public sealed class CreateCategoryTestFixture : CategoryUseCasesBaseFixture
{
    public CreateCategoryInput GetValidInput()
        => new(Categories.GetValidName(), Categories.GetValidDescription(), GetRandomBoolean());

    public CreateCategoryInput GetInputWithShortName() => GetValidInput() with { Name = "ab" };
}

// Application/UseCases/Categories/CreateCategory/CreateCategoryTestDataGenerator.cs
public static class CreateCategoryTestDataGenerator
{
    public static TheoryData<CreateCategoryInput, string> GetInvalidInputs()
    {
        var fixture = new CreateCategoryTestFixture();
        return new()
        {
            { fixture.GetInputWithShortName(), "Name should be at least 3 characters long" }
        };
    }
}
```

## Caso de uso

```csharp
// Application/UseCases/Categories/CreateCategory/CreateCategoryTest.cs
using UseCase = ProjectName.Application.UseCases.Categories.CreateCategory;

[Collection(nameof(CreateCategoryTestFixture))]
public sealed class CreateCategoryTest(CreateCategoryTestFixture fixture)
{
    [Fact(DisplayName = nameof(CreateCategory))]
    [Trait("Application", "CreateCategory - Use Cases")]
    public async Task CreateCategory()
    {
        // Arrange
        var repositoryMock = fixture.GetRepositoryMock();
        var unitOfWorkMock = fixture.GetUnitOfWorkMock();
        var useCase = new UseCase.CreateCategory(repositoryMock.Object, unitOfWorkMock.Object);
        var input = fixture.GetValidInput();

        // Act
        var output = await useCase.ExecuteAsync(input, TestContext.Current.CancellationToken);

        // Assert
        repositoryMock.Verify(r => r.InsertAsync(It.IsAny<Category>(), It.IsAny<CancellationToken>()), Times.Once);
        unitOfWorkMock.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        output.Id.Should().NotBeEmpty();
        output.Name.Should().Be(input.Name);
        output.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Theory(DisplayName = nameof(ThrowWhenInputIsInvalid))]
    [Trait("Application", "CreateCategory - Use Cases")]
    [MemberData(nameof(CreateCategoryTestDataGenerator.GetInvalidInputs), MemberType = typeof(CreateCategoryTestDataGenerator))]
    public async Task ThrowWhenInputIsInvalid(CreateCategoryInput input, string expectedMessage)
    {
        var unitOfWorkMock = fixture.GetUnitOfWorkMock();
        var useCase = new UseCase.CreateCategory(fixture.GetRepositoryMock().Object, unitOfWorkMock.Object);

        var action = () => useCase.ExecuteAsync(input, TestContext.Current.CancellationToken);

        await action.Should().ThrowAsync<EntityValidationException>().WithMessage(expectedMessage);
        unitOfWorkMock.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Never);
    }
}
```

O alias `UseCase` resolve o conflito entre a classe de teste e o caso de uso de mesmo nome.

## Agregado

```csharp
[Fact(DisplayName = nameof(CreateRaisesCategoryCreatedEvent))]
[Trait("Domain", "Category - Aggregates")]
public void CreateRaisesCategoryCreatedEvent()
{
    var category = fixture.Categories.GetValidCategory();

    category.Id.Version.Should().Be(7);
    category.Events.Should().ContainSingle()
        .Which.Should().BeOfType<CategoryCreatedEvent>()
        .Which.CategoryId.Should().Be(category.Id);
}
```
