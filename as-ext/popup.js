global = this;
(function () {
  "use strict";
  const browser = global.browser || global.chrome;

  const { mods } = global.LIBS.mods;

  let deduplicate;
  Array.prototype[(deduplicate = Symbol())] = function () {
    const result = [];
    const seen = new Set();
    for (const el of this) {
      if (!seen.has(el)) {
        result.push(el);
        seen.add(el);
      }
    }
    return result;
  };

  let sortBy;
  Array.prototype[(sortBy = Symbol())] = function sortBy(key, order) {
    const sgn = { asc: 1, desc: -1 }[order];

    return [...this].sort((a, b) => {
      const ka = key(a);
      const kb = key(b);

      if (Array.isArray(ka) !== Array.isArray(kb))
        throw Error("Key function must consistently return array or scalar");
      if (ka.length !== kb.length)
        throw Error("Key function must always return array of the same length");

      if (!Array.isArray(ka)) {
        if (ka < kb) return -1 * sgn;
        if (ka > kb) return +1 * sgn;
        return 0;
      } else {
        for (let i = 0; i < ka.length; i++) {
          if (ka[i] < kb[i]) return -1 * sgn;
          if (ka[i] > kb[i]) return +1 * sgn;
        }
        return 0;
      }
    });
  };

  let reverse;
  String.prototype[(reverse = Symbol())] = function reverse() {
    return [...this].reverse().join("");
  };

  // Modified from https://stackoverflow.com/a/66481918/4608364
  function escapeHtml(html) {
    return html.replace(
      /[\u0000-\u002F]|[\u003A-\u0040]|[\u005B-\u00FF]/g,
      c => "&#" + ("000" + c.charCodeAt(0)).substr(-4, 4) + ";"
    );
  }

  function* walk(node) {
    if (node instanceof Element) yield node;
    for (const child of node.childNodes) yield* walk(child);
  }

  // Based on https://stackoverflow.com/a/35385518/4608364
  function html(parts, ...interps) {
    parts = [...parts];
    interps = [...interps];

    let html = "";
    const attach = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const interp = interps[i];

      if (part[part.length - 1] === "$") {
        html += part.slice(0, part.length - 1) + interp.toString();
      } else if (typeof interp === "string") {
        html += part + interp.toString();
      } else if (Array.isArray(interp)) {
        html +=
          part + `<template class="__replace-me:${attach.length}"></template>`;
        attach.push(interp);
      } else {
        const attr = part[reverse]().match(/\w+/)[0][reverse]();
        html += part + "attach:" + attach.length;
        attach.push(interp);
      }
    }
    html += parts[parts.length - 1];

    const template = document.createElement("template");
    template.innerHTML = html.trim();
    const result = template.content.firstChild;

    for (const node of walk(result)) {
      if (node.nodeName === "TEMPLATE") {
        const idx = node.classList[0].slice("__replace-me:".length);
        const replacements = Array.isArray(attach[idx])
          ? attach[idx]
          : [attach[idx]];
        node.replaceWith(...replacements);
      } else {
        for (const attr of node.attributes) {
          if (attr.value.startsWith("attach:")) {
            const idx = attr.value.slice("attach:".length);
            node.removeAttribute(attr.name);
            node[attr.name] = attach[idx];
          }
        }
      }
    }

    return result;
  }

  function passes(filters, { tags }) {
    return [...filters].every(tag => [...tags].includes(tag));
  }

  function candidates(filters, tag) {
    const future = new Set([...filters, tag]);
    const matching = mods.filter(mod =>
      [...future].every(filter => mod.tags.has(filter))
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
    $root.style.padding = "0.5em 1.5em";

    $root.append(html`
      <style>
        * {
          box-sizing: border-box;
        }

        :root {
          font-size: 14px;
        }

        body {
          font-size: 1rem; /* shrug */
          padding: 0.75rem 1.5rem;
        }
      </style>
    `);

    $root.append(html`
      <p
        style="
          ; font-size: 20px
          ; margin: 2.5rem 0 1rem 0
          ; padding: 0 0 .5rem 0
          ; border-bottom: 1px solid black
        "
      >
        Modifications
      </p>
    `);

    const tags = mods
      .flatMap(mod => [...mod.tags])
      .filter(tag => !tag.startsWith("id:"))
      [deduplicate]()
      [sortBy](tag => [tag.startsWith("site:"), tag], "desc");

    const $tags = tags.map(tag => {
      const isOn = filters.has(tag);
      const hasCandidates = candidates(filters, tag).length > 0;

      return html`
        <span
          style="
            ; display: inline-block
            ; padding: 0.2rem 0.5rem
            ; cursor: pointer
            ; box-shadow: 0 1px 5px -3px rgba(0, 0, 0, 0.5)
            ; border: 1px solid ${isOn ? "black" : "rgb(230, 230, 230)"}
            ; border-radius: 2px
            ; margin: 0.2rem 0.37rem 0 0
            ; pointer-events: ${hasCandidates ? "default" : "none"}
            ; opacity: ${hasCandidates ? "1" : "0.3"}
          "
          onclick="${() => {
            if (isOn) filters.delete(tag);
            else filters.add(tag);
            rerender(filters, enabled, $root);
          }}"
        >
          <span
            style="
              ; font-family: monospace
              ; margin-right: 0.75rem
            "
            >${isOn ? "×" : "+"}</span
          >
          ${tag}
        </span>
      `;
    });

    $root.append(html`
      <div>
        <span style="font-style: italic">Filter by tag:</span> &nbsp; &nbsp;
        ${$tags}
      </div>
    `);

    $root.append(html`
      <p>
        <style>
          .enable-disable-button {
            cursor: pointer;
            color: blue;
          }
        </style>

        <span
          class="enable-disable-button"
          onclick="${() => {
            enabled = new Set([
              ...enabled,
              ...mods.filter(mod => passes(filters, mod)).map(mod => mod.id),
            ]);
            rerender(filters, enabled, $root);
          }}"
        >
          enable shown
        </span>

        |

        <span
          class="enable-disable-button"
          onclick="${() => {
            enabled = new Set(
              [...enabled].filter(id => {
                const mod = mods.find(mod => mod.id === id);
                return !passes(filters, mod);
              })
            );
            rerender(filters, enabled, $root);
          }}"
        >
          disable shown
        </span>
      </p>
    `);

    $root.append(
      ...mods
        .filter(mod => passes(filters, mod))
        .map(mod => {
          const isEnabled = enabled.has(mod.id);
          return html`
            <div
              style="
                ; padding: 0.5rem 1.5rem
                ; margin-bottom: 1rem
                ; box-shadow: 0 1px 5px -3px rgba(0, 0, 0, 0.5)
                ; border-radius: 2px
                ; border: 1px solid ${
                  isEnabled ? "skyblue" : "rgb(230, 230, 230)"
                }
                ; border-left-width: 4px
                ; cursor: pointer
                ; display: flex
              "

              onclick="${() => {
                if (isEnabled) enabled.delete(mod.id);
                else enabled.add(mod.id);
                rerender(filters, enabled, $root);
              }}"
            >
              <input
                type="checkbox"
                $${isEnabled ? 'checked="checked"' : ""}
                style="
                  ; margin-right: 1rem
                  ; cursor: pointer
                  ; vertical-align: middle
                "
              ></input>

              &nbsp;

              <span
                style="
                  ; flex: 1
                  ; font-size: 1rem
                  ; vertical-align: middle
                "
              >
                ${[...mod.tags]
                  .filter(tag => tag.startsWith("site:"))
                  .map(tag => tag.slice("site:".length))
                  .join(", ")}: ${mod.desc}
              </span>
            </div>
          `;
        })
    );
  }
})();
