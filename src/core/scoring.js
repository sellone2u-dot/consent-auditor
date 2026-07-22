(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};
  function gradeFromScore(score) { return score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'; }
  function capGrade(grade, cap) { var order = ['A','B','C','D','F']; return order.indexOf(grade) < order.indexOf(cap) ? cap : grade; }
  function scoreAnalysis(input) {
    var score = 100, caps = [], notes = [], mode = input.auditMode;
    if (!input.hasCMP) { score -= 45; caps.push('D'); notes.push('No consent manager detected.'); }
    if (mode.isPreConsent && input.ga4 && input.hasCMP && !input.hasRestrictedSignals) { score -= input.hasOnlyGcdSignal ? 14 : 20; caps.push('B'); notes.push(input.hasOnlyGcdSignal ? 'Only gcd was detected; restricted/default-denied Google behavior was not proven.' : 'Google restricted/default-denied behavior not confirmed in a pre-consent style test.'); }
    if (!mode.isPreConsent && input.ga4 && input.hasCMP && !input.hasConsentSignals) { score -= 3; notes.push('Consent Mode not seen in this selected browser state; confirm separately if needed.'); }
    if (mode.isPreConsent && input.metaCount > 0) { score -= input.hasCMP ? 25 : 35; caps.push('C'); notes.push('Meta/Facebook fired during a pre-consent or denied-cookie test.'); }
    if (!mode.isPreConsent && input.metaCount > 0 && !mode.isAccepted) { score -= 8; notes.push('Meta fired in current/unknown state; determine whether this was after consent.'); }
    if (mode.isPreConsent && input.targetingCount > 0) { score -= input.hasCMP ? 22 : 32; caps.push('C'); notes.push('Targeting cookies appeared during a pre-consent or denied-cookie test.'); }
    if (!mode.isPreConsent && input.targetingCount > 0 && !mode.isAccepted) { score -= 6; notes.push('Targeting cookies appeared in current/unknown state; confirm consent state.'); }
    if (mode.isPreConsent && input.analyticsCookieCount > 0) { score -= 8; caps.push('B'); notes.push('Analytics cookies appeared during a pre-consent or denied-cookie test; verify they are allowed or cookieless.'); }
    if (input.complyAutoStatus === 'after-tracking') { score -= mode.isPreConsent ? 18 : 8; caps.push(mode.isPreConsent ? 'D' : 'C'); notes.push('Tracking activity appeared before ComplyAuto control script blocker.js in the request timeline.'); }
    if (mode.isPreConsent && input.priorityBeforeCount > 0) { score -= 20; caps.push('F'); notes.push('Priority tracking or targeting signals appeared before ComplyAuto control script blocker.js.'); }
    if (input.gtmCount > 10) { score -= 15; caps.push('B'); notes.push('Excessive GTM container count creates governance risk.'); }
    else if (input.gtmCount > 5) { score -= 10; caps.push('B'); notes.push('High GTM container count needs governance confirmation.'); }
    else if (input.gtmCount > 2) score -= 4;
    score = Math.max(0, Math.min(100, score));
    var grade = gradeFromScore(score); caps.forEach(function(cap){ grade = capGrade(grade, cap); });
    return {score:score, grade:grade, notes:notes};
  }
  core.gradeFromScore = gradeFromScore; core.capGrade = capGrade; core.scoreAnalysis = scoreAnalysis;
})(typeof globalThis !== 'undefined' ? globalThis : this);
