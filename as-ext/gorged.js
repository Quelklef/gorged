global = this;
(function () {
  "use strict";
  const browser = global.browser || global.chrome;

  const { mods } = global.LIBS.mods;

  browser.storage.sync.get("enabled", ({ enabled }) => {
    enabled = new Set(enabled || []);

    const lib = global.LIBS.lib;
    const doc = global.document;
    const url = new URL(window.location.href);

    const matchingImpls = mods
      .filter(mod => enabled.has(mod.id))
      .flatMap(mod => mod.impls)
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
