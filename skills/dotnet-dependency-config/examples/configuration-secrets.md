# Configuração e Segredos — Padrão Oficial

Três camadas, cada uma com uma responsabilidade fixa. Não misture: segredo nunca vai para
`appsettings.json`, e configuração não sensível não precisa virar variável de ambiente só por
"padronização".

| Camada | Onde vive | Contém | Versionado? |
|---|---|---|---|
| `appsettings.json` / `appsettings.{Environment}.json` | repositório | config não sensível (timeouts, feature flags, URLs públicas, nomes de fila) | sim |
| Variáveis de ambiente (`__` como separador hierárquico) | orquestrador/container/pipeline | overrides de produção/staging, incluindo segredos em runtime | não (definidas na infra) |
| `dotnet user-secrets` | perfil do usuário no SO (fora do repo) | segredos usados em desenvolvimento local | não |

## Por que essa combinação e não `.env`

O `IConfiguration` do ASP.NET Core já lê variáveis de ambiente nativamente, com precedência sobre
`appsettings.json`, sem exigir pacote adicional. Um arquivo `.env` exigiria um pacote de terceiros
(`DotNetEnv` ou similar) para fazer o que o provider nativo já faz, e ainda corre o risco de ser
commitado por engano. Fique no provider nativo — é o que a documentação oficial e a maioria dos
times .NET usam.

## appsettings — hierarquia por ambiente

```json
// appsettings.json — valores default, não sensíveis, válidos em qualquer ambiente
{
  "Cors": {
    "AllowedOrigins": ["https://app.example.com"]
  },
  "RabbitMQ": {
    "QueueName": "orders.created"
  },
  "Logging": {
    "LogLevel": { "Default": "Information" }
  }
}
```

```json
// appsettings.Development.json — só overrides do ambiente local; nunca segredo aqui também
{
  "Cors": {
    "AllowedOrigins": ["http://localhost:5173"]
  },
  "Logging": {
    "LogLevel": { "Default": "Debug" }
  }
}
```

`ConnectionStrings`, chaves de API, client secrets de OAuth, tokens de terceiros: nenhum desses
tem entrada em `appsettings.json` ou `appsettings.{Environment}.json` — nem com valor vazio. Se a
chave existe no arquivo versionado, alguém eventualmente preenche o valor e comita.

## Variáveis de ambiente — convenção `__`

`IConfiguration` usa `:` para navegar hierarquia (`ConnectionStrings:DefaultConnection`). Como `:`
não é válido em nome de variável de ambiente em todos os SOs, o duplo underscore é o separador
oficial e é convertido automaticamente:

```bash
# Produção/staging — definidas no orquestrador (Kubernetes Secret, App Service, etc.), nunca em arquivo do repo
export ConnectionStrings__DefaultConnection="Host=prod-db;Port=5432;Database=orders;Username=orders_svc;Password=${DB_PASSWORD}"
export Auth__Authority="https://auth.example.com"
export Cors__AllowedOrigins__0="https://app.example.com"
export OpenTelemetry__OtlpEndpoint="http://otel-collector:4317"
```

```yaml
# Kubernetes — segredo real vem de um Secret, não de valor literal no manifest
env:
  - name: ConnectionStrings__DefaultConnection
    valueFrom:
      secretKeyRef:
        name: orders-db-credentials
        key: connection-string
  - name: Auth__Authority
    value: "https://auth.example.com"
```

Arrays em `IConfiguration` usam índice numérico no nome da variável
(`Cors__AllowedOrigins__0`, `Cors__AllowedOrigins__1`), o que funciona mas fica difícil de manter
para listas longas — prefira `appsettings.json` para arrays extensos e reserve env vars para
valores escalares (connection strings, chaves, URLs de dependência).

## `dotnet user-secrets` — segredos em desenvolvimento local

Nunca peça para um desenvolvedor colar uma senha real em `appsettings.Development.json`. O Secret
Manager guarda o valor fora do repositório, em `~/.microsoft/usersecrets/<UserSecretsId>/secrets.json`
no SO do desenvolvedor.

```bash
# Uma vez por projeto — grava um UserSecretsId no .csproj
dotnet user-secrets init --project src/1-Services/ProjectName.API

# Definir um segredo local
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=orders_dev;Username=dev;Password=dev123" \
  --project src/1-Services/ProjectName.API

# Listar o que está configurado localmente
dotnet user-secrets list --project src/1-Services/ProjectName.API
```

```xml
<!-- ProjectName.API.csproj — gerado automaticamente pelo init, mantém-se versionado (é só um GUID, não o segredo) -->
<PropertyGroup>
  <UserSecretsId>a1b2c3d4-e5f6-7890-abcd-ef1234567890</UserSecretsId>
</PropertyGroup>
```

O Secret Manager só é carregado quando `IHostEnvironment.EnvironmentName` é `Development`
(comportamento padrão do `WebApplication.CreateBuilder`) — não precisa de código extra para ligá-lo
nem risco de vazar para produção. Ele não criptografa o conteúdo: é proteção contra "vazar para o
repositório", não contra acesso à máquina local.

## Segredos fora do desenvolvimento local

Para staging/produção, variável de ambiente injetada pelo orquestrador a partir de um cofre
(Kubernetes Secret sincronizado de um vault, Azure Key Vault, AWS Secrets Manager) é o padrão —
detalhes de integração com um provedor específico de vault ficam fora do escopo desta skill;
o que é normativo aqui é que o segredo **nunca** chega até o `appsettings.json` versionado, entra
sempre via `IConfiguration` (env var ou provider de configuração registrado explicitamente).

## Checklist

- [ ] Nenhum `appsettings*.json` versionado contém connection string, chave de API ou token.
- [ ] `dotnet user-secrets` está inicializado no projeto de entrada para segredos de desenvolvimento.
- [ ] Variáveis de ambiente de produção usam `__` para hierarquia, não `:`.
- [ ] Config não sensível (timeouts, nomes de fila, feature flags) fica em `appsettings.json`, não
      vira variável de ambiente por padronização artificial.
- [ ] `.gitignore` cobre qualquer `appsettings.Local.json` ou similar usado como atalho pessoal.
