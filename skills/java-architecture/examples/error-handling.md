# Tratamento de Erros — Exemplo

Obrigatorio: base class `DomainException`, `GlobalExceptionHandler`, `ProblemDetail` (RFC 7807), nunca retornar stacktrace, logging estruturado.

## Domain Exception Base

```java
public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }
}
```

## Global Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ProblemDetail> handleDomainException(DomainException ex) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );

        problem.setTitle("Business Rule Violation");

        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException ex
    ) {

        ProblemDetail problem = ProblemDetail.forStatus(
                HttpStatus.BAD_REQUEST
        );

        problem.setTitle("Validation Error");

        Map<String, String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        FieldError::getDefaultMessage
                ));

        problem.setProperty("errors", errors);

        return ResponseEntity.badRequest().body(problem);
    }
}
```
