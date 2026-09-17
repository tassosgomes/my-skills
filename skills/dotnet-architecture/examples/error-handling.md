# Tratamento de Erros — Exceções e ProblemDetails

Erros viram `application/problem+json` (RFC 9457) em um único `IExceptionHandler`. Controllers e
casos de uso não montam respostas de erro.

## Mapa de exceções

| Exceção | Camada | Status | Quando |
|---|---|---|---|
| `FluentValidation.ValidationException` | Application | 400 | Formato do input inválido (validator explícito no caso de uso) |
| `NotFoundException` | Application | 404 | Caso de uso não encontrou o agregado (repositório retornou `null`) |
| `EntityValidationException` | Domain | 422 | Invariante do agregado violada |
| `RelatedAggregateException` | Application | 422 | Agregado relacionado informado não existe |
| qualquer outra | — | 500 | Erro inesperado; detalhe genérico, sem stack trace |

As exceções de Domain estão em `domain-model.md`; as de Application em `use-cases.md`.

## Global Exception Handler

```csharp
// Api/ExceptionHandlers/GlobalExceptionHandler.cs
public sealed class GlobalExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<GlobalExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problemDetails = exception switch
        {
            FluentValidation.ValidationException ex => CreateProblem(StatusCodes.Status400BadRequest, "validation-error",
                "One or more input fields are invalid", ex.Message,
                ex.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage })),

            NotFoundException ex => CreateProblem(StatusCodes.Status404NotFound, "not-found",
                "Resource not found", ex.Message),

            EntityValidationException ex => CreateProblem(StatusCodes.Status422UnprocessableEntity, "business-rule-violation",
                "One or more validation errors occurred", ex.Message,
                ex.Errors.Select(e => new { field = e.Field, message = e.Message })),

            RelatedAggregateException ex => CreateProblem(StatusCodes.Status422UnprocessableEntity, "related-aggregate-not-found",
                "Related aggregate not found", ex.Message),

            _ => CreateProblem(StatusCodes.Status500InternalServerError, "unexpected-error",
                "An unexpected error occurred", "An unexpected error occurred")
        };

        if (problemDetails.Status >= StatusCodes.Status500InternalServerError)
            _logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        else
            _logger.LogInformation("Request rejected with {Status}: {Message}", problemDetails.Status, exception.Message);

        httpContext.Response.StatusCode = problemDetails.Status!.Value;

        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problemDetails,
            Exception = exception
        });
    }

    private static ProblemDetails CreateProblem(int status, string type, string title, string detail, object? errors = null)
    {
        var problem = new ProblemDetails
        {
            Status = status,
            Type = $"/problems/{type}",
            Title = title,
            Detail = detail
        };

        if (errors is not null)
            problem.Extensions["errors"] = errors;

        return problem;
    }
}
```

```csharp
// Api/Extensions/ErrorHandlingExtensions.cs (see dotnet-program-setup)
public static class ErrorHandlingExtensions
{
    public static IServiceCollection AddErrorHandlingConfiguration(this IServiceCollection services)
    {
        services.AddProblemDetails(options =>
            options.CustomizeProblemDetails = context =>
                context.ProblemDetails.Instance = context.HttpContext.Request.Path);

        services.AddExceptionHandler<GlobalExceptionHandler>();
        return services;
    }
}

// In the pipeline composition, before the other middlewares:
app.UseExceptionHandler();
```

Exemplo de resposta 422:

```json
{
  "type": "/problems/business-rule-violation",
  "title": "One or more validation errors occurred",
  "status": 422,
  "detail": "Name should be at least 3 characters long",
  "instance": "/v1/categories",
  "errors": []
}
```

## Regras

- Nunca inclua stack trace, nome de tabela ou mensagem de exceção inesperada no corpo da resposta,
  nem em Development — use o log.
- Não use `IExceptionFilter` do MVC: ele não cobre erros fora dos controllers (middlewares,
  minimal APIs) e duplica o papel do `IExceptionHandler`.
- Não capture exceção no controller para devolver `NotFound()`; deixe o handler global mapear.
- `Type` é estável por categoria de erro; clientes decidem por `type`/`status`, não por `detail`.

## Result Pattern (somente integrações)

Para chamadas a sistemas externos em que a falha é esperada e faz parte do fluxo (ex.: consulta a
um parceiro que pode estar indisponível), prefira `Result<T>` a exceções. Não use `Result<T>` para
invariantes de domínio nem para "não encontrado".

```csharp
public sealed class Result<T>
{
    private Result(T value) => (IsSuccess, Value) = (true, value);
    private Result(string error) => (IsSuccess, Error) = (false, error);

    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }

    public static Result<T> Success(T value) => new(value);
    public static Result<T> Failure(string error) => new(error);

    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<string, TResult> onFailure)
        => IsSuccess ? onSuccess(Value!) : onFailure(Error!);
}
```
