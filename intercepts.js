"use strict";
// == ALL INTERCEPT IMPLS MUST BE TO-STRING-ABLE == //

const intercepts = [];
module.exports = { intercepts };

class Impl {
  constructor({ regex, inject, func, intercept }) {
    if ([typeof regex, typeof inject, typeof func].includes("undefined"))
      throw Error("Bad construction");

    this.regex = regex;
    this.inject = inject;
    this.func = func;

    this.intercept = intercept;
  }
}

class Intercept {
  constructor({ tags, desc }) {
    if ([typeof tags, typeof desc].includes("undefined"))
      throw Error("Bad construction");

    this.tags = tags.split(" ").filter(t => !!t);
    this.desc = desc;
    this.impls = [];

    const ids = this.tags.filter(tag => tag.startsWith("id:"));
    if (ids.length !== 1)
      throw Error("Requires exactly one id (tag starting with 'id:')");
    this.id = ids[0].slice("id:".length);
  }

  impl(args) {
    this.impls.push(new Impl({ ...args, intercept: this }));
    return this;
  }
}

function intercept(args) {
  const intercept = new Intercept(args);
  intercepts.push(intercept);
  return intercept;
}

// =========================================================================== //
// Twitter

intercept({
  tags: "id:twitter-remove-homepage-feed site:twitter scroller",
  desc: `Removes the timeline from the homepage of Twitter.`,
}).impl({
  regex: /twitter\.com/g,
  inject: true,
  func(lib, doc, url) {
    lib.watch(
      doc,
      { selector: '[aria-label="Timeline: Your Home Timeline"]' },
      lib.remove,
      { one: true }
    );
  },
});

intercept({
  tags: "id:twitter-remove-trending site:twitter pronged",
  desc: `Removes the "What's happening" block from Twitter`,
}).impl({
  regex: /twitter\.com/g,
  inject: true,
  func(lib, doc, url) {
    lib.watch(
      doc,
      { selector: '[aria-label="Timeline: Trending now"]' },
      lib.remove,
      { one: true }
    );
  },
});

intercept({
  tags: "id:twitter-remove-follow-suggestions site:twitter clutter",
  desc: `Removes the "Who to follow" block`,
}).impl({
  regex: /twitter\.com/g,
  inject: true,
  func(lib, doc, url) {
    lib.watch(doc, { selector: '[aria-label="Who to follow"]' }, lib.remove, {
      one: true,
    });
  },
});

// =========================================================================== //
// Reddit

intercept({
  tags: "id:reddit-void-homepage site:reddit scroller",
  desc: `Blanks the homepage`,
}).impl({
  regex: /(?<!old\.)reddit\.com/g,
  inject: false,
  func(lib, doc, url) {
    if (url.pathname === "/") {
      doc.head.innerHTML = "";
      doc.body.innerHTML = "";
    }
  },
});

intercept({
  tags: "id:reddit-remove-sub-feed site:reddit scroller",
  desc: `Removes the feed from subreddits`,
}).impl({
  regex: /(?<!old\.)reddit\.com/g,
  inject: true,
  func(lib, doc, url) {
    if (url.pathname.match(RegExp("/r/[^/?]+/?", "g"))) {
      lib.watch(
        doc,
        {
          selector:
            ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
        },
        lib.remove,
        { one: true }
      );
    }
  },
});

intercept({
  tags: "id:reddit-remove-after-post-feed site:reddit pronged",
  desc: `Removes the feed that appears after posts`,
}).impl({
  regex: /(?<!old\.)reddit\.com/g,
  inject: true,
  func(lib, doc, url) {
    lib.watch(
      doc,
      node =>
        node.innerText &&
        node.innerText.match(/^More posts from the .* community$/i),
      node => node.parentNode.remove()
    );
  },
});

// =========================================================================== //
// Imgur

intercept({
  tags: "id:imgur-remove-homepage-feed site:imgur scroller",
  desc: `Removes the feed from the imgur homepage`,
}).impl({
  regex: /imgur\.com/g,
  inject: true,
  func(lib, doc, url) {
    if (url.pathname === "/")
      lib.watch(doc, { selector: ".Spinner-contentWrapper" }, lib.remove, {
        one: true,
      });
  },
});

intercept({
  tags: "id:imgur-remove-search site:imgur",
  desc: `Remove the search bar`,
}).impl({
  regex: /imgur\.com/g,
  inject: true,
  func(lib, doc, url) {
    lib.watch(doc, { selector: ".Searchbar" }, lib.remove, { one: true });
  },
});

intercept({
  tags: "id:imgur-remove-right-sidebar site:imgur",
  desc: `Remove the right-hand sidebar from posts`,
})
  .impl({
    regex: RegExp(String.raw`imgur\.com/gallery/\w+/?`),
    inject: true,
    func(lib, doc, url) {
      lib.watch(doc, { selector: ".Gallery-Sidebar" }, lib.hide);
    },
  })
  .impl({
    regex: RegExp(String.raw`imgur\.com/r/[^/]+/\w+/?`),
    inject: false,
    func(lib, doc, url) {
      // For some reason the image loading fails if the bar is
      // completely gone, so we just hide it instead of removing it
      doc.querySelector("#side-gallery").style.display = "none";
    },
  });

intercept({
  tags: "id:imgur-remove-after-post-explore-feed site:imgur scroller",
  desc: `Remove the "Explore Posts" section after posts`,
}).impl({
  regex: /imgur\.com/,
  inject: true,
  func(lib, doc, url) {
    lib.watch(doc, { selector: ".BottomRecirc" }, lib.remove);
  },
});

// =========================================================================== //
// Facebook

intercept({
  tags: "id:facebook-remove-homepage-feed site:facebook",
  desc: `Remove the homepage feed`,
}).impl({
  regex: /facebook\.com/,
  inject: true,
  func(lib, doc, url) {
    lib.watch(doc, { selector: "div[role=feed]" }, lib.remove);
  },
});

// =========================================================================== //
// StackExchange (the network)

const seDoms = [
  /stackexchange\.com/,
  /\.stackexchange\.com/,
  /askubuntu\.com/,
  /mathoverflow\.net/,
  /serverfault\.com/,
  /stackoverflow\.com/,
  /stackexchange\.com/,
  /stackapps\.com/,
  /stackmod\.blog/,
  /superuser\.com/,
];

const seRe = RegExp(seDoms.map(regex => "(" + regex.source + ")").join("|"));

intercept({
  tags:
    "id:stackexchange-remove-hot-network-questions pronged site:stackexchange+",
  desc: `Removes the "Hot Network Questions" sidebar`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    doc.querySelector("#hot-network-questions").remove();
  },
});

intercept({
  tags: "id:stackexchange-remove-homepage-feed site:stackexchange+",
  desc: `Removes the "Top Question" feed from Stack Exchange site landing pages`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    if (url.pathname === "/") lib.remove(doc.querySelector("#mainbar"));
  },
});

intercept({
  tags: "id:stackexchange-remove-all-questions-feed site:stackexchange+",
  desc: `Removes the "All Questions" feed under /questsions`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    if (url.pathname === "/questions/")
      lib.remove(doc.querySelector("#mainbar"));
  },
});

intercept({
  tags: "id:stackexchange-remove-related site:stackexchange+",
  desc: `Removes the "Related" sidebar`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    lib.remove(doc.querySelector(".sidebar-related"));
  },
});

intercept({
  tags: "id:stackexchange-remove-linked site:stackexchange+",
  desc: `Removes the "Linked" sidebar`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    lib.remove(doc.querySelector(".sidebar-linked"));
  },
});

intercept({
  tags: "id:stackexchange-remove-rss-link site:stackexchange+ clutter",
  desc: `Removes the "Question feed" link`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    lib.remove(doc.querySelector("#feed-link"));
  },
});

intercept({
  tags: "id:stackexchange-remove-sticky-note site:stackexchange+",
  desc: `Removes the yellow "sticky note" on the right side of the page`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    lib.remove(doc.querySelector("#sidebar .s-sidebarwidget"));
  },
});

intercept({
  tags: "id:stackexchange-remove-left-sidebar site:stackexchange+",
  desc: `Removes the left navigation bar`,
}).impl({
  regex: seRe,
  inject: false,
  func(lib, doc, url) {
    lib.hide(doc.querySelector("#left-sidebar"));
  },
});

intercept({
  tags: "id:stackexchange-remove-se-homepage-feed site:stackexchange",
  desc: `Removes the feed on the landing page of stackexchange.com`,
}).impl({
  regex: /stackexchange\.com\/?$/,
  inject: false,
  func(lib, doc, url) {
    lib.remove(doc.querySelector("#question-list"));
  },
});
