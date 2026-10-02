# Arquitetura — domínio, casos de uso, API

Formas esperadas de cada peça. O que é DDD de livro (agregado, value object, evento de domínio com
lista de eventos pendentes) não está aqui: escreva do jeito padrão. O que está aqui é o que este
time decidiu diferente ou fixou.

## Identificadores — UUIDv7

- Todo Id de entidade, agregado e evento sai de `domain.seedwork.Ids.newId()`, que delega a
  `UuidCreator.getTimeOrderedEpoch()` (`com.github.f4b6a3:uuid-creator`, sem dependências
  transitivas). `UUID.randomUUID()` quebra o build.
- Por que biblioteca e não JDK: `UUID.ofEpochMillis` só existe a partir do JDK 26 (não-LTS) e não é
  monotônico dentro do mesmo milissegundo. Ao migrar para a próxima LTS, troque **só** o corpo de
  `Ids.newId()`.
- O Id nasce no domínio; no JPA é `@Id UUID` sem `@GeneratedValue`, coluna `uuid` no PostgreSQL.
- O `eventId` é o Id da linha do outbox **e** o `messageId` publicado; por ser v7, o outbox é
  ordenado pelo próprio Id.
- O timestamp embutido no Id não é regra de negócio; para datas use `createdAt`/`occurredOn`.
- `uuid-creator` é a **única** biblioteca de terceiros permitida no `domain` além de JSpecify — a
  regra de allow-list do ArchUnit falha com qualquer outra.

## Agregado

- Classe `final` que estende `seedwork.AggregateRoot` (Id + eventos pendentes + `pullEvents()`).
  Value object é `record` com validação no construtor compacto.
- Construtor `private`. Duas fábricas estáticas:
  - `create(...)` monta, chama `validate()` e levanta o evento — nessa ordem;
  - `restore(...)` reidrata para o adapter de persistência: **sem validação, sem evento**. Não é API
    de negócio.
- O agregado não lê relógio: recebe `Instant now` do caso de uso, que tem o `Clock`.
- Limites como constante pública (`NAME_MAX_LENGTH`), reutilizada no `@Size` do Input e no
  `varchar` da migration — o número existe em um lugar só.
- Acessores no estilo do record (`name()`, não `getName()`): o domínio não é JavaBean, nenhum
  framework o lê por reflexão.
- `equals`/`hashCode` de agregado por Id; de value object, o do `record`.

## Caso de uso

`application.<agregado>`, um arquivo por tipo. Sem interface: o controller depende da classe, e o
Mockito mocka classe. Interface sem segunda implementação é cerimônia.

```java
@UseCase                       // @Service + @Validated, em application.common
@Transactional
public class UpdateCategory {

    private final CategoryRepository categoryRepository;

    UpdateCategory(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public CategoryOutput execute(@Valid UpdateCategoryInput input) {   // 400 before any side effect
        var category = categoryRepository.findById(input.id())
                .orElseThrow(() -> new NotFoundException("Category '" + input.id() + "' not found"));

        category.update(input.name(), input.description());             // invariants -> 422

        categoryRepository.update(category);                             // state + outbox, same tx
        return CategoryOutput.from(category);
    }
}
```

**Ordem fixa:** validar input → carregar → aplicar regra no agregado → `add`/`update` → montar Output. O
commit é o fim do método (`@Transactional`); nada de `flush()` manual para "garantir".

- `@UseCase` é meta-anotação de `@Service` e `@Validated`. Ela é a âncora das regras do ArchUnit —
  não troque por `@Service` solto.
- **Validação mora no Input, é disparada no caso de uso.** O `@Valid` no parâmetro de `execute`,
  junto do `@Validated` da classe, vale para todo chamador — controller, `@RabbitListener`, job.
  O controller **não** repete `@Valid`: validaria duas vezes com duas exceções diferentes.
- Regra de formato que o Bean Validation não expressa: `ConstraintValidator` próprio em
  `application.common.validation`, nunca `if` no caso de uso.
- `UseCaseException` é a base das exceções da application (`NotFoundException`,
  `RelatedAggregateException`); `DomainException` é a do domínio. Ambas unchecked.
- Output com `static from(Agregado)` no próprio record.
- Ids de outro agregado são conferidos **em lote** antes de persistir; os ausentes viram
  `RelatedAggregateException` com a lista completa, não um erro por vez.
- Listagem: `PageInput`/`PageOutput<T>` em `application.common` — forma **interna** do caso de uso,
  independente do que vai no fio; o teto de página vem do contrato e é `@Max` no Input.
- Efeito pós-commit (invalidar cache, notificar algo local): `@TransactionalEventListener(phase =
  AFTER_COMMIT)` ou o cache manager transaction-aware. Nunca no corpo do `execute`, que roda antes
  do commit.

## Repositório

Interface no `domain.<agregado>`, adapter package-private em `infra.persistence.<agregado>`. **Só
agregados têm repositório.**

```java
public interface CategoryRepository {
    Optional<Category> findById(UUID id);
    List<Category> findAllById(Collection<UUID> ids);
    void add(Category category);      // persist + outbox rows for pulled events
    void update(Category category);   // copy onto the managed entity + outbox rows
    void delete(Category category);
}
```

- O port **não** estende `JpaRepository`/`CrudRepository`: isso traria Spring Data para o domínio
  e exporia `findAll()`, `saveAll()`, `flush()` a todo caso de uso.
- `add` e `update` separados, não um `save` que adivinha: descobrir se o agregado é novo custaria
  um `SELECT` por inserção (detalhe em [`persistence.md`](persistence.md)). Os dois chamam
  `pullEvents()` e gravam o outbox **antes** de retornar.
- Nunca lance exceção da application no adapter.
- Projeção (DTO) **não** entra no repositório: vai para `application.port.{Agregado}Queries`,
  implementada em `infra.persistence.<agregado>`, devolvendo Outputs.
- **Não crie `BaseRepository<T>`** com `findAll` ou `Specification` genérico.
- Tabela de junção é entidade JPA de infra, invisível ao domínio.

## Erros

| Exceção | Origem | Status | `type` |
|---|---|---|---|
| `ConstraintViolationException` / `MethodValidationException` | validação do Input | 400 | `/problems/validation-error` |
| Corpo ilegível, tipo de parâmetro inválido | Spring MVC | 400 | `/problems/validation-error` |
| `NotFoundException` | application | 404 | `/problems/not-found` |
| `DomainValidationException` | domain | 422 | `/problems/business-rule-violation` |
| `RelatedAggregateException` | application | 422 | `/problems/related-aggregate-not-found` |
| `ObjectOptimisticLockingFailureException` | JPA `@Version` | 409 | `/problems/concurrent-modification` |
| qualquer outra | — | 500 | `/problems/unexpected-error` (detalhe genérico) |

`type` é estável por categoria; o cliente decide por `type`/`status`, nunca por `detail`.

Um único `GlobalExceptionHandler` em `api.error`, `@RestControllerAdvice` que **estende
`ResponseEntityExceptionHandler`**. Sem o `extends`, o handler de `Exception` captura também 405,
406 e 415 do próprio Spring MVC e os devolve como 500.

- `spring.mvc.problemdetails.enabled=true`; `instance` preenchido com o path da requisição.
- Erros de validação saem numa propriedade `errors` (`campo → mensagens`). O `propertyPath` da
  validação de método vem como `execute.input.name`: normalize para `name`.
- Nunca devolva stack trace, nome de tabela, SQL ou mensagem de exceção inesperada — nem em dev.
  `server.error.include-stacktrace=never`, `include-message=never`.
- Rejeição esperada (400/404/409/422) é log `INFO`; 500 é `ERROR` com a exceção.
- Sem `try/catch` em controller para traduzir exceção.
- `Result<T>`/tipo selado de resultado só em integração com sistema externo cuja falha faz parte do
  fluxo; nunca para invariante de domínio nem para "não encontrado".

## Camada api

**Havendo `api-contract.yaml` aprovado, ele é a fonte de verdade** — paths, status, schemas e
formato de erro saem dele. Sem contrato, vale a norma em
`tsg-flow-contract-creator/references/http-conventions.md`. JSON em camelCase (padrão do Jackson;
não configure outra naming strategy).

**O formato da resposta não é decisão desta skill.** Se o sistema usa envelope, isso vem do baseline
arquitetural, é refletido no `api-contract.yaml` e aqui só se implementa, com os tipos em
`api.response`. Sem envelope, o Output do caso de uso serializa direto. Endpoint técnico (Actuator)
segue formato próprio.

Um `{Agregado}Controller` package-private por agregado em `api.<agregado>`. O método recebe o Input
e chama o caso de uso; o `Location` do 201 sai de `ServletUriComponentsBuilder.fromCurrentRequest()`,
não de string montada à mão.

```java
@PostMapping
ResponseEntity<CategoryOutput> create(@RequestBody CreateCategoryInput input) {
    var output = createCategory.execute(input);
    var location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(output.id()).toUri();
    return ResponseEntity.created(location).body(output);
}
```

- O Input do caso de uso é o corpo da requisição quando os campos coincidem. Path variable que
  compõe o Input (`PUT /{id}`) é montada no controller: `new UpdateCategoryInput(id, body.name())`
  com um `record` de corpo em `api.<agregado>`.
- Documente erros com `@ApiResponse` só onde a operação realmente os produz.
- `@RabbitListener` mora em `api.messaging`: é entrada como o controller, só chama caso de uso.
