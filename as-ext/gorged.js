global = this;
(function () {
  "use strict";
  const browser = global.browser || global.chrome;

  const { intercepts } = global.LIBS.intercepts;

  browser.storage.sync.get("enabled", ({ enabled }) => {
    enabled = new Set(enabled || []);

    const lib = global.LIBS.lib;
    const doc = global.document;
    const url = new URL(window.location.href);

    const matchingImpls = intercepts
      .filter(intercept => enabled.has(intercept.id))
      .flatMap(intercept => intercept.impls)
      .filter(impl => url.href.match(impl.regex));

    for (const impl of matchingImpls) {
      infallibly(impl.func)(lib, doc, url);
    }

    function infallibly(func) {
      return function (...args) {
        try {
          func(...args);
        } catch (err) {
          console.error("vvv GORGED ERROR vvv");
          console.error(err);
        }
      };
    }
  });
})();
