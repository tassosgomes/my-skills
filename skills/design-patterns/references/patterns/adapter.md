# Adapter

**Categoria:** Estrutural

**Intenção:** Converter a interface de uma classe em outra interface que o cliente
espera, permitindo que classes com interfaces incompatíveis trabalhem juntas.

## Quando usar

- Você precisa integrar uma biblioteca externa, SDK, API client, gerador de PDF ou
  outro componente sem acoplar a regra de negócio a ele.
- Você quer poder trocar a implementação concreta, como trocar DomPDF por TCPDF,
  sem alterar o código de alto nível.
- Está fazendo uma migração gradual e precisa que código legado funcione com
  interfaces novas.

## Quando não usar

- A interface da biblioteca já é compatível com o que seu código espera; não crie um
  adapter que só repassa chamadas sem agregar isolamento.
- O problema real é que a sua própria interface está mal definida; refatore a
  interface primeiro.

## Trade-offs

| Benefício | Custo |
|---|---|
| Desacoplamento da biblioteca externa | Uma camada extra de indireção |
| Facilita testes com mock do adapter | Mais arquivos ou classes |
| Troca de implementação sem impacto no cliente | Pode esconder complexidade da biblioteca |

## Estrutura

~~~
«interface» Target
  + operation()

Adapter implements Target
  - adaptee: ExternalLib
  + operation() → adaptee.specificMethod()

Client → depende apenas de Target
~~~

## Esqueleto de implementação

~~~
interface ReportGenerator:
    method generate(data): bytes

class DomPdfAdapter implements ReportGenerator:
    private lib: DomPdfLib

    constructor(lib: DomPdfLib):
        this.lib = lib

    method generate(data):
        this.lib.loadHtml(data.toHtml())
        this.lib.render()
        return this.lib.output()

// Trocar implementação: criar TcPdfAdapter implements ReportGenerator
// O código cliente não muda.
~~~
