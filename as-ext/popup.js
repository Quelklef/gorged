global = this;
(function () {
  "use strict";
  const browser = global.browser || global.chrome;

  const { mods } = global.LIBS.mods;

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
    const matching = mods.filter(mod =>
      [...future].every(filter => mod.tags.includes(filter))
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
        mods.flatMap(mod => mod.tags).filter(tag => !tag.startsWith("id:")),
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

    const $modTitle = document.createElement("p");
    $root.append($modTitle);
    $modTitle.innerText = "Modifications";
    $modTitle.style.fontSize = "20px";
    $modTitle.style.fontStyle = "italic";
    $modTitle.style.margin = "2.5rem 0 .75rem 0";

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
        ...mods.filter(mod => passes(filters, mod)).map(mod => mod.id),
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
          const mod = mods.find(mod => mod.id === id);
          return !passes(filters, mod);
        })
      );
      rerender(filters, enabled, $root);
    });

    for (const mod of mods) {
      if (!passes(filters, mod)) continue;

      const isEnabled = enabled.has(mod.id);

      const $mod = document.createElement("div");
      $root.append($mod);
      $mod.style.padding = ".5rem 1.5rem";
      $mod.style.marginBottom = "1rem";
      $mod.style.boxShadow = "0 1px 5px -3px rgba(0, 0, 0, 0.5)";
      $mod.style.borderRadius = "2px";

      $mod.style.position = "relative";
      if (isEnabled) {
        $mod.style.border = `1px solid skyblue`;
      } else {
        $mod.style.border = `1px solid rgb(230, 230, 230)`;
      }
      $mod.style.borderLeftWidth = "4px";

      $mod.style.display = "flex";

      const $switch = document.createElement("input");
      $mod.append($switch);
      $switch.type = "checkbox";
      if (isEnabled) $switch.checked = "checked";
      $switch.style.cursor = "pointer";
      $switch.style.marginRight = "1rem";

      $switch.addEventListener("click", () => {
        if (isEnabled) enabled.delete(mod.id);
        else enabled.add(mod.id);
        rerender(filters, enabled, $root);
      });

      const sites = mod.tags
        .filter(tag => tag.startsWith("site:"))
        .map(tag => tag.slice("site:".length));

      const $desc = document.createElement("span");
      $mod.append($desc);
      $desc.innerText = sites.join(", ") + ": " + mod.desc;
      $desc.style.flex = "1";
      $desc.style.fontSize = "1rem";
    }
  }
})();
