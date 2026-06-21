# 🛡️ Consent Auditor — Dealer Website Compliance Tool

A free Chrome extension that instantly checks any dealership website for cookie consent compliance, tracking tool behavior, and firing order — in plain English, no technical knowledge required.

**Landing page:** [sellone2u-dot.github.io/consent-auditor](https://sellone2u-dot.github.io/consent-auditor)

---

## What it does

Open the extension on any dealership website and instantly see:

- **Compliance grade (A–F)** with plain-English explanation
- **Consent manager detection** — ComplyAuto, OneTrust, Cookiebot
- **Google Consent Mode signals** — gcs=, npa=1, pscdl=denied
- **Meta / Facebook pixel** — exact request count before consent
- **GTM containers** — identifies all Google Tag Manager containers
- **Firing order** — what loads first and whether it's gated
- **Cookie classification** — Essential / Analytics / Targeting
- **Third-party domains** — every external domain contacted

---

## Real world findings

| Site | Grade | Finding |
|------|-------|---------|
| lexusofchattanooga.com | **A** | ComplyAuto active, Consent Mode confirmed, Meta blocked |
| northgeorgiatoyota.com | **A** | ComplyAuto active, 6 GTM containers detected |
| lexus.com (OEM) | **F** | No consent manager, 35 Meta requests before consent |

---

## Install in 3 minutes

1. [Download the zip](https://github.com/sellone2u-dot/consent-auditor/releases/latest/download/consent-auditor-extension.zip)
2. Unzip → right-click → Extract All
3. Open Chrome → type `chrome://extensions`
4. Toggle **Developer mode** ON (top right)
5. Click **Load unpacked** → navigate inside the unzipped folder until you see `manifest.json` → click Select Folder
6. The 🛡️ icon appears in your toolbar — click it on any dealership website

---

## How to share with a dealer

Send them this link:
```
https://sellone2u-dot.github.io/consent-auditor
```

The landing page has full install instructions with no technical jargon.

---

## Built on ComplyAuto's published audit framework

Findings are grounded in ComplyAuto's own published 10-standard audit framework — which means when you present findings to a vendor or attorney, the standards come from the vendor themselves.

---

## What "sham banner" means

Many dealership websites display a cookie consent banner — but the banner doesn't actually stop tracking tools from running. Google Analytics, the Facebook pixel, and advertising platforms may be collecting visitor data the moment someone lands on the site, before any choice is made.

This extension verifies whether the banner is real or decorative.

---

## Disclaimer

This tool is for informational purposes only and does not constitute legal advice. Always confirm compliance findings with your consent management platform vendor and qualified legal counsel.

---

*Free and open source. Built for auto dealers.*
