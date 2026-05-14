---
name: java-dependency-config
description: "Dependencias e configuracoes padrao para projetos Java Spring Boot 3+: pom.xml/build.gradle base, Spring Data JPA com HikariCP, Flyway migrations, MapStruct, OpenAPI/Swagger, Resilience4j, Spring Cache, WebClient, Micrometer/Prometheus, profiles de ambiente (dev/test/prod), Spotless formatting. Usar quando: criar projeto Java; adicionar nova integracao; configurar JPA/Hibernate; alterar infraestrutura; configurar profiles; setup de migrations."
---

# Java Dependencies & Configuration (Spring Boot 3+)

Documento normativo para padronizacao de dependencias, configuracoes e infraestrutura.
Acionada quando: criar projeto, adicionar nova integracao, alterar infraestrutura.

---

# 1. Dependencias Recomendadas (Maven)

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
    <relativePath/>
</parent>

<properties>
    <java.version>17</java.version>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
</properties>

<dependencies>
    <!-- Spring Boot Web + REST -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- Spring Data JPA + Hibernate -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>

    <!-- Validation (Jakarta Validation) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Actuator (Health Checks, Metrics) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-actuator</artifactId>
    </dependency>

    <!-- Micrometer for Prometheus -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Database Drivers -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>

    <!-- Migrations -->
    <dependency>
        <groupId>org.flywaydb</groupId>
        <artifactId>flyway-core</artifactId>
    </dependency>

    <!-- HTTP Client (WebClient moderno, RestTemplate e legacy) -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-webflux</artifactId>
    </dependency>

    <!-- Resiliencia (Retry, Circuit Breaker) -->
    <dependency>
        <groupId>io.github.resilience4j</groupId>
        <artifactId>resilience4j-spring-boot3</artifactId>
        <version>2.1.0</version>
    </dependency>

    <!-- Caching -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-cache</artifactId>
    </dependency>

    <!-- MapStruct (DTO mapping) -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>1.5.5.Final</version>
    </dependency>

    <!-- OpenAPI / Swagger -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.2.0</version>
    </dependency>

    <!-- Testing -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers</artifactId>
        <version>1.19.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <version>1.19.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>

        <!-- MapStruct Processor -->
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>3.11.0</version>
            <configuration>
                <source>17</source>
                <target>17</target>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>1.5.5.Final</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>

        <!-- Spotless (Code formatting) -->
        <plugin>
            <groupId>com.diffplug.spotless</groupId>
            <artifactId>spotless-maven-plugin</artifactId>
            <version>2.40.0</version>
            <configuration>
                <java>
                    <googleJavaFormat>
                        <version>1.17.0</version>
                    </googleJavaFormat>
                </java>
            </configuration>
        </plugin>
    </plugins>
</build>
```

---

# 2. Gradle Alternative (build.gradle.kts)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.2.0"
    id("io.spring.dependency-management") version "1.1.4"
}

group = "com.company"
version = "1.0.0"

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("org.springframework.boot:spring-boot-starter-cache")

    runtimeOnly("org.postgresql:postgresql")
    runtimeOnly("org.flywaydb:flyway-core")

    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.1.0")
    implementation("org.mapstruct:mapstruct:1.5.5.Final")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.2.0")

    annotationProcessor("org.mapstruct:mapstruct-processor:1.5.5.Final")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.assertj:assertj-core")
    testImplementation("org.testcontainers:testcontainers:1.19.0")
    testImplementation("org.testcontainers:postgresql:1.19.0")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
}
```

---

# 3. Configuracao Spring Data JPA

## Entity Base

```java
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
```

## Repository Pattern

```java
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.active = true ORDER BY u.name ASC")
    List<User> findAllActive();

    Page<User> findByActiveTrue(Pageable pageable);

    @Query("SELECT u.id, u.name, u.email FROM User u WHERE u.active = true")
    List<UserSummary> findActiveUserSummaries();
}

public interface UserSummary {
    Long getId();
    String getName();
    String getEmail();
}
```

## JPA Configuration

```java
@Configuration
@EnableJpaAuditing
@EnableTransactionManagement
public class JpaConfiguration {

    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariConfig hikariConfig() {
        return new HikariConfig();
    }
}
```

## application.yml (JPA)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/financeiro
    username: postgres
    password: postgres
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 20000
      idle-timeout: 300000
      max-lifetime: 1200000

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
        jdbc:
          batch_size: 20
          fetch_size: 50
        order_inserts: true
        order_updates: true
    show-sql: false
    open-in-view: false

  flyway:
    locations: classpath:db/migration
    out-of-order: false
```

---

# 4. Configuracao de Profiles

## application.yml (base)

```yaml
spring:
  application:
    name: financeiro-api
  jpa:
    open-in-view: false
  jackson:
    serialization:
      write-dates-as-timestamps: false
      indent-output: false

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
```

## application-dev.yml

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        format_sql: true
  datasource:
    url: jdbc:postgresql://localhost:5432/financeiro_dev
    username: postgres
    password: postgres

logging:
  level:
    com.company.project: DEBUG
    org.springframework.web: DEBUG
    org.hibernate.SQL: DEBUG
```

## application-test.yml

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: false
  datasource:
    url: jdbc:h2:mem:testdb;MODE=PostgreSQL
    driver-class-name: org.h2.Driver
    username: sa
    password:

logging:
  level:
    com.company.project: DEBUG
```

## application-prod.yml

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
  datasource:
    url: ${DB_URL}
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 30
      minimum-idle: 10

logging:
  level:
    com.company.project: INFO
    org.springframework: WARN

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  metrics:
    export:
      prometheus:
        enabled: true
```

---

# 5. Checklist de Dependencias e Configuracao

## Dependencias
- [ ] Spring Boot 3.2+ configurado
- [ ] JPA/Hibernate para acesso a dados
- [ ] MapStruct para mapeamento de DTOs
- [ ] Micrometer para metricas
- [ ] Resilience4j para resiliencia
- [ ] Spring Cache para caching
- [ ] Flyway para migrations
- [ ] Spotless para formatting

## Database
- [ ] DataSource com HikariCP pool
- [ ] Entidades com @Entity configuradas
- [ ] Repositories com Spring Data JPA
- [ ] Migrations Flyway versionadas
- [ ] open-in-view: false

## Profiles
- [ ] application.yml (base) configurado
- [ ] application-dev.yml com ddl-auto: update
- [ ] application-test.yml com H2 ou Testcontainers
- [ ] application-prod.yml com validate e secrets
