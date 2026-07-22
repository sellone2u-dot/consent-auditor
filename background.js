// background.js v12 — network request capture for consent auditing

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
  var u = url.toLowerCase();
  if (/complyauto|onetrust|cookiebot|cookieconsent|usercentrics|trustarc|osano|cookieyes|quantcast|iubenda|termly|civicuk|didomi/.test(u)) return 'consent';
  if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
  if (/google-analytics|analytics\.google|gtag\/js|collect\?v=|smetrics\.|adobedc|omtrdc|analytics\.yahoo|clarity\.ms|hotjar/.test(u)) return 'analytics';
  if (/doubleclick|googleadservices|googlesyndication|adservice|pagead|facebook\.com\/tr|connect\.facebook|fbevents|ct\.pinterest|teads|stackadapt|fls\.doubleclick/.test(u)) return 'advertising';
  if (/connect\.facebook|fbevents|facebook\.com\/tr/.test(u)) return 'advertising';
  if (/drift|tawk|livechat/.test(u)) return 'functional';
  return 'other';
}

function nameRequest(url) {
  var u = url.toLowerCase();
  if (/complyauto/.test(u) && /(^|\/)blocker\.js(?:[?#]|$)/.test(u)) return 'ComplyAuto blocker.js';
  if (/complyauto/.test(u) && /(^|\/)banner\.js(?:[?#]|$)/.test(u)) return 'ComplyAuto banner.js';
  if (u.indexOf('complyauto') > -1) return 'ComplyAuto';
  if (u.indexOf('onetrust') > -1 || u.indexOf('cookielaw') > -1) return 'OneTrust';
  if (u.indexOf('cookiebot') > -1) return 'Cookiebot';
  if (u.indexOf('usercentrics') > -1) return 'Usercentrics';
  if (u.indexOf('trustarc') > -1) return 'TrustArc';
  if (u.indexOf('osano') > -1) return 'Osano';
  if (u.indexOf('cookieyes') > -1) return 'CookieYes';
  if (u.indexOf('quantcast') > -1) return 'Quantcast Choice';
  if (u.indexOf('iubenda') > -1) return 'iubenda';
  if (u.indexOf('termly') > -1) return 'Termly';
  if (u.indexOf('googletagmanager') > -1) {
    var g = url.match(/GTM-[A-Z0-9]+/);
    return 'Google Tag Manager' + (g ? ' (' + g[0] + ')' : '');
  }
  if (u.indexOf('google-analytics') > -1 || u.indexOf('analytics.google') > -1 || u.indexOf('gtag/js') > -1) return 'Google Analytics 4';
  if (u.indexOf('doubleclick') > -1 || u.indexOf('googleadservices') > -1) return 'Google Ads';
  if (u.indexOf('connect.facebook') > -1 || u.indexOf('facebook.com/tr') > -1) return 'Meta / Facebook Pixel';
  if (u.indexOf('ct.pinterest') > -1 || u.indexOf('pinterest') > -1) return 'Pinterest Tag';
  if (u.indexOf('teads') > -1) return 'Teads';
  if (u.indexOf('stackadapt') > -1) return 'StackAdapt';
  if (u.indexOf('smetrics.lexus') > -1 || u.indexOf('smetrics.toyota') > -1 || u.indexOf('adobedc') > -1 || u.indexOf('omtrdc') > -1) return 'Adobe / OEM Analytics';
  if (u.indexOf('ensighten') > -1) return 'Ensighten Tag Manager';
  if (u.indexOf('hotjar') > -1) return 'Hotjar';
  if (u.indexOf('clarity.ms') > -1) return 'Microsoft Clarity';
  try { return new URL(url).hostname; } catch(e) { return 'Unknown'; }
}
