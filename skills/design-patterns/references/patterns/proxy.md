# Proxy

**Categoria:** Estrutural

**Intenção:** Fornecer um substituto ou placeholder para outro objeto, controlando o
acesso a ele e permitindo executar lógica antes ou depois da chamada ao objeto real.

## Variantes comuns

- **Cache Proxy** — armazena resultados para evitar reprocessamento.
- **Protection Proxy** — verifica permissões antes de delegar.
- **Virtual Proxy (Lazy Loading)** — adia a criação do objeto pesado até o primeiro uso.
- **Logging Proxy** — registra chamadas para auditoria.

## Quando usar

- Operações caras que podem ser cacheadas.
- Controle de acesso sem alterar a classe de serviço.
- Inicialização tardia de objetos pesados.
- Auditoria ou logging transparente ao cliente.

## Quando não usar

- A lógica de interceptação já é fornecida pelo framework, como middlewares,
  interceptors ou AOP; prefira o mecanismo nativo.
- A camada adiciona latência ou complexidade sem benefício mensurável.

## Trade-offs

| Benefício | Custo |
|---|---|
| Transparente para o cliente | Indireção adicional |
| Separa responsabilidades cross-cutting | Pode mascarar o custo real da operação |
| Pode melhorar performance com cache | Invalidação de cache é um problema à parte |

## Esqueleto de implementação

~~~
interface ReportService:
    method generate(params): Report

class HeavyReportService implements ReportService:
    method generate(params):
        return buildComplexReport(params)

class CachingReportProxy implements ReportService:
    private realService: ReportService
    private cache: Map<string, Report>

    constructor(realService: ReportService):
        this.realService = realService
        this.cache = {}

    method generate(params):
        key = hashOf(params)
        if key in this.cache:
            return this.cache[key]

        result = this.realService.generate(params)
        this.cache[key] = result
        return result
~~~
