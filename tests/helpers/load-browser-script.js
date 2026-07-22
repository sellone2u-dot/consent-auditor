'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repositoryRoot = path.resolve(__dirname, '..', '..');

function loadBrowserScripts(relativePaths) {
  const context = vm.createContext({
    console,
    URL,
    Date,
    JSON,
    Math,
    RegExp,
    String,
    Object,
    Array,
    Set,
    ArrayBuffer,
    Uint8Array,
    TextDecoder,
    decodeURIComponent,
    encodeURIComponent
  });

  relativePaths.forEach((relativePath) => {
    const absolutePath = path.join(repositoryRoot, relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    vm.runInContext(source, context, { filename: absolutePath });
  });

  return context;
}

module.exports = { loadBrowserScripts, repositoryRoot };
