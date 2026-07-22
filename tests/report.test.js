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
