---
name: testing-standards
description: >
  Use this skill whenever the task involves writing, reviewing, or improving tests — unit tests,
  integration tests, end-to-end tests, test structure, coverage, mocking, test doubles, TDD,
  BDD, test automation, flaky tests, or CI test pipelines. Trigger on: jest, pytest, rspec,
  go test, vitest, playwright, cypress, testing-library, any *_test.* file, or phrases like
  "write tests for", "test coverage", "test this function", "failing tests".
---

# Testing Standards — Expert Reference

## Core Mental Models

**Tests are executable specifications.** A test that doesn't describe behavior precisely is noise.

**The Test Pyramid:** Unit (fast, many) → Integration (medium) → E2E (slow, few). Inverting this pyramid means slow, brittle CI.

**Test behavior, not implementation.** Tests that break when you rename a private method are coupled to the wrong thing.

**A test suite that takes > 10 minutes to run will be skipped.** Speed is a feature.

**Flaky tests are liabilities, not assets.** A test that sometimes fails is worse than no test — it erodes trust in the entire suite.

---

## Non-Negotiable Standards

1. **Every test must have exactly one reason to fail.** If a test can fail for multiple reasons, split it.
2. **Test names describe behavior**: `"returns 401 when token is expired"` not `"test auth"`.
3. **No test depends on another test's state.** Tests must be runnable in any order in isolation.
4. **No `sleep()` or time-based waits** in tests — use deterministic triggers, event awaiting, or controlled clocks.
5. **Mock at the boundary, not the internals.** Mock HTTP clients, queues, DBs — not private functions.
6. **Coverage targets are a floor, not a goal.** 80% coverage of wrong things is meaningless. Cover every branch of business logic.
7. **Failing tests block merges.** Never skip a test to make CI green — fix the test or the code.

---

## Decision Rules

```
IF function has no external dependencies THEN unit test only
IF function calls DB/HTTP/filesystem THEN integration test with real or containerized dependency
IF test setup exceeds 20 lines THEN extract fixture/factory, not inline data
IF same assertion repeats across 3+ tests THEN extract custom matcher/assertion helper
IF test requires specific time/date THEN freeze the clock (jest.useFakeTimers, freezegun, etc.)
IF testing React/UI component THEN test via user interactions (click, type), not internal state
IF test is flaky THEN quarantine immediately, fix within 1 sprint — never leave flaky tests in main suite
IF mocking a module's internals THEN stop — redesign the interface instead
IF E2E test covers same path as unit test THEN keep unit, delete E2E (E2E for critical user journeys only)
NEVER assert on exact timestamps — use ranges or relative assertions
NEVER use production data in tests — use generated fixtures
NEVER write a test that always passes (tautology) — assert on the actual return value
```

---

## Test Structure: AAA Pattern

Every test follows **Arrange → Act → Assert**. One assertion block per test (multiple `expect` calls are fine if they describe one behavior).

```python
# BAD: unclear what's being tested, mixed concerns
def test_user():
    u = User("alice", "alice@example.com")
    u.activate()
    assert u.active == True
    assert u.email_verified == True
    u.deactivate()
    assert u.active == False

# GOOD: one behavior per test, explicit naming
def test_user_is_active_after_activation():
    user = User("alice", "alice@example.com")
    user.activate()
    assert user.active is True

def test_email_is_verified_after_activation():
    user = User("alice", "alice@example.com")
    user.activate()
    assert user.email_verified is True

def test_user_is_inactive_after_deactivation():
    user = make_active_user()  # factory hides irrelevant setup
    user.deactivate()
    assert user.active is False
```

---

## Test Doubles Taxonomy

| Type | Has real logic | Returns preset values | Records calls | Use when |
|------|---------------|----------------------|---------------|----------|
| **Stub** | No | Yes | No | You need canned responses |
| **Mock** | No | Yes | Yes | You need to verify interactions |
| **Fake** | Yes (simplified) | N/A | No | Real behavior, lightweight (in-memory DB) |
| **Spy** | Yes (real) | Passthrough | Yes | Wrap real impl, observe calls |
| **Dummy** | No | No | No | Satisfy parameter requirements |

**Rule**: Prefer Fakes over Mocks. Fakes catch real integration bugs. Mocks only verify your assumptions about the contract.

---

## Common Mistakes & Exact Fixes

### Mistake 1: Testing implementation, not behavior
```javascript
// BAD: breaks if internal array name changes
expect(service._cache.items).toHaveLength(3);

// GOOD: test via public interface
const result = await service.getItems();
expect(result).toHaveLength(3);
```

### Mistake 2: Shared mutable state between tests
```python
# BAD: tests pollute each other
db = []
def test_add(): db.append(1); assert len(db) == 1
def test_empty(): assert len(db) == 0  # fails if run after test_add

# GOOD: fresh state per test
@pytest.fixture
def db(): return []
def test_add(db): db.append(1); assert len(db) == 1
def test_empty(db): assert len(db) == 0
```

### Mistake 3: Overly specific mock assertions
```javascript
// BAD: brittle — breaks if log format changes
expect(logger.info).toHaveBeenCalledWith("User 42 logged in at 2024-01-01T00:00:00Z");

// GOOD: assert the important parts
expect(logger.info).toHaveBeenCalledWith(expect.stringContaining("User 42 logged in"));
```

### Mistake 4: Magic numbers in test data
```python
# BAD: why 3? why 'alice'? what's special about these?
result = process_order(3, 'alice', 99.99)
assert result.status == 'approved'

# GOOD: named, meaningful
MINIMUM_APPROVAL_AMOUNT = 100.00
result = process_order(
    quantity=3,
    customer_tier='standard',
    amount_cents=9999  # just under approval threshold
)
assert result.status == 'pending_review'
```

---

## Good vs. Bad Test Output

### BAD test (JavaScript):
```javascript
test('payment', async () => {
  const p = new Payment();
  p.amount = 100;
  p.process();
  expect(p.status).toBe('done');
  expect(p.fee).toBe(2.9);
  expect(emailService.send).toBeCalled();
});
```

### GOOD tests:
```javascript
describe('Payment.process()', () => {
  it('sets status to completed when charge succeeds', async () => {
    const payment = makePayment({ amount: 100 });
    chargeGateway.stub({ success: true });
    await payment.process();
    expect(payment.status).toBe('completed');
  });

  it('calculates 2.9% processing fee', async () => {
    const payment = makePayment({ amount: 100 });
    chargeGateway.stub({ success: true });
    await payment.process();
    expect(payment.feeInCents).toBe(290);
  });

  it('sends confirmation email on success', async () => {
    const payment = makePayment({ amount: 100 });
    chargeGateway.stub({ success: true });
    await payment.process();
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ template: 'payment-confirmation' })
    );
  });

  it('sets status to failed when charge is declined', async () => {
    const payment = makePayment({ amount: 100 });
    chargeGateway.stub({ success: false, code: 'card_declined' });
    await payment.process();
    expect(payment.status).toBe('failed');
  });
});
```

---

## Expert Vocabulary

- **Test isolation**: each test is hermetically sealed — no shared state, no implicit ordering
- **Test pyramid**: Unit > Integration > E2E by count; inverted pyramid = integration hell
- **Seam**: a place in code where behavior can be changed without modifying the code (injection point for test doubles)
- **Boundary**: where your code ends and external systems begin — mock the boundary, not internals
- **Regression test**: test written to pin a fixed bug, preventing recurrence
- **Characterization test**: test written to document existing (possibly broken) behavior before refactoring
- **Mutation testing**: automated modification of source code to verify tests catch the changes (Stryker, mutmut)
- **Property-based testing**: generate inputs to find edge cases automatically (Hypothesis, fast-check)
- **Test harness**: infrastructure that sets up/tears down test environment (fixtures, factories, containers)
- **Golden master**: snapshot of output used as expected value — brittle; use only for complex serialized output
