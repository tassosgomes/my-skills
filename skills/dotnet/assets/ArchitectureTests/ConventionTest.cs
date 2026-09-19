using ArchUnitNET.xUnitV3;
using static ArchUnitNET.Fluent.ArchRuleDefinition;
using static ProjectName.ArchitectureTests.ProjectArchitecture;

namespace ProjectName.ArchitectureTests;

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

    // An endpoint translates HTTP into a use case. Reaching a repository or IUnitOfWork from the
    // endpoint puts orchestration in the wrong layer; OnlyCompositionRootUsesInfra does not catch
    // it, because these ports live in Domain and Api may legitimately see Domain.
    [Fact(DisplayName = nameof(EndpointsDoNotUsePersistencePorts))]
    [Trait("Architecture", "Conventions")]
    public void EndpointsDoNotUsePersistencePorts()
        => Types().That().Are(Endpoints)
            .Should().NotDependOnAny(PersistencePorts)
            .Check(Architecture);

    // The HTTP contract is built from use-case Outputs. An entity reaching it leaks the domain
    // model into the public surface and couples the contract to an invariant change.
    [Fact(DisplayName = nameof(HttpContractsDoNotExposeDomainEntities))]
    [Trait("Architecture", "Conventions")]
    public void HttpContractsDoNotExposeDomainEntities()
        => Types().That().Are(ApiContracts)
            .Should().NotDependOnAny(DomainEntities)
            .Check(Architecture);
}
