# Criacao de Bibliotecas Profissionais (NuGet)

## Objetivo de uma biblioteca profissional

Uma biblioteca .NET profissional deve ser:
- **Inclusiva**: rodar em varios tipos de apps/plataformas
- **Estavel**: conviver bem com outras bibliotecas no mesmo processo
- **Projetada para evoluir**: permitir melhorias sem quebrar quem ja usa
- **Depuravel**: facil de diagnosticar problemas
- **Confiavel**: publicada e mantida seguindo boas praticas de seguranca e qualidade

## Decisoes iniciais de projeto

### Tipo de projeto e template
```bash
dotnet new classlib -n MinhaEmpresa.MinhaLib
```

- Prefira **SDK-style projects** (padrao no .NET Core/5+/6+/8+)
- Use a **versao mais recente de C#** possivel compativel com seus consumidores

### Target frameworks
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFrameworks>netstandard2.0;net8.0</TargetFrameworks>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>
```

## Estrutura da solucao

```
src/MinhaEmpresa.MinhaLib/MinhaEmpresa.MinhaLib.csproj
tests/MinhaEmpresa.MinhaLib.Tests/MinhaEmpresa.MinhaLib.Tests.csproj
samples/MinhaEmpresa.MinhaLib.Samples/…  (opcional)
```

## Configuracao basica de qualidade

```xml
<PropertyGroup>
  <Nullable>enable</Nullable>
  <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  <ImplicitUsings>enable</ImplicitUsings>
</PropertyGroup>
```

## Design da API publica

- **Scenario-Driven Design**: Liste cenarios principais e molde a API para que fiquem simples
- **Namespaces**: `MinhaEmpresa.MinhaArea.MinhaLib`
- **Classes publicas**: PascalCase
- **Metodos**: PascalCase com sufixo `Async` para operacoes assincronas
- Prefira APIs **assincronas** para I/O com `CancellationToken`
- Use tipos .NET conhecidos: `DateTimeOffset`, `IReadOnlyCollection<T>`, `IEnumerable<T>`
- Use **excecoes**, nao codigos de erro de retorno
- Prefira **tipos imutaveis** (especialmente DTOs/valores)
- `internal` em vez de `public` quando algo nao e para uso externo

## Empacotamento e publicacao (NuGet)

```xml
<PropertyGroup>
  <PackageId>MinhaEmpresa.MinhaLib</PackageId>
  <Version>1.0.0</Version>
  <Authors>Minha Empresa</Authors>
  <Description>Descricao clara e objetiva da biblioteca.</Description>
  <PackageTags>logging;rest;cliente-api</PackageTags>
  <RepositoryUrl>https://github.com/minha-empresa/minha-lib</RepositoryUrl>
  <PackageLicenseExpression>MIT</PackageLicenseExpression>
  <IncludeSymbols>true</IncludeSymbols>
  <SymbolPackageFormat>snupkg</SymbolPackageFormat>
  <PublishRepositoryUrl>true</PublishRepositoryUrl>
</PropertyGroup>
```

```bash
dotnet pack -c Release
dotnet nuget push bin/Release/MinhaEmpresa.MinhaLib.1.0.0.nupkg \
  --api-key <API_KEY> \
  --source https://api.nuget.org/v3/index.json
```

### SemVer 2.0.0

- **MAJOR**: quebra de compatibilidade de API
- **MINOR**: novas funcionalidades compativeis
- **PATCH**: correcoes de bug sem mudar API

### Planejando evolucao

- API publica e **contrato**: evite mudar ou remover membros publicos
- Em vez de remover, marque como `[Obsolete]` com mensagem e plano de remocao
- Quando precisar quebrar API: versao MAJOR nova + breaking changes documentados
