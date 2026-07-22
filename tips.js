// Known OEM and platform GTM containers identified through field auditing
var KNOWN_CONTAINERS = RiskAuditorCore.constants.knownContainers;

function classifyContainers(ids) {
  return RiskAuditorCore.classifyContainers(ids);
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
      return 'Google Consent Mode v2 evidence was captured. Plain read: Google ad personalization appears denied or restricted in this test state. Evidence: ' + D.consentParams.join(', ') + '. npa=1 means non-personalized ads; pscdl=denied, ads_data_redaction=1, or gcs=G100 are stronger denied/default-style signals.';
    }
    if (isPreConsentAudit(D) && D.consentParams.some(function(p){ return /^npa=0$/i.test(p); })) {
      return 'Google Consent Mode v2 evidence was captured, but the plain read is: Google ad personalization does not appear denied. Evidence includes npa=0: ' + D.consentParams.join(', ') + '. npa=0 means personalized ads may be allowed, so the vendor should explain why this appears before consent or after Deny.';
    }
    if (D.hasOnlyGcdSignal && isPreConsentAudit(D)) {
      return 'Only the Google Consent Mode v2 gcd indicator was detected: ' + D.consentParams.join(', ') + '. Plain read: denied/default behavior is not proven. gcd shows consent data may be present, but the vendor should prove Consent Mode v2 with stronger evidence such as gcs=G100, npa=1, pscdl=denied, ads_data_redaction=1, or Google Tag Assistant.';
    }
    return 'Google Consent Mode v2 indicators were detected: ' + D.consentParams.join(', ') + '. Plain read: confirm whether Google ad personalization is denied or allowed for this state. npa=1 supports non-personalized ads; npa=0 means personalized ads may be allowed and should generally be expected only after consent.';
  },
  consent_mode_missing_with_cmp: function(D) {
    if (D.auditMode && D.auditMode.isAccepted) {
      return D.cmp + ' is installed, but no Google Consent Mode v2 signals were detected in this accepted-cookie scan. This does not prove a pre-consent failure. Run a fresh incognito scan and a Deny scan to confirm whether Google ad personalization is denied by default.';
    }
    if (isPreConsentAudit(D)) {
      return D.cmp + ' is installed, but no Google Consent Mode v2 signals were detected in this fresh/denied-style scan. Plain read: Google ad personalization denial was not proven. Ask whether Consent Mode v2 is active and whether denied/default states are passed before consent.';
    }
    return D.cmp + ' is installed, but no Google Consent Mode v2 signals were detected in the current browser state. Confirm using a fresh visitor scan and a Deny scan.';
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
      if (isPreConsentAudit(D) && D.consentParams.some(function(p){ return /^npa=0$/i.test(p); })) questions.push('Why was npa=0 present in a fresh visitor or denied-cookie scan? Should ad personalization be denied or restricted in this state?');
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
