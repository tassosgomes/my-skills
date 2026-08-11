# CQRS Nativo (Sem MediatR) — Exemplo

> Use este padrão quando a complexidade do caso de uso justificar (ver `CQRS ou Service Pattern
> simples?` no `SKILL.md`). Para CRUD simples ou poucas operações, prefira
> `examples/simple-service-pattern.md` — menos peças móveis, mesmo modelo de camadas.

Implementacao completa de CQRS sem MediatR: interfaces base, dispatcher nativo via reflection, commands/queries com handlers, registro no DI e uso em controllers.

## Interfaces Base para CQRS

```csharp
// Custom CQRS interfaces
public interface ICommand<TResponse>
{
}

public interface IQuery<TResponse>
{
}

public interface ICommandHandler<TCommand, TResponse>
    where TCommand : ICommand<TResponse>
{
    Task<TResponse> HandleAsync(TCommand command, CancellationToken cancellationToken);
}

public interface IQueryHandler<TQuery, TResponse>
    where TQuery : IQuery<TResponse>
{
    Task<TResponse> HandleAsync(TQuery query, CancellationToken cancellationToken);
}

// Native dispatcher
public interface IDispatcher
{
    Task<TResponse> SendAsync<TResponse>(ICommand<TResponse> command, CancellationToken cancellationToken);
    Task<TResponse> SendAsync<TResponse>(IQuery<TResponse> query, CancellationToken cancellationToken);
}
```

## Implementacao do Dispatcher

```csharp
public class Dispatcher : IDispatcher
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<Dispatcher> _logger;

    public Dispatcher(IServiceProvider serviceProvider, ILogger<Dispatcher> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task<TResponse> SendAsync<TResponse>(ICommand<TResponse> command, CancellationToken cancellationToken)
    {
        var commandType = command.GetType();
        var handlerType = typeof(ICommandHandler<,>).MakeGenericType(commandType, typeof(TResponse));

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["command.type"] = commandType.Name
        });

        _logger.LogDebug("Executing command {CommandType}", commandType.Name);

        var handler = _serviceProvider.GetRequiredService(handlerType);
        var method = handlerType.GetMethod("HandleAsync");

        var task = (Task<TResponse>)method!.Invoke(handler, new object[] { command, cancellationToken })!;
        return await task;
    }

    public async Task<TResponse> SendAsync<TResponse>(IQuery<TResponse> query, CancellationToken cancellationToken)
    {
        var queryType = query.GetType();
        var handlerType = typeof(IQueryHandler<,>).MakeGenericType(queryType, typeof(TResponse));

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["query.type"] = queryType.Name
        });

        _logger.LogDebug("Executing query {QueryType}", queryType.Name);

        var handler = _serviceProvider.GetRequiredService(handlerType);
        var method = handlerType.GetMethod("HandleAsync");

        var task = (Task<TResponse>)method!.Invoke(handler, new object[] { query, cancellationToken })!;
        return await task;
    }
}
```

## Commands e Queries

```csharp
// Command
public record CreateUserCommand(string Name, string Email) : ICommand<CreateUserResponse>;

public record CreateUserResponse(int Id, string Name, string Email);

// Command Handler
public class CreateUserHandler : ICommandHandler<CreateUserCommand, CreateUserResponse>
{
    private readonly IUserRepository _repository;
    private readonly IValidator<CreateUserCommand> _validator;
    private readonly ILogger<CreateUserHandler> _logger;

    public CreateUserHandler(
        IUserRepository repository,
        IValidator<CreateUserCommand> validator,
        ILogger<CreateUserHandler> logger)
    {
        _repository = repository;
        _validator = validator;
        _logger = logger;
    }

    public async Task<CreateUserResponse> HandleAsync(CreateUserCommand command, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(command, cancellationToken);

        _logger.LogInformation("Creating user {Email}", command.Email);

        var user = new User(command.Name, command.Email);
        await _repository.AddAsync(user, cancellationToken);

        _logger.LogInformation("User {UserId} created successfully", user.Id);

        return new CreateUserResponse(user.Id, user.Name, user.Email);
    }
}

// Query
public record GetUserQuery(int Id) : IQuery<GetUserResponse>;

public record GetUserResponse(int Id, string Name, string Email);

// Query Handler
public class GetUserHandler : IQueryHandler<GetUserQuery, GetUserResponse>
{
    private readonly IUserRepository _repository;

    public GetUserHandler(IUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<GetUserResponse> HandleAsync(GetUserQuery query, CancellationToken cancellationToken)
    {
        var user = await _repository.GetByIdAsync(query.Id, cancellationToken);
        return user == null
            ? throw new UserNotFoundException($"User {query.Id} not found")
            : new GetUserResponse(user.Id, user.Name, user.Email);
    }
}
```

## Configuracao no DI

```csharp
// Program.cs
builder.Services.AddScoped<IDispatcher, Dispatcher>();

// Automatic handler registration
builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(classes => classes.AssignableTo(typeof(ICommandHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());

builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(classes => classes.AssignableTo(typeof(IQueryHandler<,>)))
    .AsImplementedInterfaces()
    .WithScopedLifetime());

// Or specific manual registration
builder.Services.AddScoped<ICommandHandler<CreateUserCommand, CreateUserResponse>, CreateUserHandler>();
builder.Services.AddScoped<IQueryHandler<GetUserQuery, GetUserResponse>, GetUserHandler>();
```

## Uso em Controllers

```csharp
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IDispatcher _dispatcher;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IDispatcher dispatcher, ILogger<UsersController> logger)
    {
        _dispatcher = dispatcher;
        _logger = logger;
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GetUserResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetUserAsync(int id, CancellationToken cancellationToken)
    {
        try
        {
            var query = new GetUserQuery(id);
            var result = await _dispatcher.SendAsync(query, cancellationToken);
            return Ok(result);
        }
        catch (UserNotFoundException)
        {
            return NotFound($"User {id} not found");
        }
    }

    [HttpPost]
    [ProducesResponseType(typeof(CreateUserResponse), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> CreateUserAsync(
        [FromBody] CreateUserCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _dispatcher.SendAsync(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetUserAsync),
            new { id = result.Id },
            result);
    }
}
```
