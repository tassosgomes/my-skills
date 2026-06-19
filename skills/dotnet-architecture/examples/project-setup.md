# Comandos para Criacao da Estrutura

Comandos `dotnet` CLI para criar a solution, projetos, adicionar a solution e configurar as referencias entre camadas.

## 1. Criar Solution

```bash
dotnet new sln -n ProjectName
```

## 2. Criar Projetos

```bash
# API
mkdir 1-Services && cd 1-Services
dotnet new webapi -n ProjectName.API
cd ..

# Application
mkdir 2-Application && cd 2-Application
dotnet new classlib -n ProjectName.Application
cd ..

# Domain
mkdir 3-Domain && cd 3-Domain
dotnet new classlib -n ProjectName.Domain
cd ProjectName.Domain && mkdir Entities Services Interfaces
cd ../..

# Infra
mkdir 4-Infra && cd 4-Infra
dotnet new classlib -n ProjectName.Infra
cd ProjectName.Infra && mkdir Repositories
cd ../..

# Tests
mkdir 5-Tests && cd 5-Tests
dotnet new xunit -n ProjectName.UnitTests
dotnet new xunit -n ProjectName.IntegrationTests
dotnet new xunit -n ProjectName.End2EndTests
cd ..
```

## 3. Adicionar Projetos a Solution

```bash
dotnet sln add 1-Services/ProjectName.API/ProjectName.API.csproj
dotnet sln add 2-Application/ProjectName.Application/ProjectName.Application.csproj
dotnet sln add 3-Domain/ProjectName.Domain/ProjectName.Domain.csproj
dotnet sln add 4-Infra/ProjectName.Infra/ProjectName.Infra.csproj
dotnet sln add 5-Tests/ProjectName.UnitTests/ProjectName.UnitTests.csproj
dotnet sln add 5-Tests/ProjectName.IntegrationTests/ProjectName.IntegrationTests.csproj
dotnet sln add 5-Tests/ProjectName.End2EndTests/ProjectName.End2EndTests.csproj
```

## 4. Configurar Referencias

```bash
# API → Application
dotnet add 1-Services/ProjectName.API reference 2-Application/ProjectName.Application

# Application → Domain
dotnet add 2-Application/ProjectName.Application reference 3-Domain/ProjectName.Domain

# Infra → Domain
dotnet add 4-Infra/ProjectName.Infra reference 3-Domain/ProjectName.Domain

# UnitTests → Application + Domain
dotnet add 5-Tests/ProjectName.UnitTests reference 2-Application/ProjectName.Application
dotnet add 5-Tests/ProjectName.UnitTests reference 3-Domain/ProjectName.Domain

# IntegrationTests → Application + Infra
dotnet add 5-Tests/ProjectName.IntegrationTests reference 2-Application/ProjectName.Application
dotnet add 5-Tests/ProjectName.IntegrationTests reference 4-Infra/ProjectName.Infra

# End2EndTests → API
dotnet add 5-Tests/ProjectName.End2EndTests reference 1-Services/ProjectName.API
```
