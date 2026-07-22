'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadBrowserScripts, repositoryRoot } = require('./helpers/load-browser-script');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8'));
}

test('current report logic preserves v0.1.7 single-state output expectations', () => {
  const context = loadBrowserScripts(['src/core/constants.js', 'src/core/classify.js', 'tips.js', 'report.js']);
  const { scan } = readJson('tests/fixtures/scans/fresh-restricted.json');
  const expectations = readJson('tests/fixtures/reports/v0.1.7-single-state-expectations.json');
  const tips = context.generateTips(scan);
  const report = context.buildMarkdown(scan, tips, []);

  expectations.requiredText.forEach((text) => {
    assert.ok(report.includes(text), `report is missing preserved text: ${text}`);
  });
  expectations.forbiddenText.forEach((text) => {
    assert.ok(!report.includes(text), `report contains forbidden text: ${text}`);
  });
});

test('current report rating terminology remains dealer-facing', () => {
  const context = loadBrowserScripts(['report.js']);
  assert.equal(context.reportRiskRating({ grade: 'A' }), 'Strong');
  assert.equal(context.reportRiskRating({ grade: 'B' }), 'Good / Verify');
  assert.equal(context.reportRiskRating({ grade: 'C' }), 'Needs Review');
  assert.equal(context.reportRiskRating({ grade: 'D' }), 'High Risk');
  assert.equal(context.reportRiskRating({ grade: 'F' }), 'Critical');
  assert.equal(context.reportRiskRating({}), 'Unable to Verify');
});

test('report distinguishes all three Google Consent Mode evidence outcomes', () => {
  const context = loadBrowserScripts(['report.js']);
  const base = { consentParams:[], eligibleGoogleRequestCount:0, googleConsentOutcome:'no_eligible_request' };
  assert.equal(context.reportGoogleSignalRead({ ...base, consentParams:['gcs=G101'], eligibleGoogleRequestCount:1, googleConsentOutcome:'signals_observed' }), 'Google Consent Mode signals observed. The scan captured eligible Google measurement or advertising requests containing: gcs=G101. Signal meaning depends on the selected consent state and should be confirmed with Google Tag Assistant.');
  assert.equal(context.reportGoogleSignalRead({ ...base, eligibleGoogleRequestCount:1, googleConsentOutcome:'eligible_no_signals' }), 'Google measurement or advertising requests were captured, but none contained recognized Consent Mode parameters in the observable URL or request payload. Consent Mode status was not verified.');
  assert.equal(context.reportGoogleSignalRead(base), 'No eligible Google Analytics, Google Ads, or DoubleClick measurement request was captured during this scan. Consent Mode could not be evaluated. Google scripts, fonts, static resources, and Tag Manager loaders do not count as measurement evidence.');
});

test('legacy saved scans without additive Google outcome fields retain legacy wording', () => {
  const context = loadBrowserScripts(['report.js']);
  assert.equal(context.reportGoogleConsentOutcome({ consentParams:[] }), 'legacy_unknown');
  assert.equal(context.reportGoogleSignalRead({ consentParams:[] }), 'No Google consent parameters were captured.');
});
