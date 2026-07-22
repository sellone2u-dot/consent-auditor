(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};

  function isComplyAutoControlUrl(url) {
    var u = (url || '').toLowerCase();
    return /complyauto/.test(u) && /(^|\/)blocker\.js(?:[?#]|$)/.test(u);
  }
  function isComplyAutoBannerUrl(url) {
    var u = (url || '').toLowerCase();
    return /complyauto/.test(u) && /(^|\/)banner\.js(?:[?#]|$)/.test(u);
  }
  function classifyRequest(url) {
    var u = (url || '').toLowerCase();
    if (/complyauto|onetrust|cookiebot|cookieconsent|usercentrics|trustarc|osano|cookieyes|quantcast|iubenda|termly|civicuk|didomi/.test(u)) return 'consent';
    if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
    if (/google-analytics|analytics\.google|gtag\/js|collect\?v=|smetrics\.|adobedc|omtrdc|analytics\.yahoo|clarity\.ms|hotjar/.test(u)) return 'analytics';
    if (/doubleclick|googleadservices|googlesyndication|adservice|pagead|facebook\.com\/tr|connect\.facebook|fbevents|ct\.pinterest|teads|stackadapt|fls\.doubleclick/.test(u)) return 'advertising';
    if (/drift|tawk|livechat/.test(u)) return 'functional';
    return 'other';
  }
  function classifyTechnology(text) {
    var u = (text || '').toLowerCase();
    if (/complyauto|onetrust|cookiebot|cookieconsent/.test(u)) return 'consent';
    if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
    if (/google-analytics|gtag\/js|analytics\.js|hotjar|clarity\.ms/.test(u)) return 'analytics';
    if (/doubleclick|googleadservices|googlesyndication|connect\.facebook|fbevents|fbq\(/.test(u)) return 'advertising';
    if (/drift|tawk|livechat|toyota|lexus\.com|drivecentric|dealereprocess|dealer\.com/.test(u)) return 'functional';
    return 'other';
  }
  function nameRequest(url) {
    var u = (url || '').toLowerCase();
    if (isComplyAutoControlUrl(u)) return 'ComplyAuto blocker.js';
    if (isComplyAutoBannerUrl(u)) return 'ComplyAuto banner.js';
    var platforms = (core.constants && core.constants.consentPlatforms) || [];
    for (var i = 0; i < platforms.length; i++) if (platforms[i].patterns.some(function(p){ return u.indexOf(p) > -1; })) return platforms[i].name;
    if (u.indexOf('googletagmanager') > -1) { var g = url.match(/GTM-[A-Z0-9]+/); return 'Google Tag Manager' + (g ? ' (' + g[0] + ')' : ''); }
    if (/google-analytics|analytics\.google|gtag\/js/.test(u)) return 'Google Analytics 4';
    if (/doubleclick|googleadservices/.test(u)) return 'Google Ads';
    if (/connect\.facebook|facebook\.com\/tr/.test(u)) return 'Meta / Facebook Pixel';
    if (/ct\.pinterest|pinterest/.test(u)) return 'Pinterest Tag';
    if (u.indexOf('insight.adsrvr.org') > -1) return 'Trade Desk';
    if (u.indexOf('turn.com') > -1) return 'Turn / Amobee ad-tech';
    if (u.indexOf('rlcdn') > -1 || u.indexOf('demdex') > -1) return 'Identity / audience matching';
    if (u.indexOf('nexus.toyota') > -1 || u.indexOf('shiftdigitalapps') > -1) return 'Toyota / Shift Digital measurement';
    if (u.indexOf('teads') > -1) return 'Teads';
    if (u.indexOf('stackadapt') > -1) return 'StackAdapt';
    if (/smetrics\.lexus|smetrics\.toyota|adobedc|omtrdc/.test(u)) return 'Adobe / OEM Analytics';
    if (u.indexOf('ensighten') > -1) return 'Ensighten Tag Manager';
    if (u.indexOf('hotjar') > -1) return 'Hotjar';
    if (u.indexOf('clarity.ms') > -1) return 'Microsoft Clarity';
    if (u.indexOf('drivecentric') > -1) return 'DriveCentric CRM';
    if (u.indexOf('dealereprocess') > -1) return 'Dealer eProcess';
    if (u.indexOf('tawk') > -1) return 'Tawk.to Chat';
    if (u.indexOf('drift') > -1) return 'Drift Chat';
    try { return new URL(url).hostname; } catch(e) { return 'Unknown'; }
  }
  function categorizeCookie(name) {
    if ((name || '').indexOf('_ga') === 0) return 'Analytics';
    if (['_fbp','_fbc','IDE','NID','_gcl_au','CONSENT','__gads','__gpi'].indexOf(name) > -1) return 'Targeting';
    if (/session|sess|phpsessid/i.test(name || '')) return 'Essential';
    if (/consent|comply|onetrust|cookiebot|cookie/i.test(name || '')) return 'Essential';
    if (/hotjar|_hj|heap|clarity|_clsk|_clck/i.test(name || '')) return 'Analytics';
    return 'Unknown';
  }
  function classifyContainers(ids) {
    var known = (core.constants && core.constants.knownContainers) || {};
    var oem = [], dealer = [], unknown = [];
    (ids || []).forEach(function(id) { if (known[id]) oem.push({id:id, info:known[id]}); else unknown.push(id); });
    return {oem:oem, dealer:dealer, unknown:unknown};
  }
  core.isComplyAutoControlUrl = isComplyAutoControlUrl;
  core.isComplyAutoBannerUrl = isComplyAutoBannerUrl;
  core.classifyRequest = classifyRequest;
  core.classifyTechnology = classifyTechnology;
  core.nameRequest = nameRequest;
  core.categorizeCookie = categorizeCookie;
  core.classifyContainers = classifyContainers;
})(typeof globalThis !== 'undefined' ? globalThis : this);
