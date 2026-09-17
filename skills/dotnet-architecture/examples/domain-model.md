# Modelo de Domínio — SeedWork, UUIDv7 e Agregados

## SeedWork

```csharp
// SeedWork/Entity.cs
public abstract class Entity
{
    protected Entity() => Id = Guid.CreateVersion7();

    public Guid Id { get; protected set; }
}

// SeedWork/AggregateRoot.cs
public abstract class AggregateRoot : Entity
{
    private readonly List<DomainEvent> _events = [];

    public IReadOnlyCollection<DomainEvent> Events => _events.AsReadOnly();

    protected void RaiseEvent(DomainEvent domainEvent) => _events.Add(domainEvent);

    public void ClearEvents() => _events.Clear();
}

// SeedWork/DomainEvent.cs
public abstract record DomainEvent
{
    public Guid EventId { get; } = Guid.CreateVersion7();

    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
```

`ValueObject` fica em `SeedWork/` com igualdade por componentes. Prefira `record` quando o value
object não precisar de igualdade customizada. Portas de persistência estão em
`repository-pattern.md`.

## UUIDv7

- Todo Id de entidade, agregado e evento é `Guid.CreateVersion7()`. `Guid.NewGuid()` está em
  `BannedSymbols.txt` e quebra o build.
- O Id nasce no domínio; no EF a coluna é `uuid` com `ValueGeneratedNever()`.
- O `EventId` é o `Id` da linha do outbox e o `MessageId` publicado; por ser v7, o outbox pode ser
  ordenado pelo próprio Id.
- O timestamp embutido no Id não é regra de negócio; para datas use `CreatedAt`/`OccurredOn`.
- Em teste que depende de ordem, gere com `Guid.CreateVersion7(DateTimeOffset)`.
- Oracle (`RAW(16)`): o Id continua v7, mas a ordem dos bytes do .NET não preserva o ganho de
  índice ordenado.

## Agregado

```csharp
// Entities/Category.cs
public sealed class Category : AggregateRoot
{
    private const int NameMinLength = 3;
    private const int NameMaxLength = 255;
    private const int DescriptionMaxLength = 10_000;

    // Used only by EF Core when materializing: no validation, no events.
    private Category() { }

    public static Category Create(string name, string description, bool isActive = true)
    {
        var category = new Category
        {
            Name = name,
            Description = description,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };

        category.Validate();
        category.RaiseEvent(new CategoryCreatedEvent(category.Id, category.Name));
        return category;
    }

    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    public void Update(string name, string? description = null)
    {
        Name = name;
        Description = description ?? Description;
        Validate();
    }

    public void Activate() => IsActive = true;

    public void Deactivate() => IsActive = false;

    private void Validate()
    {
        DomainValidation.NotNullOrEmpty(Name, nameof(Name));
        DomainValidation.MinLength(Name, NameMinLength, nameof(Name));
        DomainValidation.MaxLength(Name, NameMaxLength, nameof(Name));
        DomainValidation.MaxLength(Description, DescriptionMaxLength, nameof(Description));
    }
}

// Events/CategoryCreatedEvent.cs
public sealed record CategoryCreatedEvent(Guid CategoryId, string Name) : DomainEvent;
```

Regras:

- Criação usa fábrica estática (`Create`). O único construtor é privado e sem parâmetros: se houver
  construtor com parâmetros compatíveis, o EF Core pode usá-lo na leitura e levantar eventos de novo.
- Propriedades com `private set`; alteração só por método de domínio.
- Coleção de Ids de outro agregado (`IReadOnlyList<Guid> Categories`), nunca a entidade.
- Carga vinda da persistência usa método sem validação nem evento (`LoadCategories(ids)`).
- Datas em UTC.

## Validação de domínio

Duas formas, nunca misturadas no mesmo agregado:

| Situação | Forma |
|---|---|
| Poucas invariantes | `DomainValidation` estático: lança `EntityValidationException` na primeira falha |
| Muitos campos e o cliente precisa de todos os erros | `NotificationValidationHandler` acumula `ValidationError(Field, Message)`; o caso de uso lança `EntityValidationException(message, errors)` |
| Formato do input (Id vazio, página negativa) | FluentValidation na Application (`use-cases.md`) |

Mensagens de `DomainValidation` seguem o padrão `"{Field} should not be empty or null"`,
`"{Field} should be at least {n} characters long"` e
`"{Field} should be less or equal {n} characters long"`; os testes dependem desse texto.

```csharp
// Exceptions/EntityValidationException.cs
public sealed class EntityValidationException(string message, IReadOnlyCollection<ValidationError>? errors = null)
    : Exception(message)
{
    public IReadOnlyCollection<ValidationError> Errors { get; } = errors ?? [];
}

// In the use case, notification form
var notification = new NotificationValidationHandler();
video.Validate(notification);
if (notification.HasErrors)
    throw new EntityValidationException("There are validation errors", notification.Errors);
```
