'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadBrowserScripts } = require('./helpers/load-browser-script');

const api = loadBrowserScripts(['src/core/scoring.js']).RiskAuditorCore;
const consentApi = loadBrowserScripts(['src/core/consent-signals.js', 'src/core/scoring.js']).RiskAuditorCore;
const fresh = { isPreConsent:true, isAccepted:false };

function baseline(overrides) {
  return Object.assign({ auditMode:fresh, hasCMP:true, ga4:true, hasRestrictedSignals:true, hasOnlyGcdSignal:false, hasConsentSignals:true, metaCount:0, targetingCount:0, analyticsCookieCount:0, complyAutoStatus:'before-tracking', priorityBeforeCount:0, gtmCount:1 }, overrides);
}

test('v0.1.7 score thresholds and grade caps remain unchanged', () => {
  assert.equal(api.gradeFromScore(85), 'A');
  assert.equal(api.gradeFromScore(70), 'B');
  assert.equal(api.gradeFromScore(55), 'C');
  assert.equal(api.gradeFromScore(40), 'D');
  assert.equal(api.gradeFromScore(39), 'F');
  assert.equal(api.capGrade('A', 'C'), 'C');
  assert.equal(api.scoreAnalysis(baseline()).score, 100);
  assert.deepEqual(JSON.parse(JSON.stringify(api.scoreAnalysis(baseline({ hasRestrictedSignals:false, hasOnlyGcdSignal:true })))), { score:86, grade:'B', notes:['Only gcd was detected; restricted/default-denied Google behavior was not proven.'] });
  assert.equal(api.scoreAnalysis(baseline({ metaCount:1 })).grade, 'C');
  assert.equal(api.scoreAnalysis(baseline({ priorityBeforeCount:1 })).grade, 'F');
});

test('gcs=G101 is restricted evidence consistently through interpretation and scoring', () => {
  const signals = consentApi.interpretConsentSignals([{ url:'https://www.google-analytics.com/g/collect?v=2&gcs=G101' }]);
  assert.equal(signals.hasRestrictedSignals, true);
  const scored = consentApi.scoreAnalysis(baseline({
    hasRestrictedSignals:signals.hasRestrictedSignals,
    hasOnlyGcdSignal:signals.hasOnlyGcdSignal,
    hasConsentSignals:signals.hasSignals
  }));
  assert.equal(scored.score, 100);
  assert.deepEqual(Array.from(scored.notes), []);
});
