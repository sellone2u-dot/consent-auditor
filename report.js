// report.js v19 - dealer-ready reports with ComplyAuto load-order analysis and unclear-order handling

function reportModeLabel(D) {
  if (!D.auditMode) return 'Current browser state / unknown';
  if (reportConsentActionNotConfirmed(D)) return D.auditMode.label + ' (not confirmed - no CMP/banner detected)';
  return D.auditMode.label;
}

function reportModeKey(D) {
  return D.auditMode ? D.auditMode.key : 'current';
}

function reportRawModeLabel(D) {
  return D.auditMode ? D.auditMode.label : 'Current browser state / unknown';
}

function reportConsentActionNotConfirmed(D) {
  if (!D || !D.auditMode || D.hasCMP) return false;
  return reportModeKey(D) === 'accepted' || reportModeKey(D) === 'denied';
}

function reportNoBannerMode(D) {
  return !!(D && D.auditMode && reportModeKey(D) === 'no_banner');
}

function reportNeedsNoBannerEvidence(D) {
  return reportNoBannerMode(D) || reportConsentActionNotConfirmed(D);
}

function reportHasUnconfirmedConsentAction(states) {
  return (states || []).some(function(D) { return reportConsentActionNotConfirmed(D) || reportNoBannerMode(D); });
}

function reportIsPreConsent(D) {
  return !!(D.auditMode && D.auditMode.isPreConsent);
}

function reportGradeWords(grade) {
  return { A:'Great', B:'Good', C:'Fair', D:'At Risk', F:'Critical' }[grade] || 'Unknown';
}

function reportGradeLine(D) {
  return reportRiskRating(D);
}

function reportRiskRating(D) {
  if (!D) return 'Unable to Verify';
  if (D.grade === 'A') return 'Strong';
  if (D.grade === 'B') return 'Good / Verify';
  if (D.grade === 'C') return 'Needs Review';
  if (D.grade === 'D') return 'High Risk';
  if (D.grade === 'F') return 'Critical';
  return 'Unable to Verify';
}

function reportRiskMeaning(D) {
  var rating = reportRiskRating(D);
  var meanings = {
    'Strong': 'No major risk indicators were observed in this scan area.',
    'Good / Verify': 'Mostly positive evidence was observed, but one or more items should be confirmed with the vendor.',
    'Needs Review': 'Something was observed that should be reviewed with the website, consent, or advertising vendor.',
    'High Risk': 'A significant risk indicator was observed and should be reviewed promptly.',
    'Critical': 'Strong evidence of behavior that should be addressed quickly was observed.',
    'Unable to Verify': 'The tool could not collect enough evidence to make a useful observation.'
  };
  return meanings[rating] || meanings['Unable to Verify'];
}

function reportDisclaimer() {
  return 'This report does not certify compliance or provide legal conclusions. It records observable website behavior, explains what those observations commonly mean, and provides recommended next steps for dealer review.';
}

function reportCategoryCount(D, category) {
  return D.cookies.filter(function(c) { return c.category === category; }).length;
}

function reportTargetingNames(D) {
  return D.cookies.filter(function(c) { return c.category === 'Targeting'; }).map(function(c) { return c.name; });
}

function reportCmpDisplay(D) {
  if (!D || !D.hasCMP) return 'No CMP detected';
  return D.cmp || 'CMP detected - name not identified';
}

function reportDetectedCmpNames(states) {
  var seen = {};
  (states || []).forEach(function(D) {
    if (D && D.hasCMP) seen[reportCmpDisplay(D)] = true;
  });
  return Object.keys(seen).sort();
}

function reportCmpSummaryLine(states) {
  var names = reportDetectedCmpNames(states);
  if (!names.length) return 'No consent management platform was detected in the reviewed states.';
  if (names.length === 1) {
    if (/^ComplyAuto$/i.test(names[0])) return 'ComplyAuto was detected as the consent management platform in every scanned state where a CMP was present.';
    if (/name not identified/i.test(names[0])) return 'A consent management platform was detected, but the audit could not identify the provider name.';
    return names[0] + ' was detected as the consent management platform in every scanned state where a CMP was present.';
  }
  return 'Multiple CMP names or signals were detected across states: ' + names.join(', ') + '. The vendor should confirm which platform is authoritative.';
}

function reportFirstFire(D) {
  return D && D.fireOrder && D.fireOrder.length ? D.fireOrder[0] : null;
}

function reportCmpFirst(D) {
  return !!(D && D.complyAutoLoadOrder && D.complyAutoLoadOrder.status === 'loaded-first');
}

function reportGtmGated(D) {
  return !!(D && D.fireOrder && D.fireOrder.some(function(f) {
    return f && f.status === 'gated' && /Google Tag Manager/i.test(f.name || '');
  }));
}

function reportLoadOrderRead(D) {
  var notes = [];
  if (D && D.complyAutoLoadOrder) {
    notes.push(D.complyAutoLoadOrder.summary);
  } else if (D && D.hasCMP) {
    notes.push(reportCmpDisplay(D) + ' was detected, but the extension could not confirm whether it loaded before other tracking activity. Vendor confirmation is needed.');
  } else {
    notes.push('No consent platform was confirmed in the captured request sequence.');
  }
  if (reportGtmGated(D)) {
    notes.push('Google Tag Manager appears in the captured request sequence while a CMP was present. This is useful evidence, but it does not prove every tag inside every GTM container obeys the CMP rules.');
  } else if (D && D.gtmContainers && D.gtmContainers.length) {
    notes.push('GTM containers were detected, but the captured request sequence did not clearly verify CMP control. Ask the vendor to confirm whether GTM and all tags inside it are governed by the CMP.');
  }
  return notes.join(' ');
}

function reportComplyAutoLoadOrderStatus(D) {
  if (D && D.hasCMP && /comply\s*auto/i.test(D.cmp || '') && (!D.complyAutoLoadOrder || D.complyAutoLoadOrder.status === 'not-detected')) {
    return {
      status: 'unclear',
      label: 'ComplyAuto detected, blocker.js not observed',
      summary: 'ComplyAuto was identified as the CMP, but the extension could not confirm blocker.js in the captured request timeline. Because blocker.js determines what content is collected, load-order control could not be confirmed.',
      firstComplyAuto: null,
      firstComplyAutoControl: null,
      firstComplyAutoBanner: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstComplyAutoBanner : null,
      firstTracking: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstTracking : null,
      firstGtm: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstGtm : null,
      firstGoogleAnalytics: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstGoogleAnalytics : null,
      firstGoogleAds: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstGoogleAds : null,
      firstMeta: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstMeta : null,
      firstTargetingCookie: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstTargetingCookie : null,
      firstAnalyticsCookie: D.complyAutoLoadOrder ? D.complyAutoLoadOrder.firstAnalyticsCookie : null,
      priorityBeforeComplyAuto: []
    };
  }
  if (!D || !D.complyAutoLoadOrder) {
    return {
      label: 'ComplyAuto blocker.js timing could not be verified',
      summary: 'The extension did not have enough captured request evidence to determine whether ComplyAuto control script blocker.js loaded before or after tracking activity.'
    };
  }
  return D.complyAutoLoadOrder;
}

function reportTimelinePoint(point) {
  if (!point) return 'Not observed';
  return point.label + ' at request #' + point.seq;
}

function reportEvidenceValue(value) {
  return value == null || value === '' ? 'Not observed' : value;
}

function reportConsentLayerSummary(D) {
  var layer = D && D.consentLayer ? D.consentLayer : null;
  if (!layer) {
    return {
      provider: reportCmpDisplay(D),
      bannerVisible: 'Not observed',
      acceptControl: 'Not observed',
      denyControl: 'Not observed',
      technicalControl: D && D.hasCMP ? 'Observed' : 'Not observed',
      trackingChangedAfterChoice: 'Not tested in this single scan',
      conclusion: D && D.hasCMP ? 'Consent manager appears present' : 'No consent layer observed',
      evidence: ''
    };
  }
  return layer;
}

function reportCookieMonsterRead(D) {
  var targeting = reportTargetingNames(D);
  if (!D.hasCMP && (D.metaCount > 0 || targeting.length > 0)) {
    return 'Observed result: tracking or targeting was collected without a detected consent layer. This is the cookie-monster pattern: collecting before a website-level consent control was observed.';
  }
  if (D.auditMode && D.auditMode.isPreConsent && (D.metaCount > 0 || targeting.length > 0)) {
    return 'Observed result: advertising or targeting activity appeared before a confirmed consent choice. This should be treated as a priority review item.';
  }
  if (D.auditMode && D.auditMode.isPreConsent && D.metaCount === 0 && targeting.length === 0) {
    return 'Observed result: no Meta/Facebook requests or targeting cookies were observed in this pre-consent style scan. That supports restricted tracking behavior for this state.';
  }
  if (D.auditMode && D.auditMode.isAccepted) {
    return 'Observed result: this was an accepted/post-consent style scan. Tracking after Accept may be expected, but it should be compared against Fresh and Deny scans.';
  }
  return 'Observed result: review the captured request sequence and cookies for this selected browser state.';
}

function addEvidenceStandardSection(lines) {
  lines.push('## EVIDENCE STANDARD');
  lines.push('This report only states what the extension observed during the scan. The captured request sequence is useful evidence, but it is not a complete proof of script execution order. If data was not observed, the report says Not observed. If something was detected from page evidence only, the report says load timing not verified. The report does not assume a tag fired, a cookie was written, or a consent tool loaded first unless evidence was captured.');
  lines.push('');
}

function addConsentLayerSection(lines, D) {
  var layer = reportConsentLayerSummary(D);
  lines.push('## CONSENT LAYER IDENTIFIED');
  lines.push('| Item | Observed result |');
  lines.push('|---|---|');
  lines.push('| Provider | ' + mdCell(reportEvidenceValue(layer.provider)) + ' |');
  lines.push('| Banner visible | ' + mdCell(reportEvidenceValue(layer.bannerVisible)) + ' |');
  lines.push('| Accept control | ' + mdCell(reportEvidenceValue(layer.acceptControl)) + ' |');
  lines.push('| Deny/Reject control | ' + mdCell(reportEvidenceValue(layer.denyControl)) + ' |');
  lines.push('| Technical control evidence | ' + mdCell(reportEvidenceValue(layer.technicalControl)) + ' |');
  lines.push('| Tracking changed after choice | ' + mdCell(reportEvidenceValue(layer.trackingChangedAfterChoice)) + ' |');
  lines.push('| Conclusion | ' + mdCell(reportEvidenceValue(layer.conclusion)) + ' |');
  if (layer.evidence) lines.push('| Banner evidence | ' + mdCell(layer.evidence) + ' |');
  lines.push('');
}

function addObservedLoadSequenceSection(lines, D, limit) {
  var items = (D && D.observedSequence) ? D.observedSequence.slice(0, limit || 25) : [];
  lines.push('## ABSOLUTE OBSERVED FIRING ORDER');
  if (!items.length) {
    lines.push('No observed load sequence was captured for this scan.');
    lines.push('');
    return;
  }
  lines.push('| # | Tool / vendor | Type | Concern level | Evidence source | Evidence |');
  lines.push('|---:|---|---|---|---|---|');
  items.forEach(function(item, index) {
    lines.push('| ' + (index + 1) + ' | ' + mdCell(item.name) + ' | ' + mdCell(item.category) + ' | ' + mdCell(item.concern) + ' | ' + mdCell(item.source) + ' | ' + mdCell((item.evidence || '').slice(0, 180)) + ' |');
  });
  lines.push('');
}

function addConsentBehaviorSection(lines, D) {
  lines.push('## CONSENT BEHAVIOR READ');
  lines.push(reportCookieMonsterRead(D));
  lines.push('');
}

function addHighPriorityObservationsSection(lines, D) {
  lines.push('## HIGH PRIORITY OBSERVATIONS');
  lines.push('These are observed website-risk indicators, not legal conclusions. They help the dealer decide what to review with website, consent, advertising, and legal advisors.');
  (D.federalFlags && D.federalFlags.length ? D.federalFlags : ['No high-priority observation was automatically triggered by the captured scan data. This is not a legal compliance conclusion.']).forEach(function(flag) {
    lines.push('- ' + flag.replace(/^Federal review flag:\s*/i, 'Observed risk indicator: '));
  });
  lines.push('');
}

function reportCookieMeaning(name) {
  var meanings = {
    '_gcl_au': 'Google Ads / Google Conversion Linker cookie used for ad click and conversion attribution.',
    '_fbp': 'Meta / Facebook Pixel browser identifier cookie used for ad measurement, retargeting, and audience matching.',
    '_ga': 'Google Analytics visitor identifier cookie used to distinguish users for measurement.',
    '_gid': 'Google Analytics visitor/session-style cookie used to distinguish users for measurement.',
    '_gat': 'Google Analytics throttling cookie used to limit request volume.',
    '_clck': 'Microsoft Clarity visitor identifier cookie used for behavioral analytics.',
    '_clsk': 'Microsoft Clarity session cookie used for behavioral analytics.',
    '_uetvid': 'Microsoft Advertising visitor identifier cookie used for ad measurement and retargeting.',
    '_uetsid': 'Microsoft Advertising session cookie used for ad measurement and retargeting.'
  };
  return meanings[name] || 'Cookie purpose was not identified by the audit tool. Ask the vendor to identify the owner, purpose, category, and consent requirement.';
}

function reportCookieNamesWithMeanings(names) {
  if (!names.length) return 'None detected';
  return names.map(function(name) {
    return name + ' - ' + reportCookieMeaning(name);
  }).join(' ');
}

function reportConsentStateRead(D) {
  var key = reportModeKey(D);
  if (key === 'no_banner') {
    return 'This scan documents that no website-level cookie banner or Accept/Deny controls were available to the tester. Treat this as no-banner evidence, not as a completed Accept or Deny consent-state test.';
  }
  if (key === 'fresh') {
    return 'This state shows what happened when the visitor first landed before making a cookie choice. Advertising, retargeting, or non-essential analytics activity here matters because tracking may be starting before the visitor has acted.';
  }
  if (key === 'denied') {
    if (reportConsentActionNotConfirmed(D)) {
      return 'This scan was labeled Deny/Reject All, but no consent manager or banner was detected. Treat this as an attempted Deny scan, not proof that the visitor was able to reject cookies or that the site changed into a true denied-consent state.';
    }
    return 'This state shows what happened after the visitor selected Deny/Reject All. Advertising, retargeting, or non-essential analytics activity here is higher concern because the visitor already rejected non-essential tracking.';
  }
  if (key === 'accepted') {
    if (reportConsentActionNotConfirmed(D)) {
      return 'This scan was labeled Accepted/Post-consent, but no consent manager or banner was detected. Treat this as another current-page scan, not proof of true post-consent behavior, because there may have been no Accept button for the visitor to choose.';
    }
    return 'This state shows what happened after the visitor accepted cookies. More analytics or advertising activity may be expected here, but this state should look materially different from Fresh visitor and Deny/Reject All.';
  }
  return 'This state shows the current browser condition selected for the scan. Read the findings against that state before comparing them to Fresh, Deny, or Accept behavior.';
}

function reportCmpContext(D) {
  var base = 'A consent banner and an active consent-control system are not always the same thing. The audit should verify whether the CMP actually changes what fires across Fresh visitor, Deny/Reject All, and Accept/Post-consent states.';
  var loadOrder = reportLoadOrderRead(D);
  if (D.hasCMP && /comply\s*auto/i.test(D.cmp || '')) {
    return 'ComplyAuto was detected. ' + loadOrder + ' For dealers using ComplyAuto, the script may load early in the website head and then apply rules based on the dealer configuration, visitor consent choice, visitor location, state privacy requirements, and browser privacy signals such as Global Privacy Control or Do Not Track. ComplyAuto may use geolocation to determine the visitor state or region; for example, a California visitor may be handled differently than a visitor from a less restrictive state. Because of that, this scan should be read together with the scan location and the ComplyAuto rule set active for that location. ' + base;
  }
  if (reportNeedsNoBannerEvidence(D)) {
    return 'No CMP or cookie banner was detected, so the selected "' + reportRawModeLabel(D) + '" scan cannot be treated as a completed Accept or Deny consent-state test. If there was no visible website-level Accept or Deny control, the site cannot produce a reliable post-consent or denied-consent comparison from this scan. The vendor should first confirm whether a CMP/banner is installed and whether visitors can actually accept or reject tracking.';
  }
  if (D.hasCMP) {
    return D.cmp + ' was detected. ' + loadOrder + ' Different CMPs control tracking differently. Some use advanced category, location, or risk-based controls, while others may mainly show a simple Accept/Deny banner. ' + base;
  }
  return 'No CMP was detected in this scan. Without a detected CMP, the vendor should first confirm whether a consent platform is installed and whether it is able to govern downstream cookies, pixels, scripts, and GTM containers.';
}

function reportStateFindingMeaning(D) {
  var pre = reportIsPreConsent(D);
  var targeting = reportTargetingNames(D);
  var notes = [];

  notes.push(reportConsentStateRead(D));

  if (D.metaCount > 0) {
    if (reportModeKey(D) === 'denied') notes.push('Meta/Facebook requests in Deny/Reject All means the scan saw traffic to Meta/Facebook systems after the visitor rejected non-essential tracking. This usually points to the Meta Pixel, a Meta event, or a Meta tag inside a tag manager that needs a blocking-rule review.');
    else if (reportModeKey(D) === 'fresh') notes.push('Meta/Facebook requests in Fresh visitor mode means the scan saw traffic to Meta/Facebook systems before the visitor made a cookie choice. This usually points to the Meta Pixel, a Meta event, or a Meta tag inside a tag manager that may be starting too early.');
    else if (reportModeKey(D) === 'no_banner') notes.push('Meta/Facebook requests in No Banner mode means tracking fired when the tester could not find a website-level consent choice. This is a high-priority vendor review item because visitors may not have a practical way to accept or reject tracking.');
    else if (reportModeKey(D) === 'accepted') notes.push('Meta/Facebook requests after Accept may be expected if the dealer uses Meta advertising or conversion measurement. The vendor should still confirm the same Meta activity is blocked or restricted in Fresh and Deny states.');
    else notes.push('Meta/Facebook requests means the scan saw traffic to Meta/Facebook systems, usually from the Meta Pixel or a Meta tag inside a tag manager. Confirm whether that behavior is expected for this selected state.');
  } else if (pre) {
    notes.push('No Meta/Facebook requests were seen in this Fresh/Deny-style state. That supports the pixel being blocked, but the vendor should still confirm the rule in writing.');
  } else if (D.auditMode && D.auditMode.isAccepted) {
    notes.push('No Meta/Facebook requests were seen after Accept. This may mean Meta is not installed, did not trigger on this page, or remains blocked; compare against the dealer advertising setup.');
  }

  if (targeting.length) {
    if (reportModeKey(D) === 'denied') notes.push('Targeting cookies in Deny/Reject All means advertising or retargeting cookies were stored after the visitor rejected non-essential tracking. Cookies found: ' + reportCookieNamesWithMeanings(targeting));
    else if (reportModeKey(D) === 'fresh') notes.push('Targeting cookies in Fresh visitor mode means advertising or retargeting cookies were stored before the visitor made a cookie choice. Cookies found: ' + reportCookieNamesWithMeanings(targeting));
    else if (reportModeKey(D) === 'no_banner') notes.push('Targeting cookies in No Banner mode means advertising or retargeting cookies were stored when no website-level consent choice was available. Cookies found: ' + reportCookieNamesWithMeanings(targeting));
    else if (reportModeKey(D) === 'accepted') notes.push('Targeting cookies after Accept may be expected if the visitor consented and the dealer uses ad measurement or retargeting. Cookies found: ' + reportCookieNamesWithMeanings(targeting));
    else notes.push('Targeting cookies means advertising or retargeting cookies were stored in the browser. Cookies found: ' + reportCookieNamesWithMeanings(targeting));
  } else if (pre) {
    notes.push('No targeting cookies were seen in this Fresh/Deny-style state. That is a positive signal for ad-cookie blocking.');
  }

  if (D.gtmContainers.length > 1) {
    notes.push('Multiple GTM containers means more than one Google Tag Manager container can load scripts on the site. Each container can carry separate pixels, analytics tags, or vendor scripts, so the consent manager must govern every relevant container, not just the dealer or website-vendor container.');
  }

  if (reportCmpFirst(D) || reportGtmGated(D)) {
    notes.push(reportLoadOrderRead(D));
  }

  if (pre && D.analyticsCookieCount > 0) {
    notes.push('Analytics cookies before consent or after Deny means measurement cookies were present when the visitor had not granted permission. The vendor should identify each analytics cookie and explain whether it is strictly necessary, consent-exempt, or should be blocked, cookieless, or set only after Accept.');
  }

  if (pre && D.consentParams.some(function(p) { return /^npa=0$/i.test(p); })) {
    notes.push('npa=0 means Google ad personalization may be allowed. That can be expected after Accept, but in Fresh visitor or Deny/Reject All testing the vendor should explain why ad personalization was not denied or restricted.');
  }

  return notes;
}

function reportStateVendorAsks(D) {
  var pre = reportIsPreConsent(D);
  var targeting = reportTargetingNames(D);
  var asks = [];

  if (D.hasCMP && /comply\s*auto/i.test(D.cmp || '')) {
    asks.push('Confirm what visitor location or state ComplyAuto assigned to this scan and which state-specific rule set was applied.');
    asks.push('Confirm whether this dealer is using ComplyAuto high-risk/most guarded, California/strict, or lower-risk/more permissive settings.');
  }

  if (D.metaCount > 0 && pre) {
    asks.push('Identify the exact Meta/Facebook tag or pixel that fired, where it is loaded from, and why the CMP did not block it in this state.');
    asks.push('Confirm whether advanced matching, custom audiences, retargeting, or conversion tracking are enabled for that Meta/Facebook tag.');
  }

  if (targeting.length && pre) {
    asks.push('For each targeting cookie (' + targeting.join(', ') + '), identify the vendor, purpose, consent category, and the condition that allows it to be written.');
  }

  if (D.gtmContainers.length > 1) {
    asks.push('Map every GTM container to an owner and confirm whether the CMP controls all tags inside it: ' + D.gtmContainers.join(', ') + '.');
  }

  asks.push('Can you confirm that ComplyAuto control script blocker.js is loaded before Google Tag Manager, Google Analytics, Google Ads, Meta/Facebook, and any other third-party scripts so that it can govern consent before those tags fire?');
    asks.push('Can you provide proof that blocker.js initializes before other advertising, analytics, retargeting, or GTM-loaded scripts?');

  if (reportCmpFirst(D) || reportGtmGated(D)) {
    asks.push('Confirm that the positive firing-order evidence means every relevant downstream script, pixel, cookie, and GTM tag is actively controlled before it is allowed to fire.');
  }

  if (reportNeedsNoBannerEvidence(D)) {
    asks.push('Confirm whether a visible website cookie banner with Accept and Deny/Reject controls exists. If no banner exists, do not treat this scan as true ' + reportRawModeLabel(D) + ' behavior.');
  }

  if (pre && D.analyticsCookieCount > 0) {
    asks.push('List the analytics cookies found in this state and confirm whether analytics_storage is denied, cookieless, or legally treated as exempt.');
  }

  if (pre && D.consentParams.some(function(p) { return /^npa=0$/i.test(p); })) {
    asks.push('Explain why npa=0 appeared in this state and provide proof that ad personalization is denied or restricted before consent and after Deny.');
  }

  if (!asks.length) asks.push('Provide written confirmation that this state is behaving as intended and preserve a screenshot or Tag Assistant evidence for the audit file.');
  return asks;
}

function reportYesNo(value) {
  return value ? 'Yes' : 'No';
}

function reportGcmShort(D) {
  if (D.consentParams.length === 0) return 'No signals detected';
  var personalization = reportGoogleAdPersonalization(D);
  if (personalization.status === 'denied') return 'Ad personalization appears denied';
  if (personalization.status === 'not-denied') return 'Ad personalization does not appear denied';
  if (D.hasOnlyGcdSignal) return 'Only gcd detected';
  return 'Signals need verification';
}

function reportGoogleAdPersonalization(D) {
  if (!D.consentParams.length) {
    return {
      status: 'not-confirmed',
      label: 'Google ad personalization: not confirmed',
      meaning: 'No Google Consent Mode v2 ad-personalization signal was captured. Ask the vendor to prove the denied/default state with Google Tag Assistant.'
    };
  }
  if (D.consentParams.some(function(p) { return /^npa=0$/i.test(p); })) {
    return {
      status: 'not-denied',
      label: 'Google ad personalization: does not appear denied',
      meaning: 'npa=0 means Google may be allowed to use personalized ads. That may be expected after Accept, but it should be reviewed if seen before consent or after Deny.'
    };
  }
  if (D.consentParams.some(function(p) { return /^npa=1$/i.test(p); })) {
    return {
      status: 'denied',
      label: 'Google ad personalization: appears denied/restricted',
      meaning: 'npa=1 means Google is being told to use non-personalized ads, which supports a restricted advertising state.'
    };
  }
  if (D.consentParams.some(function(p) { return /^pscdl=denied$/i.test(p) || /^ads_data_redaction=1$/i.test(p) || /^gcs=G100$/i.test(p); })) {
    return {
      status: 'denied',
      label: 'Google ad personalization: restricted signal detected',
      meaning: 'A denied/default-style Google signal was captured. Confirm the full Consent Mode v2 state with Google Tag Assistant.'
    };
  }
  return {
    status: 'not-confirmed',
    label: 'Google ad personalization: not confirmed',
    meaning: 'Google Consent Mode indicators were captured, but they do not clearly prove whether ad personalization was denied. gcd by itself is not enough.'
  };
}

function reportGoogleSignalRead(D) {
  if (!D.consentParams.length) return 'No Google consent parameters were captured.';
  var personalization = reportGoogleAdPersonalization(D);
  var notes = [];
  notes.push(personalization.label + '. ' + personalization.meaning);
  if (D.consentParams.some(function(p) { return /^npa=1$/i.test(p); })) notes.push('npa=1 indicates non-personalized ads/restricted ad personalization.');
  if (D.consentParams.some(function(p) { return /^npa=0$/i.test(p); })) notes.push('npa=0 indicates personalized ads may be allowed; confirm this only appears after Accept.');
  if (D.consentParams.some(function(p) { return /^pscdl=denied$/i.test(p); })) notes.push('pscdl=denied is a stronger denied/default-style signal.');
  if (D.consentParams.some(function(p) { return /^ads_data_redaction=1$/i.test(p); })) notes.push('ads_data_redaction=1 indicates ad data redaction is active.');
  if (D.consentParams.some(function(p) { return /^gcs=G100$/i.test(p); })) notes.push('gcs=G100 is a stronger denied/default-style signal.');
  if (D.hasOnlyGcdSignal) notes.push('gcd by itself is a Consent Mode indicator but does not prove denied/default behavior.');
  return notes.length ? notes.join(' ') : 'Google consent parameters were captured and should be confirmed against the selected test state.';
}

function reportBehavioralConsentRead(D) {
  var params = (D && D.consentParams) || [];
  var pre = reportIsPreConsent(D);
  var restricted = [];
  var concerning = [];
  if (params.some(function(p) { return /^npa=1$/i.test(p); })) restricted.push('npa=1');
  if (params.some(function(p) { return /^pscdl=denied$/i.test(p); })) restricted.push('pscdl=denied');
  if (params.some(function(p) { return /^ads_data_redaction=1$/i.test(p); })) restricted.push('ads_data_redaction=1');
  params.forEach(function(p) {
    if (/^gcs=G100$/i.test(p) || /^gcs=G101$/i.test(p)) restricted.push(p);
    if (/^gcs=G111$/i.test(p)) concerning.push(p);
  });
  if (params.some(function(p) { return /^npa=0$/i.test(p); })) concerning.push('npa=0');

  if (pre && restricted.length && !concerning.length) {
    return 'ComplyAuto control-script timing may still be unverified, but observed Google behavior supports a denied/restricted state. Evidence: ' + restricted.join(', ') + '.';
  }
  if (pre && concerning.length) {
    return 'This Fresh/Deny-style scan contains Google signals that may indicate ad personalization or granted-style behavior. Review with the vendor: ' + concerning.join(', ') + '.';
  }
  if (params.length) {
    return 'Google consent signals were captured. Their meaning depends on the selected consent state. Signals: ' + params.join(', ') + '.';
  }
  return 'No Google consent parameters were captured, so behavioral consent status was not verified in this scan.';
}

function mdCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function buildFinderySummary(D) {
  var fails = [];
  var warns = [];
  var passes = [];
  var pre = reportIsPreConsent(D);
  var targeting = D.cookies.filter(function(c){return c.category==='Targeting';});

  if (!D.hasCMP) fails.push('No consent manager detected');
  else passes.push('Consent manager detected: ' + D.cmp);

  passes.push('Consent state tested: ' + reportModeLabel(D));

  var normalizedLoadOrder = reportComplyAutoLoadOrderStatus(D);
  if (normalizedLoadOrder) {
    if (normalizedLoadOrder.status === 'loaded-first') {
      passes.push('ComplyAuto was detected before other tracking requests');
    } else if (normalizedLoadOrder.status === 'after-tracking') {
      fails.push('Tracking activity occurred before ComplyAuto control script blocker.js was detected');
    } else if (normalizedLoadOrder.status === 'unclear') {
      warns.push('ComplyAuto was detected, but blocker.js timing could not be verified');
    } else if (normalizedLoadOrder.status === 'not-detected') {
      warns.push('ComplyAuto not detected');
    }
    if (normalizedLoadOrder.priorityBeforeComplyAuto && normalizedLoadOrder.priorityBeforeComplyAuto.length) {
      normalizedLoadOrder.priorityBeforeComplyAuto.forEach(function(item) { fails.push(item); });
    }
  }

  if (D.gtmContainers.length > 10) warns.push('High GTM volume: ' + D.gtmContainers.length + ' containers detected');
  else if (D.gtmContainers.length > 1) warns.push('Multiple GTM containers: ' + D.gtmContainers.length + ' containers detected');
  else if (D.gtmContainers.length === 1) passes.push('1 GTM container detected');

  if (D.det.ga4 && D.consentParams.length === 0 && D.hasCMP && pre) fails.push('Google Consent Mode not confirmed in this fresh/denied-style scan');
  else if (D.det.ga4 && D.consentParams.length === 0 && D.hasCMP) warns.push('Google Consent Mode not detected in this selected browser state');
  else if (D.det.ga4 && D.consentParams.length === 0 && !D.hasCMP) fails.push('Google Consent Mode missing with no CMP detected');
  else if (D.consentParams.length > 0 && D.hasRestrictedSignals && pre) passes.push('Strong Google restricted/default-denied signals detected: ' + D.consentParams.join(', '));
  else if (D.consentParams.length > 0 && D.hasOnlyGcdSignal && pre) warns.push('Only gcd was detected; restricted/default-denied Google behavior was not proven');
  else if (D.consentParams.length > 0) warns.push('Google Consent Mode indicator detected, but the exact consent state needs verification');

  if (pre && D.analyticsCookieCount > 0) warns.push('Analytics cookies present before consent / after Deny: ' + D.analyticsCookieCount);

  if (D.metaCount > 0 && pre) fails.push('Meta/Facebook fired ' + D.metaCount + ' time(s) in a fresh/denied-style scan');
  else if (D.metaCount > 0) warns.push('Meta/Facebook fired ' + D.metaCount + ' time(s) in this selected browser state');
  else if (pre) passes.push('No Meta/Facebook requests before consent / after Deny');
  else passes.push('No Meta/Facebook requests in this session');

  if (targeting.length > 0 && pre) fails.push('Targeting cookies present in a fresh/denied-style scan: ' + targeting.map(function(c){return c.name;}).join(', '));
  else if (targeting.length > 0) warns.push('Targeting cookies present in this selected browser state: ' + targeting.map(function(c){return c.name;}).join(', '));
  else if (pre) passes.push('No targeting cookies before consent / after Deny');
  else passes.push('No targeting cookies in this session');

  return { fails: fails, warns: warns, passes: passes };
}

function buildPlainText(D, tips) {
  var md = buildSingleStateMarkdown(D, tips);
  return md
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\|/g, ' ')
    .replace(/^---$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addRecommendedEvidenceSet(lines, D) {
  lines.push('## Recommended Evidence Set');
  if (reportNeedsNoBannerEvidence(D)) {
    lines.push('- Fresh incognito / current-page report showing what fires before any website-level consent choice is available');
    lines.push('- Screenshot showing no visible website cookie banner, Accept button, Deny/Reject All button, or cookie settings control');
    lines.push('- If the browser blocked or denied cookies, screenshot the browser privacy/cookie setting so it is clear this was browser-level behavior, not a website CMP choice');
    lines.push('- Do not mark Accept/Post-consent as complete until the website provides a real Accept/Allow control');
    lines.push('- Do not mark Deny/Reject All as complete unless the website provides a real Deny/Reject control');
    lines.push('- Vendor confirmation showing whether a CMP/banner is installed, disabled, geofenced, broken, or intentionally not shown');
  } else {
    lines.push('- Fresh incognito / before consent choice report');
    lines.push('- Deny cookies / reject all report');
    lines.push('- Accept cookies / post-consent report');
    lines.push('- Screenshots showing the browser state and key signals such as gcs, gcd, npa, and pscdl');
  }
  lines.push('');
}

function addComplyAutoLoadOrderSection(lines, D) {
  var lo = reportComplyAutoLoadOrderStatus(D);
  lines.push('## COMPLYAUTO CONTROL EVIDENCE');
  lines.push('Evidence rule: ComplyAuto page or banner evidence shows ComplyAuto is present. The stronger control evidence is the `blocker.js` request. Load timing is verified only when the scan captures the actual `blocker.js` request in the captured request sequence.');
  lines.push('');
  lines.push(lo.summary);
  lines.push('');
  lines.push('| Timeline item | First observed |');
  lines.push('|---|---|');
  lines.push('| First ComplyAuto control script blocker.js | ' + mdCell(reportTimelinePoint(lo.firstComplyAutoControl || lo.firstComplyAuto)) + ' |');
  lines.push('| First ComplyAuto banner script banner.js | ' + mdCell(reportTimelinePoint(lo.firstComplyAutoBanner)) + ' |');
  lines.push('| First Google Tag Manager request | ' + mdCell(reportTimelinePoint(lo.firstGtm)) + ' |');
  lines.push('| First Google Analytics request | ' + mdCell(reportTimelinePoint(lo.firstGoogleAnalytics)) + ' |');
  lines.push('| First Google Ads / DoubleClick / pagead request | ' + mdCell(reportTimelinePoint(lo.firstGoogleAds)) + ' |');
  lines.push('| First Meta/Facebook request | ' + mdCell(reportTimelinePoint(lo.firstMeta)) + ' |');
  lines.push('| First targeting cookie observed | ' + mdCell(lo.firstTargetingCookie ? lo.firstTargetingCookie.label + ' (write order not confirmed)' : 'Not observed') + ' |');
  lines.push('| First analytics cookie observed | ' + mdCell(lo.firstAnalyticsCookie ? lo.firstAnalyticsCookie.label + ' (write order not confirmed)' : 'Not observed') + ' |');
  lines.push('');
  lines.push('Vendor ask: Can you confirm that ComplyAuto control script blocker.js initializes before Google Tag Manager, Google Analytics, Google Ads, Meta/Facebook, and any other third-party scripts so that it can govern consent before those tags fire?');
  lines.push('Vendor ask: Can you provide proof showing blocker.js initializing before other advertising, analytics, retargeting, or GTM-loaded scripts?');
  if (lo.priorityBeforeComplyAuto && lo.priorityBeforeComplyAuto.length) {
    lo.priorityBeforeComplyAuto.forEach(function(item) {
      lines.push('- Priority finding: ' + item + '.');
    });
  }
  lines.push('');
}

function buildMarkdown(D, tips, savedStates) {
  var states = normalizeSavedStates(savedStates);
  if (states.length >= 2) return buildConsolidatedMarkdown(D.hostname, states);
  return buildSingleStateMarkdown(D, tips);
}

function buildSingleStateMarkdown(D, tips) {
  var date = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  var summary = buildFinderySummary(D);
  var targeting = reportTargetingNames(D);
  var lines = [];

  lines.push('# ' + D.hostname + ' Dealer Website Risk Auditor Report');
  lines.push('Single-State Observation Summary for Dealer and Vendor Review');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('|---|---|');
  lines.push('| Site tested | ' + mdCell(D.hostname) + ' |');
  lines.push('| Test date | ' + mdCell(date) + ' |');
  lines.push('| Consent state reviewed | ' + mdCell(reportModeLabel(D)) + ' |');
  lines.push('| Overall observed risk rating | ' + mdCell(reportRiskRating(D)) + ' |');
  lines.push('| Rating meaning | ' + mdCell(reportRiskMeaning(D)) + ' |');
  lines.push('| CMP identified | ' + mdCell(reportCmpDisplay(D)) + ' |');
  lines.push('| Purpose | Technical summary for website privacy, consent, and vendor review. |');
  lines.push('');

  lines.push('## Executive Summary');
  if (D.hasCMP) lines.push('- ' + reportCmpDisplay(D) + ' was detected. That is the right foundation, but the scan still needs to be read only as "' + reportModeLabel(D) + '".');
  else lines.push('- No consent management platform was detected. This should be treated as the first vendor review item.');
  if (summary.fails.length) summary.fails.forEach(function(x) { lines.push('- Priority finding: ' + x + '.'); });
  if (!summary.fails.length && summary.warns.length) summary.warns.slice(0, 3).forEach(function(x) { lines.push('- Needs verification: ' + x + '.'); });
  if (reportConsentActionNotConfirmed(D)) lines.push('- Consent-state caution: this scan was labeled "' + reportRawModeLabel(D) + '", but no CMP/banner was detected. Treat it as an attempted consent-state scan, not a confirmed visitor choice.');
  if (D.metaCount === 0 && targeting.length === 0) lines.push('- This scan showed 0 Meta/Facebook requests and 0 targeting cookies.');
  if (D.auditMode && D.auditMode.isAccepted && !reportConsentActionNotConfirmed(D)) lines.push('- Accepted/post-consent behavior can be different from Fresh and Deny. Do not use this scan alone as proof of before-consent behavior.');
  lines.push('- ' + reportDisclaimer());
  lines.push('');

  addEvidenceStandardSection(lines);
  addConsentLayerSection(lines, D);
  addObservedLoadSequenceSection(lines, D, 30);
  addConsentBehaviorSection(lines, D);
  addComplyAutoLoadOrderSection(lines, D);
  lines.push('## BEHAVIORAL CONSENT SIGNAL READ');
  lines.push(reportBehavioralConsentRead(D));
  lines.push('');
  addHighPriorityObservationsSection(lines, D);

  lines.push('## CMP / ComplyAuto Context');
  lines.push(reportCmpContext(D));
  lines.push('');

  lines.push('## At-a-Glance Result');
  lines.push('| Consent state | Observed risk rating | CMP identified | GTM containers | Google Consent Mode | Meta requests | Analytics cookies | Targeting cookies |');
  lines.push('|---|---:|---:|---:|---|---:|---:|---:|');
  lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + mdCell(reportGradeLine(D)) + ' | ' + mdCell(reportCmpDisplay(D)) + ' | ' + D.gtmContainers.length + ' | ' + mdCell(reportGcmShort(D)) + ' | ' + D.metaCount + ' | ' + reportCategoryCount(D, 'Analytics') + ' | ' + targeting.length + ' |');
  lines.push('');

  lines.push('## Headline Numbers');
  lines.push('| Metric | Count |');
  lines.push('|---|---:|');
  lines.push('| Total requests | ' + D.totalReqs + ' |');
  lines.push('| Third-party domains | ' + D.thirdParty.length + ' |');
  lines.push('| Cookies detected | ' + D.cookies.length + ' |');
  lines.push('| Google requests | ' + D.googleCount + ' |');
  lines.push('| Meta/Facebook requests | ' + D.metaCount + ' |');
  lines.push('');

  lines.push('## Findings by Area');
  lines.push('| Area | Positive evidence | Needs verification | Plain-English read |');
  lines.push('|---|---|---|---|');
  lines.push('| Consent manager | ' + mdCell(D.hasCMP ? D.cmp + ' detected' : 'None detected') + ' | ' + mdCell(D.hasCMP ? 'Confirm it governs all relevant tags and containers.' : 'Confirm whether a CMP is installed or failing to load.') + ' | ' + mdCell(tips.cmp) + ' |');
  lines.push('| Google Tag Manager | ' + mdCell(D.gtmContainers.length ? D.gtmContainers.length + ' container(s) detected' : 'No GTM containers detected') + ' | ' + mdCell(D.gtmContainers.length > 1 ? 'Confirm ownership and CMP governance for every container.' : 'Confirm the active container is governed.') + ' | ' + mdCell(tips.gtm || 'No GTM-specific issue was detected in this scan.') + ' |');
  lines.push('| Google Consent Mode | ' + mdCell(reportGoogleAdPersonalization(D).label + (D.consentParams.length ? ' - Signals: ' + D.consentParams.join(', ') : ' - No signals captured')) + ' | ' + mdCell(reportGoogleSignalRead(D)) + ' | ' + mdCell(tips.consentMode) + ' |');
  lines.push('| Meta / Facebook | ' + mdCell(D.metaCount === 0 ? '0 requests captured' : D.metaCount + ' request(s) captured') + ' | ' + mdCell(D.metaCount > 0 ? 'Confirm whether this was expected in this state.' : 'Confirm it stays blocked in Fresh and Deny tests.') + ' | ' + mdCell(tips.meta) + ' |');
  lines.push('| Cookies | ' + mdCell(reportCategoryCount(D, 'Essential') + ' essential, ' + reportCategoryCount(D, 'Analytics') + ' analytics, ' + targeting.length + ' targeting') + ' | ' + mdCell(targeting.length ? 'Review targeting cookies: ' + targeting.join(', ') : 'Repeat Fresh and Deny tests for proof.') + ' | ' + mdCell(tips.cookies) + ' |');
  lines.push('');

  lines.push('## What This Means in This Consent State');
  reportStateFindingMeaning(D).forEach(function(x) { lines.push('- ' + x); });
  reportStateVendorAsks(D).forEach(function(x) { lines.push('- Vendor ask: ' + x); });
  lines.push('');

  if (D.gtmContainers.length) {
    lines.push('## GTM Container Appendix');
    D.gtmContainers.forEach(function(id) { lines.push('- `' + id + '`'); });
    lines.push('');
    lines.push('Governance point: the report does not prove who owns each GTM container. The safest next step is written vendor confirmation showing which party owns each container and whether the consent manager governs every relevant tag inside it.');
    lines.push('');
  }

  lines.push('## Priority Questions for Website / Consent Vendors');
  tips.vendorQs.forEach(function(q, i) { lines.push((i + 1) + '. ' + q); });
  if (reportNeedsNoBannerEvidence(D)) lines.push((tips.vendorQs.length + 1) + '. After the CMP/banner is installed, restored, or confirmed, can the vendor provide corrected evidence for Fresh visitor, Deny/Reject All, and Accept/Post-consent?');
  else lines.push((tips.vendorQs.length + 1) + '. After any repairs are made, can the vendor provide fresh evidence for all three states: Fresh visitor, Deny/Reject All, and Accept/Post-consent?');
  lines.push('');

  addRecommendedEvidenceSet(lines, D);

  lines.push('## Important Note');
  lines.push(reportDisclaimer() + ' The findings should be reviewed with dealership legal counsel, website provider, consent management provider, and advertising/analytics vendors before making final decisions.');
  lines.push('');
  lines.push('Generated by Dealer Website Risk Auditor');

  return lines.join('\n');
}

function normalizeSavedStates(savedStates) {
  var states = (savedStates || []).filter(function(D) { return D && D.hostname && D.auditMode; });
  var order = { fresh: 1, denied: 2, accepted: 3, no_banner: 4, current: 5 };
  var seen = {};
  states.forEach(function(D) { seen[reportModeKey(D)] = D; });
  return Object.keys(seen).map(function(k) { return seen[k]; }).sort(function(a, b) {
    return (order[reportModeKey(a)] || 99) - (order[reportModeKey(b)] || 99);
  });
}

function buildConsolidatedMarkdown(hostname, states) {
  var date = new Date().toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'});
  var lines = [];
  var fresh = states.filter(function(D) { return reportModeKey(D) === 'fresh'; })[0];
  var denied = states.filter(function(D) { return reportModeKey(D) === 'denied'; })[0];
  var accepted = states.filter(function(D) { return reportModeKey(D) === 'accepted'; })[0];
  var preStates = states.filter(function(D) { return D.auditMode && D.auditMode.isPreConsent; });
  var allCmp = states.every(function(D) { return D.hasCMP; });
  var noCmp = states.every(function(D) { return !D.hasCMP; });
  var maxGtm = Math.max.apply(null, states.map(function(D) { return D.gtmContainers.length; }));
  var allContainers = {};
  states.forEach(function(D) { D.gtmContainers.forEach(function(id) { allContainers[id] = true; }); });
  var allContainerIds = Object.keys(allContainers).sort();
  var preMeta = preStates.reduce(function(sum, D) { return sum + D.metaCount; }, 0);
  var preTargeting = preStates.reduce(function(sum, D) { return sum + reportTargetingNames(D).length; }, 0);
  var preAnalytics = preStates.reduce(function(sum, D) { return sum + reportCategoryCount(D, 'Analytics'); }, 0);

  lines.push('# ' + hostname + ' Dealer Website Risk Auditor Report');
  lines.push('Consolidated Observation Summary by Consent State');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('|---|---|');
  lines.push('| Site tested | ' + mdCell(hostname) + ' |');
  lines.push('| Test date | ' + mdCell(date) + ' |');
  lines.push('| Test states reviewed | ' + mdCell(states.map(reportModeLabel).join('; ')) + ' |');
  lines.push('| CMP identified | ' + mdCell(reportDetectedCmpNames(states).join(', ') || 'No CMP detected') + ' |');
  lines.push('| Purpose | Observation summary for dealer, vendor, and legal review. |');
  lines.push('');

  lines.push('## Executive Summary');
  if (allCmp) lines.push('- ' + reportCmpSummaryLine(states));
  else if (noCmp) lines.push('- The audit tool did not detect a consent management platform in any scanned state. This should be treated as a high-priority vendor review item.');
  else lines.push('- Consent manager detection was inconsistent across the scanned states. ' + reportCmpSummaryLine(states) + ' The vendor should confirm whether the CMP loads reliably.');
  if (reportHasUnconfirmedConsentAction(states)) lines.push('- Consent-state caution: one or more scans indicate no website-level banner or no confirmed Accept/Deny control. If there was no visible website consent choice, Accept/Post-consent and Deny/Reject All should be treated as unavailable until the CMP/banner is installed, restored, or confirmed.');
  if (states.some(reportCmpFirst)) lines.push('- Positive captured-sequence signal: the CMP appeared before major tracked requests in at least one scanned state.');
  if (states.some(function(D) { return D.complyAutoLoadOrder && D.complyAutoLoadOrder.status === 'after-tracking'; })) lines.push('- Priority captured-sequence finding: tracking activity was observed before ComplyAuto control script blocker.js in at least one scanned state.');
  if (states.some(reportGtmGated)) lines.push('- Google Tag Manager appeared while a CMP was present in at least one scanned state. The vendor should still confirm every tag inside every GTM container is governed.');
  if (preStates.length) {
    lines.push('- Fresh/Deny-style scans showed ' + preMeta + ' Meta/Facebook request(s) and ' + preTargeting + ' targeting cookie(s). These are the most important before-consent indicators.');
    if (preAnalytics > 0) lines.push('- Analytics cookies were present in Fresh/Deny-style scans. The vendor should explain whether those cookies are essential, allowed, or should be blocked/cookieless when consent is not granted.');
  }
  if (maxGtm > 1) lines.push('- GTM volume should be documented: up to ' + maxGtm + ' container(s) were detected, with ' + allContainerIds.length + ' unique container(s) across the reviewed states.');
  if (states.some(function(D) { return D.det.ga4 && (!D.hasRestrictedSignals || D.hasOnlyGcdSignal); })) lines.push('- Google Consent Mode needs stronger verification where only gcd or no signals were captured. Ask for Google Tag Assistant proof or stronger request parameters such as gcs=G100, npa=1, or pscdl=denied.');
  if (accepted && !reportConsentActionNotConfirmed(accepted)) lines.push('- Accepted/post-consent behavior should be materially different from Fresh and Deny. Any Meta or targeting activity after Accept may be expected, but the same behavior should not occur before consent or after Deny.');
  if (accepted && reportConsentActionNotConfirmed(accepted)) lines.push('- The Accepted/Post-consent scan should not be read as true accepted behavior because no CMP/banner was detected for the visitor to accept.');
  lines.push('- ' + reportDisclaimer());
  lines.push('');

  addEvidenceStandardSection(lines);
  lines.push('## CONSENT LAYER BY STATE');
  lines.push('| Consent state | Provider | Banner visible | Accept control | Deny control | Conclusion |');
  lines.push('|---|---|---|---|---|---|');
  states.forEach(function(D) {
    var layer = reportConsentLayerSummary(D);
    lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + mdCell(layer.provider) + ' | ' + mdCell(layer.bannerVisible) + ' | ' + mdCell(layer.acceptControl) + ' | ' + mdCell(layer.denyControl) + ' | ' + mdCell(layer.conclusion) + ' |');
  });
  lines.push('');

  lines.push('## CONSENT BEHAVIOR READ');
  states.forEach(function(D) {
    lines.push('- ' + reportModeLabel(D) + ': ' + reportCookieMonsterRead(D));
    lines.push('- ' + reportModeLabel(D) + ' Google behavior: ' + reportBehavioralConsentRead(D));
  });
  lines.push('');

  lines.push('## COMPLYAUTO CONTROL EVIDENCE');
  lines.push('Every report should answer this question: was ComplyAuto control script blocker.js captured in the request sequence? Page/banner evidence shows presence, but blocker.js request evidence is needed to verify control-script timing.');
  lines.push('');
  lines.push('| Consent state | Status | First blocker.js / ComplyAuto control | First tracking activity | Priority before blocker.js |');
  lines.push('|---|---|---|---|---|');
  states.forEach(function(D) {
    var lo = reportComplyAutoLoadOrderStatus(D);
    lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + mdCell(lo.label || 'ComplyAuto blocker.js timing could not be verified') + ' | ' + mdCell(reportTimelinePoint(lo.firstComplyAutoControl || lo.firstComplyAuto)) + ' | ' + mdCell(reportTimelinePoint(lo.firstTracking)) + ' | ' + mdCell((lo.priorityBeforeComplyAuto && lo.priorityBeforeComplyAuto.length) ? lo.priorityBeforeComplyAuto.join('; ') : 'None detected') + ' |');
  });
  lines.push('');
  lines.push('Vendor ask: Can you confirm that ComplyAuto control script blocker.js initializes before Google Tag Manager, Google Analytics, Google Ads, Meta/Facebook, and any other third-party scripts so that it can govern consent before those tags fire?');
  lines.push('Vendor ask: Can you provide proof showing blocker.js initializing before other advertising, analytics, retargeting, or GTM-loaded scripts?');
  lines.push('');

  lines.push('## CAPTURED REQUEST SEQUENCE BY STATE');
  states.forEach(function(D) {
    lines.push('### ' + reportModeLabel(D));
    var items = (D.observedSequence || []).slice(0, 20);
    if (!items.length) {
      lines.push('No captured request sequence was available for this state.');
      lines.push('');
      return;
    }
    lines.push('| # | Tool / vendor | Type | Concern level | Evidence source |');
    lines.push('|---:|---|---|---|---|');
    items.forEach(function(item, index) {
      lines.push('| ' + (index + 1) + ' | ' + mdCell(item.name) + ' | ' + mdCell(item.category) + ' | ' + mdCell(item.concern) + ' | ' + mdCell(item.source) + ' |');
    });
    lines.push('');
  });

  lines.push('## HIGH PRIORITY OBSERVATIONS');
  lines.push('These are observed website-risk indicators, not legal conclusions. They help the dealer decide what to review with website, consent, advertising, and legal advisors.');
  states.forEach(function(D) {
    lines.push('### ' + reportModeLabel(D));
    (D.federalFlags && D.federalFlags.length ? D.federalFlags : ['No high-priority observation was automatically triggered by the captured scan data. This is not a legal compliance conclusion.']).forEach(function(flag) {
      lines.push('- ' + flag.replace(/^Federal review flag:\s*/i, 'Observed risk indicator: '));
    });
    lines.push('');
  });

  lines.push('## At-a-Glance Comparison');
  lines.push('| Consent state | Observed risk rating | CMP identified | GTM containers | Google Consent Mode | Meta requests | Analytics cookies | Targeting cookies |');
  lines.push('|---|---:|---:|---:|---|---:|---:|---:|');
  states.forEach(function(D) {
    var targeting = reportTargetingNames(D);
    lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + mdCell(reportGradeLine(D)) + ' | ' + mdCell(reportCmpDisplay(D)) + ' | ' + D.gtmContainers.length + ' | ' + mdCell(reportGcmShort(D)) + ' | ' + D.metaCount + ' | ' + reportCategoryCount(D, 'Analytics') + ' | ' + targeting.length + (targeting.length ? ' (' + mdCell(targeting.join(', ')) + ')' : '') + ' |');
  });
  lines.push('');

  lines.push('## Headline Numbers by Test State');
  lines.push('| Consent state | Total requests | Third-party domains | Cookies detected | Google requests | Meta requests |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  states.forEach(function(D) {
    lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + D.totalReqs + ' | ' + D.thirdParty.length + ' | ' + D.cookies.length + ' | ' + D.googleCount + ' | ' + D.metaCount + ' |');
  });
  lines.push('');

  lines.push('## What These Findings Mean by Consent State');
  lines.push('| Consent state | What this state means | Key findings in this state | Load-order / gate read | What to ask the vendor |');
  lines.push('|---|---|---|---|---|');
  states.forEach(function(D) {
    var summaryBits = [];
    var asks = reportStateVendorAsks(D);
    if (D.metaCount > 0) summaryBits.push('Meta/Facebook requests: ' + D.metaCount);
    else summaryBits.push('Meta/Facebook requests: 0');
    summaryBits.push('Analytics cookies: ' + reportCategoryCount(D, 'Analytics'));
    var targeting = reportTargetingNames(D);
    summaryBits.push('Targeting cookies: ' + (targeting.length ? reportCookieNamesWithMeanings(targeting) : '0'));
    summaryBits.push('GTM containers: ' + D.gtmContainers.length);
    lines.push('| ' + mdCell(reportModeLabel(D)) + ' | ' + mdCell(reportConsentStateRead(D)) + ' | ' + mdCell(summaryBits.join(' ')) + ' | ' + mdCell(reportLoadOrderRead(D)) + ' | ' + mdCell(asks.join(' ')) + ' |');
  });
  lines.push('');

  lines.push('## Cookie Name Plain-English Guide');
  lines.push('| Cookie | What it usually means |');
  lines.push('|---|---|');
  uniqueTargetingCookieNames(states).forEach(function(name) {
    lines.push('| ' + mdCell(name) + ' | ' + mdCell(reportCookieMeaning(name)) + ' |');
  });
  if (!uniqueTargetingCookieNames(states).length) lines.push('| None detected | No targeting cookies were detected in the reviewed states. |');
  lines.push('');

  lines.push('## CMP / ComplyAuto Context');
  lines.push('A consent banner and an active consent-control system are not always the same thing. Some CMPs use advanced category, location, risk, and state-based controls. Others may mainly provide a simple Accept/Deny interface with limited downstream control. The audit should verify whether tracking actually changes across Fresh visitor, Deny/Reject All, and Accept/Post-consent states.');
  if (states.some(function(D) { return D.hasCMP && /comply\s*auto/i.test(D.cmp || ''); })) {
    lines.push('');
    lines.push('ComplyAuto note: ComplyAuto may use geolocation to determine the visitor state or region and apply state-specific consent rules. For example, a California visitor may receive a stricter consent experience than a visitor from a less restrictive state. Because of this, the same website may behave differently depending on where the scan is run from. Ask the vendor what location/state was assigned to this scan and which ComplyAuto rule set was active.');
  }
  lines.push('');

  lines.push('## State-by-State Notes');
  states.forEach(function(D) {
    var summary = buildFinderySummary(D);
    lines.push('### ' + reportModeLabel(D) + ' - ' + reportGradeLine(D));
    if (summary.fails.length) summary.fails.forEach(function(x) { lines.push('- Priority finding: ' + x + '.'); });
    if (summary.warns.length) summary.warns.forEach(function(x) { lines.push('- Needs verification: ' + x + '.'); });
    if (!summary.fails.length && !summary.warns.length) lines.push('- No major consent-control issue was detected in this state.');
    reportStateFindingMeaning(D).forEach(function(x) { lines.push('- Meaning: ' + x); });
    reportStateVendorAsks(D).forEach(function(x) { lines.push('- Vendor ask: ' + x); });
    lines.push('');
  });

  lines.push('## Recommended Questions for Website / Consent Vendors');
  var questions = buildConsolidatedQuestions(states, allContainerIds);
  questions.forEach(function(q, i) { lines.push((i + 1) + '. ' + q); });
  lines.push('');

  if (allContainerIds.length) {
    lines.push('## GTM Container Appendix');
    states.forEach(function(D) {
      lines.push('**' + reportModeLabel(D) + ' containers detected (' + D.gtmContainers.length + ')**');
      lines.push(D.gtmContainers.length ? D.gtmContainers.map(function(id) { return '`' + id + '`'; }).join(', ') : 'None detected');
      lines.push('');
    });
    lines.push('Governance point: this report does not identify the owner of each GTM container. The safest next step is written vendor confirmation showing which party owns each container and whether the consent manager governs every relevant tag inside it.');
    lines.push('');
  }

  lines.push('## Evidence Set Reviewed');
  lines.push('This consolidated report is based on the scan states currently saved in Dealer Website Risk Auditor for ' + hostname + '.');
  if (reportHasUnconfirmedConsentAction(states)) {
    lines.push('Because no website-level banner or confirmed Accept/Deny control was available in at least one scan, final records should include the Fresh/current-page report, the no-banner screenshot, and any browser privacy/cookie setting screenshot. Do not treat Accept/Post-consent or Deny/Reject All as complete unless the website provides actual controls for those choices.');
  } else {
    lines.push('For final records, keep the individual Fresh, Deny/Reject All, and Accepted/Post-consent reports with screenshots.');
  }
  lines.push('');

  lines.push('## Important Note');
  lines.push(reportDisclaimer() + ' The findings should be reviewed with dealership legal counsel, website provider, consent management provider, and advertising/analytics vendors before making final decisions.');
  lines.push('');
  lines.push('Generated by Dealer Website Risk Auditor');

  return lines.join('\n');
}

function uniqueTargetingCookieNames(states) {
  var seen = {};
  states.forEach(function(D) {
    reportTargetingNames(D).forEach(function(name) { seen[name] = true; });
  });
  return Object.keys(seen).sort();
}

function buildConsolidatedQuestions(states, allContainerIds) {
  var hasCmp = states.some(function(D) { return D.hasCMP; });
  var hasMissingCmp = states.some(function(D) { return !D.hasCMP; });
  var hasPreMeta = states.some(function(D) { return D.auditMode && D.auditMode.isPreConsent && D.metaCount > 0; });
  var hasPreAnalytics = states.some(function(D) { return D.auditMode && D.auditMode.isPreConsent && reportCategoryCount(D, 'Analytics') > 0; });
  var hasPreNpaAllowed = states.some(function(D) { return D.auditMode && D.auditMode.isPreConsent && D.consentParams.some(function(p) { return /^npa=0$/i.test(p); }); });
  var hasGcmGap = states.some(function(D) { return D.det.ga4 && (!D.hasRestrictedSignals || D.hasOnlyGcdSignal); });
  var questions = [];

  if (hasMissingCmp) questions.push('Do we currently have a consent management platform installed on this website? If yes, why did the audit tool not detect it in every scanned state?');
  if (reportHasUnconfirmedConsentAction(states)) questions.push('If no Accept/Deny banner is visible, can the vendor confirm that the labeled Accept or Deny scans are not true consent-state tests and provide a corrected test after the CMP/banner is installed or restored?');
  questions.push('Can you confirm that ComplyAuto control script blocker.js is loaded before Google Tag Manager, Google Analytics, Google Ads, Meta/Facebook, and any other third-party scripts so that it can govern consent before those tags fire?');
  questions.push('Can you provide proof showing blocker.js initializing before other advertising, analytics, retargeting, or GTM-loaded scripts?');
  if (hasCmp) questions.push('Can you provide written confirmation that all targeting and analytics tags are blocked or restricted before consent and after Deny/Reject All?');
  if (allContainerIds.length) questions.push('Which vendor or party owns each detected GTM container, and are all relevant containers governed by the consent manager: ' + allContainerIds.join(', ') + '?');
  if (states.some(function(D) { return D.hasCMP && /comply\s*auto/i.test(D.cmp || ''); })) {
    questions.push('For ComplyAuto, what visitor location/state was assigned to this scan, and which state-specific rule set was applied?');
    questions.push('Is the dealer using ComplyAuto high-risk/most guarded, California/strict, or lower-risk/more permissive settings?');
  }
  if (hasPreMeta) questions.push('Why did Meta/Facebook fire during a Fresh visitor or Deny/Reject All scan?');
  questions.push('Can you confirm that Meta/Facebook and targeting cookies are blocked before consent and after reject all?');
  if (hasPreAnalytics) questions.push('Why were analytics cookies present before consent or after Deny? Are they essential, consent-exempt, or should analytics_storage be denied/cookieless?');
  if (hasPreNpaAllowed) questions.push('Why was npa=0 present before consent or after Deny? Should ad personalization be denied or restricted in those states?');
  if (hasGcmGap) questions.push('Is Google Consent Mode v2 active, and can the vendor provide stronger proof of denied/default states, such as Google Tag Assistant screenshots or request parameters like gcs=G100, npa=1, or pscdl=denied?');
  questions.push('Can the vendor provide a current map of all website scripts, containers, pixels, and consent categories so approved third-party scripts are documented going forward?');
  questions.push('After repairs are made, can the vendor provide fresh evidence for all three states: Fresh visitor, Deny/Reject All, and Accept/Post-consent?');

  return questions;
}
