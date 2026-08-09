# Singleton

**Categoria:** Criacional

**Intenção:** Garantir que uma classe tenha apenas uma instância e fornecer um ponto
de acesso global a ela.

## Aviso: anti-padrão em contextos modernos

O Singleton costuma ser problemático porque:

- dificulta testes unitários;
- esconde dependências;
- pode não ser thread-safe;
- viola ou enfraquece a inversão de dependência.

**Recomendação moderna:** use o container de injeção de dependência para registrar
serviços com escopo singleton. O resultado é semelhante, mas com testabilidade e
desacoplamento melhores.

## Quando ainda faz sentido

- Código legado sem container de DI.
- Scripts utilitários simples sem framework.
- Recursos genuinamente únicos quando o ambiente não oferece DI, como um wrapper de
  configuração em uma CLI.

## Trade-offs

| Benefício | Custo |
|---|---|
| Garante uma única instância | Estado global e dependência escondida |
| Acesso simples | Testes e concorrência mais difíceis |
| Pode proteger um recurso único | Acoplamento ao mecanismo de acesso |

## Estrutura para referência

~~~
class DatabaseConnection:
    private static instance: DatabaseConnection = null
    private connection: Connection

    private constructor():
        this.connection = createConnection()

    static method getInstance(): DatabaseConnection
        if instance == null:
            instance = new DatabaseConnection()
        return instance

    method query(sql: string): Result
        return this.connection.execute(sql)

// Uso: DatabaseConnection.getInstance().query("SELECT ...")
// Preferível: registrar no container de DI como singleton scope.
~~~
