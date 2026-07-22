# Test Structure

The test suite uses Node's built-in `node:test` runner and has no third-party runtime or test dependencies.

## Current Phase 0 coverage

```text
tests/
├── fixtures/
│   ├── pages/       Sanitized DOM/banner observations
│   ├── reports/     Stable report terminology and output expectations
│   ├── requests/    Sanitized captured request sequences
│   └── scans/       Sanitized saved analysis snapshots
├── helpers/         Node-only test loading utilities
├── contract.test.js
├── fixtures.test.js
├── manifest.test.js
└── report.test.js
```

## Planned v0.2.0 coverage

Later approved phases will add focused tests for classification, Consent Mode signals, request lifecycle outcomes, analysis, scoring, scan comparison, evidence provenance, storage migrations, and report generation. Tests should consume sanitized fixtures and should not require access to a live dealership website for deterministic logic checks.

Browser API integration and real CMP behavior require separate Chrome extension and manual test coverage.
