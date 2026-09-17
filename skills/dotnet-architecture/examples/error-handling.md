# Tratamento de Erros — Exceções e ProblemDetails

## Mapa de exceções

| Exceção | Camada | Status | `type` |
|---|---|---|---|
| `FluentValidation.ValidationException` | Application | 400 | `/problems/validation-error` |
| `NotFoundException` | Application | 404 | `/problems/not-found` |
| `EntityValidationException` | Domain | 422 | `/problems/business-rule-violation` |
| `RelatedAggregateException` | Application | 422 | `/problems/related-aggregate-not-found` |
| qualquer outra | — | 500 | `/problems/unexpected-error` (detalhe genérico) |

`type` é estável por categoria; clientes decidem por `type`/`status`, nunca por `detail`.

## Global Exception Handler

```csharp
// Api/ExceptionHandlers/GlobalExceptionHandler.cs
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            FluentValidation.ValidationException ex => CreateProblem(400, "validation-error", "One or more input fields are invalid", ex.Message,
                ex.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage })),
            NotFoundException ex => CreateProblem(404, "not-found", "Resource not found", ex.Message),
            EntityValidationException ex => CreateProblem(422, "business-rule-violation", "One or more validation errors occurred", ex.Message,
                ex.Errors.Select(e => new { field = e.Field, message = e.Message })),
            RelatedAggregateException ex => CreateProblem(422, "related-aggregate-not-found", "Related aggregate not found", ex.Message),
            _ => CreateProblem(500, "unexpected-error", "An unexpected error occurred", "An unexpected error occurred")
        };

        if (problem.Status >= 500)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        else
            logger.LogInformation("Request rejected with {Status}: {Message}", problem.Status, exception.Message);

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }

    private static ProblemDetails CreateProblem(int status, string type, string title, string detail, object? errors = null)
    {
        var problem = new ProblemDetails { Status = status, Type = $"/problems/{type}", Title = title, Detail = detail };
        if (errors is not null)
            problem.Extensions["errors"] = errors;
        return problem;
    }
}
```

Registro em `Extensions/ErrorHandlingExtensions.cs`: `AddProblemDetails` preenchendo `Instance` com
o path e `AddExceptionHandler<GlobalExceptionHandler>()`. `app.UseExceptionHandler()` é o primeiro
middleware do pipeline.

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

- Nunca devolva stack trace, nome de tabela ou mensagem de exceção inesperada, nem em Development.
- Rejeição esperada (400/404/422) é log `Information`; 500 é `Error`.
- Não use `IExceptionFilter` nem `try/catch` em endpoint para traduzir exceção.
- `Result<T>` só em integração com sistema externo cuja falha faz parte do fluxo; nunca para
  invariante de domínio nem para "não encontrado".
