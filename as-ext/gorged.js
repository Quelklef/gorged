(function () {
  const global = this;

  const { intercepts } = global.LIBS.intercepts;

  const lib = global.LIBS.lib;
  const doc = global.document;
  const url = new URL(window.location.href);

  const matchingImpls = intercepts
    .flatMap(intercept => intercept.impls)
    .filter(impl => url.href.match(impl.regex));

  for (const impl of matchingImpls) {
    if (!impl.inject) {
      document.addEventListener("DOMContentLoaded", () => {
        infallibly(impl.func)(lib, doc, url);
      });
    } else {
      infallibly(impl.func)(lib, doc, url);
    }
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
})();
