'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { loadBrowserScripts } = require('./helpers/load-browser-script');

const api = loadBrowserScripts(['src/core/capture.js']).RiskAuditorCore;

test('capture finalization includes eligible requests that arrive after initial retrieval', async () => {
  let revision = 0;
  let requests = [];
  setTimeout(() => {
    revision = 4;
    requests = [1, 2, 3, 4].map((index) => ({ url:'https://www.google-analytics.com/g/collect', requestId:'late-' + index }));
  }, 20);
  const result = await api.waitForRequestSettle(
    () => ({ requests:requests.slice(), captureRevision:revision }),
    { quietMs:30, maxWaitMs:200, pollMs:5 }
  );
  assert.equal(result.requests.length, 4);
  assert.equal(result.captureRevision, 4);
});
