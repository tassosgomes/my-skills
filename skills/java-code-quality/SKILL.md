---
name: java-code-quality
description: "Padroes transversais de qualidade de codigo Java Spring Boot / Java 17+: HARD RULES numeradas para naming, metodos, classes, DI, null handling, exceptions, collections, records, sealed classes, logging e estilo. Uso correto de DTOs, MapStruct, validacao Bean Validation, Optional, null safety. Skill transversal que deve ser aplicada apos geracao de codigo. Usar quando: gerar codigo Java; revisar naming conventions; validar clean code; aplicar regras de qualidade; revisar DTOs e mapeamentos."
---

# Java Code Quality Standards (Spring Boot / Java 17+)

Documento normativo para geracao de codigo por LLMs.
Define regras obrigatorias e diretrizes de qualidade de codigo Java.
Skill transversal — deve ser aplicada sempre apos geracao de codigo.

---

# 1. GLOBAL RULES

## HARD RULES (OBRIGATORIAS)

**GR-01** Code MUST be written in English (classes, methods, variables, packages, comments).
**GR-02** Target Java version MUST be 17 or higher.
**GR-03** Use modern language features when applicable (records, sealed classes, switch expressions, text blocks).
**GR-04** Never use deprecated APIs unless explicitly required.
**GR-05** One public class per file.
**GR-06** Do not return null when Optional is applicable.
**GR-07** Never use generic Exception or RuntimeException directly.
**GR-08** Use constructor injection for dependencies.
**GR-09** Field injection (@Autowired on field) is forbidden.
**GR-10** Setter injection is forbidden (except configuration beans).

## SOFT GUIDELINES (PREFERENCIAS)

**GG-01** Prefer clarity over brevity.
**GG-02** Optimize only when necessary (avoid premature optimization).
**GG-03** Prefer immutability.
**GG-04** Prefer composition over inheritance.
**GG-05** Prefer explicit types when var reduces readability.

---

# 2. NAMING CONVENTIONS

## HARD RULES

**NC-01** Classes, interfaces, enums -> PascalCase
**NC-02** Methods, variables, parameters -> camelCase
**NC-03** Constants (static final) -> UPPER_SNAKE_CASE
**NC-04** Packages -> lowercase.dot.separated
**NC-05** Method names MUST start with a verb.
**NC-06** Interface names MUST NOT use prefix "I".
**NC-07** Boolean getters MUST use is/has prefix.
**NC-08** Avoid abbreviations unless universally known (id, url, dto).

## EXAMPLES

Correct:

```java
public class UserService { }
public Optional<User> findUserById(int userId) { }
private static final int MAX_RETRIES = 3;
```

Incorrect:

```java
public class userService { }
public interface IUserRepository { }
public User getuser(int id) { }
```

---

# 3. METHOD DESIGN RULES

## HARD RULES

**MD-01** A method MUST perform a single clear responsibility.
**MD-02** Methods MUST NOT have more than 3 parameters (excluding constructors).
**MD-03** Flag parameters (boolean to alter behavior) are forbidden.
**MD-04** Methods MUST NOT mix mutation and query (Command-Query Separation).
**MD-05** Maximum 2 nesting levels (if/else/loops).
**MD-06** Use guard clauses instead of deep nesting.

## SOFT GUIDELINES

**MD-07** Prefer small methods (generally under 40 lines).
**MD-08** Extract complex conditions into well-named methods.

## EXAMPLE

Forbidden:

```java
public List<User> getUsers(boolean onlyActive, String name, Integer minAge, Integer maxAge)
```

Correct:

```java
public List<User> getUsers(UserFilter filter)
```

---

# 4. CLASS DESIGN RULES

## HARD RULES

**CD-01** A class MUST have a single responsibility (SRP).
**CD-02** A class MUST depend on abstractions, not concretions (DIP).
**CD-03** Avoid inheritance unless modeling true "is-a" relationship.
**CD-04** Use interfaces for contracts.
**CD-05** Classes MUST NOT exceed reasonable size (generally < 300 lines).

---

# 5. DEPENDENCY INJECTION

## HARD RULES

**DI-01** Use constructor injection only.
**DI-02** All injected dependencies MUST be final.
**DI-03** Validate constructor parameters with Objects.requireNonNull.
**DI-04** Logger SHOULD be declared as:

```java
private static final Logger LOGGER = LoggerFactory.getLogger(ClassName.class);
```

## FORBIDDEN

```java
@Autowired
private UserRepository repository;
```

---

# 6. NULL HANDLING

## HARD RULES

**NH-01** Never return null for optional results.
**NH-02** Use Optional<T> for absent values.
**NH-03** Use orElseThrow for required values.

Correct:

```java
public Optional<User> findById(int id)
```

Forbidden:

```java
public User findById(int id) // may return null
```

---

# 7. EXCEPTION HANDLING

## HARD RULES

**EH-01** Throw specific exceptions.
**EH-02** Never throw generic Exception.
**EH-03** Catch only exceptions you can handle.
**EH-04** Do not swallow exceptions.
**EH-05** Use global exception handler for REST APIs.

---

# 8. COLLECTIONS & STREAMS

## HARD RULES

**CS-01** Prefer List.of / Set.of for immutable collections.
**CS-02** Use streams for transformations and filtering only.
**CS-03** Do not use streams for side effects.

## SOFT GUIDELINES

**CS-04** Use parallelStream only after benchmarking.
**CS-05** Prefer repository-level filtering instead of in-memory filtering.

---

# 9. RECORDS (Java 16+)

## HARD RULES

**RC-01** Use records for immutable DTOs.
**RC-02** Records MUST NOT contain business logic.
**RC-03** Records are preferred over boilerplate DTO classes.

Example:

```java
public record UserDto(int id, String name, String email) {}
```

---

# 10. SEALED CLASSES (Java 17+)

## HARD RULES

**SC-01** Use sealed classes when restricting inheritance is required.
**SC-02** All permitted subclasses MUST be final or sealed.
**SC-03** Prefer switch expressions for exhaustive handling.

---

# 11. DTO MAPPING E VALIDACAO

## MapStruct (Obrigatorio para mapeamento)

**DM-01** Usar MapStruct para mapeamento entre camadas.
**DM-02** Nunca expor entidade JPA fora da camada infra.
**DM-03** DTOs de request devem usar Bean Validation.

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {
    Order toDomain(OrderEntity entity);
    OrderEntity toEntity(Order order);
    OrderDto toDto(Order order);
}
```

## Bean Validation (Jakarta Validation)

**DM-04** Usar @Valid nos controllers.
**DM-05** Usar annotations de validacao nos DTOs de request.

```java
public record CreateOrderRequest(
    @NotBlank(message = "Customer email is required")
    @Email(message = "Invalid email format")
    String customerEmail,

    @NotEmpty(message = "Order must contain items")
    @Size(min = 1, max = 100, message = "Items must be between 1 and 100")
    List<OrderItemRequest> items
) {}
```

---

# 12. LOGGING RULES (Qualidade)

## HARD RULES

**LG-01** Use SLF4J placeholders `{}` instead of string concatenation.
**LG-02** Never concatenate strings inside logger calls.
**LG-03** Do not log sensitive information (passwords, tokens, personal data).

Correct:

```java
LOGGER.info("User {} created", userId);
```

Forbidden:

```java
LOGGER.info("User " + userId + " created");
```

---

# 13. CODE STYLE

## HARD RULES

**ST-01** 4 spaces indentation.
**ST-02** Opening brace on same line.
**ST-03** No multiple variable declarations in same line.
**ST-04** Declare variables near first use.

---

# 14. ARCHITECTURE BOUNDARIES (Quality Gates)

## HARD RULES

**AR-01** Domain layer MUST NOT depend on Spring framework.
**AR-02** Domain MUST NOT depend on Infrastructure.
**AR-03** Infrastructure MAY depend on Domain.
**AR-04** Controllers MUST NOT contain business logic.
**AR-05** Services contain application logic.

---

# EXPLICITLY FORBIDDEN

* Field injection
* Generic Exception
* Returning null
* Multiple public classes per file
* Flag parameters
* Deep nesting (>2 levels)
* Business logic inside controllers
* Business logic inside DTOs
* Using deprecated APIs
* String concatenation in logger calls
* Exposing JPA entities outside infra layer

---

# GENERATION CHECKLIST (FOR LLM VALIDATION)

Before generating code, ensure:

- [ ] All names are in English
- [ ] No field injection
- [ ] No null returns
- [ ] No generic exceptions
- [ ] No flag parameters
- [ ] Constructor injection only
- [ ] Domain layer free of framework dependencies
- [ ] No business logic in controllers
- [ ] Proper logging format (SLF4J placeholders)
- [ ] Uses modern Java features when applicable
- [ ] Records used for DTOs
- [ ] MapStruct for entity-to-domain mappings
- [ ] Bean Validation on request DTOs
- [ ] Optional for nullable returns
