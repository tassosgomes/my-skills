# Modelo de Domínio — SeedWork, Agregados e Validação

O Domain concentra as abstrações base em `SeedWork/` e os tipos de negócio em pastas no plural.
Nada aqui referencia EF Core, ASP.NET Core ou mensageria.

## SeedWork

```csharp
// SeedWork/Entity.cs
namespace ProjectName.Domain.SeedWork;

public abstract class Entity
{
    protected Entity() => Id = Guid.NewGuid();

    public Guid Id { get; protected set; }
}
```

```csharp
// SeedWork/AggregateRoot.cs
namespace ProjectName.Domain.SeedWork;

public abstract class AggregateRoot : Entity
{
    private readonly List<DomainEvent> _events = [];

    public IReadOnlyCollection<DomainEvent> Events => _events.AsReadOnly();

    protected void RaiseEvent(DomainEvent domainEvent) => _events.Add(domainEvent);

    public void ClearEvents() => _events.Clear();
}
```

```csharp
// SeedWork/DomainEvent.cs
namespace ProjectName.Domain.SeedWork;

public abstract record DomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();

    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
```

```csharp
// SeedWork/ValueObject.cs
namespace ProjectName.Domain.SeedWork;

public abstract class ValueObject : IEquatable<ValueObject>
{
    protected abstract IEnumerable<object?> GetEqualityComponents();

    public bool Equals(ValueObject? other)
        => other is not null
           && other.GetType() == GetType()
           && GetEqualityComponents().SequenceEqual(other.GetEqualityComponents());

    public override bool Equals(object? obj) => obj is ValueObject other && Equals(other);

    public override int GetHashCode()
        => GetEqualityComponents().Aggregate(0, (hash, component) => HashCode.Combine(hash, component));

    public static bool operator ==(ValueObject? left, ValueObject? right) => Equals(left, right);

    public static bool operator !=(ValueObject? left, ValueObject? right) => !Equals(left, right);
}
```

As portas de persistência (`IGenericRepository<TAggregate>`, `ISearchableRepository<TAggregate>`,
`IUnitOfWork`) também ficam em `SeedWork/` — ver `repository-pattern.md`.

## Agregado com validação por exceção

Use `DomainValidation` para invariantes simples: a primeira regra violada interrompe a operação.

```csharp
// Validation/DomainValidation.cs
namespace ProjectName.Domain.Validation;

public static class DomainValidation
{
    public static void NotNull(object? target, string fieldName)
    {
        if (target is null)
            throw new EntityValidationException($"{fieldName} should not be null");
    }

    public static void NotNullOrEmpty(string? target, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(target))
            throw new EntityValidationException($"{fieldName} should not be empty or null");
    }

    public static void MinLength(string target, int minLength, string fieldName)
    {
        if (target.Length < minLength)
            throw new EntityValidationException($"{fieldName} should be at least {minLength} characters long");
    }

    public static void MaxLength(string target, int maxLength, string fieldName)
    {
        if (target.Length > maxLength)
            throw new EntityValidationException($"{fieldName} should be less or equal {maxLength} characters long");
    }
}
```

```csharp
// Exceptions/EntityValidationException.cs
namespace ProjectName.Domain.Exceptions;

public sealed class EntityValidationException : Exception
{
    public EntityValidationException(string message, IReadOnlyCollection<ValidationError>? errors = null)
        : base(message)
    {
        Errors = errors ?? [];
    }

    public IReadOnlyCollection<ValidationError> Errors { get; }
}
```

```csharp
// Entities/Category.cs
namespace ProjectName.Domain.Entities;

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
        DomainValidation.NotNull(Description, nameof(Description));
        DomainValidation.MaxLength(Description, DescriptionMaxLength, nameof(Description));
    }
}
```

```csharp
// Events/CategoryCreatedEvent.cs
namespace ProjectName.Domain.Events;

public sealed record CategoryCreatedEvent(Guid CategoryId, string Name) : DomainEvent;
```

Regras do agregado:

- Criação que levanta evento ou valida invariantes usa fábrica estática (`Category.Create`). O
  único construtor é privado e sem parâmetros: se existir um construtor com parâmetros que batem com
  as propriedades, o EF Core pode usá-lo na leitura e levantar eventos de novo a cada consulta.
- Agregados que referenciam outros agregados guardam só o Id (`IReadOnlyList<Guid> Categories`),
  nunca a entidade do outro agregado.
- Datas em UTC (`DateTime.UtcNow`); nunca `DateTime.Now`.

## Validação por notificação

Use o padrão Notification quando o agregado tem muitos campos e o cliente precisa receber todos os
erros de uma vez, em vez de corrigir um por requisição.

```csharp
// Validation/ValidationError.cs
public sealed record ValidationError(string Field, string Message);

// Validation/ValidationHandler.cs
public abstract class ValidationHandler
{
    public abstract void HandleError(ValidationError error);

    public void HandleError(string field, string message) => HandleError(new ValidationError(field, message));
}

// Validation/NotificationValidationHandler.cs
public sealed class NotificationValidationHandler : ValidationHandler
{
    private readonly List<ValidationError> _errors = [];

    public IReadOnlyCollection<ValidationError> Errors => _errors.AsReadOnly();

    public bool HasErrors => _errors.Count > 0;

    public override void HandleError(ValidationError error) => _errors.Add(error);
}

// Validation/Validator.cs
public abstract class Validator
{
    protected Validator(ValidationHandler handler) => Handler = handler;

    protected ValidationHandler Handler { get; }

    public abstract void Validate();
}
```

```csharp
// Validation/VideoValidator.cs
public sealed class VideoValidator : Validator
{
    private const int TitleMaxLength = 255;
    private const int DescriptionMaxLength = 4_000;

    private readonly Video _video;

    public VideoValidator(Video video, ValidationHandler handler) : base(handler) => _video = video;

    public override void Validate()
    {
        if (string.IsNullOrWhiteSpace(_video.Title))
            Handler.HandleError(nameof(Video.Title), "is required");
        else if (_video.Title.Length > TitleMaxLength)
            Handler.HandleError(nameof(Video.Title), $"should be less or equal {TitleMaxLength} characters long");

        if (string.IsNullOrWhiteSpace(_video.Description))
            Handler.HandleError(nameof(Video.Description), "is required");
        else if (_video.Description.Length > DescriptionMaxLength)
            Handler.HandleError(nameof(Video.Description), $"should be less or equal {DescriptionMaxLength} characters long");
    }
}

// Entities/Video.cs (trecho)
public void Validate(ValidationHandler handler) => new VideoValidator(this, handler).Validate();
```

```csharp
// In the use case
var video = Video.Create(input.Title, input.Description, ...);
var notification = new NotificationValidationHandler();
video.Validate(notification);

if (notification.HasErrors)
    throw new EntityValidationException("There are validation errors", notification.Errors);
```

## Quando usar cada forma

| Situação | Forma |
|---|---|
| Poucas invariantes, construtor pequeno | `DomainValidation` (exceção na primeira falha) |
| Muitos campos, formulário extenso, cliente precisa de todos os erros | Notification + `EntityValidationException` com `Errors` |
| Formato do input (Id vazio, página negativa) antes de tocar o domínio | FluentValidation na Application (`use-cases.md`) |

Não misture as duas formas no mesmo agregado.
