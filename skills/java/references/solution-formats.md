# Formatos — Monolito Modular e Microsserviços

A API simples é o padrão e está descrita no `SKILL.md`. Estes dois formatos mudam a **fronteira**,
não a Clean Architecture interna, que continua a mesma.

Comece pela API simples e evolua quando a dor de acoplamento ou de deploy for real.

---

## Monolito Modular

No ecossistema Java a fronteira de módulo de negócio é verificada pelo **Spring Modulith**, não por
um par de projetos Maven por módulo. As camadas continuam sendo módulos Maven; os módulos de negócio
são pacotes de topo dentro deles, e o Modulith verifica quem enxerga quem.

```text
project/
├── domain/        com.company.project.{orders,billing}.domain.*
├── application/   com.company.project.{orders,billing}.application.*
├── infra-persistence/   com.company.project.{orders,billing}.infra.persistence.*
├── api/           com.company.project.{orders,billing}.api.*   + ProjectApplication
└── ...            com.company.project.{orders,billing}.contracts   ← único pacote visível a outro módulo
```

O Modulith enxerga como módulo cada subpacote direto do pacote da classe principal — por isso
`ProjectApplication` já nasce em `com.company.project`. Cada
pacote de módulo (`com.company.project.orders`) tem um `package-info.java` com
`@ApplicationModule(allowedDependencies = "billing :: contracts")`, e `contracts` é um
`@NamedInterface("contracts")`.

### Regras de fronteira

1. Um módulo nunca acessa `domain`, `application`, `infra` ou `api` de outro — só a named interface
   `contracts`. `ApplicationModules.of(ProjectApplication.class).verify()` num `*Test` do
   `architecture-tests` quebra o build.
2. `contracts` não contém agregado, entidade JPA nem regra: records de consulta, interfaces de
   leitura e eventos de integração.
3. Não existe pacote `shared` de negócio. O que é técnico e comum (`AggregateRoot`, `UseCase`,
   `PageOutput`) mora em `com.company.project.seedwork`, sem depender de nenhum módulo, declarado em
   `@Modulithic(sharedModules = "seedwork")` na classe principal.
4. **Síncrono entre módulos:** interface em `contracts` implementada pelo módulo dono e injetada
   pelo Spring, **nunca HTTP interno**.
5. **Assíncrono:** evento de integração publicado com `ApplicationEventPublisher` e consumido com
   `@ApplicationModuleListener` (assíncrono, transação própria, depois do commit da origem). O
   registro de publicações do Modulith (`spring-modulith-starter-jdbc`) é o outbox **entre módulos**:
   publicação incompleta é republicada. **Nunca chame o listener de outro módulo dentro da
   transação do caso de uso.**
6. Evento que sai do processo (RabbitMQ) continua pelo outbox próprio descrito em
   [`messaging.md`](messaging.md) — não misture o registro do Modulith com o relay do broker.
7. Banco único com **schema por módulo** (`orders`, `billing`): migrations em
   `db/migration/{modulo}`, uma execução do Flyway por schema no deploy (histórico dentro do schema
   do módulo) e um bean `Flyway` por schema na configuração de teste — a autoconfiguração do Boot
   cobre um só.

As regras de camada (`LayerDependencyTest`) valem por módulo, com os padrões de pacote
`com.company.project.*.domain..` etc.

### Testes

`@ApplicationModuleTest` sobe só o módulo sob teste (e as dependências declaradas), com
`Scenario` para publicar evento e esperar o efeito. É o teste de integração do módulo; o end-to-end
continua no contexto completo.

### Quando não usar

Módulo que já precisa de deploy ou escala independentes vai para microsserviços. Domínio sem
fronteiras claras fica na API simples.

---

## Microsserviços

Cada serviço é um repositório (ou build) independente, com deploy, banco e ciclo de vida próprios.
O contrato compartilhado vive fora dos serviços:

```text
orders-service/   pom.xml + domain/ application/ infra-*/ api/   (mesma Clean Architecture)
contracts/        com.company.contracts:orders-contracts         # artefato Maven versionado
```

### Regras entre serviços

1. **Banco por serviço.** Nenhum serviço lê schema, view ou tabela de outro.
2. **Contrato é artefato Maven versionado** no repositório interno, não módulo do mesmo build. Só
   records e eventos de integração, sem dependência de Spring nem Jackson (anotações de Jackson só
   se o contrato exigir nome de campo diferente).
3. **O `domain` não depende do artefato de contratos.** A conversão de evento de domínio para evento
   de integração acontece na application, antes de gravar no outbox; o consumo entra por
   `api.messaging`, que chama um caso de uso.
4. **Síncrono:** HTTP service interface em `infra`, atrás de port em `application.port`, com
   timeouts por grupo (`spring.http.serviceclient.<grupo>.*`) e `@Retryable` só em operação
   idempotente.
5. **Assíncrono:** RabbitMQ com outbox no produtor e consumidor idempotente ou com inbox — ver
   [`messaging.md`](messaging.md).
6. **Evolução aditiva do contrato:** campo novo opcional, ou nova versão do artefato e da routing
   key (`.v2`). **Nunca mude o significado de um campo existente.** Consumidor ignora campo
   desconhecido: o Boot já desliga `FAIL_ON_UNKNOWN_PROPERTIES` — não religue.
7. **Correlação:** `traceparent` propagado pela instrumentação do Boot; todo log e span tem
   `service.name`.

Cada serviço tem seu `architecture-tests` com as regras da API simples mais a regra 3 (`domain` não
depende de `com.company.contracts..`).

### Quando não usar

Sem esteira de deploy independente por serviço, o resultado é um monolito distribuído — banco
compartilhado ou cadeia de chamadas síncronas. Nesse caso, monolito modular.
