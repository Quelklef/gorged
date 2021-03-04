global = this;
(function () {
  "use strict";
  const browser = global.browser || global.chrome;

  const { intercepts } = global.LIBS.intercepts;

  function sortBy(array, key, order) {
    const sgn = { asc: 1, desc: -1 }[order];

    return [...array].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);

      if (Array.isArray(ka) !== Array.isArray(kb))
        throw Error("Key function must consistently return array or scalar");
      if (ka.length !== kb.length)
        throw Error(
          "Key function must always return arrays of the same length"
        );

      for (let i = 0; i < ka.length; i++) {
        if (ka[i] < kb[i]) return -1 * sgn;
        if (ka[i] > kb[i]) return +1 * sgn;
      }

      return 0;
    });
  }

  function passes(filters, { tags }) {
    return [...filters].every(tag => [...tags].includes(tag));
  }

  function candidates(filters, tag) {
    const future = new Set([...filters, tag]);
    const matching = intercepts.filter(intercept =>
      [...future].every(filter => intercept.tags.includes(filter))
    );
    return matching;
  }

  browser.storage.sync.get("enabled", ({ enabled }) => {
    const $root = document.querySelector("#root");
    const filters = new Set();
    enabled = new Set(enabled || []);
    render(filters, enabled, $root);
  });

  function rerender(filters, enabled, $root) {
    browser.storage.sync.set({ enabled: [...enabled] }, () =>
      render(filters, enabled, $root)
    );
  }

  function render(filters, enabled, $root) {
    $root.innerHTML = "";

    $root.style.width = "600px";

    const $style = document.createElement("style");
    $root.append($style);
    $style.innerText = `
    * { box-sizing: border-box; }
    :root { font-size: 14px; }
    body {
      font-size: 1rem;  /* ¯\_(ツ)_/¯ */
      padding: .75rem 1.5rem;
    }
  `;

    const $filtersTitle = document.createElement("p");
    $root.append($filtersTitle);
    $filtersTitle.innerText = "Filters";
    $filtersTitle.style.fontSize = "20px";
    $filtersTitle.style.fontStyle = "italic";
    $filtersTitle.style.margin = ".75rem 0";

    const tags = new Set(
      sortBy(
        intercepts
          .flatMap(intercept => intercept.tags)
          .filter(tag => !tag.startsWith("id:")),
        tag => [tag.startsWith("site:"), tag],
        "desc"
      )
    );

    for (const tag of tags) {
      const isOn = filters.has(tag);

      const $tag = document.createElement("span");
      $root.append($tag);
      $tag.innerText = tag;
      $tag.style.display = "inline-block";
      $tag.style.padding = ".2rem .5rem";
      $tag.style.cursor = "pointer";
      $tag.style.boxShadow = "0 1px 5px -3px rgba(0, 0, 0, 0.5)";
      $tag.style.border = "1px solid rgb(230, 230, 230)";
      $tag.style.borderRadius = "2px";
      $tag.style.margin = ".2em .37em 0 0";

      if (isOn) $tag.style.borderColor = "black";
      else if (candidates(filters, tag).length === 0) {
        $tag.style.pointerEvents = "none";
        $tag.style.opacity = ".3";
      }

      $tag.addEventListener("click", () => {
        if (isOn) filters.delete(tag);
        else filters.add(tag);
        rerender(filters, enabled, $root);
      });

      const $sigil = document.createElement("span");
      $tag.prepend($sigil);
      $sigil.innerText = isOn ? "×" : "+";
      $sigil.style.fontFamily = "monospace";
      $sigil.style.marginRight = ".75rem";
    }

    const $interceptTitle = document.createElement("p");
    $root.append($interceptTitle);
    $interceptTitle.innerText = "Intercepts";
    $interceptTitle.style.fontSize = "20px";
    $interceptTitle.style.fontStyle = "italic";
    $interceptTitle.style.margin = "2.5rem 0 .75rem 0";

    const $buttons = document.createElement("p");
    $root.append($buttons);

    const $enableShown = document.createElement("span");
    $buttons.append($enableShown);
    $enableShown.innerText = "enable shown";
    $enableShown.style.cursor = "pointer";
    $enableShown.style.color = "blue";
    $enableShown.addEventListener("click", () => {
      enabled = new Set([
        ...enabled,
        ...intercepts
          .filter(intercept => passes(filters, intercept))
          .map(intercept => intercept.id),
      ]);
      rerender(filters, enabled, $root);
    });

    $buttons.append(" | ");

    const $disableShown = document.createElement("span");
    $buttons.append($disableShown);
    $disableShown.innerText = "disable shown";
    $disableShown.style.cursor = "pointer";
    $disableShown.style.color = "blue";
    $disableShown.addEventListener("click", () => {
      enabled = new Set(
        [...enabled].filter(id => {
          const intercept = intercepts.find(intercept => intercept.id === id);
          return !passes(filters, intercept);
        })
      );
      rerender(filters, enabled, $root);
    });

    for (const intercept of intercepts) {
      if (!passes(filters, intercept)) continue;

      const isEnabled = enabled.has(intercept.id);

      const $intercept = document.createElement("div");
      $root.append($intercept);
      $intercept.style.padding = ".5rem 1.5rem";
      $intercept.style.marginBottom = "1rem";
      $intercept.style.boxShadow = "0 1px 5px -3px rgba(0, 0, 0, 0.5)";
      $intercept.style.borderRadius = "2px";

      $intercept.style.position = "relative";
      if (isEnabled) {
        $intercept.style.border = `1px solid skyblue`;
      } else {
        $intercept.style.border = `1px solid rgb(230, 230, 230)`;
      }
      $intercept.style.borderLeftWidth = "4px";

      $intercept.style.display = "flex";

      const $switch = document.createElement("input");
      $intercept.append($switch);
      $switch.type = "checkbox";
      if (isEnabled) $switch.checked = "checked";
      $switch.style.cursor = "pointer";
      $switch.style.marginRight = "1rem";

      $switch.addEventListener("click", () => {
        if (isEnabled) enabled.delete(intercept.id);
        else enabled.add(intercept.id);
        rerender(filters, enabled, $root);
      });

      const sites = intercept.tags
        .filter(tag => tag.startsWith("site:"))
        .map(tag => tag.slice("site:".length));

      const $desc = document.createElement("span");
      $intercept.append($desc);
      $desc.innerText = sites.join(", ") + ": " + intercept.desc;
      $desc.style.flex = "1";
      $desc.style.fontSize = "1rem";
    }
  }
})();
