package com.company.project.architecture;

import static com.company.project.architecture.ProjectArchitecture.API;
import static com.company.project.architecture.ProjectArchitecture.APPLICATION;
import static com.company.project.architecture.ProjectArchitecture.DOMAIN;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.simpleNameEndingWith;
import static com.tngtech.archunit.core.domain.JavaModifier.FINAL;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noMethods;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_FIELD_INJECTION;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

import com.company.project.application.common.UseCase;
import com.company.project.domain.seedwork.AggregateRoot;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.RestController;

@AnalyzeClasses(packages = ProjectArchitecture.ROOT, importOptions = ImportOption.DoNotIncludeTests.class)
class ConventionTest {

    // @Transactional and method validation are proxies: a final use case class silently loses both.
    @ArchTest
    static final ArchRule useCasesLiveInApplicationAndAreProxiable = classes()
            .that()
            .areAnnotatedWith(UseCase.class)
            .should()
            .resideInAPackage(APPLICATION)
            .andShould()
            .notHaveModifier(FINAL)
            .andShould()
            .beAnnotatedWith(Transactional.class);

    // A controller translates HTTP into a use case. Reaching a repository port puts orchestration in
    // the wrong layer; apiDoesNotUseInfra does not catch it, because the port lives in the domain.
    @ArchTest
    static final ArchRule controllersDoNotUseRepositories = noClasses()
            .that()
            .areAnnotatedWith(RestController.class)
            .should()
            .dependOnClassesThat(resideInAPackage(DOMAIN).and(simpleNameEndingWith("Repository")));

    // The HTTP contract is built from use-case Outputs; an aggregate on it couples the contract to
    // every invariant change.
    @ArchTest
    static final ArchRule apiDoesNotExposeAggregates = noClasses()
            .that()
            .resideInAPackage(API)
            .should()
            .dependOnClassesThat()
            .areAssignableTo(AggregateRoot.class);

    // The transaction boundary is the use case. A transactional controller widens it to the
    // serialization of the response.
    @ArchTest
    static final ArchRule apiIsNotTransactional = noMethods()
            .that()
            .areDeclaredInClassesThat()
            .resideInAPackage(API)
            .should()
            .beAnnotatedWith(Transactional.class);

    @ArchTest
    static final ArchRule noFieldInjection = NO_CLASSES_SHOULD_USE_FIELD_INJECTION;

    @ArchTest
    static final ArchRule noGenericExceptions = NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;

    @ArchTest
    static final ArchRule noJavaUtilLogging = NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;
}
