# Dealer Website Risk Auditor

Dealer Website Risk Auditor is a Chrome extension for observing privacy and tracking behavior on dealership websites from a visitor's browser. It captures browser-observed evidence about network requests, consent management platforms (CMPs), ComplyAuto, cookies, Google Consent Mode signals, Google Tag Manager (GTM), and advertising and analytics technologies, then presents the findings in dealer-friendly reports. It reports observable evidence only: it is not legal advice, a compliance certification, or proof that a website complies with any law or policy.

## Current Status

- **Packaged extension version:** `0.1.7` (from `manifest.json` and `package.json`)
- **Current development work:** v0.2.0 Phase 1
- **Status:** Under active development

The [roadmap](ROADMAP.md) describes planned work toward a stable Version 1.0. Product decisions and report language are governed by the [vision](VISION.md).

## Features

The current repository includes:

- Browser network-request observation, including a captured request sequence
- Google Consent Mode signal extraction from eligible observed Google requests
- CMP and ComplyAuto observation, including separate page/DOM and captured `blocker.js` evidence
- GTM container and website technology detection
- Classification of cookies readable through JavaScript
- User-selected scan labels for:
  - **Fresh visitor / before consent choice**
  - **Denied cookies / reject all**
  - **Accepted cookies / post-consent**
  - **No banner / cannot test Accept-Deny**
  - **Current browser state / unknown**
- Locally saved scan snapshots for each dealership hostname and selected state
- Consolidated reports when two or more compatible states have been saved
- Plain-text summaries, Markdown reports, standalone HTML reports, and printable reports for browser print/PDF output

The extension does **not** automatically click Accept, Deny, Reject All, or other consent controls. Those interactions and the state assigned to each scan remain the user's responsibility.

## Installation

No package installation or build step is required to load the extension.

1. Download the repository ZIP from GitHub, or clone the repository:

   ```sh
   git clone https://github.com/sellone2u-dot/consent-auditor.git
   ```

2. If you downloaded a ZIP, extract it.
3. Open `chrome://extensions` in Google Chrome.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted or cloned folder that contains `manifest.json`.

Chrome should show **Dealer Website Risk Auditor** in the extensions list. Pin it from Chrome's Extensions menu if you want it readily available.

## Using the Extension

1. Open the dealership website you want to observe in the active Chrome tab.
2. Put the browser and website into the state you intend to capture:
   - Use a genuinely fresh browser state before selecting **Fresh visitor**.
   - Click the website's own deny or reject control before selecting **Denied cookies**.
   - Click the website's own accept control before selecting **Accepted cookies**.
   - Select **No banner** when no real website banner or Accept/Deny controls are available.
   - Select **Current browser state** when the consent state is unknown.
3. Open the extension and choose the matching **Test mode**.
4. Click **Scan page**. The extension reloads the active tab with cache bypass, waits for the page to complete, and then collects the available evidence. Opening the popup also performs a quicker read of the current page without that stronger reload capture.
5. Review the summary, Observed Load, Cookies, Domains, and Dealer report views.
6. Each completed scan is saved locally as a snapshot for its hostname and selected state. The **Saved set** indicators show which comparison states are available.
7. Copy a summary or Markdown report, download Markdown, or open the printable report to print/save as PDF or download standalone HTML or text.

The selected label records what the user says occurred; the extension does not independently verify that Accept or Deny was clicked. A label is valid only when it matches the browser's actual state during the capture.

## Evidence and Limitations

Interpret every result within these boundaries:

- An observed network request is evidence that the browser made or attempted the request. It is not proof that downloaded JavaScript executed.
- The captured request sequence is not a complete or proven JavaScript execution order.
- Activity not observed during a scan is not proof that it was blocked, is absent from the website, or would remain unobserved in another session.
- Cookie analysis is limited to cookies readable through `document.cookie`; it cannot observe `HttpOnly` cookies through that interface.
- The extension does not automatically verify that a website's Accept or Deny control was clicked or that the selected scan label is correct.
- Results are limited to the capture window and evidence observable through the extension's browser permissions and page context.
- Page or DOM evidence that identifies ComplyAuto does not prove that its `blocker.js` request was captured or establish its load timing.
- Technology, vendor, cookie, and consent-signal classifications explain observed indicators; they are not legal conclusions.

Live sites, CMP configurations, geography, prior browser storage, timing, and browser settings can all affect what a scan observes.

## Reports and Exports

The extension provides:

- **Copy Summary:** copies a plain-text summary to the clipboard
- **Copy Markdown:** builds and copies a Markdown report
- **Download MD:** downloads the Markdown report
- **PDF Report:** opens the printable report, where Chrome can print or save the report as PDF
- **Download text:** downloads the report content from the printable report view
- **Download HTML:** downloads a standalone HTML report

Run and save scans under the state that actually occurred in the browser. When at least two saved states exist for the same hostname, the report generator creates a consolidated comparison. A useful workflow is to capture Fresh, Denied, and Accepted states separately, then compare what the browser observed across those saved snapshots. Use **Clear** to remove the saved set for the current hostname.

## Privacy and Data Handling

Saved scan snapshots are stored in the extension's local Chrome storage and grouped by dealership hostname and selected state. The selected test-mode preference is also kept locally by the extension. Printable-report data is passed through local Chrome extension storage.

Reports are copied to the clipboard or exported only when the user selects the corresponding action. Markdown, text, and standalone HTML files are created through Chrome's download flow; PDF output uses Chrome's print dialog. Exported reports can contain observed URLs, cookie names and values, domains, consent signals, and other captured website evidence. Review reports before sharing them and handle them according to your organization's data practices.

## Development

The test suite uses Node's built-in test runner and has no third-party runtime or test dependencies. `package.json` supports **Node.js 18 or newer**.

Run the regression suite from the repository root:

```sh
npm test
```

No `npm install` step is required for the current test suite.

Meaningful work should be completed on a dedicated feature branch, reviewed, and merged only after it has been confirmed to align with [VISION.md](VISION.md). Keep the `main` branch stable and preserve a working state in each logical commit whenever possible.

## Project Documents

- [Product vision](VISION.md)
- [Development roadmap](ROADMAP.md)
- [Build notes](BUILD_NOTES.md)
- [v0.2.0 compatibility contract](docs/V0.2.0_COMPATIBILITY_CONTRACT.md)
- [Test suite documentation](tests/README.md)

## Downloading Releases

Official downloadable ZIP packages will appear on the repository's [GitHub Releases page](https://github.com/sellone2u-dot/consent-auditor/releases) when they are published. No published release is claimed here. Until then, use GitHub's source-code download or clone the repository and follow the unpacked-extension installation instructions above.

## License

No license has been selected for this repository yet. Unless and until a license is added, no permissions beyond those provided by applicable law should be assumed.
