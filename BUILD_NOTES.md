# Dealer Website Risk Auditor v0.1.7 Plain Observed Sequence

## What This Build Is

This build keeps the v0.1.6 readability work and replaces over-strong firing-order language with plainer observed-evidence language.

It preserves the previous scanner foundation and begins shifting the product from a consent/compliance tool into a dealer-friendly website risk observation tool.

## Main Changes

- Renames **Firing order** to **Observed Load**.
- Uses **Captured request sequence** instead of implying complete script execution order.
- Uses **ComplyAuto Control Evidence** instead of **ComplyAuto load order** in reports.
- Uses clearer visible status labels such as **site function**, **CMP present**, **no CMP seen**, and **load not verified**.
- Makes page-only ComplyAuto evidence say load timing is not verified unless `blocker.js` is actually captured.
- Improves the lower action/saved-state/detail panel spacing and hierarchy.
- Shortens export button labels.
- Makes saved-state chips easier to scan.
- Increases detail panel height.
- Changes firing-order rows to a clearer two-line layout: sequence number, tool/vendor name, domain/evidence, and status pill.
- Adds a popup summary card for **Behavioral consent read**.
- Adds a report section for **Behavioral Consent Signal Read**.
- If ComplyAuto timing is not proven but Fresh/Deny Google signals show `npa=1`, `pscdl=denied`, `ads_data_redaction=1`, `gcs=G100`, or `gcs=G101`, the tool says observed Google behavior supports a restricted/denied state.
- If Fresh/Deny signals show `npa=0` or `gcs=G111`, the tool flags that behavior for vendor review.
- Clicking **Scan page** now reloads the active tab with cache bypass and waits for page completion before collecting evidence.
- This gives the background request listener a better chance to capture early scripts such as ComplyAuto `blocker.js`.
- Opening the popup still does a quick current-page read; clicking **Scan page** performs the stronger reload capture.
- Detects visible **Powered by ComplyAuto** / **ComplyAuto** page text as ComplyAuto evidence.
- Adds ComplyAuto page/DOM evidence to the firing-order tab when no ComplyAuto network request was captured.
- Labels DOM-only ComplyAuto evidence as **load timing not verified** instead of pretending load timing was known.
- Replaced emoji and special dash/checkmark characters in the popup with plain ASCII text.
- Cleaned scan status labels such as copied, firing-order status, consent state, cookies, and summary cards.
- Kept the v0.1.1 behavior that correctly reports no website consent choice when no real Accept/Deny/settings controls are present.
- Tightened banner detection so footer/copyright/privacy-policy text does not count as a cookie banner.
- Requires a likely consent container or real consent controls before reporting a banner as observed.
- Adds `No website consent choice observed` when no Accept, Deny, settings, or real banner UI is found.
- Adds a high-priority observation when no website-level consent choice is observed.
- Improves ad-tech classification for Trade Desk, Turn/Amobee, LiveRamp-style identity, Toyota/Shift Digital, Demdex, and related measurement traffic.
- Renamed the extension to **Dealer Website Risk Auditor**.
- Updated the manifest description around observed website risk, not compliance certification.
- Changed the visible report title to **Dealer Website Risk Auditor Report**.
- Replaced report-facing letter grades with dealer-friendly observed risk ratings:
  - Strong
  - Good / Verify
  - Needs Review
  - High Risk
  - Critical
  - Unable to Verify
- Added the required no-legal-conclusions disclaimer style.
- Reframed “Federal review flags” as **High Priority Observations** / **Observed risk indicators**.
- Cleaned the popup summary so it speaks in observed facts and vendor-review language.
- Preserved existing scanner support for ComplyAuto, GTM, Google, Meta/Facebook, cookies, consent parameters, saved scan states, markdown export, and printable report export.

## Not Yet Built

- Fully automatic one-click Fresh / Deny / Accept workflow.
- Automatic banner button clicking and manual-assisted fallback.
- Full dictionary data file separated from report code.
- Deep request status separation between completed, blocked, aborted, and failed requests.

## Suggested Test

Load this folder as an unpacked Chrome extension, scan one dealership site, then export the dealer-ready markdown report and review whether the language feels dealer-first and evidence-based.

## v0.2.0 Phase 0 Foundation

Phase 0 adds a documentation and regression-test baseline for the planned v0.2.0 work. It does not change extension runtime behavior, analysis logic, scoring, reports, or visible terminology.

- Adds the v0.2.0 compatibility contract in `docs/V0.2.0_COMPATIBILITY_CONTRACT.md`.
- Records the architecture principle that conclusions must be traceable to evidence, major features must be independently testable, and v0.1.7 behavior must be preserved unless an intentional change is documented and approved.
- Adds sanitized request, page, scan, and report fixtures representing current v0.1.7 behavior.
- Adds a minimal test suite using Node's built-in test runner with no runtime dependencies.
- Adds baseline checks for the manifest, referenced files, compatibility terminology, fixture integrity, and current report output.

Run the Phase 0 regression baseline with:

```sh
npm test
```
