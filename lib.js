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

function watch(doc, args) {
  /*

  Calls the callback on all nodes in the existing document, and
  then watches the document for changes and calls it on new nodes
  as well.

  Admits several call signatures:

  > watch(doc, { selector: cssSelectorString, do: callback, once: true|false })
  > watch(doc, { xpath: xpathString,          do: callback, once: true|false })
  > watch(doc, { predicate: predicate,        do: callback, once: true|false })
  Watches the document `doc` for nodes matching the given selector/xpath/predicate.
  If once:true is given, stops after the first match.

  > watch(doc, callback)
  Watches the document `doc` for mutations, invoking the callback on modified/added
  nodes. If the callback returns 'skip', the current node will not be descended
  into (in the case of node addition); if the callbkac returns 'stop', the watching
  will cease.

  */

  const signatureOk =
    args instanceof Function ||
    (1 ===
      "selector xpath predicate".split(" ").filter(k => k in args).length &&
      args.do instanceof Function &&
      [true, false].includes(args.once));

  if (!signatureOk) throw Error("Bad call signature");

  if (args instanceof Function) {
    return watch_impl(doc, args);
  } else if ("predicate" in args) {
    return watch_impl(doc, node => {
      if (args.predicate(node)) {
        args.do(node);
        if (args.once) return "stop";
      }
    });
  } else if ("selector" in args || "xpath" in args) {
    let getMatches;
    if ("selector" in args && args.once) {
      getMatches = node => {
        const match = node.querySelector(args.selector);
        return match ? [match] : [];
      };
    } else if ("selector" in args && !args.once) {
      getMatches = node => node.querySelectorAll(args.selector);
    } else if ("xpath" in args) {
      getMatches = function* (node) {
        const matcher = doc.evaluate(
          args.xpath,
          node,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        let match;
        for (let i = 0; (match = matcher.snapshotItem(i)); i++) yield match;
      };
    } else {
      throw Error("impossible");
    }

    return watch_impl(doc, node => {
      for (const match of getMatches(node)) {
        _infallibly(args.do)(match);
        if (args.once) return "stop";
      }
      return "skip";
    });
  }

  throw Error("Programmer forgot a case");
}

function watch_impl(doc, callback) {
  /* Same as watch but only supports one signature */

  // Walk the existing DOM

  const stop = _fancyWalk(doc, { over: doc, do: callback });
  if (stop) return;

  // Watch for DOM updates
  // Note that this will catch the browser building the initial tree :)

  new MutationObserver(onMutation).observe(doc, {
    subtree: true,
    childList: true,
    attributes: true,
  });

  function onMutation(mutations, observer) {
    for (const mut of mutations) {
      switch (mut.type) {
        case "childList":
          const stop = _fancyWalk(doc, { over: mut.target, do: callback });
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

function _fancyWalk(doc, { over: root, do: callback }) {
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
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
