# architecture-tests — template

Copy `pom.xml` to `architecture-tests/` and the `.java` files to
`architecture-tests/src/test/java/com/company/project/architecture/`, then replace
`com.company.project`. The rules reference `@UseCase` and `AggregateRoot`, which only exist in a
real project.

Verified on 2026-10-02 against JDK 25.0.4, Maven 3.9, Spring Boot 4.1.1 and ArchUnit 1.5.1: the
baseline passes, and each rule fails on a planted violation.

- `failOnEmptyShould` is on by default since ArchUnit 1.0: a rule whose `that()` matches no class
  fails. That almost always means a wrong package pattern — fix the pattern, never switch it off.
- `UUID.randomUUID()`, `Instant.now()` and Jackson 2 are **not** checked here: forbiddenapis
  fails the build earlier and more cheaply (`config/forbidden-apis.txt`).
- `api` importing an infra class is not checked here first either: `api` sees infra modules
  only in `runtime` scope, so it does not compile. `apiDoesNotUseInfra` is the backstop for a
  scope changed to `compile`.
