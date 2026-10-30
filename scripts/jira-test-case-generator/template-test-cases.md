# Standard Test Case Template

This template defines the standard format for describing test cases in E2E testing projects.

## Test Case Format

```markdown
# [TEST CASE TITLE]

## Objective

[Short description of the test case objective]

## Preconditions

- [Precondition 1]
- [Precondition 2]
- [Precondition n]
```

## Usage Guide

### 1. Title

The title should be descriptive and make it easy to understand what the test case will validate.

Examples:

- "Verify successful credit card payment processing in EUR"
- "Validate transaction rejection with expired card"

### 2. Objective

Provide a concise description that clearly defines the purpose of the test case.

Examples:

- "Verify that a customer can successfully complete a sale transaction using a valid credit card in EUR currency"
- "Confirm that the system correctly rejects a transaction when attempting to use an expired credit card"

### 3. Preconditions

List all configurations and prerequisites necessary for the correct execution of the test case.

Examples:

- "Payment processor configured and available"
- "Valid test credentials configured in the environment"
- "Payment widget configured to accept EUR as currency"
- "Database in known state with test customer registered"
