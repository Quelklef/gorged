'use strict';
// == THIS FILE MAY NOT HAVE IMPORTS == //

module.exports = { watch, hide, remove };

function hide(node) {
  node.style.opacity = '0 !important';
  node.style.pointerEvents = 'none !important';
}

function remove(node) {
  node.remove();
}

function* walk(node) {
  if (node instanceof Element)
    yield node;
  for (const child of node.childNodes)
    yield* walk(child);
}

function watch(doc, ...args) {
  /*

  Calls the callback on all nodes in the existing document, and
  then watches the document for changes and calls it on new nodes
  as well.

  Admits several call signatures:

  > watch(doc, selectorString, callback)
  > watch(doc, selectorString, callback, { one: true })
  Filters nodes by the selector.
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

    argument = function(node) {
      if (predicate(node)) {
        _infallibly(callback)(node);
        if (one) return 'stop';
      }
    }
  }

  // Signature #1
  else if (args.length > 1 && typeof args[0] === 'string') {
    const selector = args[0];
    const callback = args[1];
    const one = (args[2] || {}).one || false;

    if (one) {
      argument = function(node) {
        const match = node.querySelector(selector);
        if (match) {
          _infallibly(callback)(match);
          return one ? 'stop' : 'skip';
        }
      }
    } else {
      argument = function(node) {
        const matches = node.querySelectorAll(selector);
        if (matches.length > 0) {
          matches.forEach(_infallibly(callback));
          return one ? 'stop' : 'skip';
        }
      }
    }
  }


  // Uh oh
  else {
    throw Error('Unknown call signature');
  }

  // -- Actual function body -- //

  const callback = argument;

  function firstly() {
    const stop = _fancyWalk(document, callback);
    if (stop) return;
  }

  if ('complete loaded'.includes(document.readyState)) {
    firstly();
  } else {
    document.addEventListener('DOMContentLoaded', () => firstly());
  }

  const observer = new MutationObserver(mutations => {
    for (const mut of mutations) {
      const ofInterest = [mut.target, ...mut.addedNodes];
      for (const node of ofInterest) {
        const stop = _fancyWalk(node, callback);
        if (stop) return;
      }
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
}

function _fancyWalk(root, callback) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();  // skip document since it's not an Element
  while (node) {
    const cmd = callback(node);
    switch (cmd) {
      case 'skip': node = (walker.nextSibling() || walker.nextNode()); break;
      case 'stop': return true;
      default: node = walker.nextNode(); break;
    }
  }
}

function _infallibly(func, defaultVal) {
  return function(...args) {
    try {
      return func(...args);
    } catch (err) {
      console.error(err);
      return defaultVal;
    }
  }
}
