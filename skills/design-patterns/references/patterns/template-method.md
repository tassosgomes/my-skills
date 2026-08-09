# Template Method

**Categoria:** Comportamental

**Intenção:** Definir o esqueleto de um algoritmo em uma classe base, delegando
etapas específicas para subclasses. Unifica o fluxo comum e permite variação
nos detalhes.

## Quando usar

- Múltiplas classes executam fluxos muito parecidos com pequenas variações em
  etapas específicas, como parsers de diferentes formatos ou pipelines de ETL.
- Há duplicação de código entre classes que seguem o mesmo roteiro.
- A sequência dos passos é fixa e não deve ser alterada pelas subclasses.

## Quando não usar

- Cada implementação tem um fluxo completamente diferente; não há template a extrair.
- Composição, Strategy ou Decorator resolve melhor do que herança.

## Trade-offs

| Benefício | Custo |
|---|---|
| Elimina duplicação de fluxo | Usa herança e cria acoplamento mais forte |
| Subclasses só implementam o que varia | Hierarquia pode ficar rígida |
| Garante a sequência | É mais difícil de compor que Strategy |

## Esqueleto de implementação

~~~
abstract class DataMiner:
    // Template method — define a sequência, final/sealed para não ser sobrescrito
    final method mine(path: string):
        file = this.openFile(path)
        rawData = this.extractData(file)
        analysis = this.analyzeData(rawData)
        this.sendReport(analysis)
        this.closeFile(file)

    // Etapas variáveis — subclasses obrigatoriamente implementam
    abstract method openFile(path): File
    abstract method extractData(file: File): RawData
    abstract method closeFile(file: File)

    // Etapas comuns — implementação padrão na base
    method analyzeData(rawData: RawData): Analysis:
        return defaultAnalysis(rawData)

    method sendReport(analysis: Analysis):
        emailService.send(analysis.toReport())

class CsvMiner extends DataMiner:
    method openFile(path):
        return CsvReader.open(path)

    method extractData(file):
        return file.readAllRows()

    method closeFile(file):
        file.close()

class PdfMiner extends DataMiner:
    method openFile(path):
        return PdfReader.open(path)

    method extractData(file):
        return file.extractText()

    method closeFile(file):
        file.release()
~~~
