// background.js v12 — network request capture for consent auditing

importScripts('src/core/constants.js', 'src/core/classify.js');

const tabData = {};

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.tabId < 0) return;
    if (!tabData[details.tabId]) tabData[details.tabId] = { requests: [], seq: 0 };
    var url = details.url;
    var hostname = '';
    try { hostname = new URL(url).hostname; } catch(e) {}
    tabData[details.tabId].seq = (tabData[details.tabId].seq || 0) + 1;
    tabData[details.tabId].requests.push({
      url: url, hostname: hostname,
      type: classifyRequest(url),
      name: nameRequest(url),
      timestamp: Date.now(),
      seq: tabData[details.tabId].seq
    });
    if (tabData[details.tabId].requests.length > 500) {
      tabData[details.tabId].requests.shift();
    }
  },
  { urls: ['<all_urls>'] }, []
);

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading') tabData[tabId] = { requests: [], seq: 0 };
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
    sendResponse({ requests: d.requests || [], pageData: d.pageData || null });
  }

  return true;
});

function classifyRequest(url) {
  return RiskAuditorCore.classifyRequest(url);
}

function nameRequest(url) {
  return RiskAuditorCore.nameRequest(url);
}
