(function(root) {
  'use strict';
  var core = root.RiskAuditorCore = root.RiskAuditorCore || {};

  core.waitForRequestSettle = function(getData, options) {
    options = options || {};
    var quietMs = options.quietMs == null ? 2000 : options.quietMs;
    var maxWaitMs = options.maxWaitMs == null ? 6000 : options.maxWaitMs;
    var pollMs = options.pollMs == null ? 250 : options.pollMs;
    var startedAt = Date.now();
    var quietSince = startedAt;
    var lastRevision = null;
    var latest = null;
    return new Promise(function(resolve, reject) {
      function poll() {
        Promise.resolve().then(getData).then(function(data) {
          latest = data || { requests:[] };
          var revision = typeof latest.captureRevision === 'number' ? latest.captureRevision : ((latest.requests || []).length);
          var now = Date.now();
          if (lastRevision === null || revision !== lastRevision) {
            lastRevision = revision;
            quietSince = now;
          }
          if (now - quietSince >= quietMs || now - startedAt >= maxWaitMs) return resolve(latest);
          setTimeout(poll, pollMs);
        }, reject);
      }
      poll();
    });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
