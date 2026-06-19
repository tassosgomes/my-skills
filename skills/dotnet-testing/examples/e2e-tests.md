# Testes End-to-End (E2E) — Exemplo

Playwright com Page Object Model. Poucos testes E2E, focados em happy paths criticos.

## Page Object Model

```csharp
public class LoginPage
{
    private readonly IPage _page;

    public LoginPage(IPage page)
    {
        _page = page;
    }

    public async Task NavigateAsync()
    {
        await _page.GotoAsync("/login");
    }

    public async Task LoginAsync(string email, string password)
    {
        await _page.FillAsync("#email", email);
        await _page.FillAsync("#password", password);
        await _page.ClickAsync("#login-button");
    }

    public async Task<bool> IsErrorMessageVisibleAsync()
    {
        return await _page.Locator(".error-message").IsVisibleAsync();
    }

    public async Task<string> GetErrorMessageAsync()
    {
        return await _page.Locator(".error-message").TextContentAsync() ?? "";
    }
}

// Uso nos testes
[Test]
public async Task Login_WithInvalidCredentials_ShouldShowError()
{
    var loginPage = new LoginPage(Page);
    
    await loginPage.NavigateAsync();
    await loginPage.LoginAsync("invalid@test.com", "wrong");
    
    (await loginPage.IsErrorMessageVisibleAsync()).Should().BeTrue();
    (await loginPage.GetErrorMessageAsync()).Should().Contain("Invalid credentials");
}
```
