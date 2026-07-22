(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};
  core.detectTechnologies = function(text) {
    var value = (text || '').toLowerCase();
    return { gtm:/googletagmanager|gtm\.js/.test(value), ga4:/google-analytics|gtag\/js|analytics\.google/.test(value), gads:/doubleclick|googleadservices/.test(value), meta:/connect\.facebook|facebook\.com\/tr|fbevents/.test(value), hotjar:value.indexOf('hotjar') > -1, clarity:value.indexOf('clarity.ms') > -1 };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
