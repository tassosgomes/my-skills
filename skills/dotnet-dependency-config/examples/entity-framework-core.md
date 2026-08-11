# Entity Framework Core — Configuracao e Exemplos

### Por que usar Entity Framework Core?
- **ORM Completo**: Mapeamento objeto-relacional com suporte a LINQ
- **Migrations**: Controle de versao do schema do banco de dados
- **Change Tracking**: Rastreamento automatico de alteracoes nas entidades
- **Lazy/Eager Loading**: Controle flexivel de carregamento de dados relacionados
- **Multi-Provider**: Suporte a diversos bancos de dados (PostgreSQL, Oracle, SQL Server)

### DbContext - Configuracao Base
```csharp
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<Order> Orders { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

### Configuracao de Entidade com Fluent API
```csharp
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        
        builder.HasKey(u => u.Id);
        
        builder.Property(u => u.Id)
            .HasColumnName("user_id")
            .ValueGeneratedOnAdd();
        
        builder.Property(u => u.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();
        
        builder.Property(u => u.Email)
            .HasColumnName("email")
            .HasMaxLength(255)
            .IsRequired();
        
        builder.HasIndex(u => u.Email)
            .IsUnique()
            .HasDatabaseName("ix_users_email");
        
        builder.HasMany(u => u.Orders)
            .WithOne(o => o.User)
            .HasForeignKey(o => o.UserId)
            .HasConstraintName("fk_orders_users")
            .OnDelete(DeleteBehavior.Restrict);
    }
}
```

### Registro no DI — PostgreSQL (Padrao)
```csharp
// Program.cs — PostgreSQL (padrao oficial)
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.MigrationsHistoryTable("__ef_migrations_history");
    });
    
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});

// Alternative: DbContext Pooling for better performance
builder.Services.AddDbContextPool<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString);
}, poolSize: 128);

// Repository registration
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
```

### Registro no DI — Oracle (Alternativa)
```csharp
// Program.cs — Oracle (alternativa suportada por excecao)
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseOracle(connectionString, oracleOptions =>
    {
        oracleOptions.MigrationsHistoryTable("__EF_MIGRATIONS_HISTORY");
        oracleOptions.UseOracleSQLCompatibility(OracleSQLCompatibility.DatabaseVersion19);
    });
    
    if (builder.Environment.IsDevelopment())
    {
        options.EnableSensitiveDataLogging();
        options.EnableDetailedErrors();
    }
});
```

### Unit of Work Pattern
```csharp
public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IProductRepository Products { get; }
    IOrderRepository Orders { get; }
    Task<int> CommitAsync(CancellationToken cancellationToken = default);
    Task RollbackAsync();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private IUserRepository? _users;
    private IProductRepository? _products;
    private IOrderRepository? _orders;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public IUserRepository Users => 
        _users ??= new UserRepository(_context);
    
    public IProductRepository Products => 
        _products ??= new ProductRepository(_context);
    
    public IOrderRepository Orders => 
        _orders ??= new OrderRepository(_context);

    public async Task<int> CommitAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RollbackAsync()
    {
        await _context.Database.RollbackTransactionAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
```

### Generic Repository Pattern
```csharp
public interface IBaseRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<T>> SearchAsync(Expression<Func<T, bool>> predicate, CancellationToken cancellationToken = default);
    Task AddAsync(T entity, CancellationToken cancellationToken = default);
    void Update(T entity);
    void Remove(T entity);
}

public class BaseRepository<T> : IBaseRepository<T> where T : class
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public BaseRepository(AppDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbSet.FindAsync(new object[] { id }, cancellationToken);
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet.ToListAsync(cancellationToken);
    }

    public virtual async Task<IEnumerable<T>> SearchAsync(
        Expression<Func<T, bool>> predicate, 
        CancellationToken cancellationToken = default)
    {
        return await _dbSet.Where(predicate).ToListAsync(cancellationToken);
    }

    public virtual async Task AddAsync(T entity, CancellationToken cancellationToken = default)
    {
        await _dbSet.AddAsync(entity, cancellationToken);
    }

    public virtual void Update(T entity)
    {
        _dbSet.Update(entity);
    }

    public virtual void Remove(T entity)
    {
        _dbSet.Remove(entity);
    }
}
```

### Repositorio Especifico com Queries Complexas
```csharp
public interface IUserRepository : IBaseRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetWithOrdersAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default);
}

public class UserRepository : BaseRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context) { }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<User?> GetWithOrdersAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u.Orders)
                .ThenInclude(o => o.Items)
                    .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<User>> GetActiveUsersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(u => u.Active)
            .OrderBy(u => u.Name)
            .ToListAsync(cancellationToken);
    }
}
```

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

### Configuracao de Connection String
```json
// appsettings.json — PostgreSQL (padrao)
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mydb;Username=myuser;Password=mypassword;"
  }
}

// appsettings.json — Oracle (alternativa)
// {
//   "ConnectionStrings": {
//     "DefaultConnection": "User Id=myUser;Password=myPassword;Data Source=localhost:1521/ORCLPDB1;"
//   }
// }
```

### Interceptors para Auditoria
```csharp
public class AuditInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        UpdateAuditFields(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateAuditFields(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void UpdateAuditFields(DbContext? context)
    {
        if (context is null) return;

        var now = DateTime.UtcNow;
        
        foreach (var entry in context.ChangeTracker.Entries<IAuditableEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }
    }
}

// Interceptor registration
builder.Services.AddDbContext<AppDbContext>((sp, options) =>
{
    options.UseNpgsql(connectionString)
           .AddInterceptors(new AuditInterceptor());
});
```

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
# Uma vez por repositório
dotnet new tool-manifest
dotnet tool install dotnet-ef --version 9.0.0   # mesma major do Microsoft.EntityFrameworkCore.Design

# Em qualquer clone novo ou pipeline de CI
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
do projeto (ex.: método novo do EF 9 gerado em um projeto ainda no EF 8).

### 3. Migration vazia ou que ignora uma alteração real do modelo

Normalmente é build desatualizado, não ausência de mudança. `dotnet ef` compila o projeto antes de
inspecionar o modelo via reflection; se o `obj`/`bin` estiver com artefato antigo (comum depois de
merge ou troca de branch), a migration é gerada a partir do modelo antigo.

```bash
dotnet clean
dotnet build
dotnet ef migrations add MigrationName
```

### 4. Detectar model desatualizado antes de aplicar (EF Core 8+)

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
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json")
            .AddEnvironmentVariables()
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));

        return new AppDbContext(optionsBuilder.Options);
    }
}
```

### 6. Múltiplos `DbContext` ou múltiplos projetos na solution

Sem os flags corretos, `dotnet-ef` escolhe o `DbContext` ou o projeto errado silenciosamente:

```bash
dotnet ef migrations add MigrationName \
  --project src/4-Infra/ProjectName.Infra \
  --startup-project src/1-Services/ProjectName.API \
  --context AppDbContext
```

`--startup-project` precisa apontar para o projeto executável (tem `appsettings.json` e DI
completo); `--project` aponta para onde a pasta `Migrations/` deve ser criada.

### 7. Não aplicar migration automaticamente em produção dentro do `Program.cs`

`Database.Migrate()` chamado direto no boot do `Program.cs` acopla o start da aplicação à
disponibilidade do banco e roda a cada réplica subindo — em produção isso vira condição de corrida
entre pods e falha de boot mascarando falha de schema. Separe em um step de deploy/job dedicado:

```bash
# Pipeline de deploy — antes do rollout da aplicação
dotnet ef database update --project src/4-Infra/ProjectName.Infra --startup-project src/1-Services/ProjectName.API

# Ou, para ambientes sem acesso direto ao dotnet-ef, gere um script idempotente
dotnet ef migrations script --idempotent -o migrate.sql
```

Em desenvolvimento local, aplicar via `dotnet ef database update` (ou `Database.Migrate()` atrás de
um `if (environment.IsDevelopment())`) é aceitável — o risco descrito acima é específico de
produção com múltiplas réplicas.
