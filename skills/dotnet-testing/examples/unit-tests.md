# Testes Unitarios — Exemplos

Padrao AAA (Arrange-Act-Assert) com xUnit + AwesomeAssertions + Moq.

## Estrutura de Teste — AAA Pattern

```csharp
using AwesomeAssertions;

public class TestesServicoPedido
{
    private readonly Mock<IRepositorioPedido> _repositorioMock;
    private readonly Mock<ILogger<ServicoPedido>> _loggerMock;
    private readonly ServicoPedido _sut; // System Under Test

    public TestesServicoPedido()
    {
        _repositorioMock = new Mock<IRepositorioPedido>();
        _loggerMock = new Mock<ILogger<ServicoPedido>>();
        _sut = new ServicoPedido(_repositorioMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task CriarPedidoAsync_ComSolicitacaoValida_DeveRetornarPedidoCriado()
    {
        // Arrange
        var cancellationToken = CancellationToken.None;
        var solicitacao = new SolicitacaoCriarPedido
        {
            IdCliente = 1,
            Itens = new[] { new ItemPedido { IdProduto = 1, Quantidade = 2 } }
        };
        
        var pedidoEsperado = new Pedido { Id = 123, IdCliente = 1 };
        _repositorioMock
            .Setup(r => r.CriarAsync(It.IsAny<Pedido>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(pedidoEsperado);

        // Act
        var resultado = await _sut.CriarPedidoAsync(solicitacao, cancellationToken);

        // Assert
        resultado.Should().NotBeNull();
        resultado.Id.Should().Be(123);
        resultado.IdCliente.Should().Be(1);
        
        _repositorioMock.Verify(
            r => r.CriarAsync(It.IsAny<Pedido>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task CriarPedidoAsync_ComNomeClienteInvalido_DeveLancarArgumentException(string nomeCliente)
    {
        // Arrange
        var cancellationToken = CancellationToken.None;
        var solicitacao = new SolicitacaoCriarPedido { NomeCliente = nomeCliente };

        // Act & Assert
        var acao = () => _sut.CriarPedidoAsync(solicitacao, cancellationToken);
        await acao.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Nome do cliente nao pode ser nulo ou vazio");
    }

    [Fact]
    public async Task CriarPedidoAsync_ComCancelamento_DeveLancarOperationCanceledException()
    {
        // Arrange
        using var cts = new CancellationTokenSource();
        var solicitacao = new SolicitacaoCriarPedido { IdCliente = 1 };
        cts.Cancel();

        // Act & Assert
        var acao = () => _sut.CriarPedidoAsync(solicitacao, cts.Token);
        await acao.Should().ThrowAsync<OperationCanceledException>();
    }
}
```

## Testes Parametrizados

```csharp
[Theory]
[InlineData("admin@teste.com", true)]
[InlineData("usuario@empresa.org", true)]
[InlineData("email-invalido", false)]
[InlineData("", false)]
[InlineData(null, false)]
public void EhEmailValido_ComVariasEntradas_DeveRetornarResultadoEsperado(string email, bool esperado)
{
    // Arrange & Act
    var resultado = ValidadorEmail.EhValido(email);

    // Assert
    resultado.Should().Be(esperado);
}

[Theory]
[MemberData(nameof(ObterDadosTestePedido))]
public async Task CalcularTotal_ComDiferentesPedidos_DeveRetornarTotalCorreto(Pedido pedido, decimal totalEsperado, CancellationToken cancellationToken)
{
    // Arrange & Act
    var total = await _calculadora.CalcularTotalAsync(pedido, cancellationToken);

    // Assert
    total.Should().Be(totalEsperado);
}

public static IEnumerable<object[]> ObterDadosTestePedido()
{
    yield return new object[] { new Pedido { Itens = [] }, 0m, CancellationToken.None };
    yield return new object[] { new Pedido { Itens = [new() { Preco = 10m, Quantidade = 2 }] }, 20m, CancellationToken.None };
}
```
