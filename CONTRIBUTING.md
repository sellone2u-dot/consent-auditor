# Contributing

Thank you for helping improve Dealer Website Risk Auditor. Contributions should
preserve the project's central standard: user-visible conclusions must be
supported by browser-observed evidence. Read [VISION.md](VISION.md), the
[roadmap](ROADMAP.md), and the
[v0.2.0 compatibility contract](docs/V0.2.0_COMPATIBILITY_CONTRACT.md) before
making behavior or report-language changes.

## Set Up the Repository

Clone the repository and enter its directory:

```sh
git clone https://github.com/sellone2u-dot/consent-auditor.git
cd consent-auditor
```

The project currently has no third-party runtime or test dependencies, so no
dependency installation step is required. Use Node.js 18 or newer to run the
tests. If dependencies are added in the future, follow the installation
instructions committed with that change rather than assuming an unsupported
command.

## Run the Tests

From the repository root, run the command defined in `package.json`:

```sh
npm test
```

The test suite uses Node's built-in test runner. No `npm install` step is
required for the current repository.

## Load the Extension in Chrome

No build step is required.

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Select the repository directory containing `manifest.json`.
5. Confirm that **Dealer Website Risk Auditor** loads without manifest or
   service-worker errors.

For behavior or interface changes, exercise the affected workflow manually in
addition to running the automated tests. Use controlled or sanitized test data
where practical; live dealership sites can change independently of the
extension.

## Branch and Pull-Request Workflow

- Create a dedicated branch for meaningful work; do not develop directly on
  `main`.
- Keep each change focused on one problem or closely related set of changes.
- Preserve existing behavior unless the change is intentional, documented, and
  consistent with the compatibility contract.
- Run `npm test` and resolve failures before opening a pull request.
- In the pull request, explain what changed, why it changed, how it was tested,
  and any known limitations or compatibility effects.
- Request review and merge only after the change has been checked against
  `VISION.md`. Keep `main` stable.

Do not include unrelated formatting, generated files, captured sensitive data,
or broad refactors in a focused change.

## Evidence and Language Standards

Use precise, evidence-based language in code, interfaces, reports, fixtures,
tests, and documentation.

- An observed network request is evidence that the browser made or attempted
  the request. It is not proof that a script or downloaded code executed.
- An unobserved request is not proof that it was blocked, absent from the
  website, or would remain unobserved in another session.
- A captured request sequence is not a verified script execution or firing
  order.
- A user-selected scan state must not be described as independently verified
  unless supporting evidence actually establishes that fact.
- Direct observations, derived classifications, heuristics, and recommendations
  should remain distinguishable.
- Do not describe findings as legal advice, legal conclusions, compliance
  certification, or proof of compliance.

New or changed conclusions should be traceable to captured evidence and covered
by focused tests or sanitized fixtures where the existing test architecture
supports them.
