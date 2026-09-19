using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;
using static ProjectName.ArchitectureTests.ProjectArchitecture;

namespace ProjectName.ArchitectureTests;

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
