// background.js v12 — network request capture for consent auditing

const tabData = {};

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (details.tabId < 0) return;
    if (!tabData[details.tabId]) tabData[details.tabId] = { requests: [] };
    var url = details.url;
    var hostname = '';
    try { hostname = new URL(url).hostname; } catch(e) {}
    tabData[details.tabId].requests.push({
      url: url, hostname: hostname,
      type: classifyRequest(url),
      name: nameRequest(url),
      timestamp: Date.now()
    });
    if (tabData[details.tabId].requests.length > 500) {
      tabData[details.tabId].requests.shift();
    }
  },
  { urls: ['<all_urls>'] }, []
);

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
  if (changeInfo.status === 'loading') tabData[tabId] = { requests: [] };
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
  var u = url.toLowerCase();
  if (/complyauto|onetrust|cookiebot|cookieconsent/.test(u)) return 'consent';
  if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
  if (/google-analytics|analytics\.google|gtag\/js|collect\?v=/.test(u)) return 'analytics';
  if (/doubleclick|googleadservices|googlesyndication|adservice/.test(u)) return 'advertising';
  if (/connect\.facebook|fbevents|facebook\.com\/tr/.test(u)) return 'advertising';
  if (/hotjar|clarity\.ms/.test(u)) return 'analytics';
  if (/drift|tawk|livechat/.test(u)) return 'functional';
  return 'other';
}

function nameRequest(url) {
  var u = url.toLowerCase();
  if (u.indexOf('complyauto') > -1) return 'ComplyAuto';
  if (u.indexOf('onetrust') > -1 || u.indexOf('cookielaw') > -1) return 'OneTrust';
  if (u.indexOf('cookiebot') > -1) return 'Cookiebot';
  if (u.indexOf('googletagmanager') > -1) {
    var g = url.match(/GTM-[A-Z0-9]+/);
    return 'Google Tag Manager' + (g ? ' (' + g[0] + ')' : '');
  }
  if (u.indexOf('google-analytics') > -1 || u.indexOf('analytics.google') > -1 || u.indexOf('gtag/js') > -1) return 'Google Analytics 4';
  if (u.indexOf('doubleclick') > -1 || u.indexOf('googleadservices') > -1) return 'Google Ads';
  if (u.indexOf('connect.facebook') > -1 || u.indexOf('facebook.com/tr') > -1) return 'Meta / Facebook Pixel';
  if (u.indexOf('hotjar') > -1) return 'Hotjar';
  if (u.indexOf('clarity.ms') > -1) return 'Microsoft Clarity';
  try { return new URL(url).hostname; } catch(e) { return 'Unknown'; }
}
