'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { repositoryRoot } = require('./helpers/load-browser-script');

const contractPath = path.join(repositoryRoot, 'docs', 'V0.2.0_COMPATIBILITY_CONTRACT.md');
const contract = fs.readFileSync(contractPath, 'utf8');

test('compatibility contract contains the approved architecture principle verbatim', () => {
  assert.match(
    contract,
    /Every user-visible conclusion must be traceable to evidence\. Every major feature must be independently testable\. Existing v0\.1\.7 behavior must be preserved unless an intentional behavior change is documented and approved\./
  );
});

test('compatibility contract protects established report terminology', () => {
  [
    'Observed Load',
    'Captured request sequence',
    'ComplyAuto Control Evidence',
    'Behavioral Consent Signal Read',
    'High Priority Observations',
    'Strong',
    'Good / Verify',
    'Needs Review',
    'High Risk',
    'Critical',
    'Unable to Verify'
  ].forEach((term) => assert.ok(contract.includes(term), `missing protected term: ${term}`));
});
