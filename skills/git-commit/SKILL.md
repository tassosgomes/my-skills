---
name: git-commit
description: "Use este skill quando o usuário precisar criar mensagens de commit, revisar commits existentes, ou quando uma tarefa for finalizada e for necessário gerar a mensagem de commit padronizada. Exemplos de ativação: o usuário pede para commitar alterações; o usuário finaliza uma tarefa e precisa da mensagem de commit; o usuário pergunta sobre o padrão de commit do projeto; o usuário pede para revisar ou corrigir uma mensagem de commit."
---

# Regras de Commit para o Projeto

## Objetivo

Padronizar mensagens de commit para facilitar a leitura, rastreabilidade e automações (como changelogs e deploys).

## Estrutura da Mensagem

Uma mensagem completa deve seguir esta estrutura (note a linha em branco entre o título e o corpo):

```text
<tipo>(escopo): <título breve no imperativo>

- Detalhe 1 do que foi alterado
- Detalhe 2 do que foi alterado

[Rodapé opcional: Closes #123]
```

### Exemplos Reais

**Simples:**

```text
docs(readme): atualizar instruções de instalação
```

**Com corpo e lista (Recomendado para commits maiores):**

```text
feat(auth): adicionar autenticação via Google OAuth

- Implementada estratégia do Passport.js
- Criada rota de callback /auth/google/callback
- Adicionadas variáveis de ambiente no .env.example
```

**Breaking Change (Importante para versionamento):**

```text
refactor(api)!: remover suporte à API v1
```

## Tipos de Commit

| Tipo     | Descrição                                                                 |
|----------|---------------------------------------------------------------------------|
| feat     | Nova funcionalidade                                                       |
| fix      | Correção de bug                                                           |
| docs     | Alterações na documentação                                                |
| style    | Formatação, identação, espaços, etc. (sem alteração de código funcional)  |
| refactor | Refatoração de código (sem mudança de funcionalidade)                     |
| test     | Adição ou modificação de testes                                           |
| chore    | Tarefas de manutenção (build, configs, dependências, etc.)                |

## Boas Práticas

### 1. O Título (Primeira linha)

- **Limite**: Máximo de 50-72 caracteres.
- **Idioma**: Português.
- **Verbo**: Use o infinitivo com sentido de ordem ("Adicionar" em vez de "Adicionei" ou "Adicionando").
- **Sem ponto**: Não coloque ponto final na primeira linha.

### 2. O Corpo (Opcional, mas recomendado)

- Obrigatório se o commit envolver múltiplas alterações.
- Use listas com hífens `-` para explicar o "porquê" e o "o quê".

### 3. Escopo

- Onde a mudança ocorreu? Ex: `(login)`, `(navbar)`, `(api)`, `(db)`.

### 4. Breaking Changes

- Se a alteração quebra a compatibilidade anterior, adicione um `!` após o tipo ou escreva `BREAKING CHANGE:` no rodapé.

## Checklist antes de commitar

- [ ] O código foi testado localmente?
- [ ] O lint foi executado sem erros?
- [ ] A mensagem segue o padrão `tipo(escopo): descrição`?
- [ ] Se houve mudança de lógica, o corpo do commit explica os detalhes?
- [ ] Se fecha uma Issue, o rodapé contém o número? (Ex: `Closes #42`)
