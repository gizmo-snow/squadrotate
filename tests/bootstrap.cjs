// Bootstrap: load helpers + logic into global scope before QUnit test files run.
// Function declarations executed via vm.runInThisContext become globals, which is
// what the browser-style test files expect (no import/export).
const fs   = require('fs');
const path = require('path');
const { Script } = require('vm');

function load(file) {
  const code = fs.readFileSync(path.join(__dirname, file), 'utf8');
  new Script(code).runInThisContext();
}

load('helpers.js');
load('logic.js');
