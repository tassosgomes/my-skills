---
name: dotnet-code-quality
description: "Padroes transversais de qualidade de codigo .NET C# / ASP.NET Core: convencoes de nomenclatura (PascalCase, camelCase, kebab-case), principios SOLID e Clean Code, estrutura de metodos e classes, async/await e CancellationToken, Dependency Injection, Exception Handling, estilo de codigo. Skill transversal que deve ser aplicada apos geracao de codigo. Usar quando: gerar codigo C#; revisar naming conventions; validar clean code; aplicar regras de qualidade; revisar estilo e formatacao; configurar DI."
---

# Padroes de Qualidade de Codigo .NET C# e ASP.NET Core

Documento normativo para geracao de codigo por LLMs.
Define regras obrigatorias e diretrizes de qualidade de codigo C#.
Skill transversal — deve ser aplicada sempre apos geracao de codigo.

## Indice

1. [Principios Fundamentais](#principios-fundamentais)
2. [Padroes de Codificacao](#padroes-de-codificacao)
3. [Convencoes de Nomenclatura](#convencoes-de-nomenclatura)
4. [Estilo de Codigo](#estilo-de-codigo)
5. [Melhores Praticas de Programacao](#melhores-praticas-de-programacao)
6. [Checklist de Qualidade de Codigo](#checklist-de-qualidade-de-codigo)

> **Exemplos de codigo completos** ficam em `examples/` e devem ser abertos sob demanda:
> - `examples/best-practices.md` — exemplos correto/errado de async/await, CancellationToken (4 padroes), Dependency Injection, SOLID e Exception Handling

---

## Principios Fundamentais

### Objetivos de Qualidade de Codigo

- **Legibilidade**: Codigo deve ser auto-explicativo e facil de entender
- **Manutenibilidade**: Facilitar modificacoes e extensoes futuras
  - *Por que*: 60-80% do tempo de um software e gasto em manutencao. Codigo bem estruturado reduz o custo de mudancas em ate 10x
- **Testabilidade**: Codigo deve ser facilmente testavel
  - *Por que*: Testes automatizados detectam 85-95% dos bugs antes da producao, reduzindo custos de correcao em ate 100x
- **Performance**: Otimizar quando necessario, sem sacrificar legibilidade
  - *Por que*: Otimizacao prematura e a raiz de muitos problemas. Focar na legibilidade primeiro permite identificar gargalos reais com profiling
- **Consistencia**: Seguir padroes estabelecidos em todo o projeto
  - *Por que*: Reduz a carga cognitiva da equipe e facilita a revisao de codigo, aumentando a produtividade em 25-40%

### Diretrizes Gerais

- Utilize recursos modernos da linguagem C# sempre que possivel
- Evite construcoes obsoletas
- Prefira clareza sobre brevidade
- Escreva codigo pensando em quem ira mante-lo no futuro

---

## Padroes de Codificacao

> **Por que seguir padroes de codificacao consistentes?**
> - **Reduz carga cognitiva**: Padroes uniformes permitem foco na logica, nao na sintaxe
> - **Acelera code review**: Revisores gastam tempo analisando logica, nao formatacao
> - **Facilita manutencao**: Codigo padronizado e mais previsivel e facil de modificar
> - **Melhora colaboracao**: Toda equipe segue mesmas convencoes, reduzindo conflitos
> - **Aumenta qualidade**: Padroes bem definidos previnem erros comuns

### Regras Fundamentais

#### Idioma e Nomenclatura

- **Todo codigo deve ser escrito em Ingles** para classes, metodos, variaveis e comentarios
- Use **camelCase** para variaveis e parametros
- Use **PascalCase** para classes, metodos, propriedades e interfaces
- Use **kebab-case** para diretorios
- Evite abreviacoes, mas mantenha nomes concisos (maximo 30 caracteres)

**Excecao – Linguagem Ubiqua do Dominio**

Termos do dominio definidos pelos especialistas **devem manter o nome original da linguagem do negocio**, mesmo que nao estejam em ingles ou nao possuam traducao fiel.
Esses termos **nao devem ser traduzidos ou adaptados** para evitar perda de significado.
Esses termos devem estar documentados no glossario do dominio ou no Bounded Context correspondente.

#### Estrutura de Metodos

- **Metodos devem executar uma acao clara e bem definida**
- **Nomes de metodos devem comecar com verbo**, nunca substantivo
- **Evite mais de 3 parametros** em metodos (use objetos se necessario)
- **Evite efeitos colaterais**: metodos fazem mutacao OU consulta, nunca ambos
- **Evite metodos longos**: maximo 50 linhas
- **Nunca use flag params** para chavear comportamento - extraia metodos especificos

#### Estrutura de Classes e Condicionais

- **Evite classes longas**: maximo 300 linhas
- **Nunca aninhamento maior que 2 niveis** de if/else
- **Inverta dependencias** para recursos externos (Dependency Inversion Principle)
- **Prefira composicao sobre heranca** sempre que possivel

#### Boas Praticas de Codigo Limpo

- **Evite linhas em branco** dentro de metodos (priorize legibilidade quando necessario)
- **Evite comentarios obvios** - apenas comentarios que agregam valor
- **Nunca declare multiplas variaveis na mesma linha**
- **Declare variaveis proximo ao uso**
- **Use constantes para magic numbers** com nomes descritivos

### Exemplos de Aplicacao

```csharp
// Clear method, few parameters
public class UserService
{
    public async Task<User> CreateUserAsync(string name, string email, CancellationToken cancellationToken)
    {
        ValidateParameters(name, email);
        
        var user = new User(name, email);
        await _repository.AddAsync(user, cancellationToken);
        
        return user;
    }
    
    // Specific methods without flag params
    public async Task<IEnumerable<User>> GetActiveUsersAsync(CancellationToken cancellationToken)
    {
        return await _repository.GetByStatusAsync(UserStatus.Active, cancellationToken);
    }
    
    public async Task<IEnumerable<User>> GetInactiveUsersAsync(CancellationToken cancellationToken)
    {
        return await _repository.GetByStatusAsync(UserStatus.Inactive, cancellationToken);
    }
}

// Wrong - flag param, more than 3 parameters
public async Task<IEnumerable<User>> GetUsersAsync(
    bool activeOnly, string nameFilter, int? minAge, int? maxAge, 
    CancellationToken cancellationToken)
{
    // Complex logic with flags
}

// Better alternative - filter object
public async Task<IEnumerable<User>> GetUsersAsync(
    UserFilter filter, CancellationToken cancellationToken)
{
    return await _repository.GetByFilterAsync(filter, cancellationToken);
}
```

---

## Convencoes de Nomenclatura

> **Por que padronizar nomenclatura?**
> - **Reduz carga cognitiva**: Desenvolvedores nao precisam "decifrar" nomes, focando na logica
> - **Facilita busca e navegacao**: IDEs e ferramentas funcionam melhor com padroes consistentes
> - **Melhora colaboracao**: Toda a equipe "fala a mesma lingua"
> - **Reduz bugs**: Nomes descritivos previnem erros de interpretacao
> - **Acelera code review**: Revisores gastam menos tempo entendendo o codigo

### Classes e Interfaces

```csharp
// Correct
public class UserService { }
public interface IUserRepository { }
public record Customer(string FirstName, string LastName);

// Wrong
public class userService { }
public interface UserRepository { }
```

### Metodos e Propriedades

```csharp
// Correct - PascalCase
public string GetFullName() { }
public int TotalValue { get; set; }
public async Task<User> GetUserByIdAsync(int userId) { }

// Wrong
public string getFullName() { }
public int total_value { get; set; }
```

### Variaveis e Parametros

```csharp
// Correct - camelCase
public void ProcessOrder(string customerName, int orderId)
{
    var totalValue = CalculateTotal();
    var validOrder = ValidateOrder(orderId);
}

// Wrong
public void ProcessOrder(string CustomerName, int OrderId)
{
    var TotalValue = CalculateTotal();
    var valid_order = ValidateOrder(OrderId);
}
```

### Campos Privados

```csharp
// Correct - underscore prefix with camelCase
private readonly ILogger _logger;
private static readonly string _connectionString;

// Wrong
private readonly ILogger logger;
private static readonly string ConnectionString;
```

### Constantes

```csharp
// Correct - PascalCase
public const int MaxRetryAttempts = 3;
private const string DefaultCulture = "pt-BR";

// Wrong
public const int MAX_RETRY_ATTEMPTS = 3;
private const string default_culture = "pt-BR";
```

### Diretorios e Arquivos

```
// Correct directory structure
src/
├── application-services/     // kebab-case
├── repositories/
├── domain-models/
└── api-controllers/

// Correct file names - PascalCase
UserService.cs
UserRepository.cs
UsersController.cs
```

---

## Estilo de Codigo

> **Por que seguir um estilo consistente?**
> - **Reduz debates desnecessarios**: Time gasta energia em problemas reais, nao em formatacao
> - **Facilita diff/merge**: Mudancas estruturais ficam mais visiveis quando formatacao e padronizada
> - **Melhora legibilidade**: Padroes visuais ajudam o cerebro a processar codigo mais rapidamente
> - **Automatizacao**: Ferramentas como EditorConfig e formatadores reduzem trabalho manual
> - **Profissionalismo**: Codigo bem formatado transmite qualidade e cuidado

### Formatacao e Layout

```csharp
// Correct - Allman style braces
public class UserService
{
    public async Task<User> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        var user = new User
        {
            CustomerId = request.CustomerId,
            Items = request.Items,
            CreatedAt = DateTime.UtcNow
        };

        return await _repository.SaveAsync(user, cancellationToken);
    }
}
```

### Uso de var

```csharp
// Correct - type is clear from context
var customer = new Customer();
var orders = await _repository.GetOrdersAsync();

// Wrong - type not clear
var result = ProcessData();
var count = GetCount();

// Better alternative when type is not clear
Customer result = ProcessData();
int count = GetCount();
```

### String Interpolation

```csharp
// Correct
string message = $"Order {orderId} created for customer {customerName}";

// Correct - for long strings, use raw string literals
var sqlQuery = """
    SELECT o.Id, o.Total, c.Name
    FROM Orders o
    INNER JOIN Customers c ON o.CustomerId = c.Id
    WHERE o.CreatedAt >= :startDate
    """;

// Wrong
string message = "Order " + orderId + " created for customer " + customerName;
```

### Inicializacao de Collections

```csharp
// Correct - Collection expressions (C# 12+)
string[] languages = ["C#", "Python", "JavaScript"];
List<int> numbers = [1, 2, 3, 4, 5];

// Alternative for previous versions
var languages = new[] { "C#", "Python", "JavaScript" };
var numbers = new List<int> { 1, 2, 3, 4, 5 };
```

---

## Melhores Praticas de Programacao

> **Por que seguir essas praticas?**
> - **Previne bugs comuns**: Praticas testadas em milhoes de projetos previnem armadilhas conhecidas
> - **Melhora performance**: Uso correto de async/await pode melhorar throughput em 300-500%
> - **Facilita debugging**: Codigo bem estruturado e mais facil de depurar e monitorar
> - **Reduz acoplamento**: Dependency Injection torna codigo mais testavel e flexivel
> - **Aumenta confiabilidade**: Exception handling adequado previne crashes em producao

### Regras

- **Async/Await**: nunca bloquear (`.Result`/`.Wait()`); sempre propagar `CancellationToken`; usar `ConfigureAwait(false)` em bibliotecas
- **CancellationToken**: opcional (`= default`) em APIs publicas, obrigatorio internamente; `ThrowIfCancellationRequested()` antes de side effects; nunca cancelar apos persistir (use `CancellationToken.None`); checar em loops/batches; timeout via `CreateLinkedTokenSource`
- **Dependency Injection**: constructor injection com campos `readonly` e guarda `?? throw new ArgumentNullException(...)`
- **SOLID**: uma responsabilidade por classe; extrair validadores/colaboradores; depender de abstracoes
- **Exception Handling**: capturar excecoes especificas com filtros `when`; logar com contexto; nunca `catch (Exception) { throw; }` sem valor agregado

→ Exemplos correto/errado de async/await, CancellationToken (4 padroes), DI, SOLID e Exception Handling em `examples/best-practices.md`.

---

## Checklist de Qualidade de Codigo

### Nomenclatura

- [ ] Codigo escrito em ingles
- [ ] Classes e metodos em PascalCase
- [ ] Variaveis e parametros em camelCase
- [ ] Campos privados com underscore prefix
- [ ] Diretorios em kebab-case
- [ ] Interfaces com prefixo 'I'
- [ ] Constantes em PascalCase

### Estrutura

- [ ] Metodos com maximo 3 parametros (exceto construtores DI)
- [ ] Nomes de metodos comecando com verbo
- [ ] Sem flag parameters
- [ ] Classes com maximo 300 linhas
- [ ] Metodos com maximo 50 linhas
- [ ] Maximo 2 niveis de aninhamento
- [ ] Variaveis proximas ao uso

### Qualidade

- [ ] Async/await com CancellationToken
- [ ] Constructor injection para dependencias
- [ ] Exception handling especifico
- [ ] SOLID principles aplicados
- [ ] Comentarios apenas quando necessarios
- [ ] Constantes para magic numbers