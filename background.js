// background.js v12 — network request capture for consent auditing

importScripts('src/core/constants.js', 'src/core/classify.js', 'src/core/consent-signals.js');

const tabData = {};

function emptyTabData(captureActive) {
  return { requests: [], seq: 0, captureRevision: 0, lastCapturedAt: null, captureActive: !!captureActive };
}

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.tabId < 0) return;
    if (!tabData[details.tabId]) tabData[details.tabId] = emptyTabData(false);
    var url = details.url;
    var hostname = '';
    try { hostname = new URL(url).hostname; } catch(e) {}
    tabData[details.tabId].seq = (tabData[details.tabId].seq || 0) + 1;
    var googleBodyEvidence = RiskAuditorCore.normalizeGoogleRequestBody(details.requestBody);
    tabData[details.tabId].requests.push({
      url: url, hostname: hostname,
      type: classifyRequest(url),
      name: nameRequest(url),
      method: details.method || null,
      resourceType: details.type || null,
      initiator: details.initiator || null,
      requestId: details.requestId || null,
      timestamp: details.timeStamp == null ? Date.now() : details.timeStamp,
      seq: tabData[details.tabId].seq,
      consentBodyParams: googleBodyEvidence.consentParams,
      googleMeasurementIds: googleBodyEvidence.measurementIds
    });
    tabData[details.tabId].captureRevision += 1;
    tabData[details.tabId].lastCapturedAt = Date.now();
    if (tabData[details.tabId].requests.length > 500) {
      tabData[details.tabId].requests.shift();
    }
  },
  { urls: ['<all_urls>'] }, ['requestBody']
);

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading' && !(tabData[tabId] && tabData[tabId].captureActive)) tabData[tabId] = emptyTabData(false);
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete tabData[tabId];
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === 'PAGE_DATA') {
    var tabId = sender.tab && sender.tab.id;
    if (tabId && tabData[tabId]) tabData[tabId].pageData = msg.data;
  }

  if (msg.type === 'GET_DATA') {
    var d = tabData[msg.tabId] || { requests: [] };
    sendResponse({ requests: d.requests || [], pageData: d.pageData || null, captureRevision: d.captureRevision || 0, lastCapturedAt: d.lastCapturedAt || null });
  }

  if (msg.type === 'BEGIN_CAPTURE') {
    tabData[msg.tabId] = emptyTabData(true);
    sendResponse({ ok:true });
  }

  if (msg.type === 'END_CAPTURE') {
    if (tabData[msg.tabId]) tabData[msg.tabId].captureActive = false;
    sendResponse({ ok:true });
  }

  return true;
});

function classifyRequest(url) {
  return RiskAuditorCore.classifyRequest(url);
}

function nameRequest(url) {
  return RiskAuditorCore.nameRequest(url);
}
