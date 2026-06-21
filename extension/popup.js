// popup.js v6 — all event listeners attached via JS, no inline handlers

document.addEventListener('DOMContentLoaded', function() {

  // ── Wire up all buttons via addEventListener (no inline onclick) ──
  document.getElementById('scanBtn').addEventListener('click', runScan);

  document.getElementById('tab-findings').addEventListener('click', function() { doTab('findings', this); });
  document.getElementById('tab-firing').addEventListener('click', function() { doTab('firing', this); });
  document.getElementById('tab-cookies').addEventListener('click', function() { doTab('cookies', this); });
  document.getElementById('tab-domains').addEventListener('click', function() { doTab('domains', this); });

  // Accordion via delegation on the findings panel
  document.getElementById('p-findings').addEventListener('click', function(e) {
    const btn = e.target.closest('[data-finding]');
    if (!btn) return;
    const i = btn.getAttribute('data-finding');
    const body = document.getElementById('fb' + i);
    const arr  = document.getElementById('fa' + i);
    if (!body) return;
    const open = body.style.display === 'block';
    body.style.display = open ? 'none' : 'block';
    if (arr) arr.classList.toggle('open', !open);
  });

  // Auto-scan on open
  runScan();
});

// ── Tab switching ──
function doTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('p-' + id).classList.add('on');
}

// ── Status bar ──
function st(msg, spin) {
  document.getElementById('statusBar').innerHTML = spin
    ? '<div class="sp"></div><span>' + msg + '</span>'
    : '<span>' + msg + '</span>';
}

// ── Main scan ──
async function runScan() {
  document.getElementById('scanBtn').disabled = true;
  document.getElementById('emptyArea').style.display = 'none';
  document.getElementById('tabsEl').style.display = 'none';
  document.getElementById('panelsEl').style.display = 'none';
  document.getElementById('gradeBar').style.display = 'none';
  document.getElementById('statsRow').style.display = 'none';
  document.getElementById('gtmBar').style.display = 'none';
  document.getElementById('sigBox').style.display = 'none';
  st('Scanning page…', true);

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    document.getElementById('urlBar').textContent = tab.url || '—';

    const bgData = await new Promise(function(res) {
      chrome.runtime.sendMessage({ type: 'GET_DATA', tabId: tab.id }, res);
    });

    let pageData = null;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectFromPage
      });
      pageData = results && results[0] ? results[0].result : null;
    } catch(e) {}

    render(buildAnalysis(tab, (bgData && bgData.requests) ? bgData.requests : [], pageData));
    document.getElementById('scanBtn').disabled = false;
  } catch(err) {
    st('Error: ' + err.message, false);
    document.getElementById('scanBtn').disabled = false;
    document.getElementById('emptyArea').style.display = 'block';
  }
}

// ── Runs inside the page ──
function collectFromPage() {
  var gtm = {};
  document.querySelectorAll('script').forEach(function(s) {
    var txt = (s.src || '') + (s.textContent || '');
    var m = txt.match(/GTM-[A-Z0-9]+/g);
    if (m) m.forEach(function(id) { gtm[id] = true; });
  });
  try {
    (window.dataLayer || []).forEach(function(d) {
      var m = JSON.stringify(d || '').match(/GTM-[A-Z0-9]+/g);
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
    var parts = c.trim().split('=');
    return { name: parts[0].trim() };
  }).filter(function(c) { return c.name; });

  var scripts = Array.from(document.querySelectorAll('script[src]')).map(function(s) { return s.src; });

  return { gtmContainers: Object.keys(gtm), cmp: cmp, cookies: cookies, scripts: scripts };
}

// ── Analysis ──
function buildAnalysis(tab, requests, pageData) {
  var hostname = 'unknown';
  try { hostname = new URL(tab.url).hostname; } catch(e) {}
  var fp = hostname.replace('www.', '');

  var allText = requests.map(function(r) { return r.url; })
    .concat((pageData && pageData.scripts) ? pageData.scripts : [])
    .join(' ').toLowerCase();

  var det = {
    gtm:    allText.indexOf('googletagmanager') > -1 || allText.indexOf('gtm.js') > -1,
    ga4:    allText.indexOf('google-analytics') > -1 || allText.indexOf('gtag/js') > -1 || allText.indexOf('analytics.google') > -1,
    gads:   allText.indexOf('doubleclick') > -1 || allText.indexOf('googleadservices') > -1,
    meta:   allText.indexOf('connect.facebook') > -1 || allText.indexOf('facebook.com/tr') > -1 || allText.indexOf('fbevents') > -1,
    hotjar: allText.indexOf('hotjar') > -1,
    clarity:allText.indexOf('clarity.ms') > -1,
  };

  var hasCMP = (pageData && !!pageData.cmp) ||
    allText.indexOf('complyauto') > -1 ||
    allText.indexOf('onetrust') > -1 ||
    allText.indexOf('cookiebot') > -1;

  var cmp = (pageData && pageData.cmp) ||
    (allText.indexOf('complyauto') > -1 ? 'ComplyAuto' :
     allText.indexOf('onetrust') > -1   ? 'OneTrust' :
     allText.indexOf('cookiebot') > -1  ? 'Cookiebot' : null);

  var gtmContainers = (pageData && pageData.gtmContainers) ? pageData.gtmContainers : [];

  var consentParams = [];
  requests.filter(function(r) {
    return /google-analytics|analytics\.google|gtag\/js/i.test(r.url);
  }).forEach(function(r) {
    var g = r.url.match(/[?&]gcs=([^&]+)/);
    if (g) consentParams.push('gcs=' + g[1]);
    if (r.url.indexOf('npa=1') > -1) consentParams.push('npa=1');
    if (r.url.indexOf('pscdl=denied') > -1) consentParams.push('pscdl=denied');
    if (r.url.indexOf('ads_data_redaction=1') > -1) consentParams.push('ads_data_redaction=1');
  });
  var uniqueParams = consentParams.filter(function(v, i, a) { return a.indexOf(v) === i; });

  var metaReqs = requests.filter(function(r) { return /facebook\.net|facebook\.com\/tr/i.test(r.url); });
  var googleReqs = requests.filter(function(r) { return /google|doubleclick/i.test(r.url); });

  var score = 100;
  if (!hasCMP) score -= 40;
  if (det.meta && !hasCMP) score -= 20;
  if (det.gads && !hasCMP) score -= 15;
  if (uniqueParams.length === 0 && det.ga4) score -= 12;
  if (metaReqs.length > 0 && hasCMP) score -= 5;
  if (gtmContainers.length > 2) score -= 5;
  score = Math.max(0, Math.min(100, score));
  var grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';

  var seen = {};
  var fireOrder = [];
  var seq = 1;
  if (hasCMP && cmp) {
    seen[cmp] = true;
    fireOrder.push({ seq: seq++, name: cmp + ' (consent gate)', domain: 'consent platform', status: 'consent-gate' });
  }
  requests.forEach(function(r) {
    if (fireOrder.length >= 20) return;
    var name = nameReq(r.url);
    if (!name || seen[name]) return;
    var dom = ''; try { dom = new URL(r.url).hostname; } catch(e) {}
    if (dom.indexOf(fp) > -1) return;
    seen[name] = true;
    var type = classReq(r.url);
    var status = type === 'analytics' ? (hasCMP ? 'restricted' : 'ungated')
                : type === 'advertising' ? (hasCMP ? 'blocked' : 'ungated')
                : type === 'tag-manager' ? (hasCMP ? 'gated' : 'ungated')
                : 'functional';
    fireOrder.push({ seq: seq++, name: name, domain: dom, status: status });
  });

  var cookies = ((pageData && pageData.cookies) ? pageData.cookies : []).map(function(c) {
    return { name: c.name, category: categorizeCookie(c.name) };
  });

  var domsSeen = {};
  var thirdParty = [];
  requests.forEach(function(r) {
    var h = ''; try { h = new URL(r.url).hostname; } catch(e) {}
    if (h && h.indexOf(fp) === -1 && !domsSeen[h]) { domsSeen[h] = true; thirdParty.push(h); }
  });

  return {
    hostname: hostname, det: det, hasCMP: hasCMP, cmp: cmp,
    gtmContainers: gtmContainers, score: score, grade: grade,
    fireOrder: fireOrder, cookies: cookies, thirdParty: thirdParty,
    consentParams: uniqueParams,
    metaCount: metaReqs.length, googleCount: googleReqs.length, totalReqs: requests.length
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
  if (u.indexOf('drivecentric') > -1) return 'DriveCentric CRM';
  if (u.indexOf('dealereprocess') > -1) return 'Dealer eProcess';
  if (u.indexOf('tawk') > -1) return 'Tawk.to Chat';
  if (u.indexOf('drift') > -1) return 'Drift Chat';
  try { return new URL(url).hostname; } catch(e) { return null; }
}

function categorizeCookie(name) {
  if (name.indexOf('_ga') === 0) return 'Analytics';
  if (['_fbp','_fbc','IDE','NID','_gcl_au','CONSENT','__gads','__gpi'].indexOf(name) > -1) return 'Targeting';
  if (/session|sess|phpsessid/i.test(name)) return 'Essential';
  if (/consent|comply|onetrust|cookiebot|cookie/i.test(name)) return 'Essential';
  if (/hotjar|_hj|heap|clarity|_clsk|_clck/i.test(name)) return 'Analytics';
  return 'Unknown';
}

// ── Render ──
function render(D) {
  var gW = {A:'Great',B:'Good',C:'Fair',D:'At Risk',F:'Critical'};
  var gH = {
    A:'Strong consent practices detected.',
    B:'Mostly compliant — a few things to confirm.',
    C:'Consent gaps need attention.',
    D:'Significant consent issues.',
    F:'Tracking without consent controls.'
  };
  var gS = {
    A: (D.cmp||'A consent manager') + ' is installed and appears to control tracking tools.',
    B: (D.cmp||'A consent manager') + ' found. Most tracking gated — review details.',
    C: 'Some tracking may not be properly controlled. Vendor confirmation needed.',
    D: 'No consent manager found, or key tools fire without permission.',
    F: 'No consent manager. Tracking fires on every visitor immediately.'
  };

  document.getElementById('gradeBar').style.display = 'flex';
  document.getElementById('gradeBar').innerHTML =
    '<div class="gc g' + D.grade + '"><div class="gl">' + D.grade + '</div><div class="gw">' + gW[D.grade] + '</div></div>' +
    '<div class="gm"><h2>' + gH[D.grade] + '</h2><p>' + gS[D.grade] + '</p></div>';

  document.getElementById('statsRow').style.display = 'flex';
  document.getElementById('statsRow').innerHTML = [
    {v:D.totalReqs,l:'Requests'},{v:D.thirdParty.length,l:'3rd-party'},
    {v:D.cookies.length,l:'Cookies'},{v:D.googleCount,l:'Google'},{v:D.metaCount,l:'Meta'}
  ].map(function(s) {
    return '<div class="stat"><span class="sv">' + s.v + '</span><span class="sl">' + s.l + '</span></div>';
  }).join('');

  if (D.gtmContainers.length > 0) {
    document.getElementById('gtmBar').style.display = 'flex';
    document.getElementById('gtmBar').innerHTML = '<span class="gtm-label">GTM (' + D.gtmContainers.length + '):</span>' +
      D.gtmContainers.map(function(id) {
        return '<span class="gtm-pill' + (D.gtmContainers.length > 1 ? ' warn' : '') + '">' + id + '</span>';
      }).join('');
  }

  var sigBox = document.getElementById('sigBox');
  if (D.consentParams.length > 0) {
    sigBox.style.display = 'block';
    sigBox.className = 'sig-box sig-pass';
    sigBox.innerHTML = '<div class="sig-label">Google Consent Mode signals ✓</div>' + D.consentParams.join(' · ');
  } else if (D.det.ga4) {
    sigBox.style.display = 'block';
    sigBox.className = 'sig-box sig-warn';
    sigBox.innerHTML = '<div class="sig-label">Google Consent Mode — not confirmed</div>No gcs/npa/pscdl signals found. Verify Consent Mode is configured.';
  }

  st(D.totalReqs + ' requests · ' + D.thirdParty.length + ' 3rd-party · ' + D.cookies.length + ' cookies', false);

  // Findings
  var findings = buildFindings(D);
  document.getElementById('p-findings').innerHTML = findings.map(function(f, i) {
    return '<div class="finding">' +
      '<div class="fh" data-finding="' + i + '">' +
        '<span class="fi2">' + f.icon + '</span>' +
        '<span class="ft">' + f.title + '</span>' +
        '<span class="fright">' +
          '<span class="fb ' + f.bc + '">' + f.badge + '</span>' +
          '<span class="farr" id="fa' + i + '">▾</span>' +
        '</span>' +
      '</div>' +
      '<div class="fbody" id="fb' + i + '">' +
        '<div class="wb"><div class="wl">What this means for your dealership</div><div class="wt">' + f.what + '</div></div>' +
        '<div class="wd">' + f.why + '</div>' +
        (f.extra || '') +
        '<div class="act">→ ' + f.act + '</div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Firing order
  var stMap = {
    'consent-gate':['fbl','1st ✓'], gated:['fa2','gated'], restricted:['fg','restricted ✓'],
    blocked:['fg','blocked ✓'], ungated:['fr2','no gate ✗'], functional:['fk','functional']
  };
  document.getElementById('p-firing').innerHTML = D.fireOrder.length
    ? '<div class="sh">Script / tag load sequence</div>' + D.fireOrder.map(function(f) {
        var s = stMap[f.status] || ['fk', f.status];
        return '<div class="fi-row">' +
          '<div class="fnum">' + f.seq + '</div>' +
          '<div class="fn2">' + f.name + '</div>' +
          '<div class="fdom">' + f.domain + '</div>' +
          '<span class="fbg2 ' + s[0] + '">' + s[1] + '</span>' +
        '</div>';
      }).join('')
    : '<div class="empty"><span>📋</span><p>No scripts captured.<br>Reload page then scan again.</p></div>';

  // Cookies grouped
  var groups = [
    {label:'Targeting — require consent', items:D.cookies.filter(function(c){return c.category==='Targeting';}), cls:'br'},
    {label:'Analytics', items:D.cookies.filter(function(c){return c.category==='Analytics';}), cls:'bw'},
    {label:'Essential — no consent needed', items:D.cookies.filter(function(c){return c.category==='Essential';}), cls:'bp'},
    {label:'Unknown', items:D.cookies.filter(function(c){return c.category==='Unknown';}), cls:'bi'},
  ].filter(function(g) { return g.items.length > 0; });

  document.getElementById('p-cookies').innerHTML = D.cookies.length
    ? groups.map(function(g) {
        return '<div class="sh">' + g.label + ' (' + g.items.length + ')</div>' +
          g.items.map(function(c) {
            return '<div class="ck-row"><div class="ck-name">' + c.name + '</div><span class="fb ' + g.cls + '">' + c.category + '</span></div>';
          }).join('');
      }).join('')
    : '<div class="empty"><span>🍪</span><p>No cookies read yet.</p></div>';

  // Domains
  document.getElementById('p-domains').innerHTML = D.thirdParty.length
    ? '<div class="sh">Third-party domains contacted</div>' + D.thirdParty.map(function(d) {
        var cls = /google|doubleclick/i.test(d)?'bw':/facebook/i.test(d)?'br':/complyauto|onetrust|cookiebot/i.test(d)?'bp':'bi';
        var lbl = /google|doubleclick/i.test(d)?'Google':/facebook/i.test(d)?'Meta':/complyauto|onetrust|cookiebot/i.test(d)?'Consent':'3rd party';
        return '<div class="dom-row"><div class="dom-name">' + d + '</div><span class="fb ' + cls + '">' + lbl + '</span></div>';
      }).join('')
    : '<div class="empty"><span>🌐</span><p>No third-party domains detected yet.</p></div>';

  document.getElementById('tabsEl').style.display = 'flex';
  document.getElementById('panelsEl').style.display = 'block';
  document.getElementById('emptyArea').style.display = 'none';
}

function buildFindings(D) {
  var f = [];

  f.push({
    icon: D.hasCMP ? '✅' : '🚫',
    title: D.hasCMP ? 'Consent manager: ' + D.cmp + ' is installed' : 'No consent manager found',
    badge: D.hasCMP ? 'Found' : 'Missing', bc: D.hasCMP ? 'bp' : 'br',
    what: D.hasCMP
      ? D.cmp + ' is installed. When working correctly it shows the cookie banner and stops tracking tools from running until the visitor gives permission.'
      : 'No consent management platform was found. Tracking tools may be running the moment someone lands on this site — before they\'ve agreed to anything.',
    why: D.hasCMP
      ? 'Think of it as a gatekeeper — before ' + D.cmp + ' lets Google or Facebook in, it checks whether the visitor said yes. That\'s what privacy laws require.'
      : 'Without a consent manager, visitor data is being sent to Google and others before any permission has been given.',
    act: D.hasCMP
      ? 'Ask ' + D.cmp + ' in writing: "Are all tracking tools actually blocked before a visitor clicks the consent button — not just the banner displayed?"'
      : 'Contact your website provider today. Ask about ComplyAuto, OneTrust, or Cookiebot. This is your most critical compliance fix.',
    extra: ''
  });

  if (D.gtmContainers.length > 0) {
    f.push({
      icon: '📦',
      title: D.gtmContainers.length + ' GTM container' + (D.gtmContainers.length > 1 ? 's' : '') + ' detected',
      badge: D.gtmContainers.length > 1 ? 'Multiple — review' : 'Found',
      bc: D.gtmContainers.length > 1 ? 'bw' : 'bi',
      what: 'Google Tag Manager (GTM) is a control box that tracking tools plug into. This site has ' + D.gtmContainers.length + ' container' + (D.gtmContainers.length>1?'s':'') + ': ' + D.gtmContainers.join(', ') + '. Each can independently fire analytics, ads, and pixels.',
      why: D.gtmContainers.length > 1
        ? 'Multiple containers mean multiple independent tag-firing systems. Your consent manager must govern ALL of them. One ungoverned container can fire Facebook or Google Ads without consent.'
        : 'GTM is the delivery mechanism for most tracking tools. Your consent manager must control GTM — not just individual tags.',
      act: 'Ask your provider: "Which of these GTM containers — ' + D.gtmContainers.join(', ') + ' — does our consent manager govern? Are any outside its scope?"',
      extra: ''
    });
  }

  if (D.det.ga4) {
    var has = D.consentParams.length > 0;
    f.push({
      icon: '📊',
      title: 'Google Analytics is tracking your visitors',
      badge: has ? 'Consent Mode active ✓' : D.hasCMP ? 'Verify signals' : 'Ungated',
      bc: has ? 'bp' : D.hasCMP ? 'bw' : 'br',
      what: 'Google Analytics records which pages visitors view, how long they stay, their approximate location, device type, and browser. This data is sent to Google servers.',
      why: has
        ? 'Consent signals found: ' + D.consentParams.join(', ') + '. Google is receiving restricted instructions before visitor consent — a positive sign.'
        : 'Without Google Consent Mode, GA4 collects full visitor data regardless of the cookie banner choice.',
      act: has
        ? 'Consent Mode appears active. Confirm with ' + (D.cmp||'your vendor') + ' these signals persist on every page and after a visitor clicks Deny.'
        : 'Ask ' + (D.cmp||'your provider') + ': "Is Google Consent Mode v2 active? We need gcs=G100, npa=1, and pscdl=denied in GA4 requests before consent."',
      extra: ''
    });
  }

  if (D.det.meta || D.metaCount > 0) {
    f.push({
      icon: '👤',
      title: 'Facebook / Meta pixel on this website',
      badge: D.metaCount === 0 ? 'Not firing ✓' : D.hasCMP ? D.metaCount + ' reqs — verify' : D.metaCount + ' reqs — ungated',
      bc: D.metaCount === 0 ? 'bp' : D.hasCMP ? 'bw' : 'br',
      what: 'The Facebook pixel tells Meta when someone visits this site. Used for ad retargeting and audience building. ' + (D.metaCount > 0 ? D.metaCount + ' Meta requests captured in this session.' : 'No Meta requests captured — good sign.'),
      why: 'The Meta pixel has no restricted mode — it either fires or it doesn\'t. Multiple lawsuits against dealerships name the Meta pixel as a source of privacy violations.',
      act: D.metaCount === 0 && D.hasCMP
        ? 'Good. Confirm with ' + D.cmp + ' the pixel stays blocked when a visitor clicks Deny.'
        : D.hasCMP
        ? 'Meta fired ' + D.metaCount + ' times. Ask ' + D.cmp + ': "Is Facebook completely blocked until a visitor clicks Allow All Cookies?"'
        : 'Install a consent manager. The Meta pixel must be blocked until a visitor explicitly allows targeting cookies.',
      extra: ''
    });
  }

  var targeting = D.cookies.filter(function(c) { return c.category === 'Targeting'; });
  f.push({
    icon: '🍪',
    title: D.cookies.length + ' cookies on this page',
    badge: targeting.length > 0 ? targeting.length + ' targeting' : 'See cookies tab',
    bc: targeting.length > 0 ? 'bw' : 'bi',
    what: D.cookies.length + ' cookies found. ' +
      D.cookies.filter(function(c){return c.category==='Essential';}).length + ' Essential, ' +
      D.cookies.filter(function(c){return c.category==='Analytics';}).length + ' Analytics, ' +
      targeting.length + ' Targeting (ad-related).',
    why: 'Targeting cookies require explicit visitor consent in most states. Any targeting cookie set before the visitor makes a choice is a potential compliance issue.',
    act: 'Open the Cookies tab above to see the full categorized list. Targeting cookies should only appear after a visitor clicks Allow.',
    extra: ''
  });

  return f;
}
