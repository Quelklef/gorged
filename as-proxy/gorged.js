"use strict";

const fs = require("fs");

const { JSDOM } = require("jsdom");

const { serveFifo } = require("./fifo-server.js");
const { mods } = require("../mods.js");
const lib = require("../lib.js");

const libCode = fs.readFileSync("../lib.js");

serveFifo("./ipc.sock", message => {
  const { html, url: urlStr, csp_nonce: cspNonce } = JSON.parse(message);

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const url = new URL(urlStr);

  const allImpls = mods.flatMap(mod => mod.impls);
  const matchingImpls = allImpls.filter(impl => !!url.href.match(impl.regex));

  if (matchingImpls.length === 0) return dom.serialize();

  const injection = doc.createElement("script");
  if (cspNonce) injection.nonce = cspNonce;

  injection.innerHTML = `
    const module = {};
    (function() {
      ${libCode}
    })();

    const lib = module.exports;
    const doc = document;
    const url = new URL(window.location.href);

    function infallibly(func) {
      return function(...args) {
        try {
          func(...args);
        } catch (err) {
          console.error('vvv GORGED ERROR vvv');
          console.error(err);
        }
      }
    }
  `;

  for (const impl of matchingImpls) {
    injection.innerHTML += `
      // ${impl.mod.id}, impl #${impl.mod.impls.indexOf(impl)}
      infallibly(${unevalFunction(impl.func)})(lib, doc, url);
    `;
  }

  injection.innerHTML = `
    (function() {
      ${injection.innerHTML}
    })();
  `;
  doc.head.prepend(injection);

  return dom.serialize();
});

function infallibly(func) {
  return function (...args) {
    try {
      return func(...args);
    } catch (err) {
      console.error(err);
    }
  };
}

function unevalFunction(func) {
  const string = func.toString();

  // TODO: handle js comments, etc
  //       this function is gonna be a tricky one :-)

  // function name(args) { body }
  if (string.match(/^function\s*\w/))
    return `(function() { const f = ${string}; return f; })();`;

  // function(args) { body }
  if (string.match(/^function\s*\(/)) return `(${string})`;

  // (args) => body
  if (string.match(/^\(/)) return `(${string})`;

  // arg => body
  if (string.match(/^[\w_\$]+\s*=>/)) return `(${string})`;

  // { name(args) { body } }
  if (string.match(/^[\w_\$]+\s*\([\w_\$,\s]+\)\s*\{/))
    return `({ ${string} }["${func.name}"])`;

  throw Error("Unaccounted-for case");
}
