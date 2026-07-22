'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadBrowserScripts, repositoryRoot } = require('./helpers/load-browser-script');

const api = loadBrowserScripts(['src/core/consent-signals.js']).RiskAuditorCore;
const collect = (query = '') => ({ url: 'https://www.google-analytics.com/g/collect?v=2' + (query ? '&' + query : '') });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('recognized Consent Mode fields are extracted from eligible GET requests', () => {
  const fields = {
    gcs:'G100', gcd:'13l3l3l3l5', npa:'1', pscdl:'denied', ads_data_redaction:'1',
    dma:'0', dma_cps:'syphamo', ad_user_data:'denied', ad_personalization:'denied'
  };
  Object.entries(fields).forEach(([name, value]) => {
    const result = api.interpretConsentSignals([collect(`${name}=${value}`)]);
    assert.deepEqual(Array.from(result.params), [`${name}=${value}`]);
    assert.equal(result.googleConsentOutcome, 'signals_observed');
  });
});

test('gcs variants have consistent restricted-signal interpretation', () => {
  assert.equal(api.interpretConsentSignals([collect('gcs=G100')]).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals([collect('gcs=G101')]).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals([collect('gcs=G111')]).hasRestrictedSignals, false);
});

test('multiple fields retain stable field order and duplicate values are deduplicated', () => {
  const first = collect('gcs=G100&gcd=value&npa=1&pscdl=denied');
  const duplicate = { url:'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/123/?gcs=G100&npa=1' };
  const result = api.interpretConsentSignals([first, duplicate]);
  assert.deepEqual(Array.from(result.params), ['gcs=G100', 'gcd=value', 'npa=1', 'pscdl=denied']);
  assert.equal(result.eligibleGoogleRequestCount, 2);
  assert.equal(result.consentSignalObservations.length, 2);
});

test('gcd without gcs is a signal but not restricted proof', () => {
  const result = api.interpretConsentSignals([collect('gcd=13l3l3l3l5')]);
  assert.equal(result.hasOnlyGcdSignal, true);
  assert.equal(result.hasRestrictedSignals, false);
});

test('formData and textual raw POST bodies retain only recognized consent fields', () => {
  const form = api.normalizeConsentRequestBody({ formData:{ gcs:['G101'], npa:['1'], email:['private@example.test'] } });
  assert.deepEqual(plain(form), [
    { name:'gcs', value:'G101', source:'body' },
    { name:'npa', value:'1', source:'body' }
  ]);
  const formResult = api.interpretConsentSignals([{ ...collect(), method:'POST', consentBodyParams:form }]);
  assert.deepEqual(Array.from(formResult.params), ['gcs=G101', 'npa=1']);
  assert.equal(formResult.consentSignalObservations[0].signals[0].source, 'body');
  const bytes = new TextEncoder().encode('gcs=G100&ad_user_data=denied&tid=G-YYYYYYYYYY&customer_id=private').buffer;
  const normalizedRaw = api.normalizeGoogleRequestBody({ raw:[{ bytes }] });
  const raw = normalizedRaw.consentParams;
  assert.deepEqual(plain(raw), [
    { name:'gcs', value:'G100', source:'body' },
    { name:'ad_user_data', value:'denied', source:'body' }
  ]);
  assert.deepEqual(Array.from(normalizedRaw.measurementIds), ['G-YYYYYYYYYY']);
  assert.equal(JSON.stringify(normalizedRaw).includes('private'), false);
  const result = api.interpretConsentSignals([{ ...collect(), method:'POST', consentBodyParams:raw }]);
  assert.equal(result.googleConsentOutcome, 'signals_observed');
  assert.deepEqual(Array.from(result.params), ['gcs=G100', 'ad_user_data=denied']);
});

test('malformed, inaccessible, and binary bodies are ignored safely', () => {
  assert.deepEqual(plain(api.normalizeConsentRequestBody(null)), []);
  assert.deepEqual(plain(api.normalizeConsentRequestBody({ error:'unavailable' })), []);
  assert.deepEqual(plain(api.normalizeConsentRequestBody({ raw:[{ bytes:new Uint8Array([0xff, 0xfe, 0xfd]).buffer }] })), []);
  assert.deepEqual(plain(api.normalizeConsentRequestBody({ raw:[{}] })), []);
});

test('eligibility excludes loaders, fonts, static resources, and unrelated Google traffic', () => {
  [
    'https://www.googletagmanager.com/gtm.js?id=GTM-TEST',
    'https://www.googletagmanager.com/gtag/js?id=G-TEST',
    'https://fonts.googleapis.com/css2?family=Roboto',
    'https://fonts.gstatic.com/s/roboto/font.woff2',
    'https://www.google.com/images/branding/googlelogo.png',
    'https://example.test/google/help',
    'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
  ].forEach((url) => assert.equal(api.isEligibleGoogleConsentRequest({ url }), false, url));
});

test('the three explicit Google consent outcomes are distinguishable', () => {
  assert.equal(api.interpretConsentSignals([collect('gcs=G100')]).googleConsentOutcome, 'signals_observed');
  assert.equal(api.interpretConsentSignals([collect()]).googleConsentOutcome, 'eligible_no_signals');
  assert.equal(api.interpretConsentSignals([{ url:'https://fonts.googleapis.com/css2?family=Roboto' }]).googleConsentOutcome, 'no_eligible_request');
  assert.equal(api.interpretConsentSignals([]).googleConsentOutcome, 'no_eligible_request');
});

test('sanitized fixture remains aligned with the implemented request cases', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'tests/fixtures/requests/google-consent-signals.json'), 'utf8'));
  fixture.cases.forEach(({ name, request, expectedParams }) => {
    assert.deepEqual(Array.from(api.interpretConsentSignals([request]).params), expectedParams, name);
  });
});

test('Capital Toyota HAR-equivalent fetch POSTs remain eligible with all observed signals', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'tests/fixtures/requests/capital-toyota-consent-posts.json'), 'utf8'));
  const result = api.interpretConsentSignals(fixture.requests);
  assert.equal(result.eligibleGoogleRequestCount, 4);
  assert.equal(result.googleConsentOutcome, 'signals_observed');
  assert.deepEqual(Array.from(result.params), [
    'gcs=G101', 'gcd=13q3r3q3q5l1', 'npa=1', 'pscdl=denied', 'dma=0', 'dma_cps=-'
  ]);
  assert.ok(fixture.requests.every((request) => request.resourceType === 'fetch' && api.isEligibleGoogleConsentRequest(request)));
  assert.deepEqual(Array.from(result.googleMeasurementIds), ['G-D293984MPT', 'G-S2B1L0T73X', 'G-GH9FXE8RZM', 'G-YYYYYYYYYY']);
  assert.deepEqual(Array.from(result.placeholderGoogleMeasurementIds), ['G-YYYYYYYYYY']);
});
