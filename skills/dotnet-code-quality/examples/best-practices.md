# Melhores Praticas de Programacao — Exemplos

Exemplos correto/errado para async/await, CancellationToken, Dependency Injection, SOLID e Exception Handling.

## Async/Await

```csharp
// Correct - CancellationToken required
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    var user = await _repository.GetByIdAsync(id, cancellationToken);
    return user ?? throw new UserNotFoundException($"User with ID {id} not found");
}

// Correct - ConfigureAwait(false) in libraries
public async Task<string> GetDataAsync(CancellationToken cancellationToken)
{
    var response = await _httpClient.GetAsync("api/data", cancellationToken).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
}

// Wrong - synchronous blocking
public User GetUser(int id)
{
    return _repository.GetByIdAsync(id, CancellationToken.None).Result; // May cause deadlock
}

// Wrong - CancellationToken missing
public async Task<User> GetUserAsync(int id)
{
    return await _repository.GetByIdAsync(id, CancellationToken.None); // No cancellation flexibility
}
```

## CancellationToken — Boas Praticas

### 1. Opcional em APIs Publicas, Obrigatorio Internamente
```csharp
// API publica - opcional
public async Task<Usuario> ObterUsuarioAsync(int id, CancellationToken cancellationToken = default)
{
    return await ObterUsuarioInternoAsync(id, cancellationToken);
}

// Metodo interno - obrigatorio
private async Task<Usuario> ObterUsuarioInternoAsync(int id, CancellationToken cancellationToken)
{
    cancellationToken.ThrowIfCancellationRequested();
    return await _repositorio.ObterPorIdAsync(id, cancellationToken);
}
```

### 2. Evitar Cancelamento Apos Side Effects
```csharp
public async Task<Pedido> ProcessarPedidoAsync(SolicitacaoCriarPedido solicitacao, CancellationToken cancellationToken)
{
    // Pode ser cancelado ate aqui
    cancellationToken.ThrowIfCancellationRequested();
    
    var pedido = await _repositorio.CriarPedidoAsync(solicitacao, cancellationToken);
    
    // NAO cancele apos salvar no banco
    await _servicoEmail.EnviarConfirmacaoAsync(pedido.EmailCliente, CancellationToken.None);
    
    return pedido;
}
```

### 3. Timeout com CancellationToken
```csharp
public async Task<string> ChamarServicoExternoAsync(CancellationToken cancellationToken)
{
    using var timeoutCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var combinedCts = CancellationTokenSource.CreateLinkedTokenSource(
        cancellationToken, timeoutCts.Token);
    
    try
    {
        return await _httpClient.GetStringAsync("https://api.externa.com/dados", 
            combinedCts.Token);
    }
    catch (OperationCanceledException) when (timeoutCts.Token.IsCancellationRequested)
    {
        throw new TimeoutException("Chamada ao servico externo expirou");
    }
}
```

### 4. CancellationToken em Loops e Operacoes Longas
```csharp
public async Task ProcessarLoteAsync(IEnumerable<Item> itens, CancellationToken cancellationToken)
{
    var processados = 0;
    const int batchSize = 100;
    
    foreach (var batch in itens.Chunk(batchSize))
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        await ProcessarBatchAsync(batch, cancellationToken);
        
        processados += batch.Length;
        _logger.LogInformation("Processados {Processados} itens", processados);
    }
}
```

## Dependency Injection

```csharp
// Correct - Constructor injection
public class UserService
{
    private readonly IUserRepository _repository;
    private readonly ILogger<UserService> _logger;
    private readonly IEmailService _emailService;

    public UserService(
        IUserRepository repository,
        ILogger<UserService> logger,
        IEmailService emailService)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
    }
}
```

## SOLID Principles

```csharp
// Single Responsibility Principle
public class EmailValidator
{
    public bool IsValid(string email)
    {
        return !string.IsNullOrEmpty(email) && email.Contains("@");
    }
}

public class UserService
{
    private readonly IUserRepository _repository;
    private readonly EmailValidator _emailValidator;

    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        if (!_emailValidator.IsValid(request.Email))
        {
            throw new ArgumentException("Invalid email format");
        }

        // User creation logic
    }
}
```

## Exception Handling

```csharp
// Correct - Specific exceptions with CancellationToken
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    try
    {
        var user = await _repository.GetByIdAsync(id, cancellationToken);
        return user ?? throw new UserNotFoundException($"User with ID {id} not found");
    }
    catch (DbException ex) when (ex is TimeoutException)
    {
        _logger.LogWarning("Database timeout while getting user {UserId}", id);
        throw new ServiceUnavailableException("Database temporarily unavailable", ex);
    }
}

// Wrong - Generic exception
public async Task<User> GetUserAsync(int id, CancellationToken cancellationToken)
{
    try
    {
        return await _repository.GetByIdAsync(id, cancellationToken);
    }
    catch (Exception ex)
    {
        throw; // Adds no value
    }
}
```
