# Dealer Website Risk Auditor Roadmap

This roadmap is governed by `VISION.md`: truth over assumptions, evidence over opinions, education over fear. Version 1.0 must be an honest, stable browser assessment tool whose user-visible conclusions are supported by captured browser evidence. It is not legal advice, a compliance certification, a vulnerability scanner, or merely a cookie counter.

The roadmap is based on the current extension, its Phase 0/Phase 1 test foundation, `BUILD_NOTES.md`, and `docs/V0.2.0_COMPATIBILITY_CONTRACT.md`. It does not make legal conclusions or expand the product beyond repository-supported plans.

The `main` branch must remain stable. All roadmap work should continue on dedicated feature branches and be reviewed before merge.

# Must Have for Version 1.0

## 1. Publish complete user and contributor documentation

- **Objective:** Replace the current build-note-driven onboarding with a clear root `README.md` and supporting user documentation for installation, scan modes, evidence limitations, saved states, exports, permissions, troubleshooting, and local validation.
- **Why it matters:** The repository has no root README. Users currently have to infer operation and limitations from `BUILD_NOTES.md`, the popup, and the compatibility contract. A 1.0 release cannot be used honestly if users do not know that scan labels must match actual browser state or that missing observations do not prove blocking.
- **Acceptance criteria:** Documentation explains unpacked-extension installation; quick read versus reload-based **Scan page**; Fresh, Denied, Accepted, No banner, and Current browser state meanings; how to capture and save valid states; Markdown, text, HTML, and print/PDF exports; evidence and request-sequence limitations; requested Chrome permissions; supported browser scope; data storage behavior; troubleshooting; how to run the existing test suite; and the non-legal, non-certification product boundary. Instructions and screenshots, if added, match the shipped UI.
- **Likely files or components affected:** `README.md`, `BUILD_NOTES.md`, `tests/README.md`, `docs/`, `manifest.json`, popup/report copy referenced by the documentation.
- **Tests required:** Documentation link and command checks; manual walkthrough from a clean Chrome profile; verification that every documented control and export exists and behaves as described.
- **Dependencies:** Final terminology from item 2 and final release behavior from items 3–8.
- **Known risks or limitations:** Live websites and CMPs change independently of the extension. Documentation must describe representative workflows without promising identical results on every site.

## 2. Establish one evidence terminology and claims standard

- **Objective:** Audit all user-visible language and define consistent terms for direct observations, derived classifications, heuristics, user-selected states, unavailable evidence, and recommendations.
- **Why it matters:** The compatibility contract correctly distinguishes observed requests from execution, but current code still includes stronger phrases such as “fired,” “blocked,” “proving,” “determines what content is collected,” “Consent Mode not verified,” and prescriptive consent expectations. These can overstate what a captured request, absent request, cookie, DOM signal, or selected scan label establishes.
- **Acceptance criteria:** A documented terminology matrix identifies each evidence level and approved wording. Popup, Markdown, printable, text, and HTML output use it consistently. “Not observed” never becomes proof of blocking or absence; captured sequence never becomes execution order; a user-selected state is not presented as independently confirmed; page-only CMP evidence does not imply verified control timing; derived ratings are visibly distinguished from observations; recommendations remain practical and non-legal. Unsupported or untraceable claims are removed or qualified.
- **Likely files or components affected:** `popup.js`, `report.js`, `print_report.js`, `tips.js`, `popup.html`, `print_report.html`, `src/core/scoring.js`, `src/core/constants.js`, `data/*.json`, `docs/V0.2.0_COMPATIBILITY_CONTRACT.md`, report fixtures.
- **Tests required:** Assertion-based terminology tests for prohibited and required phrases; fixtures for observed, not observed, unknown, DOM-only, and heuristic cases; manual review of every visible and exported report surface.
- **Dependencies:** `VISION.md` and the compatibility contract; intentional terminology changes must follow the contract’s change-control rule.
- **Known risks or limitations:** Concise dealer-friendly language can lose technical nuance. Terminology tests reduce regressions but cannot replace human editorial review.

## 3. Make every conclusion traceable to normalized evidence

- **Objective:** Give each finding, rating input, consent-signal interpretation, and recommendation an explicit path back to the captured request, cookie, storage, DOM, browser API, metadata, or user confirmation that supports it.
- **Why it matters:** Evidence preservation and traceability are core product requirements. Current report generation consumes a broad analysis object, but the repository’s planned evidence-provenance tests do not yet exist and conclusions do not consistently expose their supporting observation identifiers.
- **Acceptance criteria:** A documented, versioned evidence/finding shape distinguishes raw evidence, normalized observations, derived findings, and recommendations. Each user-visible finding identifies supporting evidence or explicitly states that evidence was unavailable. Evidence details remain accessible in saved scans and every applicable export. Duplicate observations have stable handling, and sensitive or excessively large captured values are bounded without silently changing conclusions.
- **Likely files or components affected:** `background.js`, `content.js`, `popup.js`, `report.js`, `print_report.js`, `src/core/capture.js`, `src/core/analysis.js`, `src/core/consent-signals.js`, storage payloads, scan/request/report fixtures.
- **Tests required:** Evidence-provenance unit tests; fixtures covering requests, cookies, DOM/CMP evidence, consent signals, unavailable evidence, and duplicate evidence; saved-scan round-trip tests; report assertions connecting conclusions to evidence.
- **Dependencies:** Item 2; storage schema and migration work in item 6.
- **Known risks or limitations:** Older saved snapshots may not contain identifiers or all raw evidence. Migration must preserve what exists and label unavailable provenance rather than invent it.

## 4. Unify analysis and report output across all surfaces

- **Objective:** Ensure popup summaries, detail panels, Markdown, printable HTML/PDF, downloaded text/HTML, and multi-state comparisons are generated from the same normalized findings and presentation rules.
- **Why it matters:** Analysis and wording are currently spread across `popup.js`, `report.js`, `print_report.js`, `tips.js`, and small core modules. This creates a material risk that the same scan receives different labels, explanations, ratings, or evidence in different outputs.
- **Acceptance criteria:** One analysis result produces semantically consistent consent state, rating, finding severity, evidence wording, counts, and recommendations on every surface. Fresh, Denied, Accepted, No banner, and Current states retain their distinct meanings. Single-state and multi-state reports use the same definitions. Empty, partial, and unavailable data render without contradictory claims or broken sections.
- **Likely files or components affected:** `popup.js`, `report.js`, `print_report.js`, `tips.js`, `src/core/analysis.js`, `src/core/scoring.js`, `src/core/constants.js`, report and scan fixtures.
- **Tests required:** Golden/structured report tests for all five states; parity tests across popup-facing view models and exported formats; partial-data and no-evidence cases; regression coverage for current compatibility terminology and disclaimers.
- **Dependencies:** Items 2 and 3; item 5 for shared classification outputs.
- **Known risks or limitations:** Pixel-perfect PDF output depends on the user’s print environment. Tests should guarantee content and structure, with manual checks for rendering.

## 5. Make dictionaries and classification deterministic and consistent

- **Objective:** Establish the JSON dictionaries as the reviewed source of truth, or document a single alternative source, and make all classifiers consume the same normalized categories and labels.
- **Why it matters:** The repository has `data/consent-platforms.json`, `cookies.json`, `gtm-containers.json`, `technologies.json`, and `vendors.json`, while overlapping values remain embedded in `src/core/constants.js` and classification/report code. Divergence could change evidence labels, categories, counts, and scoring.
- **Acceptance criteria:** Duplicate dictionary definitions are removed or mechanically verified as identical. Each entry has a documented schema, evidence basis, category vocabulary, and fallback behavior. Unknown vendors, cookies, containers, and malformed URLs are handled without unsupported attribution. Classification results are stable across capture, analysis, popup, and reports. Dictionary edits receive fixture-backed review.
- **Likely files or components affected:** `data/*.json`, `src/core/constants.js`, `src/core/classify.js`, `content.js`, `popup.js`, `report.js`, classification fixtures.
- **Tests required:** Schema/validation tests; table-driven classification tests for every dictionary entry and representative unknowns; conflict/duplicate tests; URL normalization and malformed-input tests; regression tests for established classifications.
- **Dependencies:** Item 2’s category and evidence vocabulary.
- **Known risks or limitations:** Domain and cookie names are indicators, not proof of ownership, purpose, or code execution. The report must preserve that limitation.

## 6. Harden saved-state storage, migration, and export reliability

- **Objective:** Make saved scans and all exports reliable under browser API errors, schema changes, special characters, missing fields, storage limits, repeated actions, and stale records.
- **Why it matters:** The extension relies on `chrome.storage.local` and `chrome.downloads`, but wrappers generally assume successful callbacks. Printable reports pass through a shared storage key, and the repository already identifies storage migrations as planned test coverage. Failed or mismatched persistence can compromise both evidence and user trust.
- **Acceptance criteria:** Saved payloads carry a schema and producer version; compatible older v0.1.7 snapshots load or fail with a clear, non-destructive message; writes and downloads surface `chrome.runtime.lastError`; hostname-based keys and filenames are safe and collision-aware; the printable report opens the intended immutable payload; Markdown, text, standalone HTML, and print output preserve the same evidence; deletion targets only the selected site’s record; quota and malformed-data failures do not erase valid evidence.
- **Likely files or components affected:** `popup.js`, `report.js`, `print_report.js`, `background.js`, storage helpers/schema, `manifest.json`, scan/report fixtures.
- **Tests required:** Storage round-trip and migration tests; mocked quota/API/download failures; malformed and partial payload tests; simultaneous/repeated export tests; filename sanitization tests; manual Markdown, HTML, text, and PDF verification.
- **Dependencies:** Item 3’s evidence shape and item 4’s unified report model.
- **Known risks or limitations:** Browser print-to-PDF completion cannot be programmatically guaranteed. Storage capacity and download behavior vary by browser policy and user settings.

## 7. Resolve material accessibility and secure-rendering issues

- **Objective:** Ensure users can operate and understand the extension with keyboard and assistive technology, and ensure captured website-controlled strings cannot alter extension report markup.
- **Why it matters:** The popup and print view are core user interfaces. They rely heavily on dynamically assembled `innerHTML`, including values derived from observed pages and URLs, and several status/visual treatments depend on color and compact text. These issues can materially affect access and can create an extension-page injection boundary.
- **Acceptance criteria:** All controls are keyboard reachable with visible focus; tabs expose correct roles, names, selection, and focus behavior; scan progress and errors are announced; form controls and report sections have useful accessible names and structure; meaning is not conveyed by color alone; text remains usable at browser zoom; captured values are rendered as text or passed through a reviewed escaping/sanitization boundary; standalone HTML export treats evidence as untrusted text; external navigation and generated URLs are validated.
- **Likely files or components affected:** `popup.html`, `popup.js`, `print_report.html`, `print_report.js`, `report.js`, CSS embedded in HTML/JS, rendering helpers.
- **Tests required:** Keyboard-only manual test; screen-reader smoke test; automated DOM/accessibility assertions where practical; malicious-string fixtures for hostname, URL, cookie, vendor, and DOM evidence; Content Security Policy and extension-console review.
- **Dependencies:** Items 3 and 4 so evidence fields and rendering paths are known.
- **Known risks or limitations:** Automated accessibility checks do not establish full usability. PDF accessibility depends partly on the browser’s print implementation.

## 8. Validate versions, packaging, permissions, and the 1.0 release artifact

- **Objective:** Produce a reproducible, internally consistent Version 1.0 package and validate it in a clean supported Chrome environment.
- **Why it matters:** `package.json` and `manifest.json` currently report `0.1.7`, while the branch and contract describe v0.2.0 work. The manifest grants broad host access plus cookies, webRequest, storage, downloads, activeTab, and scripting permissions. A public 1.0 needs deliberate versioning, justified permissions, complete local references, and a tested artifact.
- **Acceptance criteria:** Version numbers and release documentation agree on `1.0.0`; the manifest contains only permissions required by documented behavior; all manifest resources exist; no development-only or sensitive fixtures enter the release artifact; the extension loads without manifest/service-worker errors; quick read, reload scan, all saved states, reports, deletion, and exports pass in a clean profile; upgrade from the supported prior schema is verified; the full automated suite passes on the documented Node version; release notes state supported browser and known limitations.
- **Likely files or components affected:** `manifest.json`, `package.json`, `README.md`, `BUILD_NOTES.md` or release notes, packaging/release documentation, manifest and contract tests.
- **Tests required:** Full `npm test`; clean-profile installation and upgrade smoke tests; manifest/package version parity test; packaged-file allowlist check; permission-by-permission manual validation; report/export release matrix.
- **Dependencies:** All other Must Have items.
- **Known risks or limitations:** Chrome Web Store policy review and third-party site behavior are external to repository validation. Cross-browser support is not part of 1.0.

# Should Have

These items strengthen Version 1.0 but should not automatically block release unless their implementation or investigation reveals a serious accuracy, evidence-loss, accessibility, security, or stability problem.

## 9. Model the full request lifecycle

- **Objective:** Distinguish observed request start from completion, response, redirect, cancellation, blocking, and failure where the available Chrome APIs provide that evidence.
- **Why it matters:** `BUILD_NOTES.md` explicitly lists deeper request-status separation as not yet built. Better lifecycle evidence reduces the temptation to infer execution or blocking from a request start alone.
- **Acceptance criteria:** Lifecycle states are defined in evidence terms; correlated events do not double-count requests; reports expose only supported outcomes and retain “unknown” when correlation is incomplete; existing captured-request-sequence behavior remains compatible.
- **Likely files or components affected:** `background.js`, `src/core/capture.js`, analysis/provenance model, `report.js`, request fixtures.
- **Tests required:** Redirect, completed, aborted, error, duplicate, and unmatched-event unit fixtures; background listener tests; manual Chrome network comparison.
- **Dependencies:** Items 2 and 3.
- **Known risks or limitations:** Chrome events do not prove JavaScript execution or the reason a request was blocked/cancelled in every case. Service-worker suspension can leave incomplete lifecycles.

## 10. Improve cookie and browser-storage coverage

- **Objective:** Expand and normalize the already-supported cookie and browser-storage observations without turning the product into a cookie counter.
- **Why it matters:** `VISION.md` includes cookies and browser storage as evidence, while the current implementation and small cookie dictionary provide limited classification depth. Better coverage can improve traceability and explanations when kept subordinate to observed behavior.
- **Acceptance criteria:** First-party/third-party context, relevant cookie attributes, observed storage type, classification source, and unknown classification are represented consistently; values are bounded and handled safely; absence is not treated as proof of blocking; reports explain why an observation matters in the selected state.
- **Likely files or components affected:** `content.js`, `popup.js`, `data/cookies.json`, classification/analysis modules, report generators, fixtures.
- **Tests required:** Cookie attribute and domain tests; session/local storage fixtures; unknown and malformed entries; large/sensitive-value handling; report consistency tests.
- **Dependencies:** Items 3, 4, and 5.
- **Known risks or limitations:** Extension APIs and page isolation limit access to some storage, partitioned data, HttpOnly values, and cross-origin contexts. Stored values may be sensitive and should not be collected beyond reporting need.

## 11. Create a unified page-observation boundary

- **Objective:** Normalize CMP, banner, control, script, consent-signal, cookie, storage, and request observations before analysis.
- **Why it matters:** Observation logic currently spans `background.js`, `content.js`, `popup.js`, and core modules. A narrow browser integration boundary would make major features independently testable as required by the compatibility contract.
- **Acceptance criteria:** Browser-specific collection is separated from pure normalization and analysis; each observation records source and capture time; repeated popup reads and reload scans have defined merge/reset behavior; current observable behavior is preserved unless an intentional change is approved.
- **Likely files or components affected:** `background.js`, `content.js`, `popup.js`, `src/core/capture.js`, `src/core/analysis.js`, fixtures and browser-script test helpers.
- **Tests required:** Pure normalization tests; integration tests with mocked Chrome APIs; reload/reset and stale-event tests; regression fixtures for current v0.1.7 behavior.
- **Dependencies:** Item 3; benefits from item 9.
- **Known risks or limitations:** Refactoring active capture code can cause silent evidence loss. It should proceed in small compatibility-locked changes.

## 12. Broaden accessibility quality beyond release blockers

- **Objective:** Improve readability, responsive layout, reduced-motion behavior, table navigation, printable semantics, and accessible export guidance after material blockers are resolved.
- **Why it matters:** Accessibility is a product standard in `VISION.md`, and reports contain dense evidence tables and status language that should remain understandable to a broad audience.
- **Acceptance criteria:** Dense panels and tables remain understandable at high zoom and narrow widths; motion respects user preferences; headings and tables are semantically structured; instructions do not depend on visual position; manual checks document remaining limitations.
- **Likely files or components affected:** `popup.html`, `print_report.html`, popup/report CSS and rendering helpers.
- **Tests required:** Zoom and reflow matrix; high-contrast/reduced-motion checks; screen-reader report navigation; print preview review.
- **Dependencies:** Item 7 and stable report structure from item 4.
- **Known risks or limitations:** Extension popup size and browser print behavior constrain layout.

## 13. Expand deterministic and browser-level test infrastructure

- **Objective:** Fill the test areas already identified by `tests/README.md` and add a repeatable manual/browser smoke-test matrix.
- **Why it matters:** Current Node tests establish a valuable baseline for manifest, fixtures, classification, consent signals, capture, scoring, background behavior, and reports, but storage migrations, comparisons, provenance, exports, and browser integration need broader coverage.
- **Acceptance criteria:** Pure logic remains testable without live dealer sites; sanitized fixtures cover every supported scan state and major evidence class; storage, comparison, provenance, and report/export tests exist; a documented clean-profile Chrome smoke suite is repeatable before release.
- **Likely files or components affected:** `tests/`, `tests/README.md`, fixtures, browser-script helpers, core modules made testable by items 3–6 and 11.
- **Tests required:** This item is the test work: unit, contract, fixture, integration, migration, parity, and manual browser suites with documented expected outcomes.
- **Dependencies:** Stable schemas and module boundaries from Must Have items.
- **Known risks or limitations:** Live-site end-to-end tests are nondeterministic and may capture sensitive data. Sanitized fixtures and controlled pages should remain the deterministic baseline.

# Future Versions

## 14. Fully automated Fresh, Deny, and Accept workflows

- **Objective:** Automate creation and comparison of the three evidence states identified in `VISION.md`.
- **Why it matters:** `BUILD_NOTES.md` explicitly identifies the one-click Fresh/Deny/Accept workflow as not yet built. Automation could reduce user labeling errors and make comparisons easier.
- **Acceptance criteria:** A future approved specification defines state isolation, reset behavior, user visibility, failure recovery, evidence provenance, and comparison rules; the workflow never labels a state successful unless the corresponding action and resulting evidence are verified; manual-assisted fallback remains available.
- **Likely files or components affected:** Popup workflow, background orchestration, content scripts, storage schema, comparison/report generation, tests and fixtures.
- **Tests required:** Controlled CMP fixtures; state-isolation and retry tests; false-positive/false-action cases; evidence comparison tests; extensive manual validation.
- **Dependencies:** Stable 1.0 evidence, storage, observation, and report contracts; automatic CMP interaction in item 15.
- **Known risks or limitations:** CMPs vary widely, consent can be stored outside visible cookies, and automation can create false confidence if an interaction appears to succeed but does not change the underlying state.

## 15. Automatic CMP discovery and interaction

- **Objective:** Detect and operate supported Accept, Deny/Reject All, and settings controls while recording exactly what was observed and clicked.
- **Why it matters:** Automatic banner clicking and manual-assisted fallback are explicitly listed as not yet built, and are prerequisites for trustworthy automated state workflows.
- **Acceptance criteria:** Supported CMP adapters are evidence-backed and versioned; ambiguous controls require user assistance; interaction records selector/context, visible label, frame, timestamp, and outcome; destructive or unrelated page controls are never guessed; unsupported CMPs fail safely.
- **Likely files or components affected:** `content.js`, future CMP adapter/dictionary modules, background/popup orchestration, fixtures and controlled test pages.
- **Tests required:** Adapter-specific DOM fixtures; iframe/shadow DOM/localization cases; ambiguous and missing controls; consent-state verification; manual tests against supported CMP versions.
- **Dependencies:** Item 14’s workflow contract and 1.0 evidence provenance.
- **Known risks or limitations:** DOMs, localization, A/B tests, iframes, shadow roots, and anti-automation behavior make universal interaction unrealistic. Clicking a button is not proof that every downstream technology honored the choice.

## 16. Advanced browser automation and repeatable capture environments

- **Objective:** Add controlled profiles, navigation, cache/storage reset, multi-page journeys, timing controls, screenshots, and repeatable automation beyond the current reload scan.
- **Why it matters:** These capabilities could improve reproducibility for complex sites, but they materially expand beyond the first stable public extension.
- **Acceptance criteria:** A separately approved design defines isolation, capture boundaries, sensitive-data handling, failure states, and reproducibility; automated conclusions remain linked to captured evidence; users can inspect what automation did.
- **Likely files or components affected:** Background orchestration, capture modules, storage, UI, reporting, test harnesses, possibly a separate controlled runner.
- **Tests required:** Controlled-site end-to-end scenarios; profile/reset validation; navigation and timing races; screenshot/evidence linkage; failure recovery.
- **Dependencies:** Items 14 and 15 plus stable request lifecycle and observation boundaries.
- **Known risks or limitations:** Automation increases permission, privacy, maintenance, and nondeterminism risks. Page behavior can change based on geography, account, browser state, timing, and bot detection.

## 17. Cross-browser support

- **Objective:** Evaluate and, where evidence collection remains equivalent, support additional browsers after Chrome 1.0 is stable.
- **Why it matters:** Broader access is valuable, but browser extension APIs and request visibility differ and could undermine evidence consistency.
- **Acceptance criteria:** Each browser has a documented capability matrix; unsupported evidence is clearly labeled; reports do not imply parity where APIs differ; packaging, permissions, storage, downloads, and capture pass browser-specific validation.
- **Likely files or components affected:** `manifest.json` variants, browser API boundary, background/content integration, packaging, documentation, tests.
- **Tests required:** Full browser-specific unit/integration/manual matrix; cross-browser report parity for equivalent evidence; explicit degraded-capability tests.
- **Dependencies:** Unified page-observation boundary and stable 1.0 schemas.
- **Known risks or limitations:** Some Chrome `webRequest`, service-worker, cookie, scripting, download, or print behavior may not map directly. Cross-browser reports may require transparent capability differences.

# Recommended Execution Order

1. Approve the evidence terminology and claims standard (item 2).
2. Write the documentation skeleton and user workflow, keeping final screenshots and release details pending (item 1).
3. Define normalized evidence provenance and versioned saved payloads (items 3 and 6).
4. Consolidate dictionaries and classification vocabulary (item 5).
5. Unify analysis and all report surfaces on those contracts (item 4).
6. Complete material secure-rendering and accessibility work (item 7).
7. Finish documentation against the actual release behavior (item 1).
8. Expand deterministic tests as each contract stabilizes (item 13), and treat any discovered accuracy or evidence-loss defect as Must Have.
9. Perform version, permission, packaging, upgrade, clean-profile, and release validation (item 8).
10. Take items 9–12 only when they do not put the Must Have release criteria at risk; schedule items 14–17 after 1.0.

# Version 1.0 Definition of Done

Version 1.0 is done only when:

- A first-time user can install, run, save, understand, and export a scan using accurate documentation.
- Every user-visible conclusion is traceable to captured evidence or explicitly identifies unavailable evidence.
- Direct observations, derived classifications, heuristic ratings, user-selected states, and recommendations are clearly distinguished.
- No report claims execution, blocking, absence, consent state, ownership, purpose, compliance, or legal status beyond what the browser evidence supports.
- Fresh, Denied, Accepted, No banner, and Current browser state retain consistent meanings throughout storage, analysis, UI, and exports.
- Dictionaries and classification logic have one tested source of truth and safe unknown behavior.
- Popup, Markdown, printable, text, HTML, and multi-state outputs agree on findings, ratings, evidence, limitations, and disclaimers.
- Saved scans are versioned, migration behavior is tested, API failures are visible, and exports preserve the intended evidence.
- Material keyboard, assistive-technology, readability, and untrusted-rendering issues are resolved.
- Versions are consistently `1.0.0`, required permissions are justified, the release contents are reviewed, all automated tests pass, and the clean-profile Chrome release checklist passes.
- Known limitations are documented without implying legal assurance or unsupported browser coverage.
- Changes have been reviewed on feature branches and `main` remains stable.

# Explicitly Not Required for Version 1.0

- Fully automated one-click Fresh, Deny, and Accept capture.
- Automatic CMP/banner button interaction.
- Universal CMP support or guaranteed consent-control verification.
- Advanced browser automation, controlled multi-page journeys, or automated screenshots.
- Cross-browser support beyond the documented Chrome target.
- Proof that downloaded code executed.
- Proof that an unobserved request was blocked, absent from the site, or would remain absent in another session.
- Legal advice, legal conclusions, compliance certification, vulnerability scanning, or guaranteed vendor remediation.
- Exhaustive identification of every cookie, vendor, technology, script purpose, or GTM-contained tag.
- Pixel-identical PDF output across operating systems and printer drivers.

# Release Checklist

## Product truth and evidence

- [ ] Every report statement is reviewed against `VISION.md`.
- [ ] Required and prohibited terminology tests pass.
- [ ] Every conclusion exposes supporting evidence or an explicit unavailable-evidence statement.
- [ ] Request sequence is never described as execution order.
- [ ] “Not observed” is never presented as proof of blocking or absence.
- [ ] User-selected scan states are not presented as independently verified unless evidence supports verification.
- [ ] Ratings are described as observed-behavior summaries, not legal determinations.
- [ ] The non-legal, non-certification disclaimer appears consistently in applicable outputs.

## Documentation and usability

- [ ] Root README installation and first-scan instructions pass a clean-profile walkthrough.
- [ ] All scan states, permissions, storage behavior, exports, limitations, and troubleshooting are documented.
- [ ] Keyboard-only and screen-reader smoke tests pass.
- [ ] Status and severity remain understandable without color.
- [ ] Popup and reports remain usable at supported zoom and window sizes.

## Data, storage, and exports

- [ ] Dictionary schemas and entries pass validation and classification tests.
- [ ] Saved payload schema/version and prior-version migration pass.
- [ ] Storage quota, malformed payload, and browser API errors are visible and non-destructive.
- [ ] Markdown, text, standalone HTML, print/PDF, and multi-state reports agree.
- [ ] Captured values cannot inject extension or standalone-report markup.
- [ ] Delete and overwrite actions target only the intended saved record.

## Version, package, and validation

- [ ] `manifest.json`, `package.json`, documentation, and release notes agree on `1.0.0`.
- [ ] Every permission is required and documented.
- [ ] Every manifest reference exists and loads.
- [ ] Release contents contain no unintended development artifacts or sensitive data.
- [ ] The full automated suite passes on the documented Node version.
- [ ] The unpacked/package artifact loads in a clean supported Chrome profile without errors.
- [ ] Quick read, reload scan, all five state labels, save/load/delete, and every export pass smoke testing.
- [ ] Upgrade from the supported prior saved-data schema passes without silent evidence loss.
- [ ] Known limitations and supported-browser scope are published.
- [ ] Work was reviewed from a feature branch; `main` remained stable.

