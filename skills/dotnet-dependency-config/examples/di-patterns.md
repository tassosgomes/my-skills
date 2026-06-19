# Configuracao e DI Patterns — Exemplo

Uso de `IUnitOfWork` e mapeamento (Mapster) injetados em um controller ASP.NET Core.

```csharp
public class UsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        IUnitOfWork unitOfWork,
        ILogger<UsersController> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id, cancellationToken);
        
        if (user is null)
            return NotFound();
        
        return Ok(user.Adapt<UserDto>());
    }

    [HttpPost]
    public async Task<IActionResult> CreateAsync(
        [FromBody] CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var user = request.Adapt<User>();
        
        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken);
        
        _logger.LogInformation("User {UserId} created successfully", user.Id);
        
        return CreatedAtAction(nameof(GetByIdAsync), new { id = user.Id }, user.Adapt<UserDto>());
    }
}
```
