package com.company.project.architecture;

import static com.company.project.architecture.ProjectArchitecture.API;
import static com.company.project.architecture.ProjectArchitecture.APPLICATION;
import static com.company.project.architecture.ProjectArchitecture.DOMAIN;
import static com.company.project.architecture.ProjectArchitecture.INFRA;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.company.project.application.common.UseCase;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

// Maven scopes already stop most of this at compile time (domain has no Spring on its classpath,
// api sees infra only at runtime). These rules catch what a scope cannot: a dependency added to
// the wrong pom, and package-level boundaries inside a module.
@AnalyzeClasses(packages = ProjectArchitecture.ROOT, importOptions = ImportOption.DoNotIncludeTests.class)
class LayerDependencyTest {

    // An allow-list, not a deny-list: a new library in the domain is a decision, not an accident.
    @ArchTest
    static final ArchRule domainDependsOnlyOnJdkAndApprovedLibraries = classes()
            .that()
            .resideInAPackage(DOMAIN)
            .should()
            .onlyDependOnClassesThat()
            .resideInAnyPackage(DOMAIN, "java..", "org.jspecify..", "com.github.f4b6a3.uuid..");

    @ArchTest
    static final ArchRule applicationDoesNotKnowAdaptersNorTransport = noClasses()
            .that()
            .resideInAPackage(APPLICATION)
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage(
                    INFRA,
                    API,
                    "jakarta.persistence..",
                    "org.hibernate..",
                    "org.springframework.data..",
                    "org.springframework.jdbc..",
                    "org.springframework.web..",
                    "org.springframework.http..",
                    "org.springframework.amqp..",
                    "org.springframework.cache..",
                    "tools.jackson..");

    @ArchTest
    static final ArchRule infraDoesNotUseApi = noClasses()
            .that()
            .resideInAPackage(INFRA)
            .should()
            .dependOnClassesThat()
            .resideInAPackage(API);

    // Infra implements application ports and may return Outputs; it never runs a use case.
    @ArchTest
    static final ArchRule infraDoesNotCallUseCases = noClasses()
            .that()
            .resideInAPackage(INFRA)
            .should()
            .dependOnClassesThat()
            .areAnnotatedWith(UseCase.class);

    // Composition is component scanning over the runtime classpath; api code never names an adapter.
    @ArchTest
    static final ArchRule apiDoesNotUseInfra = noClasses()
            .that()
            .resideInAPackage(API)
            .should()
            .dependOnClassesThat()
            .resideInAPackage(INFRA);
}
