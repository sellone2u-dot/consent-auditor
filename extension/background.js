// background.js — service worker
// Tracks network requests per tab to detect third-party calls

const tabData = {};

// Listen for web requests to track what fires on each page
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;
    if (!tabData[details.tabId]) tabData[details.tabId] = { requests: [], cookies: [] };

    const url = details.url;
    let hostname = '';
    try { hostname = new URL(url).hostname; } catch {}

    const entry = {
      url: url,
      hostname: hostname,
      type: classifyRequest(url),
      name: nameRequest(url),
      timestamp: Date.now()
    };

    tabData[details.tabId].requests.push(entry);

    // Cap at 500 requests per tab
    if (tabData[details.tabId].requests.length > 500) {
      tabData[details.tabId].requests.shift();
    }
  },
  { urls: ['<all_urls>'] },
  []
);

// Clear data when tab navigates
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    tabData[tabId] = { requests: [], cookies: [] };
  }
});

// Clean up when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabData[tabId];
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'PAGE_DATA') {
    const tabId = sender.tab?.id;
    if (tabId && tabData[tabId]) {
      tabData[tabId].pageData = msg.data;
    }
  }

  if (msg.type === 'GET_DATA') {
    const tabId = msg.tabId;
    const d = tabData[tabId] || { requests: [] };
    sendResponse({ requests: d.requests || [], pageData: d.pageData || null });
  }

  return true;
});

function classifyRequest(url) {
  const u = url.toLowerCase();
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
  const u = url.toLowerCase();
  if (u.includes('complyauto')) return 'ComplyAuto';
  if (u.includes('onetrust') || u.includes('cookielaw')) return 'OneTrust';
  if (u.includes('cookiebot')) return 'Cookiebot';
  if (u.includes('googletagmanager')) {
    const gtm = url.match(/GTM-[A-Z0-9]+/);
    return 'Google Tag Manager' + (gtm ? ' (' + gtm[0] + ')' : '');
  }
  if (u.includes('google-analytics') || u.includes('gtag/js') || u.includes('analytics.google')) return 'Google Analytics 4';
  if (u.includes('doubleclick') || u.includes('googleadservices')) return 'Google Ads';
  if (u.includes('connect.facebook') || u.includes('facebook.com/tr')) return 'Meta / Facebook Pixel';
  if (u.includes('hotjar')) return 'Hotjar';
  if (u.includes('clarity.ms')) return 'Microsoft Clarity';
  if (u.includes('drift')) return 'Drift Chat';
  if (u.includes('tawk')) return 'Tawk.to Chat';
  try { return new URL(url).hostname; } catch { return 'Unknown'; }
}
