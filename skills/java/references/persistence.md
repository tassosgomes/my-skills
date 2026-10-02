# Persistência — JPA, Flyway e consultas

## Modelo JPA e adapter

O domínio não tem anotação de persistência. Cada agregado tem, em `infra.persistence.<agregado>`,
três tipos package-private: `{Agregado}JpaEntity`, `{Agregado}JpaRepository` (Spring Data) e
`{Agregado}RepositoryAdapter` (implementa o port do domínio).

```java
@Entity
@Table(name = "categories")
class CategoryJpaEntity {
    @Id private UUID id;
    @Version private @Nullable Long version;   // null = new: persist, not merge
    private String name;
    private @Nullable String description;
    private Instant createdAt;

    @SuppressWarnings("NullAway.Init")        // JPA materialization
    protected CategoryJpaEntity() {}
    // package-private constructor, getters and update(...)
}
```

```java
@Repository
@Transactional(propagation = Propagation.MANDATORY)
class CategoryRepositoryAdapter implements CategoryRepository {

    @Override
    public void add(Category category) {
        jpa.save(CategoryJpaEntity.from(category));       // version null -> persist, one INSERT
        outbox.append(category.pullEvents());             // same transaction
    }

    @Override
    public void update(Category category) {
        var managed = jpa.findById(category.id()).orElseThrow();   // loaded in this tx: first-level cache, no SELECT
        managed.update(category.name(), category.description());
        outbox.append(category.pullEvents());
    }
}
```

- **Atualização copia sobre a entidade gerenciada**, obtida na mesma transação. Nunca construa uma
  entidade nova com o mesmo Id e chame `save`/`merge`: o `@Version` lido no início é descartado e a
  checagem de concorrência some.
- Sem `@Version`, Id atribuído faz `SimpleJpaRepository.save` tratar toda entidade como existente:
  `merge` e um `SELECT` antes de cada `INSERT`. Com `@Version Long` nulo no novo, é `persist`.
- Concorrência entre requisições (cliente editou dado velho) exige a versão no contrato (ETag /
  `If-Match`). Sem isso, `@Version` protege só a janela da transação.
- Tabela no plural, colunas em `snake_case` pela naming strategy padrão do Boot; índice
  `ix_{tabela}_{colunas}` nomeado na migration, não em `@Index`.
- Instante é `Instant` ↔ `timestamptz`. `LocalDateTime` só para data-hora civil sem fuso (agenda).
- Enum é `@Enumerated(EnumType.STRING)`; `ORDINAL` quebra ao reordenar constantes.
- Coleção que pertence ao agregado (`Order.items`): `@OneToMany(cascade = ALL, orphanRemoval = true)`
  ou `@ElementCollection`. **Relação com outro agregado nunca tem associação JPA:** só a coluna de
  FK (`UUID categoryId`), via tabela de junção quando N:N.
- `FetchType.LAZY` em toda associação `@ManyToOne`/`@OneToOne` (o padrão JPA é `EAGER`).
- `equals`/`hashCode` de entidade JPA por Id e `getClass()`, nunca por todos os campos.

Oracle, quando a política permitir: dialeto do Hibernate na versão real do banco, `UUID` como
`RAW(16)` (teste o mapeamento em integração antes da primeira migration) e Flyway com
`flyway-database-oracle`.

## Auditoria

Só quando o requisito pedir rastreabilidade: `@CreatedDate`/`@LastModifiedDate` na **entidade JPA**,
`@EntityListeners(AuditingEntityListener.class)` e `@EnableJpaAuditing(dateTimeProviderRef =
"auditingDateTimeProvider")` com um `DateTimeProvider` que lê o `Clock`. **Nada de campo de auditoria
com setter público no agregado.**

## Migrations — Flyway

| Situação | Convenção |
|---|---|
| Local | `infra-persistence/src/main/resources/db/migration/` |
| Nome | `V{yyyyMMddHHmm}__{descricao_snake}.sql` (`V202610021430__add_category_is_active.sql`) |
| Repetível (view, função) | `R__{descricao}.sql` — pode ser editada; roda quando o checksum muda |
| Produção | Step de deploy: imagem `flyway/flyway` (Job/initContainer) com as migrations do artefato |
| App | `spring-boot-starter-flyway` com `<scope>test</scope>` no `api`: sem Flyway no jar de produção |
| Testes | Testcontainers; o starter roda as migrations na partida do contexto |
| `ddl-auto` | `validate` em teste e produção; nunca `update`/`create` |
| `outOfOrder` | `false` |
| `cleanDisabled` | `true` (padrão) em todo ambiente compartilhado |
| **Já aplicada fora da sua máquina** | **Imutável.** Corrigir = migration **nova** |
| Só no seu banco local | apague o arquivo e recrie o banco local (`docker compose down -v`) |

No Boot 4 a autoconfiguração do Flyway está no `spring-boot-starter-flyway`/`spring-boot-flyway`:
só `flyway-core` no classpath **não** roda migration nenhuma — e o teste passa contra um schema vazio
até o primeiro `validate` falhar. PostgreSQL precisa também de `flyway-database-postgresql`.

### Imutabilidade

Diferente do EF Core, o Flyway grava checksum: editar uma `V__` já aplicada **falha** no `validate`
— mas só contra o banco que a rodou, isto é, staging ou produção, na hora do deploy. A CI usa um
banco novo e nunca vê a diferença. Quem antecipa a falha para o PR é
[`../assets/ci/check-migrations-immutable.sh`](../assets/ci/check-migrations-immutable.sh).

**Nunca rode `flyway repair` para sumir com um checksum divergente**: ele regrava o checksum e
esconde o drift entre o arquivo e o schema real.

`CREATE INDEX CONCURRENTLY` não roda em transação: o Flyway detecta e executa fora dela, mas falha
se o mesmo arquivo misturar statements transacionais. Migration própria, só com ele.

## Consultas de leitura

Projeção não passa pelo repositório do agregado. Port em `application.port.{Agregado}Queries`,
implementação em `infra.persistence.<agregado>`.

- JPQL projetando direto no record do Output (`select new ...CategoryOutput(c.id, c.name, ...)`)
  ou `JdbcClient` com SQL explícito e parâmetros nomeados — **nunca** concatenação de string.
- Contagem de relação vira subconsulta SQL, não `size()` de coleção carregada.
- Ordenação determinística, com desempate por Id; campo de ordenação desconhecido cai no padrão em
  vez de estourar.
- Exportação grande: `Stream<T>` em `@Transactional(readOnly = true)`, fechado com
  try-with-resources, **com `fetchSize`** (`@QueryHints(@QueryHint(name = HINT_FETCH_SIZE, ...))`).
  Sem `fetchSize`, o driver do PostgreSQL carrega o resultado inteiro na memória antes do primeiro
  item.
- `@EntityGraph`, `hibernate.default_batch_fetch_size` e `@BatchSize` só onde a medição mostrou N+1.

## Paginação

Nomes dos parâmetros e teto de página são **do contrato** (`tsg-flow-contract-creator`); o formato
da resposta vem do baseline arquitetural, refletido no `api-contract.yaml`. Esta seção trata só de
como produzi-los.

- O adapter traduz `PageInput` em `PageRequest` e `Page` em `PageOutput`; `Page`, `Pageable` e
  `Sort` do Spring Data não saem de `infra`. Serializar `PageImpl` direto gera JSON instável (o
  próprio Spring Data avisa).
- Padrão: offset com índice cobrindo filtro e ordem.
- Página profunda ou tabela grande: keyset (`ScrollPosition.keyset()` / `Window<T>`) por
  `(coluna, id)` — troca **interna**, invisível no fio. Mudar o que aparece no fio é mudança de
  contrato, com acordo dos consumidores.
- `count` caro: `Slice` (sem total) se o contrato permitir → índice → cache curto do total → total
  estimado documentado, nessa ordem.

## Escrita em lote

| Situação | Abordagem |
|---|---|
| Tem regra de negócio ou evento | Blocos de ~500 pelo agregado, uma transação por bloco (`TransactionTemplate`), `EntityManager.clear()` entre blocos |
| Manutenção técnica sem regra nem evento | `@Modifying @Query` JPQL ou `JdbcClient` |

- `hibernate.jdbc.batch_size` (50) + `order_inserts`/`order_updates`. Com Id atribuído o batch
  funciona; com `IDENTITY` o Hibernate o desliga em silêncio — mais um motivo para UUID do domínio.
- `@Modifying` não passa pelo agregado: não valida, não levanta evento, não grava outbox, e o
  persistence context fica com dado velho — `clearAutomatically = true` sempre.
