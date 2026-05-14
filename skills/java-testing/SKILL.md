---
name: java-testing
description: "Estrategias de teste Java Spring Boot: testes unitarios com JUnit 5 + AssertJ + Mockito (padrao AAA), testes de integracao com Spring Boot Test + Testcontainers (PostgreSQL), testes E2E com Playwright, Dev Containers para ambiente isolado, naming convention (methodName_Condition_ExpectedBehavior), fixtures reutilizaveis, cobertura > 70% para logica de negocio. Usar quando: criar testes; revisar testes; garantir cobertura; configurar Testcontainers; setup de ambiente de teste."
---

# Java Testing Strategy (Spring Boot 3+)

Documento normativo para estrategias de teste.
Pode bloquear geracao de codigo sem teste.

---

# 1. Testes Unitarios

## Framework: JUnit 5 + AssertJ + Mockito

```xml
<dependency>
    <groupId>org.junit.jupiter</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.assertj</groupId>
    <artifactId>assertj-core</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-core</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.mockito</groupId>
    <artifactId>mockito-junit-jupiter</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 1.1 Padrao AAA (Arrange-Act-Assert)

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @InjectMocks
    private OrderService orderService;

    @Test
    void createOrder_WithValidRequest_ShouldReturnCreatedOrder() {
        // Arrange
        CreateOrderCommand command = new CreateOrderCommand(
                1L,
                List.of(new CreateOrderItemCommand(10L, 2))
        );
        Order expectedOrder = new Order(123L, 1L);
        when(orderRepository.save(any(Order.class))).thenReturn(expectedOrder);

        // Act
        Order result = orderService.createOrder(command);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(123L);
        assertThat(result.getCustomerId()).isEqualTo(1L);
        verify(orderRepository, times(1)).save(any(Order.class));
    }

    @Test
    void createOrder_WithNullCommand_ShouldThrowException() {
        // Arrange
        CreateOrderCommand command = null;

        // Act & Assert
        assertThatThrownBy(() -> orderService.createOrder(command))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Command cannot be null");
    }
}
```

---

## 1.2 Naming Convention

Padrao: `methodName_Condition_ExpectedBehavior`

```java
@Test
void calculateDiscount_WithPremiumCustomer_ShouldApply20PercentDiscount() { }

@Test
void validateEmail_WithInvalidFormat_ShouldThrowException() { }

@Test
void getOrders_WhenOrderNotFound_ShouldReturnEmptyOptional() { }
```

---

## 1.3 Testes Parametrizados

```java
@ParameterizedTest
@ValueSource(strings = {"", " ", "   "})
void validateEmail_WithInvalidEmail_ShouldReturnFalse(String email) {
    boolean result = EmailValidator.isValid(email);
    assertThat(result).isFalse();
}

@ParameterizedTest
@CsvSource({
        "user@example.com, true",
        "admin@company.org, true",
        "invalid-email, false",
        ", false"
})
void validateEmail_WithVariousInputs_ShouldReturnExpectedResult(
        String email, boolean expected) {
    boolean result = EmailValidator.isValid(email);
    assertThat(result).isEqualTo(expected);
}
```

---

## 1.4 Fixtures e Setup

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    private User defaultUser;
    private CreateUserCommand defaultCommand;

    @BeforeEach
    void setUp() {
        defaultUser = new User(1L, "John", "john@example.com");
        defaultCommand = new CreateUserCommand("John", "john@example.com", "555-1234");
    }

    @Test
    void createUser_WithValidCommand_ShouldReturnCreatedUser() {
        when(userRepository.save(any(User.class))).thenReturn(defaultUser);
        User result = userService.createUser(defaultCommand);
        assertThat(result).isNotNull().isEqualTo(defaultUser);
    }

    @AfterEach
    void tearDown() {
        reset(userRepository);
    }
}
```

---

# 2. Testes de Integracao

## 2.1 Testcontainers + Spring Boot Test

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
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
```

## 2.2 Repository Integration Test

```java
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class UserRepositoryIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByEmail_WithExistingUser_ShouldReturnUser() {
        // Arrange
        User user = new User("John", "john@example.com", "555-1234");
        entityManager.persistAndFlush(user);

        // Act
        Optional<User> result = userRepository.findByEmail("john@example.com");

        // Assert
        assertThat(result)
                .isPresent()
                .hasValueSatisfying(u -> {
                    assertThat(u.getName()).isEqualTo("John");
                    assertThat(u.getEmail()).isEqualTo("john@example.com");
                });
    }

    @Test
    void save_WithNewUser_ShouldPersistToDatabase() {
        // Arrange
        User user = new User("Alice", "alice@example.com", "555-9999");

        // Act
        User saved = userRepository.save(user);
        entityManager.flush();

        // Assert
        assertThat(saved.getId()).isNotNull();
        assertThat(userRepository.findById(saved.getId()))
                .isPresent()
                .hasValueSatisfying(u ->
                    assertThat(u.getEmail()).isEqualTo("alice@example.com")
                );
    }
}
```

## 2.3 API Integration Test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@ActiveProfiles("test")
class UserControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void createUser_WithValidData_ShouldReturn201() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest(
            "New User", "new@example.com", "555-0000");

        // Act
        ResponseEntity<UserDto> response = restTemplate.postForEntity(
                "/api/users", request, UserDto.class);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody())
                .isNotNull()
                .extracting(UserDto::getName)
                .isEqualTo("New User");
    }
}
```

---

# 3. Testes E2E com Playwright

```xml
<dependency>
    <groupId>com.microsoft.playwright</groupId>
    <artifactId>playwright</artifactId>
    <version>1.40.0</version>
    <scope>test</scope>
</dependency>
```

```java
public class LoginPageE2E {

    private static Browser browser;
    private static BrowserContext context;
    protected Page page;

    @BeforeAll
    static void setUpBrowser() {
        browser = Playwright.create().chromium().launch(
                new BrowserType.LaunchOptions().setHeadless(true)
        );
    }

    @BeforeEach
    void setUpPage() {
        context = browser.newContext();
        page = context.newPage();
    }

    @AfterEach
    void tearDown() {
        page.close();
        context.close();
    }

    @AfterAll
    static void closeBrowser() {
        browser.close();
    }

    @Test
    void userLogin_WithValidCredentials_ShouldNavigateToDashboard() {
        page.navigate("http://localhost:3000/login");
        page.fill("#email", "admin@example.com");
        page.fill("#password", "password123");
        page.click("#login-button");

        page.waitForNavigation(() -> {});
        assertThat(page.url()).contains("/dashboard");
        assertThat(page.locator(".welcome-message").textContent())
                .contains("Welcome, Admin");
    }
}
```

---

# 4. Dev Containers para Testes

## devcontainer.json

```json
{
  "name": "Java Spring Boot Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.Extension-Pack-for-Java",
        "pivotal.vscode-spring-boot"
      ]
    }
  },
  "forwardPorts": [8080, 5432],
  "postCreateCommand": "mvn clean install -DskipTests"
}
```

## docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build:
      context: ../
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ../:/workspace:cached
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/testdb
      - SPRING_DATASOURCE_USERNAME=testuser
      - SPRING_DATASOURCE_PASSWORD=testpass

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=testuser
      - POSTGRES_PASSWORD=testpass
      - POSTGRES_DB=testdb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U testuser -d testdb"]
      interval: 5s
      timeout: 5s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data
```

---

# 5. Regras de Teste

## Obrigatorias

- Regra de negocio DEVE ser testada no domain (unitario)
- Padrao AAA em todos os testes
- Naming convention: `methodName_Condition_ExpectedBehavior`
- Cobertura > 70% para logica de negocio
- Evitar uso excessivo de mocks (preferir testes de integracao para fluxos complexos)
- Testes determinísticos (sem dependência de ordem de execução)

## Proibidas

- Testes sem assertions
- Testes que dependem de estado externo nao controlado
- Mocks de classes do proprio domain
- Testes com sleep/wait fixo
- Testes que quebram quando Docker nao esta disponivel (devem ser skipped)

---

# 6. Checklist de Testes

## Unitarios
- [ ] JUnit 5 + AssertJ + Mockito configurado
- [ ] AAA Pattern usado
- [ ] Naming convention clara
- [ ] Cobertura > 70% para logica de negocio
- [ ] Testes parametrizados para multiplos cenarios
- [ ] Fixtures e setup reutilizaveis

## Integracao
- [ ] Spring Boot Test configurado
- [ ] Testcontainers para PostgreSQL
- [ ] Database seeding automatico
- [ ] Cleanup entre testes
- [ ] Isolamento de dados

## E2E
- [ ] Playwright configurado
- [ ] Testes de fluxos criticos
- [ ] Headless mode para CI/CD

## Dev Containers
- [ ] PostgreSQL container configurado
- [ ] Healthchecks implementados
- [ ] Dados deterministicos
- [ ] Cleanup automatico
