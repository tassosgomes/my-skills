# Configuração e Segredos

| Camada | Contém | Versionado |
|---|---|---|
| `appsettings.json` / `appsettings.{Environment}.json` | Config não sensível: timeouts, feature flags, URLs públicas, nomes de fila, CORS | Sim |
| Variáveis de ambiente (`__`) | Overrides de staging/produção e segredos injetados pelo orquestrador a partir de cofre | Não |
| `dotnet user-secrets` | Segredos de desenvolvimento local (no projeto `Api`) | Não |

Regras:

- Connection string, senha, chave de API, client secret e token não têm entrada em nenhum
  `appsettings*.json`, nem com valor vazio. Connection string pode aparecer sem senha.
- Não use `.env` nem pacote para lê-lo.
- Seção tipada com `IOptions<T>`, `const string SectionName`, `ValidateDataAnnotations()` e
  `ValidateOnStart()`.
- Arrays extensos ficam em `appsettings.json`; env vars para valores escalares.
- `appsettings.Local.json` ou similar pessoal está no `.gitignore`.
- Em Kubernetes, segredo entra por `secretKeyRef`, nunca literal no manifesto.
- OTLP usa as variáveis padrão (`OTEL_EXPORTER_OTLP_ENDPOINT`).

```json
// appsettings.json — no secrets, no empty secret keys
{
  "ConnectionStrings": { "DefaultConnection": "Host=localhost;Port=5432;Database=projectname;Username=projectname" },
  "RabbitMQ": { "HostName": "localhost", "UserName": "projectname", "Exchange": "projectname.events" },
  "Cors": { "AllowedOrigins": ["https://app.example.com"] },
  "OpenTelemetry": { "ServiceName": "projectname-api" }
}
```

```bash
# Local development
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;...;Password=projectname" --project src/ProjectName.Api
dotnet user-secrets set "RabbitMQ:Password" "projectname" --project src/ProjectName.Api
```

## Checklist

- [ ] Nenhum segredo nem chave de segredo em `appsettings*.json`.
- [ ] `UserSecretsId` no `ProjectName.Api.csproj`.
- [ ] Options novas com `ValidateOnStart`.
- [ ] Variáveis de ambiente de deploy documentadas.
