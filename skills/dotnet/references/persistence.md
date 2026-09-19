# Persistência — EF Core, migrations e consultas

## DbContext

Um `DbContext` por serviço (ou por módulo no monolito modular). Agregados e tabelas técnicas de
mensageria no mesmo contexto; **nada de `DbContext` por agregado**.

```csharp
public sealed class ProjectNameDbContext(DbContextOptions<ProjectNameDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
        => modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProjectNameDbContext).Assembly);
}
```

## Mapeamento

Um `IEntityTypeConfiguration<T>` por agregado, com nomes explícitos:

```csharp
builder.ToTable("categories");
builder.Property(c => c.Id).HasColumnName("id").ValueGeneratedNever();   // UUIDv7 from the aggregate
builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
builder.HasIndex(c => c.Name).HasDatabaseName("ix_categories_name");
builder.Ignore(c => c.Events);
```

- Tabela no plural, colunas em `snake_case`, índice `ix_{tabela}_{colunas}`.
- Tamanhos máximos **iguais às constantes do agregado** — não duplique o número, espelhe-o.
- `builder.Ignore(a => a.Events)` em todo agregado.
- Coleção que pertence ao agregado (`Order.Items`) usa `OwnsMany` ou `HasMany` com navegação.
  **Relação com outro agregado nunca tem navegação:** só FK, via tabela de junção mapeada com
  `HasOne<T>().WithMany().HasForeignKey(...)` e `OnDelete` explícito nos dois lados.

Oracle, quando a política permitir: `UseOracle(...)` com `MigrationsHistoryTable("__EF_MIGRATIONS_HISTORY")`
e `UseOracleSQLCompatibility` na versão real do banco; `Guid` vira `RAW(16)`.

## Auditoria

Só quando o requisito pedir rastreabilidade: shadow property `UpdatedAt` (`updated_at`) no
mapeamento e um `SaveChangesInterceptor` que preenche em `Added`/`Modified`. **Nada de setter
público de auditoria no agregado.**

## Migrations

| Situação | Convenção |
|---|---|
| Ferramenta | `dotnet tool restore` + `dotnet tool run dotnet-ef`; nunca o `dotnet-ef` global |
| Comando | Sempre com `--project src/ProjectName.Infra.Data --startup-project src/ProjectName.Api --context ProjectNameDbContext` |
| Nome | PascalCase descrevendo a mudança (`AddCategoryIsActive`) |
| CI | `dotnet ef migrations has-pending-model-changes` falha o build |
| Produção | Step de deploy (`database update`) ou `migrations script --idempotent` |
| **Já aplicada fora da sua máquina** | **Imutável.** Alterar coluna, corrigir tipo ou reverter = migration **nova** |
| Só no seu banco local | `dotnet ef database update <Anterior>` + `dotnet ef migrations remove`, e regere |
| Testes | Testcontainers com `MigrateAsync()` |
| `DbContext` com dependência não resolvível em design-time | `IDesignTimeDbContextFactory<T>` em `Infra.Data` |

### Imutabilidade

Editar o **arquivo gerado** é legítimo **antes** de aplicar — SQL cru para mover dado, índice
concorrente, rename que o EF modelou como drop+add. Depois que a migration rodou em qualquer lugar
compartilhado (branch de outro, CI, qualquer ambiente), ela não se toca: corrige-se com migration
nova.

O motivo é específico do EF: `__EFMigrationsHistory` guarda só `MigrationId` e `ProductVersion` —
**não há checksum**. Flyway e Liquibase falham a validação quando o conteúdo muda; o EF não percebe.
O banco diz que rodou, o arquivo diz outra coisa, e a diferença só aparece num banco recriado do
zero, que produz schema diferente de produção sem nenhum evento apontando a origem.

`has-pending-model-changes` **não cobre isso**: ele compara o modelo ao `ModelSnapshot`, não a
migration ao que foi aplicado. Quem cobre é
[`../assets/ci/check-migrations-immutable.sh`](../assets/ci/check-migrations-immutable.sh).

Migration vazia ou com sintaxe incompatível, diagnostique nesta ordem: versão do `dotnet-ef` × pacote
`Design` → `dotnet clean` + build → `--project`/`--startup-project`/`--context` corretos.

## Consultas de leitura

Projeção não passa pelo repositório do agregado. Porta em `Application/Interfaces/I{Agregado}Queries`,
implementação em `Infra.Data/Queries`.

- `Select` direto para o Output; contagem de relação vira subconsulta SQL, não `Count()` em memória.
- Ordenação determinística, com desempate por Id.
- Relatório com SQL explícito usa `Database.SqlQuery<T>($"...")` **interpolado** (parametrizado pelo
  EF), nunca concatenação de string.
- Exportação grande devolve `IAsyncEnumerable<T>` em vez de materializar a lista.
- `AsSplitQuery`, compiled query e `AddDbContextPool` só onde a medição mostrou o problema.

## Paginação

Nomes dos parâmetros e teto de página são **do contrato** (`tsg-flow-contract-creator`); o formato da
resposta vem do baseline arquitetural, refletido no `api-contract.yaml`. Esta seção trata só de como
produzi-los.

- Implementação padrão: offset (`Skip`/`Take` + `CountAsync`) com índice cobrindo filtro e ordem.
- Página profunda ou tabela grande: keyset por `(coluna, id)` — é troca **interna**, invisível no
  fio. Mudar o que aparece no fio é mudança de contrato, com acordo dos consumidores.
- `Count` caro: índice → cache curto do total → total estimado documentado, nessa ordem.

## Escrita em lote

| Situação | Abordagem |
|---|---|
| Tem regra de negócio ou evento | Blocos de ~500, alterar pelo agregado, `CommitAsync` por bloco, `DbContext` novo por bloco |
| Manutenção técnica sem regra nem evento | `ExecuteUpdateAsync` / `ExecuteDeleteAsync` |

`ExecuteUpdateAsync`/`ExecuteDeleteAsync` não passam pelo agregado: não validam, não levantam evento,
não gravam outbox. Use só quando isso for exatamente o que se quer.
