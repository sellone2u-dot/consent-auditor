// popup.js v15 - no-banner workflow, stricter consent scoring, and proof-quality grading

var currentAnalysis = null;

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('scanBtn').addEventListener('click', function() { runScan({ reloadFirst: true }); });
  document.getElementById('tab-firing').addEventListener('click', function() { doTab('firing', this); });
  document.getElementById('tab-cookies').addEventListener('click', function() { doTab('cookies', this); });
  document.getElementById('tab-domains').addEventListener('click', function() { doTab('domains', this); });
  document.getElementById('tab-report').addEventListener('click', function() { doTab('report', this); });
  document.getElementById('copyBtn').addEventListener('click', doCopyText);
  document.getElementById('claudeBtn').addEventListener('click', doCopyMarkdown);
  document.getElementById('downloadMdBtn').addEventListener('click', doDownloadMarkdown);
  document.getElementById('pdfBtn').addEventListener('click', doOpenPdfReport);
  document.getElementById('clearSavedBtn').addEventListener('click', clearSavedReportSet);
  var modeEl = document.getElementById('auditMode');
  if (modeEl) {
    modeEl.value = localStorage.getItem('consentAuditorMode') || 'fresh';
    modeEl.addEventListener('change', function() { localStorage.setItem('consentAuditorMode', modeEl.value); });
  }
  runScan({ reloadFirst: false });
});

function doTab(id, el) {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('on'); });
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
  el.classList.add('on');
  document.getElementById('p-' + id).classList.add('on');
}

function st(msg, spin) {
  document.getElementById('statusBar').innerHTML = spin
    ? '<div class="sp"></div><span>' + msg + '</span>'
    : '<span>' + msg + '</span>';
}

function getAuditMode() {
  var el = document.getElementById('auditMode');
  var mode = el ? el.value : 'fresh';
  var map = {
    fresh: { key:'fresh', label:'Fresh visitor / before consent choice', shortLabel:'Fresh visitor', isPreConsent:true, isAccepted:false, isDenied:false },
    denied: { key:'denied', label:'Denied cookies / reject all', shortLabel:'Denied cookies', isPreConsent:true, isAccepted:false, isDenied:true },
    accepted: { key:'accepted', label:'Accepted cookies / post-consent', shortLabel:'Accepted cookies', isPreConsent:false, isAccepted:true, isDenied:false },
    no_banner: { key:'no_banner', label:'No banner / cannot test Accept-Deny', shortLabel:'No banner', isPreConsent:true, isAccepted:false, isDenied:false, isNoBanner:true },
    current: { key:'current', label:'Current browser state / unknown', shortLabel:'Current browser state', isPreConsent:false, isAccepted:false, isDenied:false }
  };
  return map[mode] || map.fresh;
}

function gradeFromScore(score) {
  return score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
}

function capGrade(grade, cap) {
  var order = ['A','B','C','D','F'];
  return order.indexOf(grade) < order.indexOf(cap) ? cap : grade;
}

function doCopyText() {
  if (!currentAnalysis) return;
  var tips = generateTips(currentAnalysis);
  var text = buildPlainText(currentAnalysis, tips);
  navigator.clipboard.writeText(text).then(function() {
    var btn = document.getElementById('copyBtn');
    btn.classList.add('success');
    btn.textContent = 'Copied';
    setTimeout(function() { btn.classList.remove('success'); btn.textContent = 'Copy Summary'; }, 2500);
  });
}

async function doCopyMarkdown() {
  if (!currentAnalysis) return;
  var tips = generateTips(currentAnalysis);
  var savedStates = await getSavedReportStates(currentAnalysis.hostname);
  var md = buildMarkdown(currentAnalysis, tips, savedStates);
  navigator.clipboard.writeText(md).then(function() {
    var btn = document.getElementById('claudeBtn');
    btn.classList.add('success');
    btn.textContent = 'Copied';
    // Show preview in report tab
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('on'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
    document.getElementById('tab-report').classList.add('on');
    document.getElementById('p-report').classList.add('on');
    document.getElementById('p-report').innerHTML =
      '<div class="report-body">' +
        '<div class="report-meta">Copied to clipboard - paste into a document, email, or vendor message</div>' +
        md.split('\n').filter(function(l){return l.trim();}).slice(0,50).map(function(l){
          if(l.startsWith('# ')) return '<p style="color:#fff;font-size:13px;font-weight:600;margin-bottom:6px">'+l.replace(/^# /,'')+'</p>';
          if(l.startsWith('## ')) return '<p style="color:#6ab4f5;font-size:12px;font-weight:600;margin:8px 0 3px">'+l.replace(/^## /,'')+'</p>';
          if(l.startsWith('### ')) return '<p style="color:#f5bc62;font-size:11px;font-weight:600;margin:6px 0 3px">'+l.replace(/^### /,'')+'</p>';
          if(l.startsWith('> ')) return '<p style="border-left:2px solid #378ADD;padding-left:8px;color:#8b90b0;font-size:11px;margin-bottom:5px">'+l.replace(/^> /,'')+'</p>';
          if(l.startsWith('- **')) return '<p style="color:#f07776;font-size:11px;margin-left:8px;margin-bottom:3px">- '+l.replace(/^- \*\*|\*\*$/g,'')+'</p>';
          if(l.startsWith('- ')) return '<p style="color:#b0b4cc;font-size:11px;margin-left:8px;margin-bottom:2px">- '+l.replace(/^- /,'').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')+'</p>';
          if(l.startsWith('---')) return '<hr style="border-color:#1e2130;margin:6px 0">';
          if(l.match(/^\d\./)) return '<p style="color:#b0b4cc;font-size:11px;margin-bottom:3px">'+l+'</p>';
          if(l.startsWith('|')) return '';
          return '<p style="color:#6b7090;font-size:11px;margin-bottom:2px">'+l.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')+'</p>';
        }).join('') +
      '</div>';
    setTimeout(function() { btn.classList.remove('success'); btn.textContent = 'Copy Markdown'; }, 3000);
  });
}

async function buildCurrentDealerReportMarkdown() {
  var tips = generateTips(currentAnalysis);
  var savedStates = await getSavedReportStates(currentAnalysis.hostname);
  return buildMarkdown(currentAnalysis, tips, savedStates);
}

function safeReportFilename(hostname, extension) {
  var host = (hostname || 'dealer-site').replace(/^www\./i, '').replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '');
  var date = new Date().toISOString().slice(0, 10);
  return host + '-privacy-consent-audit-' + date + '.' + extension;
}

function downloadTextFile(filename, text, mimeType) {
  return new Promise(function(resolve, reject) {
    var blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({ url: url, filename: filename, saveAs: true }, function(downloadId) {
      var err = chrome.runtime.lastError;
      setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
      if (err) reject(new Error(err.message));
      else resolve(downloadId);
    });
  });
}

async function doDownloadMarkdown() {
  if (!currentAnalysis) return;
  var btn = document.getElementById('downloadMdBtn');
  try {
    var md = await buildCurrentDealerReportMarkdown();
    await downloadTextFile(safeReportFilename(currentAnalysis.hostname, 'md'), md, 'text/markdown;charset=utf-8');
    btn.classList.add('success');
    btn.textContent = 'Saved markdown';
    setTimeout(function() { btn.classList.remove('success'); btn.textContent = 'Download MD'; }, 2500);
  } catch (err) {
    st('Download error: ' + err.message, false);
  }
}

async function doOpenPdfReport() {
  if (!currentAnalysis) return;
  var md = await buildCurrentDealerReportMarkdown();
  await storageSet({
    consentAuditorPrintableReport: {
    hostname: currentAnalysis.hostname,
    markdown: md,
    createdAt: new Date().toISOString()
    }
  });
  chrome.tabs.create({ url: chrome.runtime.getURL('print_report.html') });
}

function reportStorageKey(hostname) {
  return 'consentAuditorReports:' + (hostname || 'unknown');
}

function storageGet(keys) {
  return new Promise(function(resolve) {
    chrome.storage.local.get(keys, function(result) { resolve(result || {}); });
  });
}

function storageSet(values) {
  return new Promise(function(resolve) {
    chrome.storage.local.set(values, function() { resolve(); });
  });
}

function storageRemove(keys) {
  return new Promise(function(resolve) {
    chrome.storage.local.remove(keys, function() { resolve(); });
  });
}

function makeReportSnapshot(D) {
  return JSON.parse(JSON.stringify({
    hostname:D.hostname,
    det:D.det,
    hasCMP:D.hasCMP,
    cmp:D.cmp,
    gtmContainers:D.gtmContainers,
    score:D.score,
    grade:D.grade,
    gradeNotes:D.gradeNotes,
    cookies:D.cookies,
    thirdParty:D.thirdParty,
    consentParams:D.consentParams,
    hasRestrictedSignals:D.hasRestrictedSignals,
    hasOnlyGcdSignal:D.hasOnlyGcdSignal,
    analyticsCookieCount:D.analyticsCookieCount,
    consentVerdict:D.consentVerdict,
    complyAutoLoadOrder:D.complyAutoLoadOrder,
    observedSequence:D.observedSequence,
    consentLayer:D.consentLayer,
    federalFlags:D.federalFlags,
    metaCount:D.metaCount,
    googleCount:D.googleCount,
    totalReqs:D.totalReqs,
    auditMode:D.auditMode,
    savedAt:new Date().toISOString()
  }));
}

async function getSavedReportStates(hostname) {
  try {
    var key = reportStorageKey(hostname);
    var result = await storageGet(key);
    var parsed = result[key] || {};
    return Object.keys(parsed).map(function(k) { return parsed[k]; });
  } catch(e) {
    return [];
  }
}

async function saveReportState(D) {
  try {
    var key = reportStorageKey(D.hostname);
    var result = await storageGet(key);
    var parsed = result[key] || {};
    parsed[D.auditMode.key] = makeReportSnapshot(D);
    var values = {};
    values[key] = parsed;
    await storageSet(values);
  } catch(e) {}
}

async function clearSavedReportSet() {
  if (!currentAnalysis) return;
  await storageRemove(reportStorageKey(currentAnalysis.hostname));
  updateSavedReportStatus(currentAnalysis.hostname);
}

async function updateSavedReportStatus(hostname) {
  var box = document.getElementById('savedReportBox');
  var pills = document.getElementById('savedReportPills');
  if (!box || !pills || !hostname) return;
  var states = await getSavedReportStates(hostname);
  var saved = {};
  states.forEach(function(D) { if (D.auditMode) saved[D.auditMode.key] = true; });
  var labels = [
    { key:'fresh', label:'Fresh' },
    { key:'denied', label:'Deny' },
    { key:'accepted', label:'Accept' },
    { key:'no_banner', label:'No banner' }
  ];
  pills.innerHTML = labels.map(function(item) {
    return '<span class="saved-pill ' + (saved[item.key] ? 'on' : '') + '">' + item.label + (saved[item.key] ? ' saved' : ' needed') + '</span>';
  }).join('');
  box.style.display = 'flex';
}

function googleAdPersonalizationStatus(D) {
  if (!D.consentParams.length) {
    return {
      type: 'warn',
      label: 'Google ad personalization: not confirmed',
      tip: 'No Consent Mode v2 ad-personalization signal was captured. Ask the vendor to prove denied/default behavior with Google Tag Assistant.'
    };
  }
  if (D.consentParams.some(function(p) { return /^npa=0$/i.test(p); })) {
    return {
      type: D.auditMode && D.auditMode.isPreConsent ? 'fail' : 'warn',
      label: 'Google ad personalization: does not appear denied',
      tip: 'npa=0 means personalized ads may be allowed. This may be expected after Accept, but should be reviewed if seen before consent or after Deny. Signals: ' + D.consentParams.join(', ')
    };
  }
  if (D.consentParams.some(function(p) { return /^npa=1$/i.test(p); })) {
    return {
      type: 'pass',
      label: 'Google ad personalization: appears denied/restricted',
      tip: 'npa=1 means Google is being told to use non-personalized ads. Signals: ' + D.consentParams.join(', ')
    };
  }
  if (D.consentParams.some(function(p) { return /^pscdl=denied$/i.test(p) || /^ads_data_redaction=1$/i.test(p) || /^gcs=G100$/i.test(p); })) {
    return {
      type: 'pass',
      label: 'Google Consent Mode v2: restricted signal detected',
      tip: 'A denied/default-style signal was captured. Confirm the full consent state with Google Tag Assistant. Signals: ' + D.consentParams.join(', ')
    };
  }
  return {
    type: 'warn',
    label: 'Google Consent Mode v2: signals need verification',
    tip: 'Signals were captured, but they do not clearly prove ad personalization was denied. gcd by itself is not enough. Signals: ' + D.consentParams.join(', ')
  };
}

function behavioralConsentRead(D) {
  var params = (D && D.consentParams) || [];
  var pre = !!(D && D.auditMode && D.auditMode.isPreConsent);
  var restricted = [];
  var concerning = [];
  if (params.some(function(p) { return /^npa=1$/i.test(p); })) restricted.push('npa=1');
  if (params.some(function(p) { return /^pscdl=denied$/i.test(p); })) restricted.push('pscdl=denied');
  if (params.some(function(p) { return /^ads_data_redaction=1$/i.test(p); })) restricted.push('ads_data_redaction=1');
  if (params.some(function(p) { return /^gcs=G100$/i.test(p) || /^gcs=G101$/i.test(p); })) restricted.push(params.filter(function(p) { return /^gcs=G100$/i.test(p) || /^gcs=G101$/i.test(p); }).join(', '));
  if (params.some(function(p) { return /^npa=0$/i.test(p); })) concerning.push('npa=0');
  if (params.some(function(p) { return /^gcs=G111$/i.test(p); })) concerning.push('gcs=G111');

  if (pre && restricted.length && !concerning.length) {
    return {
      type: 'pass',
      label: 'Behavioral consent read: Google appears restricted',
      tip: 'ComplyAuto control-script timing may still be unverified, but observed Google behavior supports a denied/restricted state. Evidence: ' + restricted.join(', ') + '.'
    };
  }
  if (pre && concerning.length) {
    return {
      type: 'fail',
      label: 'Behavioral consent read: Google may not be restricted',
      tip: 'Fresh/Deny-style scans should usually show restricted signals. Review these signals with the vendor: ' + concerning.join(', ') + '.'
    };
  }
  if (params.length) {
    return {
      type: 'warn',
      label: 'Behavioral consent read: signals captured',
      tip: 'Google consent signals were captured, but the selected scan state controls the meaning. Signals: ' + params.join(', ') + '.'
    };
  }
  return {
    type: 'warn',
    label: 'Behavioral consent read: not verified',
    tip: 'No Google consent parameters were captured, so behavior should be verified with Fresh, Deny, and Accept scans.'
  };
}

function classifyTimelineRequest(url) {
  var u = (url || '').toLowerCase();
  if (isComplyAutoControlUrl(u)) return { key:'complyauto', label:'ComplyAuto control script blocker.js', priority:false, marker:'blocker.js', control:true };
  if (isComplyAutoBannerUrl(u)) return { key:'complyauto_banner', label:'ComplyAuto banner script banner.js', priority:false, marker:'banner.js', control:false };
  if (/complyauto/.test(u)) return { key:'complyauto', label:'ComplyAuto', priority:false, marker:'ComplyAuto', control:false };
  if (/onetrust|cookielaw/.test(u)) return { key:'cmp', label:'OneTrust', priority:false };
  if (/cookiebot/.test(u)) return { key:'cmp', label:'Cookiebot', priority:false };
  if (/usercentrics/.test(u)) return { key:'cmp', label:'Usercentrics', priority:false };
  if (/trustarc/.test(u)) return { key:'cmp', label:'TrustArc', priority:false };
  if (/osano/.test(u)) return { key:'cmp', label:'Osano', priority:false };
  if (/cookieyes/.test(u)) return { key:'cmp', label:'CookieYes', priority:false };
  if (/quantcast/.test(u)) return { key:'cmp', label:'Quantcast Choice', priority:false };
  if (/iubenda/.test(u)) return { key:'cmp', label:'iubenda', priority:false };
  if (/termly/.test(u)) return { key:'cmp', label:'Termly', priority:false };
  if (/googletagmanager|gtm\.js/.test(u)) return { key:'gtm', label:'Google Tag Manager', priority:true };
  if (/google-analytics|analytics\.google|gtag\/js|collect\?v=/.test(u)) return { key:'ga', label:'Google Analytics', priority:false };
  if (/doubleclick|googleadservices|googlesyndication|googleads\.g\.doubleclick|pagead|fls\.doubleclick/.test(u)) return { key:'gads', label:'Google Ads / DoubleClick / pagead', priority:true };
  if (/connect\.facebook|facebook\.com\/tr|fbevents|facebook\.net/.test(u)) return { key:'meta', label:'Meta / Facebook', priority:true };
  if (/pinterest|ct\.pinterest|teads|stackadapt|adsrvr|turn\.com|rlcdn|demdex|smetrics\.lexus|smetrics\.toyota|adobe|ensighten|shiftdigitalapps|nexus\.toyota/.test(u)) return { key:'third_party_tracking', label:'Third-party advertising / analytics', priority:false };
  if (/hotjar|clarity\.ms/.test(u)) return { key:'analytics_other', label:'Other analytics', priority:false };
  return null;
}

function isComplyAutoControlUrl(url) {
  var u = (url || '').toLowerCase();
  return /complyauto/.test(u) && /(^|\/)blocker\.js(?:[?#]|$)/.test(u);
}

function isComplyAutoBannerUrl(url) {
  var u = (url || '').toLowerCase();
  return /complyauto/.test(u) && /(^|\/)banner\.js(?:[?#]|$)/.test(u);
}

function evidenceConcernForRequest(url, type) {
  var u = (url || '').toLowerCase();
  if (type === 'consent') return 'Consent layer';
  if (/facebook\.com\/tr|connect\.facebook|fbevents|doubleclick|googleadservices|pagead|ct\.pinterest|teads|stackadapt|adsrvr|turn\.com/.test(u)) return 'Advertising / retargeting concern';
  if (/rlcdn|demdex|smetrics\.|nexus\.toyota|shiftdigitalapps|adobe|ensighten/.test(u)) return 'Measurement / identity review';
  if (/email=|phone=|first[_-]?name|last[_-]?name|credit|finance|lead|customer/.test(u)) return 'Sensitive / personal data concern';
  if (/smetrics\.|google-analytics|analytics\.google|clarity\.ms|hotjar|timeSpent|referrer|pageName|pageview/.test(u)) return 'Measurement review';
  if (type === 'tag-manager') return 'Tag manager';
  if (type === 'functional') return 'Functional / low concern';
  return 'Needs review';
}

function evidenceCategoryForRequest(url, type) {
  if (type === 'consent') return 'consent layer';
  if (type === 'tag-manager') return 'GTM / tag manager';
  if (type === 'advertising') return 'advertising / retargeting';
  if (type === 'analytics') return 'analytics / measurement';
  if (/adsrvr|turn\.com|rlcdn|demdex/.test((url || '').toLowerCase())) return 'ad-tech / identity';
  if (/nexus\.toyota|shiftdigitalapps|smetrics\.|adobe|ensighten/.test((url || '').toLowerCase())) return 'OEM / vendor measurement';
  if (type === 'functional') return 'functional';
  return 'other';
}

function buildObservedSequence(requests, cookies, pageData, hostname) {
  var seq = [];
  var host = hostname || '';
  var requestItems = (requests || []).slice().sort(function(a, b) {
    var as = a.seq || 0, bs = b.seq || 0;
    if (as !== bs) return as - bs;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  requestItems.forEach(function(r, index) {
    var name = nameReq(r.url);
    if (!name) return;
    var type = classReq(r.url);
    var domain = '';
    try { domain = new URL(r.url).hostname; } catch(e) {}
    if (domain && host && domain.indexOf(host.replace('www.','')) > -1 && type === 'other') return;
    seq.push({
      order: r.seq || (index + 1),
      name: name,
      category: evidenceCategoryForRequest(r.url, type),
      concern: evidenceConcernForRequest(r.url, type),
      source: 'network request',
      evidence: r.url,
      domain: domain,
      observedStatus: 'Observed'
    });
  });

  (cookies || []).forEach(function(c, index) {
    var category = c.category === 'Targeting' ? 'targeting cookie' : c.category === 'Analytics' ? 'analytics cookie' : c.category.toLowerCase() + ' cookie';
    seq.push({
      order: 10000 + index,
      name: c.name,
      category: category,
      concern: c.category === 'Targeting' ? 'Advertising / retargeting concern' : c.category === 'Analytics' ? 'Measurement review' : 'Functional / low concern',
      source: 'cookie observed',
      evidence: c.name + ' cookie present during scan',
      domain: '',
      observedStatus: 'Observed, write order not proven'
    });
  });

  if (pageData && pageData.cmp && !seq.some(function(item) { return item.name === pageData.cmp; })) {
    seq.unshift({
      order: 0,
      name: pageData.cmp,
      category: 'consent layer',
      concern: 'Consent layer',
      source: 'page / DOM evidence',
      evidence: pageData.cmp + ' detected on page',
      domain: '',
      observedStatus: 'Detected, load timing not verified'
    });
  }

  return seq.slice(0, 75);
}

function detectConsentLayer(pageData, hasCMP, cmp, auditMode, observedSequence) {
  var bannerEvidence = [];
  var hasBannerText = !!(pageData && pageData.bannerText && pageData.hasRealConsentChoice);
  if (pageData && pageData.bannerText) {
    bannerEvidence.push(pageData.bannerText.slice(0, 160));
  }
  var hasAnyControl = !!(pageData && (pageData.acceptControl || pageData.denyControl || pageData.settingsControl));
  var provider = hasCMP ? (cmp || 'CMP detected - name not identified') : 'None observed';
  var technicalControl = hasCMP ? 'Observed' : 'Not observed';
  var conclusion = 'No consent layer observed';
  if (hasCMP && (hasBannerText || hasAnyControl)) conclusion = 'Consent manager and visitor controls observed';
  else if (hasCMP) conclusion = 'Consent manager appears present, visitor controls not observed';
  else if (hasBannerText || hasAnyControl) conclusion = 'Consent choice UI observed, technical control not proven';
  else conclusion = 'No website consent choice observed';
  if (auditMode && auditMode.isNoBanner) conclusion = 'No website consent choice observed';
  return {
    provider: provider,
    bannerVisible: hasBannerText ? 'Observed' : 'Not observed',
    acceptControl: pageData && pageData.acceptControl ? 'Observed' : 'Not observed',
    denyControl: pageData && pageData.denyControl ? 'Observed' : 'Not observed',
    technicalControl: technicalControl,
    trackingChangedAfterChoice: 'Not tested in this single scan',
    conclusion: conclusion,
    evidence: bannerEvidence.join(' | ')
  };
}

function buildFederalFlags(D) {
  var flags = [];
  if (!D.hasCMP) flags.push('Observed risk indicator: no consent manager was detected while tracking activity was observed.');
  if ((D.auditMode && D.auditMode.isNoBanner) || (D.consentLayer && D.consentLayer.conclusion === 'No website consent choice observed')) flags.push('Observed risk indicator: no website-level consent choice was observed.');
  if (D.complyAutoLoadOrder && D.complyAutoLoadOrder.status === 'after-tracking') flags.push('Observed risk indicator: tracking appeared before the consent layer could be confirmed.');
  if (D.metaCount > 0 && D.auditMode && D.auditMode.isPreConsent) flags.push('Observed risk indicator: Meta/Facebook advertising activity appeared before a confirmed consent choice.');
  if (D.cookies && D.cookies.some(function(c) { return c.category === 'Targeting'; }) && D.auditMode && D.auditMode.isPreConsent) flags.push('Observed risk indicator: targeting cookies were present before a confirmed consent choice.');
  if (D.consentParams && D.consentParams.some(function(p) { return /^npa=0$/i.test(p) || /^gcs=G111$/i.test(p); }) && D.auditMode && D.auditMode.isPreConsent) flags.push('Observed risk indicator: Google ad-personalization signals may indicate advertising was not restricted before consent.');
  if (!flags.length) flags.push('No high-priority observation was automatically triggered by the captured scan data. This is not a legal compliance conclusion.');
  return flags;
}

function requestHasPriorityConsentSignal(url) {
  var u = url || '';
  return /[?&;]npa=0(?:[&;]|$)/i.test(u) || /[?&;]gcs=G111(?:[&;]|$)/i.test(u);
}

function analyzeComplyAutoLoadOrder(requests, cookies, cmpInfo) {
  cmpInfo = cmpInfo || {};
  var sorted = (requests || []).slice().sort(function(a, b) {
    var as = a.seq || 0, bs = b.seq || 0;
    if (as !== bs) return as - bs;
    return (a.timestamp || 0) - (b.timestamp || 0);
  });
  var firsts = {};
  var firstTracking = null;
  var firstComplyAuto = null;
  var firstComplyAutoControl = null;
  var firstComplyAutoBanner = null;
  var priorityBefore = [];

  sorted.forEach(function(r, i) {
    var item = classifyTimelineRequest(r.url);
    if (!item) return;
    var entry = {
      seq: r.seq || (i + 1),
      timestamp: r.timestamp || null,
      label: item.label,
      key: item.key,
      url: r.url
    };
    if (!firsts[item.key]) firsts[item.key] = entry;
    if (item.key === 'complyauto' && !firstComplyAuto) firstComplyAuto = entry;
    if (item.key === 'complyauto' && item.control && !firstComplyAutoControl) firstComplyAutoControl = entry;
    if (item.key === 'complyauto_banner' && !firstComplyAutoBanner) firstComplyAutoBanner = entry;
    if (item.key !== 'complyauto' && item.key !== 'complyauto_banner' && item.key !== 'cmp' && !firstTracking) firstTracking = entry;
  });

  if (!firstComplyAuto && firstComplyAutoBanner) firstComplyAuto = firstComplyAutoBanner;

  function isBeforeComply(entry) {
    var compareTo = firstComplyAutoControl || firstComplyAuto;
    if (!entry || !compareTo) return false;
    if (entry.seq && compareTo.seq && entry.seq !== compareTo.seq) return entry.seq < compareTo.seq;
    if (entry.timestamp && compareTo.timestamp) return entry.timestamp < compareTo.timestamp;
    return false;
  }

  ['meta','gads','gtm'].forEach(function(key) {
    if (isBeforeComply(firsts[key])) priorityBefore.push(firsts[key].label + ' request fired before ComplyAuto control script');
  });
  sorted.forEach(function(r, i) {
    var entry = { seq: r.seq || (i + 1), timestamp: r.timestamp || null, label: 'Google consent/ad signal', url: r.url };
    if (firstComplyAuto && isBeforeComply(entry) && requestHasPriorityConsentSignal(r.url)) {
      if (/[?&;]npa=0(?:[&;]|$)/i.test(r.url)) priorityBefore.push('npa=0 appeared before ComplyAuto control script');
      if (/[?&;]gcs=G111(?:[&;]|$)/i.test(r.url)) priorityBefore.push('gcs=G111 appeared before ComplyAuto control script');
    }
  });

  var targetingNames = (cookies || []).filter(function(c) { return c.category === 'Targeting'; }).map(function(c) { return c.name; });
  var analyticsNames = (cookies || []).filter(function(c) { return c.category === 'Analytics'; }).map(function(c) { return c.name; });
  var watchedTargeting = targetingNames.filter(function(name) { return name === '_fbp' || name === '_gcl_au'; });

  var complyAutoDetectedByPage = !!(cmpInfo.hasCMP && /comply\s*auto/i.test(cmpInfo.cmp || ''));
  var status = 'not-detected';
  var label = 'ComplyAuto not detected';
  var summary = 'No ComplyAuto script or request was found in the scan.';

  if (firstComplyAutoControl && firstTracking) {
    if (isBeforeComply(firstTracking)) {
      status = 'after-tracking';
      label = 'ComplyAuto control script loaded after tracking';
      summary = 'Tracking activity was detected before ComplyAuto control script blocker.js appeared in the request timeline. Because blocker.js determines what content is collected, this should be reviewed.';
    } else if (isBeforeComply(firstComplyAutoControl) || firstComplyAutoControl.seq < firstTracking.seq) {
      status = 'loaded-first';
      label = 'ComplyAuto control script loaded first';
      summary = 'ComplyAuto control script blocker.js was detected before major tracking activity. This indicates the consent control layer was present before Google, Meta, analytics, advertising, or targeting activity was observed.';
    } else {
      status = 'unclear';
      label = 'ComplyAuto control script detected, timing not verified';
      summary = 'ComplyAuto control script blocker.js was detected, but the captured request sequence did not verify whether it initialized before other tracking activity.';
    }
  } else if (firstComplyAutoControl && !firstTracking) {
    status = 'loaded-first';
    label = 'ComplyAuto control script loaded first';
    summary = 'ComplyAuto control script blocker.js was detected and no major tracking request was seen before it in the captured request sequence.';
  } else if (!firstComplyAutoControl && firstComplyAutoBanner) {
    status = 'unclear';
    label = 'ComplyAuto banner detected, control script not observed';
    summary = 'ComplyAuto banner script banner.js was detected, but the control script blocker.js was not observed in the captured request sequence. Because blocker.js is the stronger control evidence, the extension cannot verify ComplyAuto control timing from this scan.';
  } else if (!firstComplyAuto && complyAutoDetectedByPage) {
    status = 'unclear';
    label = 'ComplyAuto visible, blocker.js timing not verified';
    summary = 'ComplyAuto was identified from page or script evidence, but blocker.js was not observed in the captured request sequence. ComplyAuto presence is visible; control timing is not verified.';
  } else if (!firstComplyAuto) {
    status = 'not-detected';
    label = 'ComplyAuto not detected';
    summary = 'No ComplyAuto script or request was found in the scan.';
  } else {
    status = 'unclear';
    label = 'ComplyAuto detected, timing not verified';
    summary = 'ComplyAuto was detected, but the extension could not verify whether blocker.js initialized before other tracking activity.';
  }

  if (!firstComplyAuto && watchedTargeting.length) {
    watchedTargeting.forEach(function(name) { priorityBefore.push(name + ' cookie was present, but ComplyAuto control script was not detected'); });
  }

  return {
    status: status,
    label: label,
    summary: summary,
    firstComplyAuto: firstComplyAuto,
    firstComplyAutoControl: firstComplyAutoControl,
    firstComplyAutoBanner: firstComplyAutoBanner,
    firstTracking: firstTracking,
    firstGtm: firsts.gtm || null,
    firstGoogleAnalytics: firsts.ga || null,
    firstGoogleAds: firsts.gads || null,
    firstMeta: firsts.meta || null,
    firstTargetingCookie: targetingNames.length ? { label: targetingNames[0], orderConfirmed: false } : null,
    firstAnalyticsCookie: analyticsNames.length ? { label: analyticsNames[0], orderConfirmed: false } : null,
    cookieOrderConfirmed: false,
    priorityBeforeComplyAuto: priorityBefore.filter(function(v, i, a) { return a.indexOf(v) === i; })
  };
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise(function(resolve) {
    var done = false;
    var timer = setTimeout(function() {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs || 12000);
    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      setTimeout(function() { resolve(true); }, 1200);
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function runScan(options) {
  options = options || {};
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('emptyArea').style.display = 'none';
  document.getElementById('gradeBar').style.display = 'none';
  document.getElementById('statsRow').style.display = 'none';
  document.getElementById('gtmBar').style.display = 'none';
  document.getElementById('auditStateBox').style.display = 'none';
  document.getElementById('sigBox').style.display = 'none';
  document.getElementById('summaryBlock').style.display = 'none';
  document.getElementById('outputRow').style.display = 'none';
  document.getElementById('savedReportBox').style.display = 'none';
  document.getElementById('tabsEl').style.display = 'none';
  document.getElementById('panelsEl').style.display = 'none';
  st(options.reloadFirst ? 'Reloading page to capture request sequence...' : 'Scanning page...', true);

  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    document.getElementById('urlBar').textContent = tab.url || '-';

    if (options.reloadFirst && tab && tab.id) {
      await chrome.tabs.reload(tab.id, { bypassCache: true });
      await waitForTabComplete(tab.id, 15000);
      st('Collecting evidence after reload...', true);
      var refreshedTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = refreshedTabs[0] || tab;
      document.getElementById('urlBar').textContent = tab.url || '-';
    }

    var bgData = await new Promise(function(res) {
      chrome.runtime.sendMessage({ type: 'GET_DATA', tabId: tab.id }, res);
    });

    var pageData = null;
    try {
      var results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: collectFromPage });
      pageData = results && results[0] ? results[0].result : null;
    } catch(e) {}

    var analysis = buildAnalysis(tab, (bgData && bgData.requests) ? bgData.requests : [], pageData);
    currentAnalysis = analysis;
    await saveReportState(analysis);
    render(analysis);
    updateSavedReportStatus(analysis.hostname);
    document.getElementById('scanBtn').disabled = false;
  } catch(err) {
    st('Error: ' + err.message, false);
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('emptyArea').style.display = 'block';
  }
}

function collectFromPage() {
  function textOf(el) {
    return (el && (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '') || '').replace(/\s+/g, ' ').trim();
  }
  function visible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }
  function isFooterOrPolicyOnly(el, text) {
    var tag = (el.tagName || '').toLowerCase();
    var idClass = ((el.id || '') + ' ' + (el.className || '')).toLowerCase();
    if (tag === 'footer' || el.closest('footer')) return true;
    if (/footer|copyright|sitemap|privacy-policy|site-info|legal/.test(idClass)) return true;
    return /copyright|sitemap|all rights reserved|dealer websites by|contact us/i.test(text || '') &&
      !/accept|allow all|reject|deny|decline|manage preferences|cookie settings/i.test(text || '');
  }
  function consentishContainer(el) {
    var idClass = ((el.id || '') + ' ' + (el.className || '') + ' ' + (el.getAttribute('role') || '')).toLowerCase();
    return /cookie|consent|privacy|cmp|onetrust|trustarc|usercentrics|cookiebot|cookieyes|osano|banner|modal|dialog|notice|preference/.test(idClass);
  }
  function controlKind(el) {
    var text = textOf(el).toLowerCase();
    if (/^(accept|accept all|allow all|agree|i agree|got it|ok|okay)$/.test(text) || /accept all|allow all|i agree/.test(text)) return 'accept';
    if (/reject all|deny all|decline all|deny|reject|decline|do not sell|opt out/.test(text)) return 'deny';
    if (/manage preferences|cookie settings|privacy settings|customize|preferences/.test(text)) return 'settings';
    return null;
  }
  var gtm = {};
  document.querySelectorAll('script').forEach(function(s) {
    var m = ((s.src||'')+(s.textContent||'')).match(/GTM-[A-Z0-9]+/g);
    if (m) m.forEach(function(id) { gtm[id] = true; });
  });
  try {
    (window.dataLayer||[]).forEach(function(d) {
      var m = JSON.stringify(d||'').match(/GTM-[A-Z0-9]+/g);
      if (m) m.forEach(function(id) { gtm[id] = true; });
    });
  } catch(e) {}
  var cmp = null;
  if (window.ComplyAuto) cmp = 'ComplyAuto';
  if (window.OneTrust || window.OnetrustActiveGroups) cmp = 'OneTrust';
  if (window.Cookiebot || window.CookieConsent) cmp = 'Cookiebot';
  document.querySelectorAll('script[src]').forEach(function(s) {
    if (s.src.indexOf('complyauto') > -1) cmp = 'ComplyAuto';
    if (s.src.indexOf('onetrust') > -1 || s.src.indexOf('cookielaw') > -1) cmp = 'OneTrust';
    if (s.src.indexOf('cookiebot') > -1) cmp = 'Cookiebot';
  });
  if (!cmp && document.querySelector('[class*="complyauto"],[id*="complyauto"]')) cmp = 'ComplyAuto';
  if (!cmp && document.querySelector('#onetrust-consent-sdk')) cmp = 'OneTrust';
  if (!cmp && document.querySelector('[id*="usercentrics"],[class*="usercentrics"]')) cmp = 'Usercentrics';
  if (!cmp && document.querySelector('[id*="trustarc"],[class*="trustarc"]')) cmp = 'TrustArc';
  if (!cmp && document.querySelector('[id*="osano"],[class*="osano"]')) cmp = 'Osano';
  if (!cmp && document.querySelector('[id*="cookieyes"],[class*="cookieyes"]')) cmp = 'CookieYes';
  if (!cmp && document.querySelector('[id*="onetrust"],[class*="onetrust"]')) cmp = 'OneTrust';
  if (!cmp) {
    var cmpText = Array.from(document.querySelectorAll('body *')).filter(visible).map(function(el) {
      return textOf(el);
    }).filter(function(text) {
      return text && text.length <= 300 && /powered by complyauto|complyauto/i.test(text);
    }).slice(0, 3).join(' | ');
    if (cmpText) cmp = 'ComplyAuto';
  }
  var controls = Array.from(document.querySelectorAll('button,a,input,[role="button"]')).filter(visible).map(function(el) {
    return { el: el, kind: controlKind(el), text: textOf(el) };
  }).filter(function(item) { return !!item.kind && !isFooterOrPolicyOnly(item.el, item.text); });
  var acceptControl = controls.some(function(item) { return item.kind === 'accept'; });
  var denyControl = controls.some(function(item) { return item.kind === 'deny'; });
  var settingsControl = controls.some(function(item) { return item.kind === 'settings'; });
  var bannerNodes = Array.from(document.querySelectorAll('body *')).filter(function(el) {
    if (!visible(el)) return false;
    var text = textOf(el);
    var lower = text.toLowerCase();
    if (!text || text.length < 20 || text.length > 1200) return false;
    if (isFooterOrPolicyOnly(el, text)) return false;
    if (!/(cookie|cookies|consent|privacy choices|do not sell|reject all|accept all|manage preferences|cookie settings)/i.test(text)) return false;
    if (!consentishContainer(el) && !controls.some(function(item) { return el.contains(item.el) || item.el.contains(el); })) return false;
    return /accept|allow|agree|deny|reject|decline|manage preferences|cookie settings|do not sell|opt out/i.test(lower);
  }).slice(0, 3);
  var bannerText = bannerNodes.map(function(el) { return textOf(el); }).filter(Boolean).join(' | ');
  var hasRealConsentChoice = !!bannerText || acceptControl || denyControl || settingsControl;
  var cookies = document.cookie.split(';').map(function(c) {
    return { name: c.trim().split('=')[0].trim() };
  }).filter(function(c) { return c.name; });
  var scripts = Array.from(document.querySelectorAll('script[src]')).map(function(s) { return s.src; });
  return { gtmContainers: Object.keys(gtm), cmp: cmp, cookies: cookies, scripts: scripts, bannerText: bannerText, acceptControl: acceptControl, denyControl: denyControl, settingsControl: settingsControl, hasRealConsentChoice: hasRealConsentChoice };
}

function buildAnalysis(tab, requests, pageData) {
  var auditMode = getAuditMode();
  var hostname = 'unknown';
  try { hostname = new URL(tab.url).hostname; } catch(e) {}
  var fp = hostname.replace('www.', '');
  var allText = requests.map(function(r) { return r.url; })
    .concat((pageData && pageData.scripts) ? pageData.scripts : []).join(' ').toLowerCase();

  var det = {
    gtm:    allText.indexOf('googletagmanager') > -1 || allText.indexOf('gtm.js') > -1,
    ga4:    allText.indexOf('google-analytics') > -1 || allText.indexOf('gtag/js') > -1 || allText.indexOf('analytics.google') > -1,
    gads:   allText.indexOf('doubleclick') > -1 || allText.indexOf('googleadservices') > -1,
    meta:   allText.indexOf('connect.facebook') > -1 || allText.indexOf('facebook.com/tr') > -1 || allText.indexOf('fbevents') > -1,
    hotjar: allText.indexOf('hotjar') > -1,
    clarity:allText.indexOf('clarity.ms') > -1
  };

  var hasComplyAutoMarker = allText.indexOf('complyauto') > -1;
  var hasCMP = (pageData && !!pageData.cmp) || hasComplyAutoMarker || /onetrust|cookiebot|usercentrics|trustarc|osano|cookieyes|quantcast|iubenda|termly/.test(allText);
  var cmp = (pageData && pageData.cmp) || (hasComplyAutoMarker ? 'ComplyAuto' : allText.indexOf('onetrust') > -1 ? 'OneTrust' : allText.indexOf('cookiebot') > -1 ? 'Cookiebot' : allText.indexOf('usercentrics') > -1 ? 'Usercentrics' : allText.indexOf('trustarc') > -1 ? 'TrustArc' : allText.indexOf('osano') > -1 ? 'Osano' : allText.indexOf('cookieyes') > -1 ? 'CookieYes' : allText.indexOf('quantcast') > -1 ? 'Quantcast Choice' : allText.indexOf('iubenda') > -1 ? 'iubenda' : allText.indexOf('termly') > -1 ? 'Termly' : null);
  var gtmContainers = (pageData && pageData.gtmContainers) ? pageData.gtmContainers : [];

  var consentParams = [];
  requests.filter(function(r) { return /google-analytics|analytics\.google|gtag\/js|googleadservices|doubleclick|pagead/i.test(r.url); }).forEach(function(r) {
    ['gcs','gcd','npa','pscdl','ads_data_redaction'].forEach(function(param) {
      var match = r.url.match(new RegExp('[?&]' + param + '=([^&]+)', 'i'));
      if (match) consentParams.push(param + '=' + decodeURIComponent(match[1]));
    });
  });
  var uniqueParams = consentParams.filter(function(v,i,a) { return a.indexOf(v)===i; });
  // Treat gcd by itself as a Consent Mode v2 indicator, not as proof of restricted/default-denied behavior.
  var hasStrongRestrictedSignals = uniqueParams.some(function(p){ return /^npa=1$/i.test(p) || /^pscdl=denied$/i.test(p) || /^ads_data_redaction=1$/i.test(p) || /^gcs=G100$/i.test(p); });
  var hasConsentSignals = uniqueParams.length > 0;
  var hasOnlyGcdSignal = hasConsentSignals && uniqueParams.every(function(p){ return /^gcd=/i.test(p); });

  var metaReqs = requests.filter(function(r) { return /facebook\.net|facebook\.com\/tr|connect\.facebook|fbevents/i.test(r.url); });
  var googleReqs = requests.filter(function(r) { return /google|doubleclick|googlesyndication/i.test(r.url); });
  var cookies = ((pageData && pageData.cookies) ? pageData.cookies : []).map(function(c) {
    return {name:c.name, category:categorizeCookie(c.name)};
  });
  var targeting = cookies.filter(function(c){return c.category==='Targeting';});
  var analyticsCookies = cookies.filter(function(c){return c.category==='Analytics';});
  var complyAutoLoadOrder = analyzeComplyAutoLoadOrder(requests, cookies, { hasCMP: hasCMP, cmp: cmp });
  var observedSequence = buildObservedSequence(requests, cookies, pageData, hostname);
  var consentLayer = detectConsentLayer(pageData, hasCMP, cmp, auditMode, observedSequence);

  var score = 100;
  var caps = [];
  var notes = [];

  if (!hasCMP) { score -= 45; caps.push('D'); notes.push('No consent manager detected.'); }
  if (auditMode.isPreConsent && det.ga4 && hasCMP && !hasStrongRestrictedSignals) { score -= hasOnlyGcdSignal ? 14 : 20; caps.push('B'); notes.push(hasOnlyGcdSignal ? 'Only gcd was detected; restricted/default-denied Google behavior was not proven.' : 'Google restricted/default-denied behavior not confirmed in a pre-consent style test.'); }
  if (!auditMode.isPreConsent && det.ga4 && hasCMP && !hasConsentSignals) { score -= 3; notes.push('Consent Mode not seen in this selected browser state; confirm separately if needed.'); }
  if (auditMode.isPreConsent && metaReqs.length > 0) { score -= hasCMP ? 25 : 35; caps.push('C'); notes.push('Meta/Facebook fired during a pre-consent or denied-cookie test.'); }
  if (!auditMode.isPreConsent && metaReqs.length > 0 && !auditMode.isAccepted) { score -= 8; notes.push('Meta fired in current/unknown state; determine whether this was after consent.'); }
  if (auditMode.isPreConsent && targeting.length > 0) { score -= hasCMP ? 22 : 32; caps.push('C'); notes.push('Targeting cookies appeared during a pre-consent or denied-cookie test.'); }
  if (!auditMode.isPreConsent && targeting.length > 0 && !auditMode.isAccepted) { score -= 6; notes.push('Targeting cookies appeared in current/unknown state; confirm consent state.'); }
  if (auditMode.isPreConsent && analyticsCookies.length > 0) { score -= 8; caps.push('B'); notes.push('Analytics cookies appeared during a pre-consent or denied-cookie test; verify they are allowed or cookieless.'); }
  if (complyAutoLoadOrder.status === 'after-tracking') {
    score -= auditMode.isPreConsent ? 18 : 8;
    caps.push(auditMode.isPreConsent ? 'D' : 'C');
    notes.push('Tracking activity appeared before ComplyAuto control script blocker.js in the request timeline.');
  }
  if (auditMode.isPreConsent && complyAutoLoadOrder.priorityBeforeComplyAuto.length > 0) {
    score -= 20;
    caps.push('F');
    notes.push('Priority tracking or targeting signals appeared before ComplyAuto control script blocker.js.');
  }
  if (gtmContainers.length > 10) { score -= 15; caps.push('B'); notes.push('Excessive GTM container count creates governance risk.'); }
  else if (gtmContainers.length > 5) { score -= 10; caps.push('B'); notes.push('High GTM container count needs governance confirmation.'); }
  else if (gtmContainers.length > 2) score -= 4;

  score = Math.max(0, Math.min(100, score));
  var grade = gradeFromScore(score);
  caps.forEach(function(cap){ grade = capGrade(grade, cap); });

  var consentVerdict = 'not-confirmed';
  if (hasStrongRestrictedSignals && auditMode.isPreConsent) consentVerdict = 'restricted-before-consent';
  else if (hasConsentSignals) consentVerdict = 'signals-detected';
  else if (auditMode.isAccepted) consentVerdict = 'not-required-for-accepted-only';

  var seen = {}; var fireOrder = [];
  requests.forEach(function(r) {
    if (fireOrder.length >= 20) return;
    var name = nameReq(r.url); if (!name || seen[name]) return;
    var dom = ''; try { dom = new URL(r.url).hostname; } catch(e) {}
    if (dom.indexOf(fp) > -1) return;
    seen[name] = true;
    var type = classReq(r.url);
    var status = 'functional';
    if (type === 'analytics') status = hasStrongRestrictedSignals ? 'restricted' : (hasCMP ? 'verify' : 'ungated');
    else if (type === 'advertising') status = auditMode.isPreConsent ? (hasCMP ? 'verify' : 'ungated') : (auditMode.isAccepted ? 'allowed' : 'verify');
    else if (type === 'tag-manager') status = hasCMP ? 'gated' : 'ungated';
    if (type === 'consent') status = 'consent-gate';
    fireOrder.push({seq:r.seq || (fireOrder.length + 1),name:name,domain:dom,status:status});
  });
  if (pageData && pageData.cmp && !fireOrder.some(function(f) { return f.name === pageData.cmp || /ComplyAuto/.test(f.name || ''); })) {
    fireOrder.unshift({
      seq: 'DOM',
      name: pageData.cmp + ' detected on page',
      domain: 'page evidence',
      status: 'detected'
    });
  }

  var domsSeen = {}; var thirdParty = [];
  requests.forEach(function(r) {
    var h=''; try{h=new URL(r.url).hostname;}catch(e){}
    if (h && h.indexOf(fp)===-1 && !domsSeen[h]) { domsSeen[h]=true; thirdParty.push(h); }
  });

  var analysis = {
    hostname:hostname, det:det, hasCMP:hasCMP, cmp:cmp, gtmContainers:gtmContainers,
    score:score, grade:grade, gradeNotes:notes, fireOrder:fireOrder, cookies:cookies,
    thirdParty:thirdParty, consentParams:uniqueParams, hasRestrictedSignals:hasStrongRestrictedSignals, hasOnlyGcdSignal:hasOnlyGcdSignal, analyticsCookieCount:analyticsCookies.length,
    consentVerdict:consentVerdict, complyAutoLoadOrder:complyAutoLoadOrder, observedSequence:observedSequence, consentLayer:consentLayer, metaCount:metaReqs.length, googleCount:googleReqs.length,
    totalReqs:requests.length, auditMode:auditMode
  };
  analysis.federalFlags = buildFederalFlags(analysis);
  return analysis;
}

function classReq(url) {
  var u = url.toLowerCase();
  if (/complyauto|onetrust|cookiebot|usercentrics|trustarc|osano|cookieyes|quantcast|iubenda|termly/.test(u) || isComplyAutoControlUrl(u) || isComplyAutoBannerUrl(u)) return 'consent';
  if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
  if (/google-analytics|analytics\.google|gtag\/js|collect\?v=|smetrics\.|adobedc|omtrdc|hotjar|clarity\.ms/.test(u)) return 'analytics';
  if (/doubleclick|googleadservices|googlesyndication|pagead|connect\.facebook|facebook\.com\/tr|fbevents|ct\.pinterest|teads|stackadapt|fls\.doubleclick/.test(u)) return 'advertising';
  return 'other';
}

function nameReq(url) {
  var u = url.toLowerCase();
  if (isComplyAutoControlUrl(u)) return 'ComplyAuto blocker.js';
  if (isComplyAutoBannerUrl(u)) return 'ComplyAuto banner.js';
  if (u.indexOf('complyauto')>-1) return 'ComplyAuto';
  if (u.indexOf('onetrust')>-1||u.indexOf('cookielaw')>-1) return 'OneTrust';
  if (u.indexOf('cookiebot')>-1) return 'Cookiebot';
  if (u.indexOf('usercentrics')>-1) return 'Usercentrics';
  if (u.indexOf('trustarc')>-1) return 'TrustArc';
  if (u.indexOf('osano')>-1) return 'Osano';
  if (u.indexOf('cookieyes')>-1) return 'CookieYes';
  if (u.indexOf('quantcast')>-1) return 'Quantcast Choice';
  if (u.indexOf('iubenda')>-1) return 'iubenda';
  if (u.indexOf('termly')>-1) return 'Termly';
  if (u.indexOf('googletagmanager')>-1) { var g=url.match(/GTM-[A-Z0-9]+/); return 'Google Tag Manager'+(g?' ('+g[0]+')':''); }
  if (u.indexOf('google-analytics')>-1||u.indexOf('analytics.google')>-1||u.indexOf('gtag/js')>-1) return 'Google Analytics 4';
  if (u.indexOf('doubleclick')>-1||u.indexOf('googleadservices')>-1) return 'Google Ads';
  if (u.indexOf('connect.facebook')>-1||u.indexOf('facebook.com/tr')>-1) return 'Meta / Facebook Pixel';
  if (u.indexOf('ct.pinterest')>-1||u.indexOf('pinterest')>-1) return 'Pinterest Tag';
  if (u.indexOf('insight.adsrvr.org')>-1) return 'Trade Desk';
  if (u.indexOf('turn.com')>-1) return 'Turn / Amobee ad-tech';
  if (u.indexOf('rlcdn')>-1 || u.indexOf('demdex')>-1) return 'Identity / audience matching';
  if (u.indexOf('nexus.toyota')>-1 || u.indexOf('shiftdigitalapps')>-1) return 'Toyota / Shift Digital measurement';
  if (u.indexOf('teads')>-1) return 'Teads';
  if (u.indexOf('stackadapt')>-1) return 'StackAdapt';
  if (u.indexOf('smetrics.lexus')>-1||u.indexOf('smetrics.toyota')>-1||u.indexOf('adobedc')>-1||u.indexOf('omtrdc')>-1) return 'Adobe / OEM Analytics';
  if (u.indexOf('ensighten')>-1) return 'Ensighten Tag Manager';
  if (u.indexOf('hotjar')>-1) return 'Hotjar';
  if (u.indexOf('clarity.ms')>-1) return 'Microsoft Clarity';
  if (u.indexOf('drivecentric')>-1) return 'DriveCentric CRM';
  if (u.indexOf('dealereprocess')>-1) return 'Dealer eProcess';
  if (u.indexOf('tawk')>-1) return 'Tawk.to Chat';
  if (u.indexOf('drift')>-1) return 'Drift Chat';
  try { return new URL(url).hostname; } catch(e) { return null; }
}

function categorizeCookie(name) {
  if (name.indexOf('_ga')===0) return 'Analytics';
  if (['_fbp','_fbc','IDE','NID','_gcl_au','CONSENT','__gads','__gpi'].indexOf(name)>-1) return 'Targeting';
  if (/session|sess|phpsessid/i.test(name)) return 'Essential';
  if (/consent|comply|onetrust|cookiebot|cookie/i.test(name)) return 'Essential';
  if (/hotjar|_hj|heap|clarity|_clsk|_clck/i.test(name)) return 'Analytics';
  return 'Unknown';
}

function render(D) {
  var gW={A:'Strong',B:'Good / Verify',C:'Needs Review',D:'High Risk',F:'Critical'};
  var gH={A:'No major risk indicators observed.',B:'Mostly positive observations, verify details.',C:'Observed items need vendor review.',D:'Significant risk indicators observed.',F:'Strong risk indicators observed.'};
  var gS={
    A:(D.cmp||'A consent manager')+' is installed and this '+D.auditMode.shortLabel.toLowerCase()+' scan did not show major risk indicators.',
    B:(D.cmp||'A consent manager')+' found. One or more items need confirmation for this test mode.',
    C:'Website behavior should be reviewed with the vendor.',
    D:'Important tracking, consent, or load-order behavior needs prompt review.',
    F:'Strong evidence of behavior that should be addressed quickly was observed.'
  };

  document.getElementById('gradeBar').style.display='flex';
  document.getElementById('gradeBar').innerHTML='<div class="gc g'+D.grade+'"><div class="gl">'+gW[D.grade]+'</div><div class="gw">Observed risk</div></div><div class="gm"><h2>'+gH[D.grade]+'</h2><p>'+gS[D.grade]+'</p></div>';
  var stateBox = document.getElementById('auditStateBox');
  stateBox.style.display = 'block';
  stateBox.innerHTML = '<strong>Consent state tested:</strong> ' + D.auditMode.label + (D.auditMode.isNoBanner ? ' - Accept/Deny states are not available until a website banner is present' : D.auditMode.isPreConsent ? ' - useful evidence for before-consent behavior' : ' - do not use this alone as before-consent proof');

  document.getElementById('statsRow').style.display='flex';
  document.getElementById('statsRow').innerHTML=[
    {v:D.totalReqs,l:'Requests'},{v:D.thirdParty.length,l:'3rd-party'},
    {v:D.cookies.length,l:'Cookies'},{v:D.googleCount,l:'Google'},{v:D.metaCount,l:'Meta'}
  ].map(function(s){return'<div class="stat"><span class="sv">'+s.v+'</span><span class="sl">'+s.l+'</span></div>';}).join('');

  if (D.gtmContainers.length > 0) {
    document.getElementById('gtmBar').style.display='flex';
    var classified = typeof classifyContainers === 'function' ? classifyContainers(D.gtmContainers) : {oem:[]};
    document.getElementById('gtmBar').innerHTML='<span class="gtm-label">GTM ('+D.gtmContainers.length+'):</span>'+
      D.gtmContainers.map(function(id){
        var isOem = classified.oem.some(function(c){return c.id===id;});
        var cls = isOem ? 'gtm-pill oem' : D.gtmContainers.length > 1 ? 'gtm-pill warn' : 'gtm-pill';
        return '<span class="'+cls+'">'+id+'</span>';
      }).join('');
  }

  var sigBox=document.getElementById('sigBox');
  if (D.consentParams.length>0) {
    sigBox.style.display='block'; sigBox.className='sig-box sig-pass';
    sigBox.innerHTML='<div class="sig-label">Google Consent Mode signals </div>'+D.consentParams.join(' - ') + (D.hasRestrictedSignals ? '<br><span style="color:#bde88e">Strong restricted/default-denied behavior detected.</span>' : '');
  } else if (D.det.ga4) {
    sigBox.style.display='block'; sigBox.className='sig-box sig-warn';
    sigBox.innerHTML='<div class="sig-label">Google Consent Mode - not confirmed</div>No gcs/npa/pscdl signals found in this '+D.auditMode.shortLabel.toLowerCase()+' scan.';
  }

  // -- Build summary items - all visible, no tap needed --
  var items = buildSummaryItems(D);
  document.getElementById('summaryItems').innerHTML = items.map(function(item) {
    return '<div class="summary-item si-'+item.type+'">' +
      '<span class="si-icon">'+item.icon+'</span>' +
      '<div class="si-text">' +
        '<span class="si-label">'+item.label+'</span>' +
        '<span class="si-tip">'+item.tip+'</span>' +
      '</div>' +
    '</div>';
  }).join('');
  document.getElementById('summaryBlock').style.display='block';

  st(D.totalReqs+' requests - '+D.thirdParty.length+' 3rd-party - '+D.cookies.length+' cookies', false);
  document.getElementById('outputRow').style.display='flex';

  // Observed load tab
  var stMap={'consent-gate':['fbl','consent tool'],detected:['fbl','load not verified'],gated:['fa2','CMP present'],restricted:['fg','restricted'],blocked:['fg','blocked'],allowed:['fg','allowed'],verify:['fa2','review'],ungated:['fr2','no CMP seen'],functional:['fk','site function']};
  document.getElementById('p-firing').innerHTML=D.fireOrder.length
    ?'<div class="sh">Captured request sequence - not full execution order</div>'+D.fireOrder.map(function(f){
        var s=stMap[f.status]||['fk',f.status];
        return'<div class="fi-row"><div class="fnum">'+f.seq+'</div><div class="fmain"><div class="fn2">'+f.name+'</div><div class="fdom">'+f.domain+'</div></div><span class="fbg2 '+s[0]+'">'+s[1]+'</span></div>';
      }).join('')
    :'<div class="empty"><span></span><p>Reload page then scan again.</p></div>';

  // Cookies tab
  var groups=[
    {label:'Targeting - require consent',items:D.cookies.filter(function(c){return c.category==='Targeting';}),cls:'br'},
    {label:'Analytics',items:D.cookies.filter(function(c){return c.category==='Analytics';}),cls:'bw'},
    {label:'Essential - no consent needed',items:D.cookies.filter(function(c){return c.category==='Essential';}),cls:'bp'},
    {label:'Unknown',items:D.cookies.filter(function(c){return c.category==='Unknown';}),cls:'bi'},
  ].filter(function(g){return g.items.length>0;});
  document.getElementById('p-cookies').innerHTML=D.cookies.length
    ?groups.map(function(g){
        return'<div class="sh">'+g.label+' ('+g.items.length+')</div>'+
          g.items.map(function(c){return'<div class="ck-row"><div class="ck-name">'+c.name+'</div><span class="fb '+g.cls+'">'+c.category+'</span></div>';}).join('');
      }).join('')
    :'<div class="empty"><span></span><p>No cookies read yet.</p></div>';

  // Domains tab
  document.getElementById('p-domains').innerHTML=D.thirdParty.length
    ?'<div class="sh">Third-party domains</div>'+D.thirdParty.map(function(d){
        var cls=/google|doubleclick/i.test(d)?'bw':/facebook/i.test(d)?'br':/complyauto|onetrust|cookiebot/i.test(d)?'bp':'bi';
        var lbl=/google|doubleclick/i.test(d)?'Google':/facebook/i.test(d)?'Meta':/complyauto|onetrust|cookiebot/i.test(d)?'Consent':'3rd party';
        return'<div class="dom-row"><div class="dom-name">'+d+'</div><span class="fb '+cls+'">'+lbl+'</span></div>';
      }).join('')
    :'<div class="empty"><span></span><p>No third-party domains detected.</p></div>';

  document.getElementById('tabsEl').style.display='flex';
  document.getElementById('panelsEl').style.display='block';
  document.getElementById('emptyArea').style.display='none';
}

function buildSummaryItems(D) {
  var items = [];
  var isPre = D.auditMode && D.auditMode.isPreConsent;
  var mode = D.auditMode ? D.auditMode.shortLabel.toLowerCase() : 'current browser state';

  // Test state
  if (D.auditMode && D.auditMode.isNoBanner) {
    items.push({type:'fail', icon:'Issue', label:'No banner / cannot test Accept-Deny', tip:'No website-level consent choice was available. Save this as no-banner evidence; do not mark Accept or Deny as complete until the site shows real controls.'});
  } else {
    items.push({type:isPre?'pass':'warn', icon:isPre?'OK':'Review', label:'Test mode: '+(D.auditMode ? D.auditMode.label : 'Current browser state'), tip:isPre?'This is the strongest state for proving before-consent or deny-cookie behavior.':'This scan is useful, but it should not be presented as before-consent proof unless the mode matches the browser state.'});
  }

  // CMP
  if (D.hasCMP) {
    items.push({type:'pass', icon:'OK', label:'Consent manager: '+D.cmp+' installed', tip:'Consent gate is present. Use fresh visitor and deny-cookie scans to prove the gate actually controls tracking.'});
  } else {
    items.push({type:'fail', icon:'Issue', label:'NO CONSENT MANAGER FOUND', tip:'No visible consent platform was detected. Install or confirm ComplyAuto, OneTrust, Cookiebot, or the active CMP immediately.'});
  }

  if (D.consentLayer) {
    var layerType = /No consent|vanity/i.test(D.consentLayer.conclusion) ? 'fail' : /Simple banner|not proven/i.test(D.consentLayer.conclusion) ? 'warn' : 'pass';
    items.push({type:layerType, icon:layerType === 'pass' ? 'OK' : layerType === 'fail' ? 'Issue' : 'Review', label:'Consent layer: '+D.consentLayer.conclusion, tip:'Provider: '+D.consentLayer.provider+' - Banner: '+D.consentLayer.bannerVisible+' - Accept: '+D.consentLayer.acceptControl+' - Deny: '+D.consentLayer.denyControl});
  }

  // ComplyAuto control evidence
  if (D.complyAutoLoadOrder) {
    var lo = D.complyAutoLoadOrder;
    var loType = lo.status === 'loaded-first' ? 'pass' : lo.status === 'after-tracking' ? 'fail' : 'warn';
    var loIcon = loType === 'pass' ? 'OK' : loType === 'fail' ? 'Issue' : 'Review';
    items.push({type:loType, icon:loIcon, label:'ComplyAuto control evidence: '+lo.label, tip:lo.summary});
  }

  // GTM containers
  if (D.gtmContainers.length > 5) {
    var classified = typeof classifyContainers === 'function' ? classifyContainers(D.gtmContainers) : {oem:[]};
    var oemNote = classified.oem.length > 0 ? ' ' + classified.oem.length + ' appear to be OEM/manufacturer containers outside dealer control.' : '';
    items.push({type:'fail', icon:'Issue', label:D.gtmContainers.length+' GTM CONTAINERS - unusually high', tip:'Industry average is commonly 2-4.' + oemNote + ' Ask which containers your CMP actually governs.'});
  } else if (D.gtmContainers.length > 1) {
    items.push({type:'warn', icon:'Review', label:D.gtmContainers.length+' GTM containers - verify coverage', tip:'Multiple containers can independently load tags. Ask your vendor which containers are governed by the consent manager.'});
  } else if (D.gtmContainers.length === 1) {
    items.push({type:'pass', icon:'OK', label:'1 GTM container detected', tip:'Single-container setups are easier to govern. Still confirm CMP coverage.'});
  }

  // Google Consent Mode
  if (D.consentParams.length > 0) {
    var googleStatus = googleAdPersonalizationStatus(D);
    items.push({type:googleStatus.type, icon:googleStatus.type === 'pass' ? 'OK' : googleStatus.type === 'fail' ? 'Issue' : 'Review', label:googleStatus.label, tip:googleStatus.tip});
    var behaviorStatus = behavioralConsentRead(D);
    items.push({type:behaviorStatus.type, icon:behaviorStatus.type === 'pass' ? 'OK' : behaviorStatus.type === 'fail' ? 'Issue' : 'Review', label:behaviorStatus.label, tip:behaviorStatus.tip});
  } else if (D.det.ga4 && D.hasCMP && isPre) {
    items.push({type:'fail', icon:'Issue', label:'GOOGLE CONSENT MODE NOT CONFIRMED', tip:D.cmp+' is installed but no gcs/npa/pscdl signals were detected in this '+mode+' scan. Ask whether Consent Mode v2 is active.'});
  } else if (D.det.ga4 && D.hasCMP) {
    items.push({type:'warn', icon:'Review', label:'Google Consent Mode not seen in this scan', tip:'Because this was '+mode+', this does not prove a pre-consent failure. Confirm using fresh incognito and deny-cookie tests.'});
  } else if (D.det.ga4) {
    items.push({type:'fail', icon:'Issue', label:'GOOGLE ANALYTICS WITH NO CONSENT CONTROLS', tip:'GA4 was detected without a consent manager or consent signals.'});
  }

  // Meta
  if (D.metaCount === 0 && isPre) {
    items.push({type:'pass', icon:'OK', label:'No Meta/Facebook requests before consent', tip:'No Meta requests fired during this '+mode+' scan. Repeat after Deny to confirm it stays blocked.'});
  } else if (D.metaCount === 0) {
    items.push({type:'pass', icon:'OK', label:'No Meta/Facebook requests in this session', tip:'No Meta requests fired during this '+mode+' scan. This may mean the pixel is blocked, absent, or not triggered on this page.'});
  } else if (D.hasCMP && isPre) {
    items.push({type:'fail', icon:'Issue', label:'META FIRED '+D.metaCount+' TIMES BEFORE CONSENT', tip:'This is a serious finding for a fresh visitor or deny-cookie scan. Ask the CMP/vendor why Meta was not blocked.'});
  } else if (D.hasCMP) {
    items.push({type:'warn', icon:'Review', label:'Meta fired '+D.metaCount+' times', tip:'This may be expected after accepting cookies. Do not treat it as a failure unless it occurred before consent or after Deny.'});
  } else {
    items.push({type:'fail', icon:'Issue', label:'META PIXEL UNGATED - '+D.metaCount+' requests fired', tip:'Meta fired with no consent manager detected.'});
  }

  // Targeting cookies
  var targeting = D.cookies.filter(function(c){return c.category==='Targeting';});
  if (targeting.length === 0 && isPre) {
    items.push({type:'pass', icon:'OK', label:'No targeting cookies before consent', tip:'Ad-targeting cookies were not detected in this '+mode+' scan.'});
  } else if (targeting.length === 0) {
    items.push({type:'pass', icon:'OK', label:'No targeting cookies in this session', tip:'No targeting cookies were detected in this '+mode+' scan. This does not by itself prove before-consent gating.'});
  } else if (isPre) {
    items.push({type:'fail', icon:'Issue', label:targeting.length+' targeting cookie'+(targeting.length>1?'s':'')+' before consent', tip:'These require explicit consent. Flag these cookies with your vendor: '+targeting.map(function(c){return c.name;}).join(', ')});
  } else {
    items.push({type:'warn', icon:'Review', label:targeting.length+' targeting cookie'+(targeting.length>1?'s':'')+' found', tip:'This may be expected after Accept. Confirm they do not appear in fresh visitor or Deny scans.'});
  }

  return items;
}


