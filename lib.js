"use strict";
// == THIS FILE MAY NOT HAVE IMPORTS == //

module.exports = { watch, hide, remove };

function hide(node) {
  node.style.opacity = 0;
  node.style.pointerEvents = "none";
}

function remove(node) {
  node.remove();
}

function* walk(node) {
  if (node instanceof Element) yield node;
  for (const child of node.childNodes) yield* walk(child);
}

function watch(doc, ...args) {
  /*

  Calls the callback on all nodes in the existing document, and
  then watches the document for changes and calls it on new nodes
  as well.

  Admits several call signatures:

  > watch(doc, { selector: cssSelectorString }, callback)
  > watch(doc, { selector: cssSelectorString }, callback, { one: true })
  > watch(doc, { xpath: xpathString }, callback)
  > watch(doc, { xpath: xpathString }, callback, { one: true })
  Filters nodes by the given css selector or xpath
  If one=true is given, stops after the first node matched.

  > watch(doc, predicate, callback)
  > watch(doc, predicate, callback, { one: true })
  Filters nodes by the predicate.
  If one=true is given, stops after the first node matched.

  > watch(doc, callback)
  Does not filter nodes.
  If the callback returns 'skip', the current node will not be descended into.
  If the callback returns 'stop', the watching will cease.

  If an intercept uses this function, then the intercept MUST
  be marked inect=true.

  */

  // Argument parsing
  let argument;

  // Signature #3
  if (args.length === 1) {
    argument = _infallibly(args[0]);
  }

  // Signature #2
  else if (args.length > 1 && args[0] instanceof Function) {
    const predicate = args[0];
    const callback = args[1];
    const one = (args[2] || {}).one || false;

    argument = function (node) {
      if (predicate(node)) {
        _infallibly(callback)(node);
        if (one) return "stop";
      }
    };
  }

  // Signature #1
  else if (args.length > 1 && (args[0].selector || args[0].xpath)) {
    const selectorType = args[0].selector ? "css" : "xpath";
    const selector = args[0].selector || args[0].xpath;
    const callback = args[1];
    const one = (args[2] || {}).one || false;

    const getMatches = (() => {
      if (selectorType === "css" && one)
        return node => {
          const match = node.querySelector(selector);
          return match ? [match] : [];
        };

      if (selectorType === "css" && !one)
        return node => node.querySelectorAll(selector);

      if (selectorType === "xpath")
        return function* (node) {
          const matcher = document.evaluate(
            selector,
            node,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          let match;
          for (let i = 0; (match = matcher.snapshotItem(i)); i++) yield match;
        };

      throw Error("Bad call");
    })();

    argument = function (node) {
      for (const match of getMatches(node)) {
        _infallibly(callback)(match);
        if (one) return "stop";
      }
      return "skip";
    };
  }

  // Uh oh
  else {
    throw Error("Unknown call signature");
  }

  // -- Actual function body -- //

  const callback = argument;

  // Walk the existing DOM

  const stop = _fancyWalk(document, callback);
  if (stop) return;

  // Watch for DOM updates
  // Note that this WILL catch the browser building the initial tree!

  new MutationObserver(onMutation).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
  });

  function onMutation(mutations) {
    for (const mut of mutations) {
      switch (mut.type) {
        case "childList":
          const stop = _fancyWalk(mut.target, callback);
          if (stop) {
            observer.disconnect();
            return;
          }
          break;

        case "attributes":
          const cmd = callback(mut.target);
          if (cmd === "stop") {
            observer.disconnect();
            return;
          }
          break;

        default:
          throw Error("Programmer forgot a case");
      }
    }
  }
}

function _fancyWalk(root, callback) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  if (!(node instanceof Element)) node = walker.nextNode();
  while (node) {
    const cmd = callback(walker.currentNode);
    switch (cmd) {
      case "skip":
        node = walker.nextSibling() || walker.nextNode();
        break;
      case "stop":
        return true;
      default:
        node = walker.nextNode();
        break;
    }
  }
}

function _infallibly(func, defaultVal) {
  return function (...args) {
    try {
      return func(...args);
    } catch (err) {
      console.error(err);
      return defaultVal;
    }
  };
}
