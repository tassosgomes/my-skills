# Entity Framework Core — Configuracao e Exemplos

### Por que usar Entity Framework Core?
- **ORM Completo**: Mapeamento objeto-relacional com suporte a LINQ
- **Migrations**: Controle de versao do schema do banco de dados
- **Change Tracking**: Rastreamento automatico de alteracoes nas entidades
- **Lazy/Eager Loading**: Controle flexivel de carregamento de dados relacionados
- **Multi-Provider**: Suporte a diversos bancos de dados (PostgreSQL, Oracle, SQL Server)

### DbContext

Um `DbContext` por serviço (ou por módulo no monolito modular), com os agregados e as tabelas
técnicas de mensageria. Configurações por entidade em `Configurations/`, aplicadas por assembly.

```csharp
// Infra.Data/ProjectNameDbContext.cs
public sealed class ProjectNameDbContext : DbContext
{
    public ProjectNameDbContext(DbContextOptions<ProjectNameDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Genre> Genres => Set<Genre>();
    public DbSet<GenresCategories> GenresCategories => Set<GenresCategories>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ProjectNameDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

### Configuração de agregado com Fluent API

```csharp
// Infra.Data/Configurations/CategoryConfiguration.cs
public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");

        builder.HasKey(category => category.Id);
        builder.Property(category => category.Id)
            .HasColumnName("id")
            .ValueGeneratedNever(); // the aggregate generates its own Guid

        builder.Property(category => category.Name)
            .HasColumnName("name")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(category => category.Description)
            .HasColumnName("description")
            .HasMaxLength(10_000)
            .IsRequired();

        builder.Property(category => category.IsActive).HasColumnName("is_active");
        builder.Property(category => category.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(category => category.Name).HasDatabaseName("ix_categories_name");

        builder.Ignore(category => category.Events); // domain events are not columns
    }
}

// Infra.Data/Configurations/GenresCategoriesConfiguration.cs
public sealed class GenresCategoriesConfiguration : IEntityTypeConfiguration<GenresCategories>
{
    public void Configure(EntityTypeBuilder<GenresCategories> builder)
    {
        builder.ToTable("genres_categories");
        builder.HasKey(relation => new { relation.GenreId, relation.CategoryId });

        // Aggregates reference each other by Id only: foreign keys without navigation properties
        builder.HasOne<Genre>().WithMany().HasForeignKey(relation => relation.GenreId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Category>().WithMany().HasForeignKey(relation => relation.CategoryId).OnDelete(DeleteBehavior.Restrict);
    }
}
```

- Agregados têm Id gerado no domínio (`Guid`): `ValueGeneratedNever`.
- Relação entre agregados é só por chave estrangeira, sem navegação de um agregado para outro.
- Coleção que pertence ao agregado (ex.: `Order.Items`) é mapeada com `OwnsMany` ou `HasMany`
  com navegação, e carregada pelo repositório do agregado.

### Registro no DI — PostgreSQL (padrão)

```csharp
// Api/Extensions/PersistenceExtensions.cs
public static class PersistenceExtensions
{
    public static IServiceCollection AddPersistenceConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ProjectNameDbContext>(options =>
            options.UseNpgsql(
                configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history")));

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IGenreRepository, GenreRepository>();

        return services;
    }
}
```

`EnableSensitiveDataLogging` e `EnableDetailedErrors` só em Development (expõem valores de parâmetros
nos logs). `AddDbContextPool` só depois de medir custo de criação de contexto (`dotnet-performance`); o pool
exige que o `DbContext` não guarde estado próprio entre requests.

### Registro no DI — Oracle (alternativa)

```csharp
// Api/Extensions/PersistenceExtensions.cs — Oracle, only for services that already use it
services.AddDbContext<ProjectNameDbContext>(options =>
    options.UseOracle(
        configuration.GetConnectionString("DefaultConnection"),
        oracle =>
        {
            oracle.MigrationsHistoryTable("__EF_MIGRATIONS_HISTORY");
            oracle.UseOracleSQLCompatibility(OracleSQLCompatibility.DatabaseVersion19);
        }));
```

### Unit of Work e repositórios

Repositórios existem por agregado, com contratos no Domain
(`dotnet-architecture/examples/repository-pattern.md`). O `UnitOfWork` não expõe repositórios nem
faz rollback manual: grava dados e eventos de domínio (outbox) em um único `SaveChangesAsync`, que
já é uma transação (`examples/outbox-inbox.md`).

Não crie `BaseRepository<T> where T : class` com `GetAllAsync` ou `SearchAsync(Expression<...>)`:
isso expõe o modelo de persistência para qualquer classe e empurra filtros para fora do
repositório do agregado.

### Migrations - Comandos Essenciais
```bash
# Create a new migration
dotnet ef migrations add MigrationName

# Apply pending migrations
dotnet ef database update

# Revert to a specific migration
dotnet ef database update PreviousMigrationName

# Generate SQL script from migrations
dotnet ef migrations script

# List migrations
dotnet ef migrations list

# Remove last migration (if not applied)
dotnet ef migrations remove
```

### Connection string

```json
// appsettings.json — no password; the full value comes from user-secrets or ConnectionStrings__DefaultConnection
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=projectname;Username=projectname"
  }
}
```

Segredos seguem `examples/configuration-secrets.md`.

### Interceptor de auditoria

Colunas técnicas de auditoria (`updated_at`, `updated_by`) não pertencem ao agregado. Mapeie como
shadow properties e preencha em um interceptor, sem setters públicos no domínio.

```csharp
// Infra.Data/Configurations/CategoryConfiguration.cs (trecho)
builder.Property<DateTime?>("UpdatedAt").HasColumnName("updated_at");

// Infra.Data/Interceptors/AuditInterceptor.cs
public sealed class AuditInterceptor : SaveChangesInterceptor
{
    private const string UpdatedAtProperty = "UpdatedAt";

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        if (eventData.Context is not null)
            SetUpdatedAt(eventData.Context);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void SetUpdatedAt(DbContext context)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in context.ChangeTracker.Entries<AggregateRoot>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            if (entry.Metadata.FindProperty(UpdatedAtProperty) is not null)
                entry.Property(UpdatedAtProperty).CurrentValue = now;
        }
    }
}

// Registration
services.AddSingleton<AuditInterceptor>();
services.AddDbContext<ProjectNameDbContext>((serviceProvider, options) =>
    options.UseNpgsql(connectionString)
        .AddInterceptors(serviceProvider.GetRequiredService<AuditInterceptor>()));
```

Use interceptor de auditoria só quando o requisito pedir rastreabilidade.

## Troubleshooting de Migrations

A causa mais comum de migration gerada com sintaxe antiga/incompatível ou que "não aplica" não é
o modelo em si — é descompasso de versão entre a ferramenta `dotnet-ef` e o pacote
`Microsoft.EntityFrameworkCore.Design` do projeto, ou build desatualizado. Antes de investigar o
modelo, descarte essas causas na ordem abaixo.

### 1. Fixar a versão da ferramenta `dotnet-ef` no projeto

Se `dotnet-ef` estiver instalado globalmente com uma versão diferente da major do EF Core do
projeto, ele gera migrations com a sintaxe da versão instalada — não da versão referenciada no
`.csproj`. Trave a ferramenta por projeto com um manifest versionado:

```bash
# Once per repository
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 10.0.0  # same version as Microsoft.EntityFrameworkCore.Design in Directory.Packages.props

# On every fresh clone or CI pipeline
dotnet tool restore
dotnet tool run dotnet-ef migrations add MigrationName
```

`.config/dotnet-tools.json` fica versionado no repositório — assim todo desenvolvedor e o CI usam
exatamente a mesma versão de `dotnet-ef`, nunca a instalada globalmente na máquina de quem gerou a
migration.

### 2. Confirmar que `dotnet-ef` e `Microsoft.EntityFrameworkCore.Design` batem de versão

```bash
dotnet list package | grep EntityFrameworkCore.Design
dotnet tool list
```

As duas versões devem ter a mesma major (idealmente a mesma minor). Um `dotnet-ef` mais novo que o
pacote `Design` do projeto é a causa mais frequente de migration com API que não existe na versão
do projeto (ex.: API nova do EF Core 10 gerada em um projeto que ainda referencia o EF Core 9).

### 3. Migration vazia ou que ignora uma alteração real do modelo

Normalmente é build desatualizado, não ausência de mudança. `dotnet ef` compila o projeto antes de
inspecionar o modelo via reflection; se o `obj`/`bin` estiver com artefato antigo (comum depois de
merge ou troca de branch), a migration é gerada a partir do modelo antigo.

```bash
dotnet clean
dotnet build
dotnet ef migrations add MigrationName
```

### 4. Detectar model desatualizado antes de aplicar

```bash
dotnet ef migrations has-pending-model-changes
```

Retorna erro se o modelo atual diverge da última migration — use isso no CI para bloquear merge de
um PR que mudou entidade sem gerar a migration correspondente, antes de descobrir em produção.

### 5. DbContext que depende de DI não resolvível em design-time

Se o `DbContext` recebe no construtor algo além de `DbContextOptions<T>` (ex.: um serviço de
tenant resolvido em runtime), o `dotnet-ef` não consegue instanciá-lo fora do host da aplicação.
Sintoma típico: comando trava, falha com erro genérico de DI, ou usa a connection string errada.
Resolva com uma factory explícita para design-time:

```csharp
public class ProjectNameDbContextFactory : IDesignTimeDbContextFactory<ProjectNameDbContext>
{
    public ProjectNameDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<ProjectNameDbContext>();
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));

        return new ProjectNameDbContext(optionsBuilder.Options);
    }
}
```

### 6. Múltiplos `DbContext` ou múltiplos projetos na solution

Sem os flags corretos, `dotnet-ef` escolhe o `DbContext` ou o projeto errado silenciosamente:

```bash
dotnet ef migrations add MigrationName \
  --project src/ProjectName.Infra.Data \
  --startup-project src/ProjectName.Api \
  --context ProjectNameDbContext
```

`--startup-project` precisa apontar para o projeto executável (tem `appsettings.json` e DI
completo); `--project` aponta para onde a pasta `Migrations/` deve ser criada.

### 7. Não aplicar migration automaticamente em produção dentro do `Program.cs`

`Database.Migrate()` chamado direto no boot do `Program.cs` acopla o start da aplicação à
disponibilidade do banco e roda a cada réplica subindo — em produção isso vira condição de corrida
entre pods e falha de boot mascarando falha de schema. Separe em um step de deploy/job dedicado:

```bash
# Deploy pipeline — before rolling out the application
dotnet ef database update --project src/ProjectName.Infra.Data --startup-project src/ProjectName.Api

# Or, where dotnet-ef cannot reach the database, generate an idempotent script
dotnet ef migrations script --idempotent -o migrate.sql
```

Em desenvolvimento local, aplicar via `dotnet ef database update` (ou `Database.Migrate()` atrás de
um `if (environment.IsDevelopment())`) é aceitável — o risco descrito acima é específico de
produção com múltiplas réplicas.
