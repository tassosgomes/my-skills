# Decorator

**Categoria:** Estrutural

**Intenção:** Adicionar responsabilidades a objetos dinamicamente por composição
recursiva, sem alterar a classe original. Respeita o princípio Open/Closed.

## Quando usar

- Você precisa empilhar funcionalidades opcionais sobre um objeto base, como
  compressão, criptografia e logging sobre um stream de dados.
- Subclassing geraria uma explosão combinatória de classes.
- Funcionalidades precisam ser adicionadas ou removidas em runtime.

## Quando não usar

- Existe apenas uma variação fixa; herança ou composição direta é mais clara.
- As funcionalidades sempre são aplicadas juntas e na mesma ordem; considere um
  componente único com responsabilidades explícitas.

## Trade-offs

| Benefício | Custo |
|---|---|
| Composição flexível em runtime | Stack de decorators pode dificultar debug |
| Cada decorator tem responsabilidade única | Muitas classes pequenas |
| Evita herança profunda | A ordem dos decorators pode importar |

## Estrutura

~~~
«interface» Component
  + execute()

ConcreteComponent implements Component
  + execute() → lógica base

BaseDecorator implements Component
  - wrapped: Component
  + execute() → wrapped.execute()

DecoratorA extends BaseDecorator
  + execute() → extraLogic() + super.execute()

DecoratorB extends BaseDecorator
  + execute() → super.execute() + otherLogic()
~~~

## Esqueleto de implementação

~~~
interface ImageProcessor:
    method process(image): Image

class BasicProcessor implements ImageProcessor:
    method process(image):
        return image

class WatermarkDecorator implements ImageProcessor:
    private wrapped: ImageProcessor

    constructor(wrapped: ImageProcessor):
        this.wrapped = wrapped

    method process(image):
        result = this.wrapped.process(image)
        return addWatermark(result)

class ResizeDecorator implements ImageProcessor:
    private wrapped: ImageProcessor
    private dimensions: Size

    constructor(wrapped: ImageProcessor, dimensions: Size):
        this.wrapped = wrapped
        this.dimensions = dimensions

    method process(image):
        result = this.wrapped.process(image)
        return resize(result, this.dimensions)

// Uso: pipeline = ResizeDecorator(WatermarkDecorator(BasicProcessor()))
// Execução: basic → watermark → resize
~~~
