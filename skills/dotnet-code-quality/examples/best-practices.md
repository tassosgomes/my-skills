# Boas Práticas de Código — Exemplos

Exemplos certo/errado para async/await, `CancellationToken`, injeção de dependência, SOLID e
exceções. Os tipos seguem as skills de arquitetura: casos de uso na Application, repositórios que
retornam `null` e exceções tratadas pelo `GlobalExceptionHandler`.

## Async/await

```csharp
// Correct: async all the way, token propagated, repository returns null and the use case decides
public async Task<CategoryModelOutput> ExecuteAsync(GetCategoryInput input, CancellationToken cancellationToken)
{
    var category = await _categoryRepository.GetAsync(input.Id, cancellationToken);
    NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

    return CategoryModelOutput.FromCategory(category!);
}

// Correct: ConfigureAwait(false) in reusable libraries (no synchronization context to resume on)
public async Task<string> DownloadManifestAsync(Uri uri, CancellationToken cancellationToken)
{
    using var response = await _httpClient.GetAsync(uri, cancellationToken).ConfigureAwait(false);
    return await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);
}

// Wrong: blocking on async code can deadlock and wastes a thread
public Category? GetCategory(Guid id)
    => _categoryRepository.GetAsync(id, CancellationToken.None).Result;

// Wrong: the caller cannot cancel
public async Task<Category?> GetCategoryAsync(Guid id)
    => await _categoryRepository.GetAsync(id, CancellationToken.None);
```

## CancellationToken

### Opcional só na borda pública, obrigatório internamente

```csharp
// Public library API: optional token for caller convenience
public Task<Manifest> GetManifestAsync(Guid videoId, CancellationToken cancellationToken = default)
    => LoadManifestAsync(videoId, cancellationToken);

// Internal code: required token, so no one forgets to pass it
private async Task<Manifest> LoadManifestAsync(Guid videoId, CancellationToken cancellationToken)
{
    cancellationToken.ThrowIfCancellationRequested();
    return await _manifestStore.GetAsync(videoId, cancellationToken);
}
```

Casos de uso, repositórios e handlers são código interno: o token é sempre obrigatório.

### Não cancelar depois do efeito colateral

```csharp
public async Task<CategoryModelOutput> ExecuteAsync(UpdateCategoryInput input, CancellationToken cancellationToken)
{
    // Cancellation is fine until something is persisted
    var category = await _categoryRepository.GetAsync(input.Id, cancellationToken);
    NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

    category!.Update(input.Name, input.Description);
    await _unitOfWork.CommitAsync(cancellationToken);

    // After the commit, cleanup must run even if the request was aborted
    await _cache.RemoveAsync(GetCategory.CacheKey(category.Id), CancellationToken.None);

    return CategoryModelOutput.FromCategory(category);
}
```

### Timeout combinado com o token do chamador

```csharp
public async Task<EncoderJobStatus?> GetJobStatusAsync(Guid jobId, CancellationToken cancellationToken)
{
    using var timeoutSource = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    using var linkedSource = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeoutSource.Token);

    try
    {
        return await _encoderClient.GetJobStatusAsync(jobId, linkedSource.Token);
    }
    catch (OperationCanceledException) when (timeoutSource.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
    {
        throw new TimeoutException($"Encoder did not answer for job {jobId} within 30 seconds");
    }
}
```

Para chamadas HTTP, prefira os timeouts do `AddStandardResilienceHandler`
(`dotnet-performance`); o padrão acima é para operações sem pipeline de resiliência.

### Loops e lotes

```csharp
public async Task ImportAsync(IEnumerable<CreateCategoryInput> inputs, CancellationToken cancellationToken)
{
    const int BatchSize = 100;
    var importedCount = 0;

    foreach (var batch in inputs.Chunk(BatchSize))
    {
        cancellationToken.ThrowIfCancellationRequested();

        await ImportBatchAsync(batch, cancellationToken);

        importedCount += batch.Length;
        _logger.LogInformation("Imported {ImportedCount} categories", importedCount);
    }
}
```

## Injeção de dependência

```csharp
// Correct: constructor injection, readonly fields, dependencies behind abstractions
public sealed class CreateGenre : ICreateGenre
{
    private readonly IGenreRepository _genreRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateGenre(IGenreRepository genreRepository, ICategoryRepository categoryRepository, IUnitOfWork unitOfWork)
    {
        _genreRepository = genreRepository ?? throw new ArgumentNullException(nameof(genreRepository));
        _categoryRepository = categoryRepository ?? throw new ArgumentNullException(nameof(categoryRepository));
        _unitOfWork = unitOfWork ?? throw new ArgumentNullException(nameof(unitOfWork));
    }
}

// Wrong: service locator hides dependencies and breaks unit tests
public sealed class CreateGenre : ICreateGenre
{
    private readonly IServiceProvider _serviceProvider;

    public async Task<GenreModelOutput> ExecuteAsync(CreateGenreInput input, CancellationToken cancellationToken)
    {
        var repository = _serviceProvider.GetRequiredService<IGenreRepository>();
        // ...
    }
}
```

## SOLID

### Responsabilidade única

```csharp
// Wrong: the use case validates format, applies business rules, persists and sends e-mail
public sealed class RegisterCustomer : IRegisterCustomer
{
    public async Task<CustomerModelOutput> ExecuteAsync(RegisterCustomerInput input, CancellationToken cancellationToken)
    {
        if (!input.Email.Contains('@')) throw new ArgumentException("Invalid e-mail");
        // ... business rules, persistence and SMTP code in the same method
    }
}

// Correct: each concern in its own place
public sealed class RegisterCustomerInputValidator : AbstractValidator<RegisterCustomerInput>
{
    public RegisterCustomerInputValidator() => RuleFor(input => input.Email).NotEmpty().EmailAddress();
}

public sealed class RegisterCustomer : IRegisterCustomer
{
    public async Task<CustomerModelOutput> ExecuteAsync(RegisterCustomerInput input, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(input, cancellationToken);   // format
        var customer = Customer.Register(input.Name, input.Email);          // invariants + CustomerRegisteredEvent
        await _customerRepository.InsertAsync(customer, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken);                   // data + outbox
        return CustomerModelOutput.FromCustomer(customer);                  // welcome e-mail is sent by an event consumer
    }
}
```

### Sem flag parameter

```csharp
// Wrong: the boolean switches behavior
public Task<IReadOnlyList<Category>> ListAsync(bool onlyActive, CancellationToken cancellationToken);

// Correct: explicit filter object (or two methods)
public Task<SearchOutput<Category>> SearchAsync(SearchInput input, CancellationToken cancellationToken);
```

## Exceções

```csharp
// Correct: catch the specific exception, add context, keep the original as inner exception
public async Task<EncoderJobStatus?> GetJobStatusAsync(Guid jobId, CancellationToken cancellationToken)
{
    try
    {
        return await _encoderClient.GetJobStatusAsync(jobId, cancellationToken);
    }
    catch (HttpRequestException ex) when (ex.StatusCode is HttpStatusCode.ServiceUnavailable)
    {
        _logger.LogWarning(ex, "Encoder unavailable while checking job {JobId}", jobId);
        throw new EncoderUnavailableException(jobId, ex);
    }
}

// Wrong: catch-all that adds nothing
public async Task<Category?> GetAsync(Guid id, CancellationToken cancellationToken)
{
    try
    {
        return await _context.Categories.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }
    catch (Exception)
    {
        throw;
    }
}

// Wrong: controller translating exceptions; GlobalExceptionHandler already maps them to ProblemDetails
[HttpGet("{id:guid}")]
public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
{
    try
    {
        return Ok(await _getCategory.ExecuteAsync(new GetCategoryInput(id), cancellationToken));
    }
    catch (NotFoundException)
    {
        return NotFound();
    }
}
```
