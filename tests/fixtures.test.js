'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { repositoryRoot } = require('./helpers/load-browser-script');

function readFixture(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'tests', 'fixtures', relativePath), 'utf8'));
}

test('request fixture preserves captured order without claiming execution order', () => {
  const fixture = readFixture('requests/complyauto-before-gtm.json');
  assert.equal(fixture.fixtureVersion, 1);
  assert.deepEqual(fixture.requests.map((request) => request.seq), [1, 2, 3]);
  assert.equal(fixture.requests[0].name, 'ComplyAuto blocker.js');
  assert.equal(fixture.requests[1].type, 'tag-manager');
});

test('page fixture contains a real manual consent choice', () => {
  const { page } = readFixture('pages/complyauto-banner.json');
  assert.equal(page.cmp, 'ComplyAuto');
  assert.equal(page.hasRealConsentChoice, true);
  assert.equal(page.acceptControl, true);
  assert.equal(page.denyControl, true);
});

test('scan fixture is a complete Fresh visitor v0.1.7 snapshot', () => {
  const { scan } = readFixture('scans/fresh-restricted.json');
  assert.equal(scan.auditMode.key, 'fresh');
  assert.equal(scan.auditMode.label, 'Fresh visitor / before consent choice');
  assert.equal(scan.complyAutoLoadOrder.status, 'loaded-first');
  assert.deepEqual(scan.consentParams, ['gcs=G100', 'npa=1']);
});
