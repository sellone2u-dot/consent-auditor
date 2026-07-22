// content.js — runs inside the page at document_start
// Intercepts scripts, tags, cookies, and consent signals as they load

(function() {
  'use strict';

  const data = {
    url: window.location.href,
    hostname: window.location.hostname,
    timestamp: new Date().toISOString(),
    scripts: [],
    gtmContainers: [],
    cmp: null,
    consentSignals: [],
    cookies: [],
    thirdPartyDomains: new Set(),
    dataLayer: [],
    fireOrder: []
  };

  let fireSeq = 0;

  // ── Intercept script tags as they are added to the DOM ──────────────────
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'SCRIPT') {
          const src = node.src || '';
          const inline = node.textContent || '';
          fireSeq++;

          const entry = {
            seq: fireSeq,
            src: src,
            inline: src ? false : true,
            snippet: src ? '' : inline.slice(0, 200)
          };

          // Detect GTM containers
          const gtmMatch = (src + inline).match(/GTM-[A-Z0-9]+/g);
          if (gtmMatch) {
            gtmMatch.forEach(id => {
              if (!data.gtmContainers.includes(id)) {
                data.gtmContainers.push(id);
              }
            });
          }

          // Classify the script
          entry.type = classifyScript(src, inline);
          entry.name = nameScript(src, inline);
          entry.domain = src ? (function() {
            try { return new URL(src).hostname; } catch { return ''; }
          })() : window.location.hostname;
          entry.status = inferStatus(entry.type, entry.name);

          // Track third-party domains
          if (entry.domain && entry.domain !== window.location.hostname && entry.domain !== '') {
            data.thirdPartyDomains.add(entry.domain);
          }

          data.scripts.push(entry);
          data.fireOrder.push({ seq: fireSeq, name: entry.name, type: entry.type, status: entry.status, domain: entry.domain });
        }
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // ── Intercept dataLayer pushes ──────────────────────────────────────────
  const origDataLayer = window.dataLayer;
  window.dataLayer = new Proxy(Array.isArray(origDataLayer) ? origDataLayer : [], {
    get(target, prop) {
      if (prop === 'push') {
        return function(...args) {
          args.forEach(item => {
            if (item && typeof item === 'object') {
              data.dataLayer.push(JSON.parse(JSON.stringify(item)));
              // Check for consent updates
              if (item.event === 'consent_update' || item['0'] === 'consent') {
                data.consentSignals.push({ source: 'dataLayer', value: item });
              }
            }
          });
          return Array.prototype.push.apply(target, args);
        };
      }
      return target[prop];
    }
  });

  // ── Intercept gtag() calls for consent signals ──────────────────────────
  const origGtag = window.gtag;
  window.gtag = function() {
    const args = Array.from(arguments);
    if (args[0] === 'consent') {
      data.consentSignals.push({ source: 'gtag', command: args[1], params: args[2] });
    }
    if (origGtag) origGtag.apply(this, args);
  };

  // ── Detect CMP by known global variables and script patterns ────────────
  function detectCMP() {
    if (window.__tcfapi || window.UC_UI || document.querySelector('[id*="usercentrics"]')) {
      data.cmp = 'Usercentrics';
    } else if (window.OneTrust || window.OnetrustActiveGroups || document.querySelector('#onetrust-consent-sdk')) {
      data.cmp = 'OneTrust';
    } else if (window.Cookiebot || window.CookieConsent) {
      data.cmp = 'Cookiebot';
    } else if (window.ComplyAuto || document.querySelector('[class*="complyauto"]') || document.querySelector('[id*="complyauto"]')) {
      data.cmp = 'ComplyAuto';
    } else if (window.dataLayer && window.dataLayer.some && window.dataLayer.some(d => JSON.stringify(d||'').includes('complyauto'))) {
      data.cmp = 'ComplyAuto';
    }
    // Check script sources already loaded
    document.querySelectorAll('script[src]').forEach(s => {
      if (s.src.includes('complyauto')) data.cmp = 'ComplyAuto';
      if (s.src.includes('onetrust') || s.src.includes('cookielaw')) data.cmp = 'OneTrust';
      if (s.src.includes('cookiebot')) data.cmp = 'Cookiebot';
    });
  }

  // ── Script classification helpers ───────────────────────────────────────
  function classifyScript(src, inline) {
    return RiskAuditorCore.classifyTechnology(src + inline);
  }

  function nameScript(src, inline) {
    const text = src + inline;
    const lowerText = text.toLowerCase();
    if (lowerText.includes('complyauto') && /(^|\/)blocker\.js(?:[?#]|$)/i.test(text)) return 'ComplyAuto blocker.js';
    if (lowerText.includes('complyauto') && /(^|\/)banner\.js(?:[?#]|$)/i.test(text)) return 'ComplyAuto banner.js';
    if (lowerText.includes('complyauto')) return 'ComplyAuto';
    if (text.includes('onetrust') || text.includes('cookielaw')) return 'OneTrust';
    if (text.includes('cookiebot')) return 'Cookiebot';
    const gtm = text.match(/GTM-[A-Z0-9]+/);
    if (text.includes('googletagmanager') || text.includes('gtm.js')) return 'Google Tag Manager' + (gtm ? ' (' + gtm[0] + ')' : '');
    if (text.includes('gtag/js') || text.includes('google-analytics')) return 'Google Analytics / gtag';
    if (text.includes('doubleclick') || text.includes('googleadservices')) return 'Google Ads / DoubleClick';
    if (text.includes('connect.facebook') || text.includes('fbevents')) return 'Meta / Facebook Pixel';
    if (text.includes('hotjar')) return 'Hotjar';
    if (text.includes('clarity.ms')) return 'Microsoft Clarity';
    if (text.includes('drift')) return 'Drift Chat';
    if (text.includes('tawk')) return 'Tawk.to Chat';
    if (src) {
      try { return new URL(src).hostname; } catch {}
    }
    return 'Inline script';
  }

  function inferStatus(type, name) {
    if (type === 'consent') return 'consent-gate';
    if (type === 'tag-manager') return data.cmp ? 'gated' : 'ungated';
    if (type === 'advertising' && name.includes('Facebook')) return data.cmp ? 'needs-verification' : 'firing-without-consent';
    if (type === 'advertising') return data.cmp ? 'needs-verification' : 'firing-without-consent';
    if (type === 'analytics') return data.cmp ? 'restricted-mode' : 'firing-without-consent';
    return 'functional';
  }

  // ── Collect cookies at page load ────────────────────────────────────────
  function collectCookies() {
    data.cookies = document.cookie.split(';').map(c => {
      const [name, ...rest] = c.trim().split('=');
      const value = rest.join('=');
      return {
        name: name.trim(),
        value: value.slice(0, 50),
        category: categorizeCookie(name.trim()),
        firstParty: true
      };
    }).filter(c => c.name);
  }

  function categorizeCookie(name) {
    return RiskAuditorCore.categorizeCookie(name);
  }

  // ── Run detection after page loads ──────────────────────────────────────
  function runDetection() {
    detectCMP();
    collectCookies();

    // Deduplicate fireOrder
    const seen = new Set();
    data.fireOrder = data.fireOrder.filter(f => {
      const key = f.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Convert Set to Array for serialization
    const payload = {
      ...data,
      thirdPartyDomains: Array.from(data.thirdPartyDomains)
    };

    // Store in sessionStorage for popup to read
    try {
      sessionStorage.setItem('__consent_audit_data__', JSON.stringify(payload));
    } catch(e) {}

    // Also send to background
    chrome.runtime.sendMessage({ type: 'PAGE_DATA', data: payload }).catch(() => {});
  }

  // Run on DOM ready and again after full load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(runDetection, 800));
  } else {
    setTimeout(runDetection, 800);
  }
  window.addEventListener('load', () => setTimeout(runDetection, 1500));

})();
