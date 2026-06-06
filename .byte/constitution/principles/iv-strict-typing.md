---
id: iv-strict-typing
name: IV. Strict Typing
order: 4
---
All function signatures MUST include explicit type annotations for parameters and return types. All variables MUST have type annotations where types cannot be unambiguously inferred from context. Use of `any` is prohibited unless explicitly justified with an inline comment. The TypeScript compiler and ESLint MUST pass cleanly with no type errors or unresolved type issues.
