// popup.js v13 — stricter consent scoring and proof-quality grading

var currentAnalysis = null;

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('scanBtn').addEventListener('click', runScan);
  document.getElementById('tab-firing').addEventListener('click', function() { doTab('firing', this); });
  document.getElementById('tab-cookies').addEventListener('click', function() { doTab('cookies', this); });
  document.getElementById('tab-domains').addEventListener('click', function() { doTab('domains', this); });
  document.getElementById('tab-report').addEventListener('click', function() { doTab('report', this); });
  document.getElementById('copyBtn').addEventListener('click', doCopyText);
  document.getElementById('claudeBtn').addEventListener('click', doCopyMarkdown);
  var modeEl = document.getElementById('auditMode');
  if (modeEl) {
    modeEl.value = localStorage.getItem('consentAuditorMode') || 'fresh';
    modeEl.addEventListener('change', function() { localStorage.setItem('consentAuditorMode', modeEl.value); });
  }
  runScan();
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
    btn.textContent = '✓ Copied!';
    setTimeout(function() { btn.classList.remove('success'); btn.textContent = '📋 Copy report'; }, 2500);
  });
}

function doCopyMarkdown() {
  if (!currentAnalysis) return;
  var tips = generateTips(currentAnalysis);
  var md = buildMarkdown(currentAnalysis, tips);
  navigator.clipboard.writeText(md).then(function() {
    var btn = document.getElementById('claudeBtn');
    btn.classList.add('success');
    btn.textContent = '✓ Copied!';
    // Show preview in report tab
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('on'); });
    document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('on'); });
    document.getElementById('tab-report').classList.add('on');
    document.getElementById('p-report').classList.add('on');
    document.getElementById('p-report').innerHTML =
      '<div class="report-body">' +
        '<div class="report-meta">✅ Copied to clipboard — paste into any .md file, email, or Claude chat</div>' +
        md.split('\n').filter(function(l){return l.trim();}).slice(0,50).map(function(l){
          if(l.startsWith('# ')) return '<p style="color:#fff;font-size:13px;font-weight:600;margin-bottom:6px">'+l.replace(/^# /,'')+'</p>';
          if(l.startsWith('## ')) return '<p style="color:#6ab4f5;font-size:12px;font-weight:600;margin:8px 0 3px">'+l.replace(/^## /,'')+'</p>';
          if(l.startsWith('### ')) return '<p style="color:#f5bc62;font-size:11px;font-weight:600;margin:6px 0 3px">'+l.replace(/^### /,'')+'</p>';
          if(l.startsWith('> ')) return '<p style="border-left:2px solid #378ADD;padding-left:8px;color:#8b90b0;font-size:11px;margin-bottom:5px">'+l.replace(/^> /,'')+'</p>';
          if(l.startsWith('- **')) return '<p style="color:#f07776;font-size:11px;margin-left:8px;margin-bottom:3px">✗ '+l.replace(/^- \*\*|\*\*$/g,'')+'</p>';
          if(l.startsWith('- ')) return '<p style="color:#b0b4cc;font-size:11px;margin-left:8px;margin-bottom:2px">• '+l.replace(/^- /,'').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')+'</p>';
          if(l.startsWith('---')) return '<hr style="border-color:#1e2130;margin:6px 0">';
          if(l.match(/^\d\./)) return '<p style="color:#b0b4cc;font-size:11px;margin-bottom:3px">'+l+'</p>';
          if(l.startsWith('|')) return '';
          return '<p style="color:#6b7090;font-size:11px;margin-bottom:2px">'+l.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')+'</p>';
        }).join('') +
      '</div>';
    setTimeout(function() { btn.classList.remove('success'); btn.textContent = '🤖 Copy AI markdown'; }, 3000);
  });
}

async function runScan() {
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('emptyArea').style.display = 'none';
  document.getElementById('gradeBar').style.display = 'none';
  document.getElementById('statsRow').style.display = 'none';
  document.getElementById('gtmBar').style.display = 'none';
  document.getElementById('auditStateBox').style.display = 'none';
  document.getElementById('sigBox').style.display = 'none';
  document.getElementById('summaryBlock').style.display = 'none';
  document.getElementById('outputRow').style.display = 'none';
  document.getElementById('tabsEl').style.display = 'none';
  document.getElementById('panelsEl').style.display = 'none';
  st('Scanning page…', true);

  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    var tab = tabs[0];
    document.getElementById('urlBar').textContent = tab.url || '—';

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
    render(analysis);
    document.getElementById('scanBtn').disabled = false;
  } catch(err) {
    st('Error: ' + err.message, false);
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('emptyArea').style.display = 'block';
  }
}

function collectFromPage() {
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
  var cookies = document.cookie.split(';').map(function(c) {
    return { name: c.trim().split('=')[0].trim() };
  }).filter(function(c) { return c.name; });
  var scripts = Array.from(document.querySelectorAll('script[src]')).map(function(s) { return s.src; });
  return { gtmContainers: Object.keys(gtm), cmp: cmp, cookies: cookies, scripts: scripts };
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

  var hasCMP = (pageData && !!pageData.cmp) || allText.indexOf('complyauto') > -1 || allText.indexOf('onetrust') > -1 || allText.indexOf('cookiebot') > -1;
  var cmp = (pageData && pageData.cmp) || (allText.indexOf('complyauto') > -1 ? 'ComplyAuto' : allText.indexOf('onetrust') > -1 ? 'OneTrust' : allText.indexOf('cookiebot') > -1 ? 'Cookiebot' : null);
  var gtmContainers = (pageData && pageData.gtmContainers) ? pageData.gtmContainers : [];

  var consentParams = [];
  requests.filter(function(r) { return /google-analytics|analytics\.google|gtag\/js|googleadservices|doubleclick|pagead/i.test(r.url); }).forEach(function(r) {
    var g = r.url.match(/[?&]gcs=([^&]+)/); if (g) consentParams.push('gcs='+decodeURIComponent(g[1]));
    var gcd = r.url.match(/[?&]gcd=([^&]+)/); if (gcd) consentParams.push('gcd='+decodeURIComponent(gcd[1]));
    if (r.url.indexOf('npa=1') > -1) consentParams.push('npa=1');
    if (r.url.indexOf('pscdl=denied') > -1) consentParams.push('pscdl=denied');
    if (r.url.indexOf('ads_data_redaction=1') > -1) consentParams.push('ads_data_redaction=1');
  });
  var uniqueParams = consentParams.filter(function(v,i,a) { return a.indexOf(v)===i; });
  // Treat gcd by itself as a Consent Mode v2 indicator, not as proof of restricted/default-denied behavior.
  var hasStrongRestrictedSignals = uniqueParams.some(function(p){ return /npa=1|pscdl=denied|ads_data_redaction=1|gcs=G100/i.test(p); });
  var hasConsentSignals = uniqueParams.length > 0;
  var hasOnlyGcdSignal = hasConsentSignals && uniqueParams.every(function(p){ return /^gcd=/i.test(p); });

  var metaReqs = requests.filter(function(r) { return /facebook\.net|facebook\.com\/tr|connect\.facebook|fbevents/i.test(r.url); });
  var googleReqs = requests.filter(function(r) { return /google|doubleclick|googlesyndication/i.test(r.url); });
  var cookies = ((pageData && pageData.cookies) ? pageData.cookies : []).map(function(c) {
    return {name:c.name, category:categorizeCookie(c.name)};
  });
  var targeting = cookies.filter(function(c){return c.category==='Targeting';});
  var analyticsCookies = cookies.filter(function(c){return c.category==='Analytics';});

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

  var seen = {}; var fireOrder = []; var seq = 1;
  if (hasCMP && cmp) { seen[cmp]=true; fireOrder.push({seq:seq++,name:cmp+' (consent gate)',domain:'consent platform',status:'consent-gate'}); }
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
    fireOrder.push({seq:seq++,name:name,domain:dom,status:status});
  });

  var domsSeen = {}; var thirdParty = [];
  requests.forEach(function(r) {
    var h=''; try{h=new URL(r.url).hostname;}catch(e){}
    if (h && h.indexOf(fp)===-1 && !domsSeen[h]) { domsSeen[h]=true; thirdParty.push(h); }
  });

  return {
    hostname:hostname, det:det, hasCMP:hasCMP, cmp:cmp, gtmContainers:gtmContainers,
    score:score, grade:grade, gradeNotes:notes, fireOrder:fireOrder, cookies:cookies,
    thirdParty:thirdParty, consentParams:uniqueParams, hasRestrictedSignals:hasStrongRestrictedSignals, hasOnlyGcdSignal:hasOnlyGcdSignal, analyticsCookieCount:analyticsCookies.length,
    consentVerdict:consentVerdict, metaCount:metaReqs.length, googleCount:googleReqs.length,
    totalReqs:requests.length, auditMode:auditMode
  };
}

function classReq(url) {
  var u = url.toLowerCase();
  if (/complyauto|onetrust|cookiebot/.test(u)) return 'consent';
  if (/googletagmanager|gtm\.js/.test(u)) return 'tag-manager';
  if (/google-analytics|analytics\.google|gtag\/js|collect\?v=/.test(u)) return 'analytics';
  if (/doubleclick|googleadservices|googlesyndication/.test(u)) return 'advertising';
  if (/connect\.facebook|facebook\.com\/tr|fbevents/.test(u)) return 'advertising';
  if (/hotjar|clarity\.ms/.test(u)) return 'analytics';
  return 'other';
}

function nameReq(url) {
  var u = url.toLowerCase();
  if (u.indexOf('complyauto')>-1) return 'ComplyAuto';
  if (u.indexOf('onetrust')>-1||u.indexOf('cookielaw')>-1) return 'OneTrust';
  if (u.indexOf('cookiebot')>-1) return 'Cookiebot';
  if (u.indexOf('googletagmanager')>-1) { var g=url.match(/GTM-[A-Z0-9]+/); return 'Google Tag Manager'+(g?' ('+g[0]+')':''); }
  if (u.indexOf('google-analytics')>-1||u.indexOf('analytics.google')>-1||u.indexOf('gtag/js')>-1) return 'Google Analytics 4';
  if (u.indexOf('doubleclick')>-1||u.indexOf('googleadservices')>-1) return 'Google Ads';
  if (u.indexOf('connect.facebook')>-1||u.indexOf('facebook.com/tr')>-1) return 'Meta / Facebook Pixel';
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
  var gW={A:'Great',B:'Good',C:'Fair',D:'At Risk',F:'Critical'};
  var gH={A:'Strong consent practices detected.',B:'Mostly compliant — a few things to confirm.',C:'Consent gaps need attention.',D:'Significant consent issues.',F:'Tracking without consent controls.'};
  var gS={
    A:(D.cmp||'A consent manager')+' is installed and this '+D.auditMode.shortLabel.toLowerCase()+' scan looks clean.',
    B:(D.cmp||'A consent manager')+' found. One or more items need confirmation for this test mode.',
    C:'Consent gaps detected. Vendor confirmation needed.',
    D:'No consent manager, or key tools firing without permission.',
    F:'No consent manager. Tracking fires on every visitor immediately.'
  };

  document.getElementById('gradeBar').style.display='flex';
  document.getElementById('gradeBar').innerHTML='<div class="gc g'+D.grade+'"><div class="gl">'+D.grade+'</div><div class="gw">'+gW[D.grade]+'</div></div><div class="gm"><h2>'+gH[D.grade]+'</h2><p>'+gS[D.grade]+'</p></div>';
  var stateBox = document.getElementById('auditStateBox');
  stateBox.style.display = 'block';
  stateBox.innerHTML = '<strong>Consent state tested:</strong> ' + D.auditMode.label + (D.auditMode.isPreConsent ? ' · best evidence for before-consent compliance' : ' · do not use this alone as before-consent proof');

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
    sigBox.innerHTML='<div class="sig-label">Google Consent Mode signals ✓</div>'+D.consentParams.join(' · ') + (D.hasRestrictedSignals ? '<br><span style="color:#bde88e">Strong restricted/default-denied behavior detected.</span>' : '');
  } else if (D.det.ga4) {
    sigBox.style.display='block'; sigBox.className='sig-box sig-warn';
    sigBox.innerHTML='<div class="sig-label">Google Consent Mode — not confirmed</div>No gcs/npa/pscdl signals found in this '+D.auditMode.shortLabel.toLowerCase()+' scan.';
  }

  // ── Build summary items — all visible, no tap needed ──
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

  st(D.totalReqs+' requests · '+D.thirdParty.length+' 3rd-party · '+D.cookies.length+' cookies', false);
  document.getElementById('outputRow').style.display='flex';

  // Firing order tab
  var stMap={'consent-gate':['fbl','1st ✓'],gated:['fa2','gated'],restricted:['fg','restricted ✓'],blocked:['fg','blocked ✓'],allowed:['fg','allowed'],verify:['fa2','verify'],ungated:['fr2','no gate ✗'],functional:['fk','functional']};
  document.getElementById('p-firing').innerHTML=D.fireOrder.length
    ?'<div class="sh">Script / tag load sequence</div>'+D.fireOrder.map(function(f){
        var s=stMap[f.status]||['fk',f.status];
        return'<div class="fi-row"><div class="fnum">'+f.seq+'</div><div class="fn2">'+f.name+'</div><div class="fdom">'+f.domain+'</div><span class="fbg2 '+s[0]+'">'+s[1]+'</span></div>';
      }).join('')
    :'<div class="empty"><span>📋</span><p>Reload page then scan again.</p></div>';

  // Cookies tab
  var groups=[
    {label:'Targeting — require consent',items:D.cookies.filter(function(c){return c.category==='Targeting';}),cls:'br'},
    {label:'Analytics',items:D.cookies.filter(function(c){return c.category==='Analytics';}),cls:'bw'},
    {label:'Essential — no consent needed',items:D.cookies.filter(function(c){return c.category==='Essential';}),cls:'bp'},
    {label:'Unknown',items:D.cookies.filter(function(c){return c.category==='Unknown';}),cls:'bi'},
  ].filter(function(g){return g.items.length>0;});
  document.getElementById('p-cookies').innerHTML=D.cookies.length
    ?groups.map(function(g){
        return'<div class="sh">'+g.label+' ('+g.items.length+')</div>'+
          g.items.map(function(c){return'<div class="ck-row"><div class="ck-name">'+c.name+'</div><span class="fb '+g.cls+'">'+c.category+'</span></div>';}).join('');
      }).join('')
    :'<div class="empty"><span>🍪</span><p>No cookies read yet.</p></div>';

  // Domains tab
  document.getElementById('p-domains').innerHTML=D.thirdParty.length
    ?'<div class="sh">Third-party domains</div>'+D.thirdParty.map(function(d){
        var cls=/google|doubleclick/i.test(d)?'bw':/facebook/i.test(d)?'br':/complyauto|onetrust|cookiebot/i.test(d)?'bp':'bi';
        var lbl=/google|doubleclick/i.test(d)?'Google':/facebook/i.test(d)?'Meta':/complyauto|onetrust|cookiebot/i.test(d)?'Consent':'3rd party';
        return'<div class="dom-row"><div class="dom-name">'+d+'</div><span class="fb '+cls+'">'+lbl+'</span></div>';
      }).join('')
    :'<div class="empty"><span>🌐</span><p>No third-party domains detected.</p></div>';

  document.getElementById('tabsEl').style.display='flex';
  document.getElementById('panelsEl').style.display='block';
  document.getElementById('emptyArea').style.display='none';
}

function buildSummaryItems(D) {
  var items = [];
  var isPre = D.auditMode && D.auditMode.isPreConsent;
  var mode = D.auditMode ? D.auditMode.shortLabel.toLowerCase() : 'current browser state';

  // Test state
  items.push({type:isPre?'pass':'warn', icon:isPre?'✅':'⚠️', label:'Test mode: '+(D.auditMode ? D.auditMode.label : 'Current browser state'), tip:isPre?'This is the strongest state for proving before-consent or deny-cookie behavior.':'This scan is useful, but it should not be presented as before-consent proof unless the mode matches the browser state.'});

  // CMP
  if (D.hasCMP) {
    items.push({type:'pass', icon:'✅', label:'Consent manager: '+D.cmp+' installed', tip:'Consent gate is present. Use fresh visitor and deny-cookie scans to prove the gate actually controls tracking.'});
  } else {
    items.push({type:'fail', icon:'❌', label:'NO CONSENT MANAGER FOUND', tip:'No visible consent platform was detected. Install or confirm ComplyAuto, OneTrust, Cookiebot, or the active CMP immediately.'});
  }

  // GTM containers
  if (D.gtmContainers.length > 5) {
    var classified = typeof classifyContainers === 'function' ? classifyContainers(D.gtmContainers) : {oem:[]};
    var oemNote = classified.oem.length > 0 ? ' ' + classified.oem.length + ' appear to be OEM/manufacturer containers outside dealer control.' : '';
    items.push({type:'fail', icon:'❌', label:D.gtmContainers.length+' GTM CONTAINERS — unusually high', tip:'Industry average is commonly 2–4.' + oemNote + ' Ask which containers your CMP actually governs.'});
  } else if (D.gtmContainers.length > 1) {
    items.push({type:'warn', icon:'⚠️', label:D.gtmContainers.length+' GTM containers — verify coverage', tip:'Multiple containers can independently load tags. Ask your vendor which containers are governed by the consent manager.'});
  } else if (D.gtmContainers.length === 1) {
    items.push({type:'pass', icon:'✅', label:'1 GTM container detected', tip:'Single-container setups are easier to govern. Still confirm CMP coverage.'});
  }

  // Google Consent Mode
  if (D.consentParams.length > 0 && D.hasRestrictedSignals && isPre) {
    items.push({type:'pass', icon:'✅', label:'Google restricted before consent: '+D.consentParams.join(', '), tip:'This is the strongest Google evidence: restricted/default-denied signals were seen in a pre-consent or denied-cookie test.'});
  } else if (D.consentParams.length > 0) {
    items.push({type:'pass', icon:'✅', label:'Google Consent Mode signals detected: '+D.consentParams.join(', '), tip:'Signals were found in this '+mode+' scan. For legal/audit records, also capture fresh visitor and denied-cookie states.'});
  } else if (D.det.ga4 && D.hasCMP && isPre) {
    items.push({type:'fail', icon:'❌', label:'GOOGLE CONSENT MODE NOT CONFIRMED', tip:D.cmp+' is installed but no gcs/npa/pscdl signals were detected in this '+mode+' scan. Ask whether Consent Mode v2 is active.'});
  } else if (D.det.ga4 && D.hasCMP) {
    items.push({type:'warn', icon:'⚠️', label:'Google Consent Mode not seen in this scan', tip:'Because this was '+mode+', this does not prove a pre-consent failure. Confirm using fresh incognito and deny-cookie tests.'});
  } else if (D.det.ga4) {
    items.push({type:'fail', icon:'❌', label:'GOOGLE ANALYTICS WITH NO CONSENT CONTROLS', tip:'GA4 was detected without a consent manager or consent signals.'});
  }

  // Meta
  if (D.metaCount === 0 && isPre) {
    items.push({type:'pass', icon:'✅', label:'No Meta/Facebook requests before consent', tip:'No Meta requests fired during this '+mode+' scan. Repeat after Deny to confirm it stays blocked.'});
  } else if (D.metaCount === 0) {
    items.push({type:'pass', icon:'✅', label:'No Meta/Facebook requests in this session', tip:'No Meta requests fired during this '+mode+' scan. This may mean the pixel is blocked, absent, or not triggered on this page.'});
  } else if (D.hasCMP && isPre) {
    items.push({type:'fail', icon:'❌', label:'META FIRED '+D.metaCount+' TIMES BEFORE CONSENT', tip:'This is a serious finding for a fresh visitor or deny-cookie scan. Ask the CMP/vendor why Meta was not blocked.'});
  } else if (D.hasCMP) {
    items.push({type:'warn', icon:'⚠️', label:'Meta fired '+D.metaCount+' times', tip:'This may be expected after accepting cookies. Do not treat it as a failure unless it occurred before consent or after Deny.'});
  } else {
    items.push({type:'fail', icon:'❌', label:'META PIXEL UNGATED — '+D.metaCount+' requests fired', tip:'Meta fired with no consent manager detected.'});
  }

  // Targeting cookies
  var targeting = D.cookies.filter(function(c){return c.category==='Targeting';});
  if (targeting.length === 0 && isPre) {
    items.push({type:'pass', icon:'✅', label:'No targeting cookies before consent', tip:'Ad-targeting cookies were not detected in this '+mode+' scan.'});
  } else if (targeting.length === 0) {
    items.push({type:'pass', icon:'✅', label:'No targeting cookies in this session', tip:'No targeting cookies were detected in this '+mode+' scan. This does not by itself prove before-consent gating.'});
  } else if (isPre) {
    items.push({type:'fail', icon:'❌', label:targeting.length+' targeting cookie'+(targeting.length>1?'s':'')+' before consent', tip:'These require explicit consent. Flag these cookies with your vendor: '+targeting.map(function(c){return c.name;}).join(', ')});
  } else {
    items.push({type:'warn', icon:'⚠️', label:targeting.length+' targeting cookie'+(targeting.length>1?'s':'')+' found', tip:'This may be expected after Accept. Confirm they do not appear in fresh visitor or Deny scans.'});
  }

  return items;
}
