# Report Redesign Proposal for v0.2.0

## Purpose and Scope

This proposal redesigns the single-state and consolidated report layouts using only results the extension already produces. It does not change detection, collection, classification, consent analysis, network observation, scoring, or the meaning of a saved scan.

The redesign has two goals:

1. Make the first pages useful to a dealer, manager, or vendor without requiring them to read raw evidence.
2. Keep every displayed observation traceable to evidence already captured by the extension.

The report remains an evidence-based browser observation, not legal advice or a compliance certification.

## Design Principles

### Evidence Over Inference

Lead with what the browser observed. Interpretive text must be visibly secondary and must not be presented as a direct observation.

### No Unsupported Conclusions

Do not convert:

- an observed request into proof that downloaded code executed;
- a captured request sequence into a complete execution order;
- a user-selected scan mode into independently verified consent;
- an unobserved request into proof that it was blocked or absent;
- page or DOM evidence into verified script timing;
- a domain, cookie name, or URL indicator into proof of ownership or purpose.

### Traceability

Every finding, technology, consent signal, cookie summary, domain summary, and recommendation must link to or name a supporting evidence reference in the Evidence Appendix.

### Progressive Disclosure

Show the assessment, scan context, and key findings first. Show grouped inventories next. Put raw URLs, request-sequence details, and verbose evidence in the appendix.

### Professional Printable Layout

Use restrained color, strong typographic hierarchy, short tables, repeated table headers, page-break controls, and text labels that remain meaningful in grayscale.

### Shared HTML and Print Structure

The popup preview, Markdown export, printable view, standalone HTML, and plain-text output should follow the same section order and terminology. Print may change styling and pagination, but not content or meaning.

## Evidence Reference Model

The v0.2.0 layout should assign report-local references while rendering. These references are presentation aids and do not change saved evidence or collection behavior.

| Prefix | Existing evidence source | Example |
|---|---|---|
| `REQ` | Captured network request or observed sequence item | `REQ-012` |
| `COOKIE` | Observed cookie entry | `COOKIE-003` |
| `CONSENT` | Consent signal observation or interpreted parameter | `CONSENT-002` |
| `DOM` | Existing page/DOM CMP or visitor-control evidence | `DOM-001` |
| `GTM` | Existing detected GTM container | `GTM-002` |
| `META` | Scan metadata or user-selected scan state | `META-001` |

Reference assignment should be deterministic within a rendered report. Repeated use of the same underlying item should reuse the same reference. If an older saved scan contains only a summary and not the original supporting item, the report must say `Supporting detail unavailable in this saved scan` instead of inventing a reference.

### Confidence Display

The report currently has no general-purpose numeric confidence score for technologies. The redesign must not invent one or alter scoring. Each technology should therefore use a presentation-only evidence confidence label based on the existing source:

| Label | Display rule |
|---|---|
| **Directly observed** | A matching captured request, cookie, consent signal, or existing explicit browser observation is available. |
| **Detected from page evidence** | The technology is identified from existing page, DOM, or script evidence, but network timing is not verified. |
| **Classified indicator** | The existing classifier identifies the technology from an observed URL, domain, cookie name, or container indicator. |
| **Supporting detail unavailable** | A legacy or partial saved result names the technology but does not retain the supporting evidence needed for a stronger label. |

These labels describe evidence quality, not vendor identity certainty, legal significance, or execution.

## Proposed Report Structure

### 1. Executive Summary

The first page should answer: what was scanned, what was observed, and what deserves review?

#### Overall Assessment

Show the existing observed-risk rating and its existing meaning in a compact assessment card.

- Label it **Observed risk rating**.
- State that it is a derived summary of captured behavior, not a legal determination.
- Do not expose the raw score unless the product already intends users to interpret it.
- In consolidated reports, show one row per saved state rather than manufacturing a new combined grade.

#### Scan Metadata

Use a two-column block:

| Field | Value |
|---|---|
| Site tested | Existing hostname |
| Report generated | Report generation date and time |
| Scan saved | Existing `savedAt`, when available |
| Selected scan state | Existing audit mode label |
| State verification | `User-selected; not independently verified` unless existing evidence explicitly supports a narrower statement |
| States included | Single state or list of consolidated states |
| Evidence boundary | Capture-window and observable-browser-evidence note |

#### Observed Technologies

Show category counts and up to six named technologies with the strongest available supporting evidence. Link the block to the full Technology Inventory.

Example:

| Category | Observed |
|---|---:|
| Analytics | 2 |
| Advertising | 1 |
| Consent Platforms | 1 |
| Dealer Platforms | 2 |
| Other | 3 |

An empty category means `No matching indicator observed in this scan`, not that the technology is absent from the site.

#### Consent State

Show:

- selected scan-state label;
- CMP/provider observation;
- banner, Accept, Deny, and technical-control observations already present in `consentLayer`;
- Google Consent Mode outcome;
- a short state caveat when Accept or Deny was selected but no visitor control was observed.

#### Key Findings

Show no more than five concise findings. Each finding contains:

1. a neutral title;
2. one evidence-based sentence;
3. one or more evidence references;
4. an existing review level or rating label, when available.

Do not place recommendations inside this block.

### 2. Technology Inventory

Group existing detected technologies into these fixed report categories and preserve empty-state language:

1. Analytics
2. Advertising
3. Consent Platforms
4. Dealer Platforms
5. Chat
6. Video
7. Widgets
8. Other

Each technology row should show:

| Technology | Observed evidence | Confidence | Supporting evidence |
|---|---|---|---|
| Existing detected name | Short description of the captured indicator | Evidence confidence label | One or more appendix references |

#### Category Mapping

Use existing classifier categories where they map cleanly. The report layer may normalize labels for display, but must not reclassify the underlying result or affect counts used by scoring.

- Existing analytics and measurement indicators → **Analytics**
- Existing advertising, retargeting, and ad-tech indicators → **Advertising**
- Existing CMP and consent-layer indicators → **Consent Platforms**
- Existing dealer, OEM, inventory, retailing, and website-platform indicators → **Dealer Platforms**
- Existing chat indicators → **Chat**
- Existing video indicators → **Video**
- Existing widget or functional-tool indicators → **Widgets**
- Unmapped existing detections → **Other**

If the existing result does not retain enough category information to place a technology reliably, put it in **Other**. Do not guess based only on a vendor name during report rendering.

GTM containers may appear as a compact subsection under **Other** or **Analytics**, depending on the existing classifier category, but must be described as tag-manager indicators rather than proof of the tags contained inside them.

### 3. Consent Signals

Present existing Google Consent Mode observations in a clean table. Do not infer a full consent state from a parameter unless the existing consent analysis already does so.

| Signal | Observed value | Existing interpretation | Selected state | Evidence |
|---|---|---|---|---|
| `gcs` | Existing captured value | Existing interpretation | Existing audit mode | `CONSENT-001`, `REQ-014` |
| `gcd` | Existing captured value | Existing interpretation | Existing audit mode | `CONSENT-002`, `REQ-014` |
| `npa` | Existing captured value | Existing interpretation | Existing audit mode | `CONSENT-003`, `REQ-021` |
| `pscdl` | Existing captured value | Existing interpretation | Existing audit mode | `CONSENT-004`, `REQ-021` |
| `ads_data_redaction` | Existing captured value | Existing interpretation | Existing audit mode | `CONSENT-005`, `REQ-021` |

Above the table, display the existing outcome:

- Signals observed;
- eligible requests observed, no recognized signals;
- no eligible measurement or advertising request captured; or
- unavailable in a legacy saved scan.

Below it, retain the limitation that Google loaders, fonts, static resources, and Tag Manager loaders are not measurement-request evidence.

For consolidated reports, either add a **State** column or render one table per state. Prefer one table with a State column when it fits the printed page.

### 4. Cookies

Use these report groups in this order:

1. Essential
2. Analytics
3. Advertising
4. Unknown

The current internal `Targeting` category should be labeled **Advertising** in the presentation only. This does not change stored classification or scoring.

Each group begins with a count, followed by a compact table:

| Cookie | Existing category | Observed evidence | Evidence |
|---|---|---|---|
| Existing cookie name | Existing category (`Targeting` may display as `Advertising`) | Present during scan; write time not established | `COOKIE-001` |

Do not repeat generic cookie-purpose prose in every row. Where the existing tool has a reviewed cookie description, place it in an optional **Known description** column or appendix note. Unknown cookies should remain unknown.

Empty-state copy: `No cookies in this category were readable through the page context during this scan.` This preserves the current limitation around `document.cookie` and `HttpOnly` cookies.

For consolidated reports, group first by state and then by cookie category, or add a State column when the resulting table remains readable.

### 5. Network Activity

Lead with category summaries rather than the full captured sequence.

| Category | Observed requests | Unique domains | First observed reference | Notes |
|---|---:|---:|---|---|
| Consent layer | Existing grouped count | Existing grouped count | `REQ-003` | Captured sequence only |
| Tag managers | Existing grouped count | Existing grouped count | `REQ-007` | Does not identify contained tags |
| Analytics / measurement | Existing grouped count | Existing grouped count | `REQ-011` | Request observed; execution not established |
| Advertising / retargeting | Existing grouped count | Existing grouped count | `REQ-018` | Request observed; execution not established |
| Functional | Existing grouped count | Existing grouped count | `REQ-002` | — |
| Other | Existing grouped count | Existing grouped count | `REQ-001` | Existing classifier did not assign another category |

Only counts that can be calculated from the existing retained request or observed-sequence data should be shown. Because `observedSequence` is currently capped, reports generated from saved snapshots may need to label these as `retained evidence counts` rather than total request counts. The existing `totalReqs` remains the overall captured request count.

After the summary, include a short **Notable Sequence Observations** table for evidence already used by current load-order analysis:

| Observation | First observed | Evidence |
|---|---|---|
| CMP control request | Existing sequence point or `Not observed` | `REQ-003` |
| GTM request | Existing sequence point or `Not observed` | `REQ-007` |
| Analytics request | Existing sequence point or `Not observed` | `REQ-011` |
| Advertising request | Existing sequence point or `Not observed` | `REQ-018` |

Move the detailed request sequence to the Evidence Appendix. Rename it **Captured Request Sequence**; do not use “absolute firing order.”

### 6. Third-Party Domains

Group identical domains into one row. The current saved `thirdParty` list is already unique, but a request count requires retained request-level evidence.

| Domain | Existing category or associated technology | Observed requests | First evidence | Additional evidence |
|---|---|---:|---|---|
| Existing hostname | Existing classification, otherwise `Other` | Count when supported | `REQ-004` | `REQ-009`, `REQ-016` |

Rules:

- Normalize only exact hostname duplicates for v0.2.0.
- Do not collapse subdomains to a registrable domain without a separately reviewed normalization rule.
- Do not state vendor ownership unless the existing classifier identifies it.
- When saved data has only the unique domain list, show `Count unavailable in saved scan`.
- Sort by category, then request count when available, then hostname.

### 7. Key Findings

This is the expanded version of the Executive Summary block. Findings must be concise, evidence-based observations only.

Recommended row/card format:

| Observation | Selected state | Evidence | Why it is shown |
|---|---|---|---|
| Neutral statement of what was observed | Existing audit mode | References | Existing rating input or finding category |

Writing pattern:

> `[Technology or signal] was observed [in the selected state or sequence position]. Evidence: [references].`

Allowed examples:

- `Two Meta request indicators were observed in the Fresh visitor scan. Evidence: REQ-018, REQ-019.`
- `ComplyAuto page evidence was observed; blocker.js was not present in the retained captured sequence. Evidence: DOM-001.`
- `The Denied scan contained npa=0 in an eligible Google request. Evidence: CONSENT-003, REQ-021.`

Avoid:

- “fired,” when only a request was captured;
- “blocked,” when activity was not observed;
- “proves,” unless the evidence directly establishes the narrow stated fact;
- “compliant,” “non-compliant,” “violation,” or other legal language;
- generic best-practice statements without a report evidence reference.

If no high-priority finding was generated, state: `No high-priority observation was generated from the retained scan evidence.` Follow with the normal evidence limitations; do not convert this into a positive certification.

### 8. Recommendations

Recommendations should be a two-part table that separates fact from action:

| Observed Evidence | Potential Follow-up |
|---|---|
| Concise evidence statement with references | Neutral question or verification step directly related to that evidence |

Examples:

| Observed Evidence | Potential Follow-up |
|---|---|
| `Meta request indicators were observed in the user-selected Fresh visitor state. REQ-018, REQ-019.` | `Ask the website or advertising vendor to identify the source of these requests and confirm the intended behavior for this state.` |
| `The report retained two GTM container IDs. GTM-001, GTM-002.` | `Ask the website provider to identify the owner of each container and document which consent controls apply to it.` |
| `Eligible Google requests were captured without recognized Consent Mode parameters. REQ-011.` | `Review the configuration with the analytics or consent-platform vendor and, if needed, capture supporting Tag Assistant evidence outside this report.` |

Potential Follow-up must:

- be framed as review, confirmation, comparison, documentation, or retesting;
- remain proportional to the observed evidence;
- avoid legal conclusions and prescriptive legal language;
- avoid requesting “proof” of facts the extension cannot itself evaluate;
- never imply that a missing observation establishes blocking.

### 9. Evidence Appendix

The appendix preserves supporting evidence already collected by the extension. It should be detailed enough to verify report statements without forcing raw evidence into the main narrative.

#### A. Evidence Reference Index

| Reference | Type | Source | Used by |
|---|---|---|---|
| `REQ-018` | Network request | Captured request sequence | Technology Inventory; Key Finding 1; Recommendation 1 |

#### B. Captured Request Sequence

Show the retained sequence in existing captured order:

| Reference | Sequence | Name | Category | Domain | Observed status | Evidence |
|---|---:|---|---|---|---|---|

Long URLs should wrap in HTML, remain selectable, and print without overflowing. The report must repeat that sequence position is not proven JavaScript execution order.

#### C. Consent and CMP Evidence

Include existing:

- provider and page/DOM observations;
- banner and visitor-control observations;
- consent signal observations;
- ComplyAuto `blocker.js` and `banner.js` sequence points;
- existing load-order summary inputs.

Keep page evidence and request evidence visibly distinct.

#### D. Cookie Evidence

List all retained cookie observations with report-local references and current classification. State that presence was observed during the scan and write order was not established.

#### E. GTM Containers

List existing container IDs. State that the extension does not establish container ownership or enumerate every contained tag.

#### F. Third-Party Domain Evidence

List each exact hostname and its supporting retained request references where available.

#### G. Evidence Limitations

Use a short standard block:

- Results cover one capture window and the selected browser state.
- A captured request does not prove downloaded code executed.
- The captured request sequence is not a complete execution order.
- An unobserved item is not proven blocked or absent.
- Cookie evidence is limited to cookies readable through the current page context.
- The selected scan state is user-provided unless explicitly supported by retained evidence.
- Page/DOM CMP evidence does not establish control-script timing.

## Single-State and Consolidated Reports

Both formats should use the same section order.

### Single-State

- One assessment card.
- One selected-state context throughout.
- Findings and recommendations reference evidence from that scan.
- Do not include repeated explanations of the selected state in multiple sections.

### Consolidated

- Do not calculate a new overall grade.
- Show a state comparison table in the Executive Summary.
- Add a State column to inventories when readable.
- Keep references unique across states, for example `FRESH-REQ-001`, `DENIED-REQ-001`, and `ACCEPTED-REQ-001`.
- Compare only observed results; use `Not observed in retained evidence` rather than “blocked.”
- Clearly mark scans whose Accept or Deny state was not confirmed by an observed visitor control.

Suggested comparison:

| State | Observed rating | CMP | Eligible Google requests | Consent signals | Advertising indicators | Analytics cookies | Advertising cookies |
|---|---|---|---:|---|---:|---:|---:|

## Visual and Print Specification

### Page Hierarchy

- Letter-size primary target with responsive screen width.
- Report title, hostname, state, and generation date in a compact header.
- Executive Summary begins on page one.
- Evidence Appendix begins on a new page.
- Footer includes product name, hostname, generation date, and page number where browser print support permits.

### Typography

- 10.5–12 pt body text in print.
- 20–24 pt report title.
- 14–16 pt section headings.
- Monospace only for IDs, cookie names, parameters, domains, and URLs.
- Minimum 1.4 line height for body copy.

### Color

- Neutral navy/gray base.
- Restrained green, amber, and red accents only for existing rating or review meaning.
- Always pair color with a text label.
- Maintain readable contrast and usable grayscale printing.

### Tables

- Repeat header rows across printed pages where supported.
- Avoid tables wider than the printable area.
- Prefer stacked cards on narrow screens.
- Keep rows together when practical, but allow long evidence tables to split across pages.
- Wrap URLs and evidence text instead of shrinking the whole report.

### Accessibility and Safe Rendering

- Use semantic headings in order.
- Use real tables with header cells and captions.
- Include accessible names for expandable evidence in HTML.
- Do not rely on color, icon, or page position alone.
- Treat all hostname, URL, cookie, domain, CMP, and evidence strings as untrusted text.
- Preserve keyboard access and visible focus in interactive HTML.
- The print report should remain understandable when interactive disclosure controls are expanded or unavailable.

## Proposed HTML Information Architecture

```text
Report
├── Header and report identity
├── Executive Summary
│   ├── Overall Assessment
│   ├── Scan Metadata
│   ├── Observed Technologies
│   ├── Consent State
│   └── Key Findings
├── Technology Inventory
├── Consent Signals
├── Cookies
├── Network Activity
├── Third-Party Domains
├── Key Findings
├── Recommendations
│   ├── Observed Evidence
│   └── Potential Follow-up
└── Evidence Appendix
    ├── Evidence Reference Index
    ├── Captured Request Sequence
    ├── Consent and CMP Evidence
    ├── Cookie Evidence
    ├── GTM Containers
    ├── Third-Party Domain Evidence
    └── Evidence Limitations
```

## Existing Result-to-Section Mapping

| Proposed section | Existing result fields or report inputs |
|---|---|
| Overall Assessment | `grade`, `score`, `gradeNotes`, existing rating wording |
| Scan Metadata | `hostname`, `auditMode`, `savedAt`, report creation time |
| Observed Technologies | `det`, `hasCMP`, `cmp`, `gtmContainers`, retained classified sequence items |
| Consent State | `auditMode`, `consentLayer`, `hasCMP`, `cmp`, `consentVerdict` |
| Consent Signals | `consentParams`, `consentSignalObservations`, `googleConsentOutcome`, `eligibleGoogleRequestCount`, existing consent interpretation fields |
| Cookies | `cookies`, `analyticsCookieCount` |
| Network Activity | `totalReqs`, `observedSequence`, `complyAutoLoadOrder` |
| Third-Party Domains | `thirdParty`, domains retained in `observedSequence` |
| Key Findings | `federalFlags`, `gradeNotes`, existing summary/finding functions, referenced supporting fields |
| Recommendations | Existing vendor questions and recommended evidence prompts, rewritten into evidence/follow-up pairs |
| Evidence Appendix | `observedSequence`, `consentSignalObservations`, `consentLayer`, `complyAutoLoadOrder`, `cookies`, `gtmContainers`, `thirdParty` |

## Content Deduplication Rules

The current report repeats CMP context, Google signal interpretation, load-order language, state meaning, vendor questions, and disclaimers. The redesign should use:

- one state explanation in Scan Metadata/Consent State;
- one concise finding per distinct observation;
- one recommendation row per distinct follow-up;
- one full evidence item in the appendix, referenced everywhere else;
- one standard limitations block;
- one standard product disclaimer in the footer or final note.

## Implementation Challenges

### 1. Existing saved snapshots do not retain every raw request

`totalReqs` records the full captured count, while `observedSequence` is capped and filtered. Accurate category and per-domain request counts may therefore be available for a live analysis but not reconstructable from a saved snapshot. The implementation must either:

- calculate only from evidence retained in the existing report input and label the result accordingly; or
- omit unsupported counts.

Changing saved evidence or collection is outside this redesign.

### 2. Technology evidence is not uniformly shaped

`det`, CMP fields, GTM containers, request classifications, cookies, and DOM evidence represent technologies differently. A presentation view model will need to normalize these existing result shapes without changing the underlying detection or classification.

### 3. There are no stable evidence IDs

Report-local references can be assigned during rendering, but older or partial saved scans may not retain the item needed to support a summary. Missing provenance must remain visible rather than being reconstructed from assumptions.

### 4. Confidence is not an existing numeric result

The report should use evidence-quality labels, not a synthetic percentage. This requires careful tests so presentation labels remain tied to source type and never become a new detection or scoring system.

### 5. Current Markdown is the canonical print input

The printable report converts Markdown with a small custom parser. Richer layouts, captions, reference links, responsive cards, repeated table headers, and print-only appendix behavior will strain that parser. The implementation may need a shared report view model with separate Markdown and semantic HTML renderers while preserving identical meaning.

### 6. Single-state and consolidated output currently duplicate logic

Moving both formats to one section model is necessary to prevent terminology and evidence-reference drift. Consolidated references also need state-qualified IDs.

### 7. Long evidence values affect print layout

URLs, consent payloads, container IDs, and cookie names can overflow tables. Safe wrapping, page breaks, and bounded previews with full appendix values require careful HTML and print CSS.

### 8. Existing copy includes overstatement and legal-adjacent phrasing

The redesign can change presentation wording, but must not silently change detection or consent-analysis meaning. Report language needs fixture-based review across all scan states and partial-data cases.

### 9. Popup space is constrained

The 480-pixel popup cannot reproduce the full printable report comfortably. It should show the Executive Summary and compact section previews, while exports contain the complete report. The content and references must remain consistent.

## Estimated Implementation Complexity

**Overall: Medium–High**

Estimated implementation size: **approximately 900–1,500 lines changed or added**, including rendering code, styles, shared presentation helpers, and report tests. This estimate does not include any capture, detection, classification, consent-analysis, scoring, storage-schema, or manifest work.

Likely work areas:

| Work area | Complexity | Notes |
|---|---|---|
| Shared presentation view model and evidence references | Medium–High | Main traceability and deduplication work |
| Single-state Markdown rendering | Medium | Reorganizes current content |
| Consolidated rendering | High | State-qualified references and comparison tables |
| Printable/standalone HTML | Medium–High | Semantic structure, print CSS, safe rendering |
| Popup summary alignment | Medium | Compact view of the same section model |
| Tests and fixtures | High | Parity, terminology, partial evidence, print structure, escaping |

Expected delivery: **3–5 focused development days plus manual browser/print review**, assuming no changes to the stored analysis shape are required. If accurate request-category and per-domain counts are required for older saved reports, the scope would exceed a presentation-only redesign and would need a separate evidence/storage proposal.

## Risks

- Presentation normalization could accidentally diverge from the existing classifier.
- A confidence label could be mistaken for certainty about execution, ownership, purpose, or compliance.
- Saved scans may lack enough retained detail for complete evidence references.
- Markdown, popup, printable HTML, standalone HTML, and plain text may drift without a shared presentation model and parity tests.
- Long or hostile captured strings can break layout or create unsafe rendering if escaping is inconsistent.
- Browser print engines may paginate tables differently.
- Condensing findings may remove necessary evidence context unless appendix references are mandatory.

## Acceptance Criteria for a Later Implementation

- No detection, collection, scoring, network-observation, or consent-analysis behavior changes.
- All report surfaces use the proposed section order and approved terminology.
- Every substantive finding and recommendation contains at least one evidence reference or an explicit unavailable-evidence statement.
- No request is described as executed solely because it was captured.
- No missing observation is described as blocked or absent.
- Technology confidence uses evidence-quality labels only.
- Cookie `Targeting` may display as `Advertising` without changing stored classification.
- Duplicate exact third-party hostnames render once.
- Main Network Activity content is grouped; detailed sequence appears in the appendix.
- Single-state and consolidated reports preserve scan-state meaning.
- HTML output is semantically structured, keyboard usable where interactive, safely escaped, and printable in grayscale.
- Markdown, text, HTML, popup, and print outputs are semantically consistent.
- Existing files remain unchanged until implementation is separately approved.

## Suggested Implementation Sequence

1. Define a pure presentation view model over the existing analysis/snapshot object.
2. Add deterministic report-local evidence-reference assignment.
3. Implement single-state section renderers.
4. Implement consolidated state-qualified references and comparison tables.
5. Align Markdown, plain text, popup preview, printable HTML, and standalone HTML.
6. Add safe-rendering, terminology, traceability, parity, and partial-data tests.
7. Perform keyboard, zoom, grayscale, print-preview, and PDF manual checks.

