(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};
  var CONSENT_FIELDS = ['gcs','gcd','npa','pscdl','ads_data_redaction','dma','dma_cps','ad_user_data','ad_personalization'];

  function isConsentField(name) {
    return CONSENT_FIELDS.indexOf(String(name || '').toLowerCase()) > -1;
  }

  function addValue(values, name, value, source) {
    var key = String(name || '').toLowerCase();
    if (!isConsentField(key) || value == null) return;
    values.push({ name:key, value:String(value), source:source });
  }

  function parseEncodedText(text, source) {
    var values = [];
    if (typeof text !== 'string' || !text) return values;
    var value = text.charAt(0) === '?' ? text.slice(1) : text;
    value.split('&').forEach(function(part) {
      if (!part) return;
      var separator = part.indexOf('=');
      var rawName = separator > -1 ? part.slice(0, separator) : part;
      var rawValue = separator > -1 ? part.slice(separator + 1) : '';
      try {
        addValue(values, decodeURIComponent(rawName.replace(/\+/g, ' ')), decodeURIComponent(rawValue.replace(/\+/g, ' ')), source);
      } catch(e) {}
    });
    return values;
  }

  function measurementIdsFromText(text) {
    var ids = [];
    if (typeof text !== 'string' || !text) return ids;
    text.split('&').forEach(function(part) {
      var separator = part.indexOf('=');
      if (separator < 0) return;
      try {
        var name = decodeURIComponent(part.slice(0, separator).replace(/\+/g, ' ')).toLowerCase();
        var value = decodeURIComponent(part.slice(separator + 1).replace(/\+/g, ' '));
        if (name === 'tid' && /^G-[A-Z0-9]+$/i.test(value) && ids.indexOf(value.toUpperCase()) === -1) ids.push(value.toUpperCase());
      } catch(e) {}
    });
    return ids;
  }

  function normalizeGoogleRequestBody(requestBody) {
    var result = { consentParams:[], measurementIds:[] };
    if (!requestBody || requestBody.error) return result;
    var formData = requestBody.formData;
    if (formData && typeof formData === 'object') {
      Object.keys(formData).forEach(function(name) {
        var entries = Array.isArray(formData[name]) ? formData[name] : [formData[name]];
        entries.forEach(function(value) {
          if (typeof value !== 'string') return;
          addValue(result.consentParams, name, value, 'body');
          if (String(name).toLowerCase() === 'tid' && /^G-[A-Z0-9]+$/i.test(value)) {
            var id = value.toUpperCase();
            if (result.measurementIds.indexOf(id) === -1) result.measurementIds.push(id);
          }
        });
      });
    }
    if ((result.consentParams.length || result.measurementIds.length) || !Array.isArray(requestBody.raw)) return result;
    requestBody.raw.forEach(function(upload) {
      if (!upload || !upload.bytes || typeof TextDecoder === 'undefined') return;
      try {
        var bytes = upload.bytes instanceof ArrayBuffer ? new Uint8Array(upload.bytes) : new Uint8Array(upload.bytes.buffer || upload.bytes);
        var text = new TextDecoder('utf-8', { fatal:true }).decode(bytes);
        parseEncodedText(text, 'body').forEach(function(item) { result.consentParams.push(item); });
        measurementIdsFromText(text).forEach(function(id) {
          if (result.measurementIds.indexOf(id) === -1) result.measurementIds.push(id);
        });
      } catch(e) {}
    });
    return result;
  }

  function normalizeConsentRequestBody(requestBody) {
    return normalizeGoogleRequestBody(requestBody).consentParams;
  }

  function isEligibleGoogleConsentRequest(request) {
    var parsed;
    try { parsed = new URL((request && request.url) || ''); } catch(e) { return false; }
    var host = parsed.hostname.toLowerCase();
    var path = parsed.pathname.toLowerCase();
    if (/(^|\.)google-analytics\.com$/.test(host) || host === 'analytics.google.com') {
      return /\/(?:g\/)?collect(?:\/|$)/.test(path) || /\/j\/collect(?:\/|$)/.test(path);
    }
    if (host === 'www.googletagmanager.com' || host === 'googletagmanager.com') {
      return /\/(?:g\/)?collect(?:\/|$)/.test(path);
    }
    if (/(^|\.)googleadservices\.com$/.test(host) || /(^|\.)doubleclick\.net$/.test(host)) {
      return /\/(?:pagead\/(?:conversion|viewthroughconversion)|activityi?|fls)(?:\/|$)/.test(path);
    }
    if (/(^|\.)googlesyndication\.com$/.test(host)) {
      return /\/pagead\/(?:1p-conversion|1p-user-list|conversion|viewthroughconversion)(?:\/|$)/.test(path);
    }
    return false;
  }

  function valuesForRequest(request) {
    var values = [];
    var query = '';
    try { query = new URL((request && request.url) || '').search.slice(1); } catch(e) {}
    parseEncodedText(query, 'url').forEach(function(item) { values.push(item); });
    ((request && request.consentBodyParams) || []).forEach(function(item) {
      if (item && typeof item === 'object') addValue(values, item.name, item.value, 'body');
    });
    return values;
  }

  function isPlaceholderMeasurementId(id) {
    return /^G-(?:X{6,}|Y{6,}|0{6,}|TEST[A-Z0-9]*)$/i.test(id || '');
  }

  function interpretConsentSignals(requests) {
    var params = [];
    var observations = [];
    var eligibleCount = 0;
    var measurementIds = [];
    (requests || []).forEach(function(request) {
      if (!isEligibleGoogleConsentRequest(request)) return;
      eligibleCount += 1;
      var query = '';
      try { query = new URL(request.url || '').search.slice(1); } catch(e) {}
      measurementIdsFromText(query).concat(request.googleMeasurementIds || []).forEach(function(id) {
        var normalizedId = String(id).toUpperCase();
        if (/^G-[A-Z0-9]+$/.test(normalizedId) && measurementIds.indexOf(normalizedId) === -1) measurementIds.push(normalizedId);
      });
      var requestValues = valuesForRequest(request);
      requestValues.forEach(function(item) {
        var param = item.name + '=' + item.value;
        if (params.indexOf(param) === -1) params.push(param);
      });
      if (requestValues.length) {
        observations.push({
          requestId:request.requestId || null,
          seq:request.seq || null,
          timestamp:request.timestamp == null ? null : request.timestamp,
          method:request.method || null,
          resourceType:request.resourceType || null,
          initiator:request.initiator || null,
          url:request.url,
          signals:requestValues.map(function(item) { return { name:item.name, value:item.value, source:item.source }; })
        });
      }
    });
    var restricted = params.some(function(p) { return /^npa=1$/i.test(p) || /^pscdl=denied$/i.test(p) || /^ads_data_redaction=1$/i.test(p) || /^gcs=G10[01]$/i.test(p); });
    var outcome = params.length ? 'signals_observed' : eligibleCount ? 'eligible_no_signals' : 'no_eligible_request';
    return {
      params:params,
      hasSignals:params.length > 0,
      hasRestrictedSignals:restricted,
      hasOnlyGcdSignal:params.length > 0 && params.every(function(p){ return /^gcd=/i.test(p); }),
      eligibleGoogleRequestCount:eligibleCount,
      consentSignalObservations:observations,
      googleConsentOutcome:outcome,
      googleMeasurementIds:measurementIds,
      placeholderGoogleMeasurementIds:measurementIds.filter(isPlaceholderMeasurementId)
    };
  }

  core.googleConsentFields = CONSENT_FIELDS.slice();
  core.normalizeConsentRequestBody = normalizeConsentRequestBody;
  core.normalizeGoogleRequestBody = normalizeGoogleRequestBody;
  core.isPlaceholderGoogleMeasurementId = isPlaceholderMeasurementId;
  core.isEligibleGoogleConsentRequest = isEligibleGoogleConsentRequest;
  core.interpretConsentSignals = interpretConsentSignals;
})(typeof globalThis !== 'undefined' ? globalThis : this);
