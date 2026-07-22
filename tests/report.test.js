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

test('legacy saved scans without additive Google outcome fields use explicit compatibility wording', () => {
  const context = loadBrowserScripts(['report.js']);
  assert.equal(context.reportGoogleConsentOutcome({ consentParams:[] }), 'legacy_unknown');
  assert.equal(context.reportGoogleSignalRead({ consentParams:[] }), 'This legacy saved scan does not contain enough request-eligibility data to evaluate Google Consent Mode.');
});

test('Capital Toyota HAR evidence flows into single-state and consolidated report wording', () => {
  const context = loadBrowserScripts(['src/core/constants.js', 'src/core/classify.js', 'src/core/consent-signals.js', 'tips.js', 'report.js']);
  const fixture = readJson('tests/fixtures/requests/capital-toyota-consent-posts.json');
  const evidence = context.RiskAuditorCore.interpretConsentSignals(fixture.requests);
  const { scan:baseScan } = readJson('tests/fixtures/scans/fresh-restricted.json');
  const scan = {
    ...baseScan,
    hostname:'capitaltoyota.com',
    consentParams:Array.from(evidence.params),
    eligibleGoogleRequestCount:evidence.eligibleGoogleRequestCount,
    consentSignalObservations:JSON.parse(JSON.stringify(evidence.consentSignalObservations)),
    googleConsentOutcome:evidence.googleConsentOutcome,
    googleMeasurementIds:Array.from(evidence.googleMeasurementIds),
    placeholderGoogleMeasurementIds:Array.from(evidence.placeholderGoogleMeasurementIds)
  };
  const expected = 'Google Consent Mode signals observed. The scan captured eligible Google measurement or advertising requests containing: gcs=G101, gcd=13q3r3q3q5l1, npa=1, pscdl=denied, dma=0, dma_cps=-. Signal meaning depends on the selected consent state and should be confirmed with Google Tag Assistant.';
  const single = context.buildSingleStateMarkdown(scan, context.generateTips(scan));
  assert.ok(single.includes(expected));
  assert.ok(single.includes('Eligible Google measurement / advertising requests | 4'));
  assert.ok(single.includes('placeholder-looking Google measurement ID observed: G-YYYYYYYYYY'));

  const denied = JSON.parse(JSON.stringify(scan));
  denied.auditMode = { key:'denied', label:'Denied cookies / reject all', shortLabel:'Denied cookies', isPreConsent:true, isAccepted:false, isDenied:true };
  const consolidated = context.buildConsolidatedMarkdown(scan.hostname, [scan, denied]);
  assert.ok(consolidated.includes(expected));
  assert.ok(consolidated.includes('placeholder-looking Google measurement ID observed: G-YYYYYYYYYY'));
  assert.ok(!single.includes('No Google consent parameters were captured'));
  assert.ok(!consolidated.includes('No Google consent parameters were captured'));
});
