---
name: dotnet-code-quality
description: "Use ao revisar ou refatorar um diff C#/.NET para naming, SOLID, métodos, async/await, CancellationToken, DI, exceções e estilo. Não acione apenas porque uma tarefa gera código; aplique ao diff quando a qualidade for parte do objetivo ou do gate."
metadata:
  group: dotnet
---

# Qualidade de Código .NET C# / ASP.NET Core

Use esta skill sobre o diff relevante. Ela reduz defeitos sem transformar toda implementação em
uma auditoria global; os exemplos detalhados ficam em `examples/best-practices.md`.

## Regras normativas

### Naming e idioma

- Código, classes, métodos, propriedades, variáveis e comentários ficam em inglês, exceto termos
  da linguagem ubíqua do domínio documentados no glossário.
- Tipos, métodos e propriedades usam `PascalCase`; variáveis e parâmetros usam `camelCase`.
- Interfaces usam prefixo `I`; campos privados usam `_camelCase`; constantes usam `PascalCase`.
- Diretórios usam `kebab-case` e arquivos/tipos usam `PascalCase`.
- Nomes de métodos começam com verbo e não usam abreviações desnecessárias.

### Design de métodos e classes

- Cada método executa uma ação clara; prefira guard clauses.
- Evite mais de três parâmetros, métodos acima de 50 linhas e classes acima de 300 linhas.
- Não use flag parameters para alternar comportamentos; extraia operações específicas ou use um
  objeto de filtro.
- Não misture mutação e consulta no mesmo método e não ultrapasse dois níveis de aninhamento.
- Prefira composição, abstrações e responsabilidade única.

### Async, DI e exceções

- Nunca bloqueie com `.Result` ou `.Wait()`.
- Propague `CancellationToken`; em bibliotecas, use `ConfigureAwait(false)` quando apropriado.
- Use `ThrowIfCancellationRequested()` antes de efeitos colaterais e não cancele uma persistência
  depois que ela começou.
- Use constructor injection, campos `readonly` e validação de argumentos no construtor.
- Capture exceções específicas, adicione contexto ao log e não faça `catch (Exception) { throw; }`
  sem valor agregado.
- Não introduza `any` equivalente, estado global mutável ou dependência concreta sem justificativa.

## Recurso sob demanda

Leia `examples/best-practices.md` somente quando precisar de exemplos de async/await,
CancellationToken, DI, SOLID ou tratamento de exceções. Para uma mudança pequena, valide apenas
as regras que o diff toca.

## Checklist do diff

- [ ] Naming e idioma seguem as convenções.
- [ ] Métodos têm uma responsabilidade e parâmetros controlados.
- [ ] Não há flag parameter, bloqueio síncrono ou aninhamento excessivo.
- [ ] `CancellationToken` é propagado na cadeia assíncrona.
- [ ] Dependências usam constructor injection e abstrações.
- [ ] Exceções são específicas e logadas com contexto seguro.
- [ ] O diff não contém comentários óbvios, magic numbers ou variáveis distantes do uso.
