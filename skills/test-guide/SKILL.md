---
name: test-guide
description: >
  Guide for writing and auditing tests across all layers — unit, integration, and E2E.
  Use this skill when writing new tests, creating test files, deciding what to test at each layer,
  choosing between unit vs integration vs E2E, and also when auditing existing tests, cleaning up
  redundant tests, or finding missing coverage. Triggers on: "write tests", "add tests for",
  "create unit tests", "create integration tests", "create e2e tests", "should I test this",
  "what layer should this test be", "audit tests", "test cleanup", "which tests can I delete",
  "what tests am I missing", "review test quality".
---

# Test Guide

Write tests that verify the system behaves correctly at each layer. Each test must have a clear purpose — what behavior it proves and at which boundary. Go beyond happy paths: test edge cases, error scenarios, and boundary conditions where bugs actually hide.

---

## The Criteria

These rules apply whether you're writing new tests or auditing existing ones.

### Worth testing

- **Business logic with branching** — conditionals, state machines, permission checks, domain rules
- **Security boundaries** — auth, authorization, rate limiting, input sanitization, xss, csrf, sql injection, etc.
- **Data integrity** — transformations, serialization, migrations, calculations where wrong output = corrupt data
- **Error handling** — what happens when external services fail, database is down, user is unauthorized
- **Critical user flows** — auth, payment, upload, core CRUD that users depend on
- **Race conditions** — concurrent operations, optimistic locking, queue processing
- **Boundary/edge cases** — null, empty, max values, off-by-one, overflow conditions
- **External integrations** — webhooks, unexpected API responses, timeouts, contract mismatches

### NOT worth testing

- **Framework behavior** — Trust what the framework guarantees: rendering, routing, request handling, ORM persistence, loading states. If the framework works, these work. Test your logic on top of it.
- **Validation passthrough** — Validation libraries already enforce their rules. One test proving the validator is wired is enough — not one per rule on the same code path. Keep one happy-path test per validator to prove valid input passes, but don't duplicate every rejection rule.
- **Mirror tests** — When the assertion copies the return value of the implementation. The test can never catch a bug — it can only break when you intentionally change the code.
- **Duplicate coverage across layers** — Each test must catch a bug no other test catches. If a behavior is verified at a higher layer, a lower-layer test for the same path adds nothing unless the logic is complex enough to need fault isolation. This includes: functions re-tested by their callers.
- **Wiring tests** — Tests that only verify a side-effect call was made with the right arguments. These test glue, not logic. They break on refactors, not on bugs. Only test wiring when there's transformation, conditional logic, or error handling between caller and callee.
- **Static structure assertions** — Field existence, column types, initial state values, default config, type checks. If the structure is wrong, every other test that depends on it already fails.
- **Output shape without behavior** — Tests that verify static output (rendered text, response field presence, visual properties, source file contents) without exercising any logic. If a behavioral test in the same file already produces the same output, the shape-only test is redundant.
- **Variant repetition without branching** — Multiple tests exercising the same code path with different inputs. If the logic doesn't branch, one representative test (or one parameterized test) is enough.
- **Single-path utilities** — Functions with no conditionals, no error handling, no edge cases. Simple getters, setters, one-liner delegations. If the function branches, it's worth testing.

### Mock health

- **Max 3 mocks per test.** More than that means you're testing wiring, not behavior.
- If a test needs 4+ mocks, rewrite it as an integration test or remove it.
- Frontend tests are especially prone to over-mocking. A component test with mocked router, mocked context, mocked API, and mocked hooks tests nothing real.

### Each layer has a purpose

**Unit tests** prove isolated logic works — branching, calculations, domain rules. They're fast and pinpoint exactly what broke. Write them for functions with complex conditionals where fault isolation matters. Not every behavior needs a unit test — if the logic is simple and an integration test already covers it, the unit test is duplicate coverage.

**Integration tests** prove pieces work together — API + DB, service + repository, component + context. They catch contract mismatches and wiring bugs that unit tests can't see.

**E2E tests** prove a complete flow works end-to-end — a full API call traversing all layers (request → middleware → service → DB → response), a browser-driven test that triggers backend calls, or a flow that includes external services. They validate that the entire chain works together, not just individual pieces.

| Layer | Test | Skip |
|-------|------|------|
| **Unit** | Functions with conditionals, calculations, domain rules, state machines | Getters, trivial utils, config, schema validation |
| **Integration** | API endpoints (auth, permissions, errors), services + DB, component + context | Simple CRUD already covered by E2E, static rendering |
| **E2E** | Critical user flows (auth, upload, core workflows), full API traversals | Flows already well-covered by integration tests |

---

## Mode: Writing Tests

When creating new tests, apply the criteria above before writing anything.

1. Check the code against the **"Worth testing"** and **"NOT worth testing"** categories above.
2. If it matches "Worth testing" and not "NOT worth testing" → write it. Focus assertions on behavior, not only granular implementation details.
3. Otherwise → don't write the test. Move on.

When writing:
- Test behavior and outcomes, not a very granular implementation details.
- One concept per test — if you need `and` in the test name, split it
- Name tests after what they verify: `test_locked_account_returns_403`, not `test_login_3`
- Prefer real dependencies over mocks **when feasible** (in-memory DB over mocked repository). If its not a greenfield project, follow the project's conventions.

---

## Mode: Audit

When auditing existing tests, use the same criteria to classify each test.

### Phase 1: Understand the project's test definitions

Before judging, understand what unit/integration/E2E mean **in this specific project** — these terms are ambiguous:

- Read project docs, test configs, CI pipeline, directory structure
- Confirm your understanding with the user before proceeding

### Phase 2: Explore, Count & Classify

- **Step 1**: Explore the application code (not just tests) — understand modules, business logic, critical flows, and what each area of the codebase does. This context is essential to judge whether a test is worth keeping.
- **Step 2**: Find all test files (Glob) to know the total scale.
- **Step 3**: Based on the number of test files/dirs/modules and the app structure, decide how many parallel agents to launch. Each agent gets a specific scope (files, dirs, or modules — match the project's organization). Each agent also receives context about the production code its tests relate to.
- **Step 4**: Each agent, in a single pass per file, does:
  - Count every individual test case precisely (read each file, count exact declarations — no estimates, no sampling). Maximum precision on test counts is required.
  - Classify each test: **Remove** / **Keep** / **Missing** — using knowledge of the production code to judge worthiness against the criteria above.
- **Step 5**: Aggregate all agent results — total counts + classifications.

### Phase 3: Report

```
# Test Audit Report

## Test Count Overview
| Metric | Count |
|--------|-------|
| **Total tests in system** | X |
| **Tests to remove** | Y |
| **Projected count after cleanup** | Z |

## Project Test Definitions
[What each category means in this project]

## Summary
- Test files analyzed: X
- Remove: X | Keep: X | Missing critical: X | Missing edge cases: X

## Tests to Remove
### [filename:test_name]
- **Category**: [matching category from NOT worth testing list above]
- **Why**: [1-2 sentences]

## Missing Tests (Priority Order)
### Critical
[What to test and why it matters]

### Edge Cases
[Scenario descriptions]

## Mock Health
[Files with excessive mocking and suggested refactors]
```

### Execution modes

Ask the user which mode they want:

- **Report only** (default) — generate report, make no changes
- **Report + Delete** — report, then remove confirmed tests one at a time
- **Report + Scaffold** — report, then scaffold missing tests with TODO placeholders
- **Full automation** — report, delete confirmed tests, scaffold missing tests with TODO placeholders

---

## Principles

- Read the actual test code — don't judge by name alone
- Apply the criteria consistently — if a test matches NOT worth testing and doesn't match Worth testing, remove it
- Respect project conventions (test configs)
- The test pyramid is a guideline, not a law — if logic lives in API handlers, integration tests may matter more than unit tests