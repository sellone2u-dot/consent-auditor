// Known OEM and platform GTM containers identified through field auditing
var KNOWN_CONTAINERS = {
  'GTM-KMQZ7S3K': { owner: 'Toyota/Lexus OEM', risk: 'high', note: 'Toyota/Lexus corporate container' },
  'GTM-MT64F4S':  { owner: 'Toyota/Lexus OEM', risk: 'high', note: 'OEM brand layer container' },
  'GTM-MLHK883':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-MV862RN':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-PFPSKQNM': { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-WT64PDP':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-ND7WWDN':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-T9QJJTD':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-WPGZWQGR': { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-5DZL2Q6':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-M8LD4PJ':  { owner: 'Toyota OEM platform', risk: 'high', note: 'Recurring across Toyota dealer network' },
  'GTM-WGWTL8KV': { owner: 'Toyota/Lexus OEM', risk: 'high', note: 'Detected on Lexus of Chattanooga — OEM layer' },
  'GTM-TCBRBF7N': { owner: 'Honda OEM platform', risk: 'high', note: 'Recurring on Honda dealer sites' },
  'GTM-MF2ML8X':  { owner: 'Honda OEM platform', risk: 'high', note: 'Recurring on Honda dealer sites' },
  'GTM-5LCXP36':  { owner: 'Honda OEM platform', risk: 'high', note: 'Recurring on Honda dealer sites' }
};

function classifyContainers(ids) {
  var oem = [], dealer = [], unknown = [];
  ids.forEach(function(id) {
    if (KNOWN_CONTAINERS[id]) oem.push({ id: id, info: KNOWN_CONTAINERS[id] });
    else unknown.push(id);
  });
  return { oem: oem, dealer: dealer, unknown: unknown };
}

function modeLabel(D) {
  return D.auditMode ? D.auditMode.label : 'Current browser state / unknown';
}

function isPreConsentAudit(D) {
  return !!(D.auditMode && D.auditMode.isPreConsent);
}

var TIPS = {
  cmp_found: function(D) {
    return 'Having ' + D.cmp + ' installed is the right foundation. Because this scan is labeled "' + modeLabel(D) + '", the findings should be read in that exact test state. For audit records, save fresh visitor, Deny, and Accept results separately.';
  },
  cmp_missing: function() {
    return 'No consent management platform was detected. This is the first item to resolve before relying on any cookie or tag findings.';
  },
  gtm_single: function(ids) {
    return 'One GTM container (' + ids[0] + ') was detected. Confirm the consent manager governs this container and not only selected tags inside it.';
  },
  gtm_multiple: function(ids, count) {
    var classified = classifyContainers(ids);
    var base = count + ' GTM containers detected. ';
    if (classified.oem.length > 0) {
      base += classified.oem.length + ' appear to be OEM/brand-level (' + classified.oem.map(function(c){return c.id;}).join(', ') + '). These may be controlled by the manufacturer rather than the dealer or website vendor. ';
    }
    if (classified.unknown.length > 0) base += classified.unknown.length + ' are unidentified (' + classified.unknown.join(', ') + '). ';
    base += 'Ask in writing which containers the consent manager governs.';
    return base;
  },
  consent_mode_active: function(D) {
    if (D.hasRestrictedSignals && isPreConsentAudit(D)) {
      return 'Strong Google restricted/default-denied signals were confirmed: ' + D.consentParams.join(', ') + '. Because this was a fresh/denied-style scan, these signals support restricted Google behavior before consent.';
    }
    if (D.hasOnlyGcdSignal && isPreConsentAudit(D)) {
      return 'Only the Google Consent Mode v2 gcd indicator was detected: ' + D.consentParams.join(', ') + '. This shows consent data may be present, but it does not by itself prove restricted/default-denied behavior. Look for stronger proof such as gcs=G100, npa=1, pscdl=denied, or confirm with Google Tag Assistant.';
    }
    return 'Google Consent Mode indicators were detected: ' + D.consentParams.join(', ') + '. Confirm the exact consent state with a fresh visitor scan, a Deny scan, and Google Tag Assistant before treating this as proof.';
  },
  consent_mode_missing_with_cmp: function(D) {
    if (D.auditMode && D.auditMode.isAccepted) {
      return D.cmp + ' is installed, but no Google Consent Mode signals were detected in this accepted-cookie scan. This does not prove a pre-consent failure. Run a fresh incognito scan and a Deny scan to confirm default/restricted states.';
    }
    if (isPreConsentAudit(D)) {
      return D.cmp + ' is installed, but no Google Consent Mode signals were detected in this fresh/denied-style scan. Ask whether Google Consent Mode v2 is active and whether denied/default states are passed before consent.';
    }
    return D.cmp + ' is installed, but no Google Consent Mode signals were detected in the current browser state. Confirm using a fresh visitor scan and a Deny scan.';
  },
  consent_mode_missing_no_cmp: function() {
    return 'No consent manager and no Google Consent Mode signals were detected. Google tag behavior should be reviewed immediately.';
  },
  meta_blocked: function(D) {
    if (isPreConsentAudit(D)) return 'No Meta/Facebook requests were captured in this fresh/denied-style scan. That supports the pixel being blocked before consent. Repeat after Deny to preserve a second proof point.';
    return 'No Meta/Facebook requests were captured in this ' + modeLabel(D) + ' scan. This may mean Meta is blocked, absent, or not triggered on this page.';
  },
  meta_firing_with_cmp: function(D) {
    if (isPreConsentAudit(D)) return D.metaCount + ' Meta requests fired during a fresh/denied-style scan with ' + D.cmp + ' installed. This should be escalated to the CMP and website provider.';
    return D.metaCount + ' Meta requests fired in this ' + modeLabel(D) + ' scan. This may be expected after Accept, but it must not occur before consent or after Deny.';
  },
  meta_firing_no_cmp: function(D) {
    return D.metaCount + ' Meta/Facebook requests fired with no consent gate detected. Install or fix the consent manager before relying on the site.';
  },
  cookies_clean: function(D) {
    if (isPreConsentAudit(D)) return 'No targeting cookies were detected in this fresh/denied-style scan. This supports ad tracking cookies being gated before consent.';
    return 'No targeting cookies were detected in this ' + modeLabel(D) + ' scan. This is positive, but it does not replace a fresh visitor and Deny test.';
  },
  cookies_targeting: function(D, names) {
    if (isPreConsentAudit(D)) return names.length + ' targeting cookie(s) appeared during a fresh/denied-style scan: ' + names.join(', ') + '. These should be flagged with the vendor immediately.';
    return names.length + ' targeting cookie(s) appeared: ' + names.join(', ') + '. This can be expected after Accept but should not appear before consent or after Deny.';
  },
  risk_summary: function(D) {
    var mode = modeLabel(D);
    if (D.grade === 'A') return 'Overall risk posture: LOW for the selected test state (' + mode + '). Preserve screenshots and repeat fresh visitor, Deny, and Accept tests as separate records.';
    if (D.grade === 'B') return 'Overall risk posture: MODERATE-LOW. Core consent controls appear present, but excessive GTM volume, analytics cookies, or proof-quality signals need written vendor confirmation for the selected state (' + mode + ').';
    if (D.grade === 'C') return 'Overall risk posture: ELEVATED. One or more consent-control gaps were observed in the selected state (' + mode + '). Vendor review should be prioritized.';
    if (D.grade === 'D') return 'Overall risk posture: HIGH. Significant consent-control problems were detected. Legal/vendor review is recommended before relying on this setup.';
    return 'Overall risk posture: CRITICAL. Consent controls were missing or tracking behavior appears uncontrolled. Immediate remediation is recommended.';
  },
  vendor_questions: function(D) {
    var questions = [];
    if (D.hasCMP) {
      questions.push('For this scan state (' + modeLabel(D) + '), which tools are supposed to be blocked, restricted, or allowed?');
      questions.push('Can you provide written confirmation that all targeting and analytics tags are blocked or restricted before consent and after Deny?');
      if (D.gtmContainers.length > 1) {
        var classified = classifyContainers(D.gtmContainers);
        questions.push('Which of these GTM containers does your consent manager govern: ' + D.gtmContainers.join(', ') + '?');
        if (classified.oem.length > 0) questions.push('Do you govern these OEM/manufacturer-level containers, or are they outside your platform\'s control: ' + classified.oem.map(function(c){return c.id;}).join(', ') + '?');
      }
      if (D.det.ga4 && (D.consentParams.length === 0 || D.hasOnlyGcdSignal)) questions.push('Is Google Consent Mode v2 active, and can you confirm denied/default states with stronger proof than gcd alone, such as gcs=G100, npa=1, pscdl=denied, or Google Tag Assistant?');
      if (D.analyticsCookieCount > 0 && isPreConsentAudit(D)) questions.push('Why were analytics cookies present in a fresh visitor or denied-cookie scan? Are these cookies allowed, or should analytics_storage be denied/cookieless?');
      if (D.metaCount > 0) questions.push('Was the Facebook pixel expected to fire in this test state? If not, why was it not blocked?');
    } else {
      questions.push('Do we currently have a consent management platform installed on this website?');
      questions.push('If not, what is the timeline to install and verify one?');
    }
    return questions;
  }
};

function generateTips(D) {
  var t = D.cookies.filter(function(c){return c.category==='Targeting';});
  return {
    cmp:          D.hasCMP ? TIPS.cmp_found(D) : TIPS.cmp_missing(),
    gtm:          D.gtmContainers.length === 1 ? TIPS.gtm_single(D.gtmContainers) : D.gtmContainers.length > 1 ? TIPS.gtm_multiple(D.gtmContainers, D.gtmContainers.length) : null,
    consentMode:  D.consentParams.length > 0 ? TIPS.consent_mode_active(D) : D.hasCMP ? TIPS.consent_mode_missing_with_cmp(D) : TIPS.consent_mode_missing_no_cmp(),
    meta:         D.metaCount === 0 ? TIPS.meta_blocked(D) : D.hasCMP ? TIPS.meta_firing_with_cmp(D) : TIPS.meta_firing_no_cmp(D),
    cookies:      t.length === 0 ? TIPS.cookies_clean(D) : TIPS.cookies_targeting(D, t.map(function(c){return c.name;})),
    riskSummary:  TIPS.risk_summary(D),
    vendorQs:     TIPS.vendor_questions(D)
  };
}
