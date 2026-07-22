(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};
  function interpretConsentSignals(requests) {
    var values = [];
    (requests || []).filter(function(r) { return /google-analytics|analytics\.google|gtag\/js|googleadservices|doubleclick|pagead/i.test(r.url || ''); }).forEach(function(r) {
      ['gcs','gcd','npa','pscdl','ads_data_redaction'].forEach(function(param) {
        var match = (r.url || '').match(new RegExp('[?&]' + param + '=([^&]+)', 'i'));
        if (match) values.push(param + '=' + decodeURIComponent(match[1]));
      });
    });
    var params = values.filter(function(v,i,a) { return a.indexOf(v) === i; });
    var restricted = params.some(function(p) { return /^npa=1$/i.test(p) || /^pscdl=denied$/i.test(p) || /^ads_data_redaction=1$/i.test(p) || /^gcs=G100$/i.test(p); });
    return { params:params, hasSignals:params.length > 0, hasRestrictedSignals:restricted, hasOnlyGcdSignal:params.length > 0 && params.every(function(p){ return /^gcd=/i.test(p); }) };
  }
  core.interpretConsentSignals = interpretConsentSignals;
})(typeof globalThis !== 'undefined' ? globalThis : this);
