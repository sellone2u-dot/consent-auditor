'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { repositoryRoot } = require('./helpers/load-browser-script');

const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'manifest.json'), 'utf8'));

test('manifest preserves the v0.1.7 extension identity during Phase 0', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Dealer Website Risk Auditor');
  assert.equal(manifest.version, '0.1.7');
});

test('every local manifest reference resolves', () => {
  const references = [
    manifest.background.service_worker,
    manifest.action.default_popup,
    ...manifest.content_scripts.flatMap((entry) => entry.js || []),
    ...Object.values(manifest.action.default_icon || {}),
    ...Object.values(manifest.icons || {})
  ];

  references.forEach((reference) => {
    assert.ok(fs.existsSync(path.join(repositoryRoot, reference)), `missing manifest reference: ${reference}`);
  });
});

test('core dependencies load before the content runtime', () => {
  assert.deepEqual(manifest.content_scripts[0].js, [
    'src/core/constants.js',
    'src/core/classify.js',
    'content.js'
  ]);
});
