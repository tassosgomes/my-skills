---
name: dotnet-testing
description: "Estrategias de teste .NET C# / ASP.NET Core: testes unitarios com xUnit + AwesomeAssertions + Moq (padrao AAA), testes de integracao com WebApplicationFactory + Testcontainers (PostgreSQL padrao oficial), testes E2E com Playwright, Dev Containers para ambiente isolado, naming convention (MethodName_Condition_ExpectedBehavior), fixtures reutilizaveis, cobertura > 80% para logica de negocio. Usar quando: criar testes; revisar testes; garantir cobertura; configurar Testcontainers; setup de ambiente de teste."
---

# Estrategias de Teste .NET C# e ASP.NET Core

Documento normativo para estrategias de teste.
Pode bloquear geracao de codigo sem teste.

> **Politica de Banco de Dados em Testes**
> - **PostgreSQL e o padrao oficial** para Testcontainers e Dev Containers
> - **Oracle apenas para servicos oficialmente Oracle** (legado/aprovacao explicita)

---

## Indice
1. [Testes Unitarios](#testes-unitarios)
2. [Testes de Integracao](#testes-de-integracao)
3. [Testes End-to-End (E2E)](#testes-end-to-end-e2e)
4. [Dev Containers para Testes de Integracao](#dev-containers-para-testes-de-integracao)
5. [Checklist de Estrategias de Teste](#checklist-de-estrategias-de-teste)

> **Exemplos de codigo completos** ficam em `examples/` e devem ser abertos sob demanda conforme a tarefa:
> - `examples/unit-tests.md` — classe de teste AAA (xUnit/Moq/AwesomeAssertions) e testes parametrizados
> - `examples/integration-tests.md` — WebApplicationFactory + Testcontainers PostgreSQL + testes de API
> - `examples/e2e-tests.md` — Playwright com Page Object Model
> - `examples/dev-containers.md` — estrutura, docker-compose, fixture PostgreSQL e teste com fixture

---

## Testes Unitarios

> **Por que investir em testes unitarios?**
> - **ROI comprovado**: Cada hora investida em testes economiza 3-10 horas de debugging
> - **Deteccao precoce**: Bugs encontrados em desenvolvimento custam 100x menos que em producao
> - **Refatoracao segura**: Testes permitem mudancas com confianca
> - **Documentacao viva**: Testes descrevem o comportamento esperado melhor que comentarios
> - **Melhora design**: Codigo testavel e naturalmente melhor estruturado

### Framework Recomendado: xUnit + AwesomeAssertions
```xml
<PackageReference Include="xunit" Version="2.6.6" />
<PackageReference Include="xunit.runner.visualstudio" Version="2.5.6" />
<PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
<PackageReference Include="Moq" Version="4.20.70" />
<PackageReference Include="AwesomeAssertions" Version="6.15.1" />
<PackageReference Include="AutoFixture" Version="4.18.1" />
```

> **Por que AwesomeAssertions ao inves de FluentAssertions?**
> - **Licenca Apache 2.0**: Mantem licenca open-source sempre gratuita
> - **Fork ativo**: Continuacao comunitaria do FluentAssertions com melhorias
> - **Compatibilidade**: API identica ao FluentAssertions, migracao transparente

### Regras

* **AAA Pattern**: estruturar todo teste em Arrange / Act / Assert
* Mockar dependencias com Moq; o `_sut` (System Under Test) e instanciado no construtor
* Sempre testar o caminho de `CancellationToken` (cancelamento)
* Usar `[Theory]` + `[InlineData]`/`[MemberData]` para multiplos cenarios

### Naming Convention para Testes
```csharp
// Padrao: NomeMetodo_CondicaoTeste_ComportamentoEsperado
[Fact]
public void CalcularDesconto_ComClientePremium_DeveAplicarDesconto20Porcento()

[Fact]
public void ValidarEmail_ComFormatoInvalido_DeveRetornarFalse()

[Fact]
public async Task ObterUsuarioAsync_QuandoUsuarioNaoEncontrado_DeveLancarUsuarioNaoEncontradoException()
```

→ Classe de teste AAA completa e testes parametrizados em `examples/unit-tests.md`.

---

## Testes de Integracao

> **Por que testes de integracao sao essenciais?**
> - **Validam integracoes reais**: Bugs frequentemente ocorrem nas integracoes entre componentes
> - **Detectam problemas de configuracao**: Banco de dados, APIs externas, configuracoes
> - **Confidence em deploys**: Reduzem drasticamente o risco de falhas em producao
> - **Complementam testes unitarios**: Juntos fornecem cobertura abrangente (piramide de testes)

### Framework e Setup
```xml
<PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="8.0.0" />
<PackageReference Include="Testcontainers" Version="3.7.0" />
<PackageReference Include="Testcontainers.PostgreSql" Version="3.7.0" />
<PackageReference Include="Npgsql" Version="8.0.0" />
```

Abordagem: `WebApplicationFactory<Program>` + `IAsyncLifetime` sobe um `PostgreSqlContainer` (Testcontainers), substitui o `DbContextOptions` por `ConfigureTestServices`, faz seed de dados e exercita os endpoints via `HttpClient`. Use `ICollectionFixture` para compartilhar a factory entre testes.

→ WebApplicationFactory com Testcontainers e testes de API completos em `examples/integration-tests.md`.

---

## Testes End-to-End (E2E)

> **Por que testes E2E sao o topo da piramide?**
> - **Validacao final**: Testam a aplicacao exatamente como o usuario a utilizara
> - **Detectam problemas de UX**: Problemas de usabilidade que outros testes nao capturam
> - **Confidence para releases**: Ultimas verificacoes antes de entregar valor ao usuario
> - **Complemento, nao substituto**: Poucos testes E2E focados em happy paths criticos

### Framework Recomendado: Playwright
```xml
<PackageReference Include="Microsoft.Playwright" Version="1.41.0" />
<PackageReference Include="Microsoft.Playwright.NUnit" Version="1.41.0" />
```

Padrao **Page Object Model**: encapsular seletores e acoes de cada pagina em uma classe, mantendo os testes legiveis e resistentes a mudancas de UI.

→ Page Object Model e teste de exemplo em `examples/e2e-tests.md`.

---

## Dev Containers para Testes de Integracao

> **Por que usar Dev Containers?**
> - **Isolamento total**: Cada execucao de teste usa banco limpo e isolado
> - **Paralelizacao**: Multiplos containers para testes paralelos sem conflitos
> - **Reprodutibilidade**: Mesmo ambiente PostgreSQL em CI/CD e localmente
> - **Cleanup automatico**: Containers sao destruidos apos testes, sem residuos
> - **Versionamento de schema**: Scripts de teste versionados junto com codigo

Estrutura: `.devcontainer/` com `docker-compose.yml` (PostgreSQL com healthcheck + `tmpfs` para dados efemeros), scripts SQL versionados em `test-data/`, e uma `PostgresTestFixture` (`IAsyncLifetime` + `ICollectionFixture`) que cria conexoes e faz cleanup determinastico entre testes.

→ Estrutura de arquivos, docker-compose, fixture PostgreSQL e teste com fixture em `examples/dev-containers.md`.

---

## Checklist de Estrategias de Teste

### Testes Unitarios
- [ ] xUnit + AwesomeAssertions configurado
- [ ] Moq para mocks e stubs
- [ ] AAA Pattern (Arrange-Act-Assert)
- [ ] Naming convention: MethodName_Condition_ExpectedBehavior
- [ ] Cobertura > 80% para logica de negocio
- [ ] Testes parametrizados para multiplos cenarios
- [ ] CancellationToken testado

### Testes de Integracao
- [ ] WebApplicationFactory configurada
- [ ] Testcontainers para PostgreSQL (padrao oficial)
- [ ] Database seeding automatico
- [ ] HTTP client configurado
- [ ] Cleanup entre testes
- [ ] Isolamento de dados

### Testes E2E
- [ ] Playwright configurado
- [ ] Page Object Model implementado
- [ ] Testes de fluxos criticos
- [ ] Screenshots em falhas
- [ ] Paralelizacao configurada

### Dev Containers
- [ ] PostgreSQL container configurado (padrao)
- [ ] Scripts SQL versionados
- [ ] Healthchecks implementados
- [ ] Dados deterministicos
- [ ] Cleanup automatico
- [ ] CI/CD integration
