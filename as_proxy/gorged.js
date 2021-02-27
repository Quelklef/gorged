"use strict";

const fs = require("fs");

const { JSDOM } = require("jsdom");

const { serveFifo } = require("./fifo_server.js");
const { intercepts } = require("../intercepts.js");
const lib = require("../lib.js");

const libCode = fs.readFileSync("../lib.js");

serveFifo("./ipc.sock", message => {
  const { html, url: urlStr } = JSON.parse(message);

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const url = new URL(urlStr);

  const allImpls = intercepts.flatMap(intercept => intercept.impls);
  const matchingImpls = allImpls.filter(impl => !!url.href.match(impl.regex));
  const hasInject = matchingImpls.some(impl => impl.inject);

  let injection;
  if (hasInject) {
    injection = doc.createElement("script");
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
  }

  for (const impl of matchingImpls) {
    if (!impl.inject) {
      infallibly(impl.func)(lib, doc, url);
    } else {
      injection.innerHTML += `
        // ${impl.intercept.id}, impl #${impl.intercept.impls.indexOf(impl)}
        infallibly(${unevalFunction(impl.func)})(lib, doc, url);
      `;
    }
  }

  if (hasInject) {
    injection.innerHTML = `
      (function() {
        ${injection.innerHTML}
      })();
    `;
    doc.head.prepend(injection);
  }

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
