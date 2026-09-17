# Testes de Arquitetura — ArchUnitNET

Um projeto `tests/ProjectName.ArchitectureTests` por solution. Ele carrega os assemblies de `src/`
e falha quando uma dependência atravessa a fronteira definida em `dotnet-architecture`. Uso de
`Guid.NewGuid()`/`DateTime.Now` não é verificado aqui: `BannedSymbols.txt` quebra o build antes.

```xml
<!-- tests/ProjectName.ArchitectureTests/ProjectName.ArchitectureTests.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" />
    <PackageReference Include="xunit.v3" />
    <PackageReference Include="xunit.runner.visualstudio" />
    <PackageReference Include="TngTech.ArchUnitNET.xUnitV3" />
    <ProjectReference Include="../../src/ProjectName.Api/ProjectName.Api.csproj" />
  </ItemGroup>
</Project>
```

Rode em `Debug` (padrão de `dotnet test`): ArchUnitNET lê o IL e o Release pode otimizar dependências.

## Estrutura

```text
tests/ProjectName.ArchitectureTests/
├── ProjectArchitecture.cs          # assemblies carregados e camadas nomeadas
├── LayerDependencyTest.cs          # grafo de dependências
├── ConventionTest.cs               # sealed, localização de casos de uso, pacotes proibidos
└── ModuleBoundaryTest.cs           # só no Monolito Modular
```

## Arquitetura carregada

```csharp
// ProjectArchitecture.cs
using ArchUnitNET.Domain;
using ArchUnitNET.Fluent;
using ArchUnitNET.Loader;
using static ArchUnitNET.Fluent.ArchRuleDefinition;
using Assembly = System.Reflection.Assembly;

namespace ProjectName.ArchitectureTests;

internal static class ProjectArchitecture
{
    private static readonly Assembly DomainAssembly = typeof(Category).Assembly;
    private static readonly Assembly ApplicationAssembly = typeof(IUseCase<,>).Assembly;
    private static readonly Assembly InfraDataAssembly = typeof(ProjectNameDbContext).Assembly;
    private static readonly Assembly InfraMessagingAssembly = typeof(RabbitMqPublisher).Assembly;
    private static readonly Assembly ApiAssembly = typeof(CategoryEndpoints).Assembly;

    public static readonly Architecture Architecture = new ArchLoader()
        .LoadAssemblies(DomainAssembly, ApplicationAssembly, InfraDataAssembly, InfraMessagingAssembly, ApiAssembly)
        .Build();

    public static readonly IObjectProvider<IType> DomainLayer = Types().That().ResideInAssembly(DomainAssembly).As("Domain");
    public static readonly IObjectProvider<IType> ApplicationLayer = Types().That().ResideInAssembly(ApplicationAssembly).As("Application");
    public static readonly IObjectProvider<IType> InfraLayer = Types().That().ResideInAssembly(InfraDataAssembly)
        .Or().ResideInAssembly(InfraMessagingAssembly).As("Infra");
    public static readonly IObjectProvider<IType> ApiLayer = Types().That().ResideInAssembly(ApiAssembly).As("Api");

    public static readonly IObjectProvider<IType> UseCases =
        Types().That().HaveFullNameContaining("ProjectName.Application.UseCases.").As("Use cases");
    public static readonly IObjectProvider<IType> ApiExtensions =
        Types().That().HaveFullNameContaining("ProjectName.Api.Extensions.").As("Composition root");

    // Types(true) includes referenced external types, required to match framework namespaces.
    public static readonly IObjectProvider<IType> EntityFrameworkCore =
        Types(true).That().HaveFullNameContaining("Microsoft.EntityFrameworkCore").As("EF Core");
    public static readonly IObjectProvider<IType> AspNetCore =
        Types(true).That().HaveFullNameContaining("Microsoft.AspNetCore").As("ASP.NET Core");
    public static readonly IObjectProvider<IType> RabbitMqClient =
        Types(true).That().HaveFullNameContaining("RabbitMQ.Client").As("RabbitMQ.Client");
    public static readonly IObjectProvider<IType> MediatR =
        Types(true).That().HaveFullNameContaining("MediatR").As("MediatR");
}
```

## Regras — API simples (e cada microsserviço)

```csharp
// LayerDependencyTest.cs
using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;
using static ProjectName.ArchitectureTests.ProjectArchitecture;

public sealed class LayerDependencyTest
{
    [Fact(DisplayName = nameof(DomainDependsOnNoOtherLayerNorFramework))]
    [Trait("Architecture", "Layers - Dependencies")]
    public void DomainDependsOnNoOtherLayerNorFramework()
        => Types().That().Are(DomainLayer)
            .Should().NotDependOnAny(ApplicationLayer)
            .AndShould().NotDependOnAny(InfraLayer)
            .AndShould().NotDependOnAny(ApiLayer)
            .AndShould().NotDependOnAny(EntityFrameworkCore)
            .AndShould().NotDependOnAny(AspNetCore)
            .Check(Architecture);

    [Fact(DisplayName = nameof(ApplicationDependsOnlyOnDomain))]
    [Trait("Architecture", "Layers - Dependencies")]
    public void ApplicationDependsOnlyOnDomain()
        => Types().That().Are(ApplicationLayer)
            .Should().NotDependOnAny(InfraLayer)
            .AndShould().NotDependOnAny(ApiLayer)
            .AndShould().NotDependOnAny(EntityFrameworkCore)
            .AndShould().NotDependOnAny(AspNetCore)
            .AndShould().NotDependOnAny(RabbitMqClient)
            .Check(Architecture);

    [Fact(DisplayName = nameof(InfraDoesNotUseApiNorUseCases))]
    [Trait("Architecture", "Layers - Dependencies")]
    public void InfraDoesNotUseApiNorUseCases()
        => Types().That().Are(InfraLayer)
            .Should().NotDependOnAny(ApiLayer)
            .AndShould().NotDependOnAny(UseCases)
            .Check(Architecture);

    [Fact(DisplayName = nameof(OnlyCompositionRootUsesInfra))]
    [Trait("Architecture", "Layers - Dependencies")]
    public void OnlyCompositionRootUsesInfra()
        => Types().That().Are(ApiLayer).And().AreNot(ApiExtensions)
            .Should().NotDependOnAny(InfraLayer)
            .AndShould().NotDependOnAny(EntityFrameworkCore)
            .Check(Architecture);
}
```

```csharp
// ConventionTest.cs
public sealed class ConventionTest
{
    [Fact(DisplayName = nameof(UseCasesAreSealedAndLiveInUseCasesNamespace))]
    [Trait("Architecture", "Conventions")]
    public void UseCasesAreSealedAndLiveInUseCasesNamespace()
        => Classes().That().ImplementInterface(typeof(IUseCase<,>)).Or().ImplementInterface(typeof(IUseCase<>))
            .Should().BeSealed()
            .AndShould().Be(UseCases)
            .Check(Architecture);

    [Fact(DisplayName = nameof(NoMediatR))]
    [Trait("Architecture", "Conventions")]
    public void NoMediatR()
        => Types().That().Are(DomainLayer).Or().Are(ApplicationLayer).Or().Are(InfraLayer).Or().Are(ApiLayer)
            .Should().NotDependOnAny(MediatR)
            .Check(Architecture);
}
```

Microsserviço acrescenta: `Domain` não depende de `ProjectName.Contracts`
(`Types(true).That().HaveFullNameContaining("ProjectName.Contracts")`).

## Regras — Monolito Modular

Mesmas regras de camada aplicadas a cada módulo (providers por prefixo de namespace
`ProjectName.{Modulo}.Domain.`), mais a fronteira entre módulos como `Theory`:

```csharp
// ModuleBoundaryTest.cs
public sealed class ModuleBoundaryTest
{
    private static readonly string[] Modules = ["Orders", "Billing"];

    public static TheoryData<string, string> ModulePairs()
    {
        var pairs = new TheoryData<string, string>();
        foreach (var module in Modules)
            foreach (var other in Modules.Where(other => other != module))
                pairs.Add(module, other);
        return pairs;
    }

    [Theory(DisplayName = nameof(ModuleOnlySeesContractsOfOtherModule))]
    [Trait("Architecture", "Modules - Boundaries")]
    [MemberData(nameof(ModulePairs))]
    public void ModuleOnlySeesContractsOfOtherModule(string module, string otherModule)
        => Types().That().HaveFullNameContaining($"ProjectName.{module}.")
            .Should().NotDependOnAny(Types().That().HaveFullNameContaining($"ProjectName.{otherModule}.")
                .And().DoNotHaveFullNameContaining($"ProjectName.{otherModule}.Contracts."))
            .Check(Architecture);

    [Fact(DisplayName = nameof(SharedKernelDependsOnNoModule))]
    [Trait("Architecture", "Modules - Boundaries")]
    public void SharedKernelDependsOnNoModule()
        => Types().That().HaveFullNameContaining("ProjectName.SharedKernel.")
            .Should().NotDependOnAny(Types().That().HaveFullNameContaining("ProjectName.Orders.")
                .Or().HaveFullNameContaining("ProjectName.Billing."))
            .Check(Architecture);

    [Fact(DisplayName = nameof(HostOnlyUsesModuleApis))]
    [Trait("Architecture", "Modules - Boundaries")]
    public void HostOnlyUsesModuleApis()
        => Types().That().HaveFullNameContaining("ProjectName.Host.")
            .Should().NotDependOnAny(Types().That().HaveFullNameContaining(".Domain.")
                .Or().HaveFullNameContaining(".Application.")
                .Or().HaveFullNameContaining(".Infra."))
            .Check(Architecture);
}
```

Ao criar um módulo, adicione-o a `Modules` e ao `LoadAssemblies`.

## Regras de manutenção

- Regra nova nasce de uma decisão de `dotnet-architecture`; não crie regra para gosto pessoal.
- Exceção a uma regra é explícita no próprio teste (`AreNot(...)`) com o motivo em `Because(...)`,
  nunca removendo a regra.
- Todo assembly de `src/` está no `LoadAssemblies`; assembly esquecido é fronteira sem verificação.
- Providers de camada terminam em `Layer` (`DomainLayer`): dentro de `ProjectName.ArchitectureTests`,
  `Domain` resolve para o namespace `ProjectName.Domain` e não compila.
- Não use `WithoutRequiringPositiveResults()`: no ArchUnitNET 0.13 uma regra cujo filtro não encontra
  tipos falha, e isso quase sempre é prefixo de namespace errado.
