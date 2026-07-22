function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function parseTable(lines, start) {
  var rows = [];
  var i = start;
  while (i < lines.length && /^\s*\|/.test(lines[i])) {
    if (!/^\s*\|?\s*:?-{3,}:?\s*\|/.test(lines[i])) {
      var cells = lines[i].trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
      rows.push(cells.map(function(cell) { return inlineMarkdown(cell.trim().replace(/\\\|/g, '|')); }));
    }
    i++;
  }
  if (!rows.length) return { html: '', next: i };
  var head = rows.shift();
  var html = '<table><thead><tr>' + head.map(function(cell) { return '<th>' + cell + '</th>'; }).join('') + '</tr></thead><tbody>';
  rows.forEach(function(row) {
    html += '<tr>' + row.map(function(cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
  });
  html += '</tbody></table>';
  return { html: html, next: i };
}

function markdownToHtml(markdown) {
  var lines = markdown.split(/\r?\n/);
  var html = [];
  var listType = null;

  function closeList() {
    if (listType) {
      html.push('</' + listType + '>');
      listType = null;
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) {
      closeList();
      continue;
    }
    if (/^\s*\|/.test(line)) {
      closeList();
      var table = parseTable(lines, i);
      html.push(table.html);
      i = table.next - 1;
      continue;
    }
    if (line.indexOf('# ') === 0) {
      closeList();
      html.push('<h1>' + inlineMarkdown(line.replace(/^#\s+/, '')) + '</h1>');
      continue;
    }
    if (line.indexOf('## ') === 0) {
      closeList();
      html.push('<h2>' + inlineMarkdown(line.replace(/^##\s+/, '')) + '</h2>');
      continue;
    }
    if (line.indexOf('### ') === 0) {
      closeList();
      html.push('<h3>' + inlineMarkdown(line.replace(/^###\s+/, '')) + '</h3>');
      continue;
    }
    if (line === '---') {
      closeList();
      continue;
    }
    if (/^- /.test(line)) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html.push('<ul>');
      }
      html.push('<li>' + inlineMarkdown(line.replace(/^- /, '')) + '</li>');
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html.push('<ol>');
      }
      html.push('<li>' + inlineMarkdown(line.replace(/^\d+\.\s+/, '')) + '</li>');
      continue;
    }
    closeList();
    if (html.length === 1 && /^Consolidated|^Single-State/.test(line)) {
      html.push('<p class="subtitle">' + inlineMarkdown(line) + '</p>');
    } else {
      html.push('<p>' + inlineMarkdown(line) + '</p>');
    }
  }

  closeList();
  return html.join('\n');
}

function getReportPayload() {
  return new Promise(function(resolve) {
    chrome.storage.local.get('consentAuditorPrintableReport', function(result) {
      resolve((result && result.consentAuditorPrintableReport) || {});
    });
  });
}

function safeReportFilename(hostname, extension) {
  var host = (hostname || 'dealer-site').replace(/^www\./i, '').replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '');
  var date = new Date().toISOString().slice(0, 10);
  return host + '-privacy-consent-audit-' + date + '.' + extension;
}

function downloadTextFile(filename, text, mimeType) {
  return new Promise(function(resolve, reject) {
    var blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    chrome.downloads.download({ url: url, filename: filename, saveAs: true }, function(downloadId) {
      var err = chrome.runtime.lastError;
      setTimeout(function() { URL.revokeObjectURL(url); }, 30000);
      if (err) reject(new Error(err.message));
      else resolve(downloadId);
    });
  });
}

function buildStandaloneHtml(payload, bodyHtml) {
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>' +
    escapeHtml((payload.hostname || 'Consent Audit') + ' Report') +
    '</title>\n<style>' +
    'body{margin:0;background:#eef1f5;color:#172033;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45}' +
    '.page{width:8.5in;min-height:11in;margin:22px auto;background:#fff;padding:.62in .68in;box-shadow:0 8px 28px rgba(23,32,51,.18)}' +
    'h1{font-size:22px;line-height:1.18;margin:0 0 4px;color:#172033;font-weight:700}' +
    '.subtitle{font-size:13px;color:#566174;margin:0 0 18px}' +
    'h2{font-size:15px;margin:20px 0 8px;color:#21365b;border-bottom:1px solid #d8dee8;padding-bottom:4px}' +
    'h3{font-size:12.5px;margin:14px 0 5px;color:#2b3f63}' +
    'p{margin:0 0 8px}ul,ol{margin:6px 0 10px 19px;padding:0}li{margin:3px 0}' +
    'table{width:100%;border-collapse:collapse;margin:8px 0 13px}th,td{border:1px solid #cfd6e1;padding:5px 6px;vertical-align:top}' +
    'th{background:#edf2f8;color:#22324f;font-weight:700}code{font-family:Consolas,Menlo,monospace;background:#f2f4f7;border:1px solid #d8dee8;border-radius:3px;padding:0 3px;font-size:11px}' +
    '.note{margin-top:18px;padding-top:10px;border-top:1px solid #d8dee8;color:#566174;font-size:11px}' +
    '@media print{body{background:#fff}.page{width:auto;min-height:auto;margin:0;padding:0;box-shadow:none}}' +
    '</style>\n</head>\n<body>\n<main class="page">\n' +
    bodyHtml +
    '\n<p class="note">Generated by Dealer Website Risk Auditor. This report records observable website behavior and does not certify compliance or provide legal conclusions.</p>' +
    '\n</main>\n</body>\n</html>';
}

document.addEventListener('DOMContentLoaded', async function() {
  var payload = await getReportPayload();
  var report = document.getElementById('report');
  if (!payload.markdown) {
    report.className = 'empty';
    report.innerHTML = '<h1>No report found</h1><p>Go back to Dealer Website Risk Auditor, run a scan, then choose Open PDF report.</p>';
    return;
  }

  var reportHtml = markdownToHtml(payload.markdown);
  report.innerHTML = reportHtml +
    '<p class="note">Generated by Dealer Website Risk Auditor. This report records observable website behavior and does not certify compliance or provide legal conclusions.</p>';

  document.title = (payload.hostname || 'Consent Audit') + ' PDF Report';
  document.getElementById('printBtn').addEventListener('click', function() { window.print(); });
  document.getElementById('copyBtn').addEventListener('click', function() {
    navigator.clipboard.writeText(payload.markdown);
  });
  document.getElementById('downloadTextBtn').addEventListener('click', function() {
    downloadTextFile(safeReportFilename(payload.hostname, 'md'), payload.markdown, 'text/markdown;charset=utf-8');
  });
  document.getElementById('downloadHtmlBtn').addEventListener('click', function() {
    downloadTextFile(safeReportFilename(payload.hostname, 'html'), buildStandaloneHtml(payload, reportHtml), 'text/html;charset=utf-8');
  });
  setTimeout(function() { window.print(); }, 500);
});
