'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { repositoryRoot } = require('./helpers/load-browser-script');

test('background capture requests body access and preserves isolated request metadata', () => {
  let beforeRequest;
  let beforeRequestExtraInfo;
  let runtimeMessage;
  const context = vm.createContext({
    URL,
    Date,
    importScripts() {},
    RiskAuditorCore: {
      classifyRequest() { return 'analytics'; },
      nameRequest() { return 'Google Analytics 4'; },
      normalizeConsentRequestBody(body) {
        return body && body.formData ? [{ name:'gcs', value:body.formData.gcs[0], source:'body' }] : [];
      }
    },
    chrome: {
      webRequest: { onBeforeRequest: { addListener(callback, filter, extraInfo) { beforeRequest = callback; beforeRequestExtraInfo = extraInfo; } } },
      tabs: {
        onUpdated: { addListener() {} },
        onRemoved: { addListener() {} }
      },
      runtime: { onMessage: { addListener(callback) { runtimeMessage = callback; } } }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(repositoryRoot, 'background.js'), 'utf8'), context);
  assert.deepEqual(Array.from(beforeRequestExtraInfo), ['requestBody']);

  beforeRequest({
    tabId:7,
    url:'https://www.google-analytics.com/g/collect',
    method:'POST',
    type:'ping',
    initiator:'https://dealer.example',
    requestId:'request-1',
    timeStamp:1234.5,
    requestBody:{ formData:{ gcs:['G101'], email:['private@example.test'] } }
  });
  let response;
  runtimeMessage({ type:'GET_DATA', tabId:7 }, {}, (value) => { response = value; });
  const captured = response.requests[0];
  assert.equal(captured.url, 'https://www.google-analytics.com/g/collect');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.resourceType, 'ping');
  assert.equal(captured.initiator, 'https://dealer.example');
  assert.equal(captured.requestId, 'request-1');
  assert.equal(captured.timestamp, 1234.5);
  assert.equal(captured.seq, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(captured.consentBodyParams)), [{ name:'gcs', value:'G101', source:'body' }]);
  assert.equal('requestBody' in captured, false);
});
