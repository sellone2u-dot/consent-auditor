'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadBrowserScripts, repositoryRoot } = require('./helpers/load-browser-script');

function core() {
  return loadBrowserScripts(['src/core/constants.js', 'src/core/classify.js']).RiskAuditorCore;
}

test('request and technology classification preserve established categories', () => {
  const api = core();
  assert.equal(api.classifyRequest('https://www.googletagmanager.com/gtm.js?id=GTM-ABC123'), 'tag-manager');
  assert.equal(api.classifyRequest('https://www.google-analytics.com/g/collect?v=2'), 'analytics');
  assert.equal(api.classifyRequest('https://connect.facebook.com/en_US/fbevents.js'), 'advertising');
  assert.equal(api.classifyRequest('https://cdn.onetrust.com/consent.js'), 'consent');
  assert.equal(api.classifyTechnology('window.fbq("init", "123")'), 'advertising');
  assert.equal(api.classifyTechnology('https://cdn.drivecentric.com/widget.js'), 'functional');
  assert.equal(api.classifyTechnology('https://example.com/app.js'), 'other');
});

test('known and unknown GTM containers are separated without guessing ownership', () => {
  const api = core();
  const result = api.classifyContainers(['GTM-KMQZ7S3K', 'GTM-UNKNOWN']);
  assert.equal(result.oem.length, 1);
  assert.equal(result.oem[0].info.owner, 'Toyota/Lexus OEM');
  assert.deepEqual(Array.from(result.unknown), ['GTM-UNKNOWN']);
  assert.deepEqual(Array.from(result.dealer), []);
});

test('cookie classification preserves v0.1.7 categories', () => {
  const api = core();
  assert.equal(api.categorizeCookie('_ga_ABC'), 'Analytics');
  assert.equal(api.categorizeCookie('_fbp'), 'Targeting');
  assert.equal(api.categorizeCookie('PHPSESSID'), 'Essential');
  assert.equal(api.categorizeCookie('cookie_notice'), 'Essential');
  assert.equal(api.categorizeCookie('_clck'), 'Analytics');
  assert.equal(api.categorizeCookie('dealer_preference'), 'Unknown');
});

test('runtime GTM and consent dictionaries match their maintainable JSON data', () => {
  const api = core();
  const containers = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'data/gtm-containers.json'), 'utf8'));
  const platforms = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'data/consent-platforms.json'), 'utf8'));
  assert.deepEqual(JSON.parse(JSON.stringify(api.constants.knownContainers)), containers);
  assert.deepEqual(JSON.parse(JSON.stringify(api.constants.consentPlatforms)), platforms);
});
