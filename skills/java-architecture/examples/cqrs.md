# CQRS Padrao (Type-Safe, Sem Reflection Fragil) — Exemplo

Regras: um handler por operacao, dispatcher type-safe, Commands e Queries imutaveis (record).

**Proibido:**
- Resolver handler por nome de bean
- Usar string para encontrar handler
- Usar `ApplicationContext.getBean` com nome

## Interfaces Base

```java
public interface Command<R> {}
public interface Query<R> {}

public interface CommandHandler<C extends Command<R>, R> {
    R handle(C command);
}

public interface QueryHandler<Q extends Query<R>, R> {
    R handle(Q query);
}
```

## Dispatcher Type-Safe (Obrigatorio)

Os handlers sao resolvidos por tipo via `GenericTypeResolver` no construtor — nunca por nome/string.

```java
@Component
public class SimpleDispatcher implements Dispatcher {

    private final Map<Class<?>, CommandHandler<?, ?>> commandHandlers;
    private final Map<Class<?>, QueryHandler<?, ?>> queryHandlers;

    public SimpleDispatcher(
            List<CommandHandler<?, ?>> commandHandlers,
            List<QueryHandler<?, ?>> queryHandlers
    ) {
        this.commandHandlers = commandHandlers.stream()
                .collect(Collectors.toMap(
                        this::resolveCommandType,
                        Function.identity()
                ));

        this.queryHandlers = queryHandlers.stream()
                .collect(Collectors.toMap(
                        this::resolveQueryType,
                        Function.identity()
                ));
    }

    @Override
    @SuppressWarnings("unchecked")
    public <R> R dispatch(Command<R> command) {
        CommandHandler<Command<R>, R> handler =
                (CommandHandler<Command<R>, R>) commandHandlers.get(command.getClass());

        if (handler == null) {
            throw new IllegalStateException("No handler found for " + command.getClass());
        }

        return handler.handle(command);
    }

    @Override
    @SuppressWarnings("unchecked")
    public <R> R query(Query<R> query) {
        QueryHandler<Query<R>, R> handler =
                (QueryHandler<Query<R>, R>) queryHandlers.get(query.getClass());

        if (handler == null) {
            throw new IllegalStateException("No handler found for " + query.getClass());
        }

        return handler.handle(query);
    }

    private Class<?> resolveCommandType(CommandHandler<?, ?> handler) {
        return GenericTypeResolver.resolveTypeArgument(
                handler.getClass(),
                CommandHandler.class
        );
    }

    private Class<?> resolveQueryType(QueryHandler<?, ?> handler) {
        return GenericTypeResolver.resolveTypeArgument(
                handler.getClass(),
                QueryHandler.class
        );
    }
}
```
