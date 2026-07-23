# Changelog

All notable changes to Dealer Website Risk Auditor will be documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A v0.2.0 compatibility contract, sanitized regression fixtures, and a
  dependency-free Node.js test suite for the current behavior.
- Pure analysis, classification, consent-signal, capture, and scoring modules,
  with reviewed data dictionaries for supported indicators.
- Regression coverage for manifest integrity, evidence fixtures,
  classification, scoring, request capture, Google Consent Mode observations,
  and report output.

### Changed

- Runtime classification and analysis now use shared core modules.
- Google Consent Mode evidence collection and reporting now recognize supported
  signals from eligible observed Google requests, including delayed fetch
  capture and consolidated state reports.

## [0.1.7] - 2026-07-23

### Added

- Initial public release of the Chrome extension.
- Browser-observed network-request evidence and a captured request sequence.
- User-labeled Fresh, Denied, Accepted, No banner, and Current browser state
  scans, saved locally by dealership hostname.
- Observation of supported Google Consent Mode signals in eligible captured
  requests.
- Observation and classification of cookies readable through
  `document.cookie`.
- Detection of supported Google Tag Manager containers, consent management
  platforms, ComplyAuto indicators, and advertising and analytics
  technologies.
- Dealer-friendly single-state and consolidated multi-state reports.
- Plain-text summaries, Markdown downloads, standalone HTML downloads, and
  printable reports that can be printed or saved as PDF through Chrome.

### Notes

- Results describe evidence observed by the browser during the capture window.
  A captured request does not prove that downloaded code executed, and a
  request not observed does not prove that it was blocked or absent.
- Scan-state labels are selected by the user and are not independently verified
  by the extension.
- Findings are not legal advice, a compliance certification, or a vulnerability
  assessment.

[Unreleased]: https://github.com/sellone2u-dot/consent-auditor/compare/v0.1.7...HEAD
[0.1.7]: https://github.com/sellone2u-dot/consent-auditor/releases/tag/v0.1.7
