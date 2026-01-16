# AGENTS.md — Universal Default Guide for AI Coding Agents

## Purpose

This file provides AI coding agents with a complete, self-contained set of rules, standards, and workflows to safely and effectively create, modify, or maintain code in this repository.

It is designed to be **project-agnostic** and requires **no manual customization**.
When project-specific details exist, the agent must infer them from the repository structure and existing code.

---

## Project Assumptions (Default)

Unless the repository explicitly indicates otherwise, assume the following:

* The project is actively maintained
* Code quality, correctness, and clarity are priorities
* Backward compatibility matters unless stated otherwise
* Tests are expected when behavior changes
* The repository already contains the authoritative patterns

**The existing codebase is the single source of truth.**

---

## Repository Structure (Observed, Not Assumed)

The agent must infer structure dynamically. Common directories may include:

* `src/` — Primary application or library code
* `lib/` — Compiled or shared library output
* `tests/` or `__tests__/` — Automated tests
* `docs/` — Documentation
* `scripts/` — Automation and tooling scripts
* `config/` or root config files — Tooling and environment configuration

If a directory exists, respect its purpose as demonstrated by its contents.

---

## Critical Safety Rules

### Do Not Execute Long-Running or Interactive Commands

**NEVER** run commands that:

* Start servers
* Launch watchers
* Require user input
* Block execution indefinitely

Examples (non-exhaustive):

* `npm start`
* `npm run dev`
* `python main.py`
* `docker compose up`

Only run such commands if the user explicitly asks.

---

### Preserve Existing Behavior

* Do not change external behavior unless explicitly requested
* Avoid breaking public APIs
* Maintain backward compatibility by default
* Refactors must not alter logic unless stated

---

## Coding Conventions

### Follow What Exists

Before writing new code:

1. Inspect nearby files
2. Match naming, formatting, and structure
3. Reuse established abstractions

**Never introduce new architectural patterns unless required.**

---

### File Naming

* Match the dominant style in the repository
* If no dominant style exists:

  * `snake_case` for Python
  * `camelCase` or `kebab-case` for JavaScript/TypeScript
  * `PascalCase` for classes and types
* Be consistent within the same directory

---

### Language Standards (Universal Defaults)

Apply these unless existing code dictates otherwise:

* Prefer explicit types where supported
* Avoid implicit globals
* Handle errors explicitly
* Favor readability over cleverness
* Avoid premature optimization

---

### Comments & Documentation

* Public APIs must be documented
* Internal code should be self-explanatory
* Inline comments are allowed only when intent is non-obvious
* Do not restate what the code already clearly expresses

---

## Architecture Principles

### Separation of Concerns

* Business logic must not depend on UI, transport, or framework layers
* Side effects (I/O, network, filesystem) should be isolated
* Configuration should not be hard-coded

---

### Dependency Direction

* High-level modules must not depend on low-level implementation details
* Prefer dependency injection or inversion where patterns already exist

---

## Error Handling

### Strategy

* Fail fast on programmer errors
* Gracefully handle runtime and external failures
* Never silently swallow errors

### Logging Errors

* Log errors once, at the appropriate boundary
* Preserve stack traces when available
* Re-throw after logging unless explicitly handled

---

## Logging Standards

### Levels

* `error` — Unrecoverable failures
* `warn` — Recoverable but notable issues
* `info` — Significant lifecycle events
* `debug` — Diagnostic details

### Prohibited Logging

* Credentials
* Tokens or secrets
* Personal data
* Entire request/response payloads

---

## Testing Expectations

### When to Add Tests

Tests are required when:

* Fixing bugs
* Adding features
* Modifying logic
* Refactoring complex code

### Test Types

* **Unit tests** for logic
* **Integration tests** for boundaries
* **End-to-end tests** only when already present

### Test Style

* Test behavior, not implementation
* Use descriptive test names
* Keep tests deterministic and isolated

---

## Pre-Commit Quality Checklist

Before considering work complete, ensure:

1. Code builds (if applicable)
2. Tests pass or were added appropriately
3. No debug artifacts remain
4. Imports are organized
5. Errors are handled
6. No sensitive data is introduced
7. Formatting matches existing code

---

## Dependency Management

* Do not add dependencies unless necessary
* Prefer existing libraries already in use
* Avoid duplicate or overlapping dependencies
* Document why a new dependency is required

---

## Configuration & Environment

* Never hard-code environment-specific values
* Use existing configuration patterns
* Respect `.env`, config files, or environment variables already present
* Do not assume production or development context

---

## Build & Deployment

* Do not modify build pipelines unless asked
* Preserve CI/CD compatibility
* Avoid introducing environment-specific assumptions

---

## Common Pitfalls to Avoid

1. Introducing new patterns when existing ones exist
2. Refactoring beyond the requested scope
3. Removing code that appears unused without confirmation
4. Making stylistic changes unrelated to the task
5. Guessing requirements instead of inferring from code

---

## How to Proceed When Unsure

If ambiguity exists:

1. Inspect similar files
2. Follow the most common existing pattern
3. Choose the least invasive option
4. Leave behavior unchanged
5. Prefer explicitness over assumption

---

## Agent Operating Principles

* Be conservative
* Be consistent
* Be reversible
* Be explicit
* Be testable

**The goal is to integrate seamlessly into the existing codebase as if written by its original authors.**
