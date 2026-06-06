---
id: ii-don-t-repeat-yourself-dry
name: II. Don't Repeat Yourself (DRY)
order: 2
---
All code MUST avoid unnecessary duplication of logic, configuration, and data definitions. Shared behavior MUST be extracted into reusable services, utilities, or base classes and resolved through established import patterns. When identical or near-identical logic exists in more than one location, it MUST be consolidated into a single authoritative source. Duplication in test fixtures, schema definitions, and type declarations MUST be reduced through shared factories, constants, or helper modules. Shared logic MUST be extracted into `src/utils/`.
