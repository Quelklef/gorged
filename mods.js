"use strict";
// == ALL MOD IMPLS MUST BE toString()-ABLE == //

const mods = [];
module.exports = { mods };

class Impl {
  constructor({ regex, func, mod }) {
    if ([typeof regex, typeof func].includes("undefined"))
      throw Error("Bad construction");

    this.regex = regex;
    this.func = func;

    this.mod = mod;
  }
}

class Mod {
  constructor({ tags, desc }) {
    if ([typeof tags, typeof desc].includes("undefined"))
      throw Error("Bad construction");

    this.tags = new Set(tags.split(" ").filter(t => !!t));
    this.desc = desc;
    this.impls = [];

    this.id; // hehe
  }

  get id() {
    const ids = [...this.tags].filter(tag => tag.startsWith("id:"));
    if (ids.length !== 1)
      throw Error("Requires exactly one id (tag starting with 'id:')");
    return ids[0].slice("id:".length);
  }

  get sites() {
    return new Set(
      [...this.tags]
        .filter(tag => tag.startsWith("site:"))
        .map(tag => tag.slice("site:".length))
    );
  }

  impl(args) {
    this.impls.push(new Impl({ ...args, mod: this }));
    return this;
  }
}

function mod(args) {
  const mod = new Mod(args);
  mods.push(mod);
  return mod;
}

function re(...args) {
  return new RegExp(String.raw(...args));
}

// =========================================================================== //
// Twitter

mod({
  tags: "id:twitter-remove-homepage-feed site:twitter scroller",
  desc: `remove the homepage timeline`,
}).impl({
  regex: re`twitter\.com`,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: '[aria-label="Timeline: Your Home Timeline"]',
      do: lib.remove,
      once: true,
    });
  },
});

mod({
  tags: "id:twitter-remove-trending site:twitter pronged",
  desc: `remove the "What's happening" block`,
}).impl({
  regex: re`twitter\.com`,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: '[aria-label="Timeline: Trending now"]',
      do: lib.remove,
      once: true,
    });
  },
});

mod({
  tags: "id:twitter-remove-follow-suggestions site:twitter clutter",
  desc: `remove the "Who to follow" block`,
}).impl({
  regex: re`twitter\.com`,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: '[aria-label="Who to follow"]',
      do: lib.remove,
      once: true,
    });
  },
});

// =========================================================================== //
// Reddit

mod({
  tags: "id:reddit-void-homepage site:reddit scroller",
  desc: `blank the homepage`,
}).impl({
  regex: re`(?<!old\.)reddit\.com`,
  func(lib, doc, url) {
    if (url.pathname === "/")
      lib.watch(doc, {
        selector: "html",
        do: html => (html.head.innerHTML = html.body.innerHTML = ""),
        once: true,
      });
  },
});

mod({
  tags: "id:reddit-remove-sub-feed site:reddit scroller",
  desc: `remove subreddit homepage feeds`,
}).impl({
  regex: re`(?<!old\.)reddit\.com`,
  func(lib, doc, url) {
    if (url.pathname.match(RegExp("/r/[^/?]+/?", "g"))) {
      lib.watch(doc, {
        selector:
          ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
        do: lib.remove,
        once: false,
      });
    }
  },
});

mod({
  tags: "id:reddit-remove-after-post-feed site:reddit pronged",
  desc: `remove after-post feeds`,
}).impl({
  regex: re`(?<!old\.)reddit\.com`,
  func(lib, doc, url) {
    lib.watch(doc, {
      predicate: node =>
        node.innerText &&
        node.innerText.match(/^More posts from the .* community$/i),
      do: node => node.parentNode.remove(),
      once: false,
    });
  },
});

// =========================================================================== //
// Imgur

mod({
  tags: "id:imgur-remove-homepage-feed site:imgur scroller",
  desc: `remove the homepage feed`,
}).impl({
  regex: re`imgur\.com`,
  func(lib, doc, url) {
    if (url.pathname === "/")
      lib.watch(doc, {
        selector: ".Spinner-contentWrapper",
        do: lib.remove,
        once: true,
      });
  },
});

mod({
  tags: "id:imgur-remove-search site:imgur",
  desc: `remove the search bar`,
}).impl({
  regex: re`imgur\.com`,
  func(lib, doc, url) {
    lib.watch(doc, { selector: ".Searchbar", do: lib.remove, once: true });
  },
});

mod({
  tags: "id:imgur-remove-right-sidebar site:imgur",
  desc: `remove the right-hand sidebar from posts`,
})
  .impl({
    regex: RegExp(String.raw`imgur\.com/gallery/\w+/?`),
    func(lib, doc, url) {
      lib.watch(doc, {
        selector: ".Gallery-Sidebar",
        do: lib.hide,
        once: false,
      });
    },
  })
  .impl({
    regex: RegExp(String.raw`imgur\.com/r/[^/]+/\w+/?`),
    func(lib, doc, url) {
      // For some reason the image loading fails if the bar is
      // completely gone, so we just hide it instead of removing it
      lib.watch(doc, {
        selector: "#side-gallery",
        do: node => (node.style.display = "none"),
        once: true,
      });
    },
  });

mod({
  tags: "id:imgur-remove-after-post-explore-feed site:imgur scroller",
  desc: `remove the after-post feed`,
}).impl({
  regex: re`imgur\.com`,
  func(lib, doc, url) {
    lib.watch(doc, { selector: ".BottomRecirc", do: lib.remove, once: false });
  },
});

// =========================================================================== //
// Facebook

mod({
  tags: "id:facebook-remove-homepage-feed site:facebook",
  desc: `remove the homepage feed`,
}).impl({
  regex: re`facebook\.com`,
  func(lib, doc, url) {
    lib.watch(doc, { selector: "div[role=feed]", do: lib.remove, once: false });
  },
});

// =========================================================================== //
// StackExchange (the network)

const seDoms = [
  re`stackexchange\.com`,
  re`\.stackexchange\.com`,
  re`askubuntu\.com`,
  re`mathoverflow\.net`,
  re`serverfault\.com`,
  re`stackoverflow\.com`,
  re`stackexchange\.com`,
  re`stackapps\.com`,
  re`stackmod\.blog`,
  re`superuser\.com`,
];

const seRe = RegExp(seDoms.map(regex => "(" + regex.source + ")").join("|"));

mod({
  tags:
    "id:stackexchange-remove-hot-network-questions pronged site:⋆.stackexchange",
  desc: `remove the "Hot Network Questions" sidebar`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: "#hot-network-questions",
      do: lib.remove,
      once: true,
    });
  },
});

mod({
  tags: "id:stackexchange-remove-homepage-feed site:⋆.stackexchange",
  desc: `remove the "Top Question" feed from the landing page`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    if (url.pathname === "/")
      lib.watch(doc, { selector: "#mainbar", do: lib.remove, once: true });
  },
});

mod({
  tags: "id:stackexchange-remove-all-questions-feed site:⋆.stackexchange",
  desc: `remove the "All Questions" feed under /questsions`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    if (url.pathname === "/questions/")
      lib.watch(doc, { selector: "#mainbar", do: lib.remove, once: true });
  },
});

mod({
  tags: "id:stackexchange-remove-related site:⋆.stackexchange",
  desc: `remove the "Related" sidebar`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: ".sidebar-related",
      do: lib.remove,
      once: true,
    });
  },
});

mod({
  tags: "id:stackexchange-remove-linked site:⋆.stackexchange",
  desc: `remove the "Linked" sidebar`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, { selector: ".sidebar-linked", do: lib.remove, once: true });
  },
});

mod({
  tags: "id:stackexchange-remove-rss-link site:⋆.stackexchange clutter",
  desc: `remove the "Question feed" RSS link`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, { selector: "#feed-link", do: lib.remove, once: true });
  },
});

mod({
  tags: "id:stackexchange-remove-sticky-note site:⋆.stackexchange",
  desc: `remove the yellow "sticky note" on the right side of the page`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, {
      selector: "#sidebar .s-sidebarwidget",
      do: lib.remove,
      once: true,
    });
  },
});

mod({
  tags: "id:stackexchange-remove-left-sidebar site:⋆.stackexchange",
  desc: `remove the left navigation bar`,
}).impl({
  regex: seRe,
  func(lib, doc, url) {
    lib.watch(doc, { selector: "#left-sidebar", do: lib.hide, once: true });
  },
});

mod({
  tags: "id:stackexchange-remove-se-homepage-feed site:stackexchange",
  desc: `remove the feed on the landing page of stackexchange.com`,
}).impl({
  regex: re`stackexchange\.com/?$`,
  func(lib, doc, url) {
    lib.watch(doc, { selector: "#question-list", do: lib.remove, once: true });
  },
});
