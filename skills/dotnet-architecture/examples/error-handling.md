# Tratamento de Erros — Exemplo

> **Por que tratamento de erros e fundamental?**
> - **Resiliencia**: Aplicacoes robustas se recuperam graciosamente de falhas
> - **Debugging eficiente**: Stack traces e logs estruturados aceleram identificacao de problemas
> - **UX superior**: Usuarios recebem mensagens claras ao inves de crashes
> - **Monitoramento**: Erros estruturados permitem alertas e metricas uteis
> - **Compliance**: Muitas regulamentacoes exigem logging e auditoria de erros
> - **Previne vazamentos**: Tratamento adequado evita expor informacoes sensiveis

## Global Exception Handler (ASP.NET Core 8+)

```csharp
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = exception switch
        {
            ValidationException ex => (400, "Validation Error", ex.Message),
            UserNotFoundException ex => (404, "Resource Not Found", ex.Message),
            UnauthorizedAccessException => (401, "Unauthorized", "Authentication required"),
            ArgumentNullException ex => (400, "Invalid Request", $"Required parameter {ex.ParamName} is missing"),
            _ => (500, "Internal Server Error", "An unexpected error occurred")
        };

        _logger.LogError(exception, "Exception occurred: {Message}", exception.Message);

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}

// Registration in Program.cs
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
app.UseExceptionHandler();
```

## Custom Exceptions

```csharp
public abstract class DomainException : Exception
{
    protected DomainException(string message) : base(message) { }
    protected DomainException(string message, Exception innerException) : base(message, innerException) { }
}

public class UserNotFoundException : DomainException
{
    public UserNotFoundException(int userId)
        : base($"User with ID {userId} was not found") { }
}

public class ValidationException : DomainException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred")
    {
        Errors = errors;
    }
}

public class BusinessException : DomainException
{
    public string RuleCode { get; }

    public BusinessException(string ruleCode, string message)
        : base(message)
    {
        RuleCode = ruleCode;
    }
}
```

## Result Pattern

```csharp
public class Result<T>
{
    public bool IsSuccess { get; private set; }
    public T? Value { get; private set; }
    public string? Error { get; private set; }
    public Exception? Exception { get; private set; }

    private Result(T value)
    {
        IsSuccess = true;
        Value = value;
    }

    private Result(string error, Exception? exception = null)
    {
        IsSuccess = false;
        Error = error;
        Exception = exception;
    }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);
    public static Result<T> Failure(string error, Exception exception) => new(error, exception);

    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<string, TResult> onFailure)
    {
        return IsSuccess ? onSuccess(Value!) : onFailure(Error!);
    }

    public async Task<TResult> MatchAsync<TResult>(
        Func<T, Task<TResult>> onSuccess,
        Func<string, Task<TResult>> onFailure)
    {
        return IsSuccess ? await onSuccess(Value!) : await onFailure(Error!);
    }
}

// Usage
public async Task<Result<User>> GetUserAsync(int id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _repository.GetByIdAsync(id, cancellationToken);
        return user == null
            ? Result<User>.Failure($"User {id} not found")
            : Result<User>.Success(user);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error retrieving user {UserId}", id);
        return Result<User>.Failure("An error occurred while retrieving the user", ex);
    }
}

// Usage in Controllers
[HttpGet("{id}")]
public async Task<IActionResult> GetUser(int id, CancellationToken cancellationToken)
{
    var result = await _userService.GetUserAsync(id, cancellationToken);

    return result.Match<IActionResult>(
        onSuccess: user => Ok(user),
        onFailure: error => NotFound(error)
    );
}
```

## Middleware para Logging de Erros

```csharp
public class ErrorLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorLoggingMiddleware> _logger;

    public ErrorLoggingMiddleware(RequestDelegate next, ILogger<ErrorLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await LogErrorAsync(context, ex);
            throw; // Re-throw to allow other middlewares to process
        }
    }

    private async Task LogErrorAsync(HttpContext context, Exception exception)
    {
        var correlationId = context.TraceIdentifier;
        var userId = context.User?.Identity?.Name ?? "Anonymous";
        var endpoint = $"{context.Request.Method} {context.Request.Path}";

        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["correlation.id"] = correlationId,
            ["user.id"] = userId,
            ["http.request.method"] = context.Request.Method,
            ["url.path"] = context.Request.Path,
            ["error.type"] = exception.GetType().Name
        });

        _logger.LogError(exception,
            "Unhandled exception occurred for {Endpoint} by user {UserId}. Correlation ID: {CorrelationId}",
            endpoint, userId, correlationId);

        context.Items["Exception"] = exception;
        context.Items["CorrelationId"] = correlationId;
    }
}

// Pipeline registration
app.UseMiddleware<ErrorLoggingMiddleware>();
```

## Validacao com FluentValidation

```csharp
public class CreateUserCommandValidator : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .WithMessage("Name is required")
            .MaximumLength(100)
            .WithMessage("Name must have at most 100 characters");

        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required")
            .EmailAddress()
            .WithMessage("Email must have a valid format")
            .MaximumLength(255)
            .WithMessage("Email must have at most 255 characters");
    }
}

// Manual validation in handlers
public class CreateUserHandler : ICommandHandler<CreateUserCommand, CreateUserResponse>
{
    private readonly IValidator<CreateUserCommand> _validator;

    public async Task<CreateUserResponse> HandleAsync(CreateUserCommand command, CancellationToken cancellationToken)
    {
        // Manual validation
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors
                .GroupBy(x => x.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray());

            throw new ValidationException(errors);
        }

        // Handler logic...
    }
}

// DI registration
builder.Services.AddValidatorsFromAssembly(typeof(Program).Assembly);
```
