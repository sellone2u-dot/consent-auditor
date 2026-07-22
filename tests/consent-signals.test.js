'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadBrowserScripts } = require('./helpers/load-browser-script');

const api = loadBrowserScripts(['src/core/consent-signals.js']).RiskAuditorCore;
const request = (query) => [{ url: 'https://www.google-analytics.com/g/collect?v=2&' + query }];

test('Consent Mode signal combinations distinguish strong restriction from gcd-only evidence', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(api.interpretConsentSignals([]))), { params:[], hasSignals:false, hasRestrictedSignals:false, hasOnlyGcdSignal:false });
  assert.equal(api.interpretConsentSignals(request('gcd=13l3l3l3l5')).hasOnlyGcdSignal, true);
  assert.equal(api.interpretConsentSignals(request('gcd=13l3l3l3l5&npa=1')).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals(request('pscdl=denied')).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals(request('ads_data_redaction=1')).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals(request('gcs=G100')).hasRestrictedSignals, true);
  assert.equal(api.interpretConsentSignals(request('npa=0&gcs=G111')).hasRestrictedSignals, false);
});

test('Consent Mode parameters retain order and are deduplicated', () => {
  const result = api.interpretConsentSignals(request('gcs=G100&gcd=value&gcs=G100'));
  assert.deepEqual(Array.from(result.params), ['gcs=G100', 'gcd=value']);
});
