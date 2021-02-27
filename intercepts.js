"use strict";
// == ALL INTERCEPT IMPLS MUST BE TO-STRING-ABLE == //

// https://stackoverflow.com/a/3561711/4608364
const escapeRegex = (s) => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

// -- //

const intercepts = [];
module.exports = { intercepts };

class Intercept {
  constructor({ regex, desc, tags, inject, impl }) {
    this.regex = regex;
    this.desc = desc;
    this.tags = tags.split(" ").filter((t) => !!t);
    this.inject = inject;
    this.impl = impl;

    const ids = this.tags.filter((tag) => tag.startsWith("id="));
    if (ids.length !== 1)
      throw Error("Requires exactly one id (tag starting with 'id=')");
    this.id = ids[0].slice("id=".length);
  }
}

function intercept(args) {
  intercepts.push(new Intercept(args));
}

intercept({
  regex: /twitter\.com/g,
  tags: "id=twitter-remove-homepage-feed site=twitter scroller",
  desc: `Removes the timeline from the homepage of Twitter.`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(doc, '[aria-label="Timeline: Your Home Timeline"]', lib.remove, {
      one: true,
    });
  },
});

intercept({
  regex: /twitter\.com/g,
  tags: "id=twitter-remove-trending site=twitter pronged",
  desc: `Removes the "What's happening" block from Twitter`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(doc, '[aria-label="Timeline: Trending now"]', lib.remove, {
      one: true,
    });
  },
});

intercept({
  regex: /twitter\.com/g,
  tags: "id=twitter-follow-suggestions site=twitter clutter",
  desc: `Removes the "Who to follow" block`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(doc, '[aria-label="Who to follow"]', lib.remove, { one: true });
  },
});

intercept({
  regex: /(?<!old\.)reddit\.com/g,
  tags: "id=reddit-remove-homepage-feed site=reddit scroller",
  desc: `Removes the homepage feed`,
  inject: false,
  impl(lib, doc, url) {
    if (url.pathname === "/") {
      doc.head.innerHTML = "";
      doc.body.innerHTML = "";
    }
  },
});

intercept({
  regex: /(?<!old\.)reddit\.com/g,
  tags: "id=reddit-remove-sub-feed site=reddit scroller",
  desc: `Removes the feed from subreddits`,
  inject: true,
  impl(lib, doc, url) {
    if (url.pathname.match(RegExp("/r/[^/?]+/?", "g"))) {
      console.log(url.pathname);
      lib.watch(
        doc,
        ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
        lib.remove,
        { one: true }
      );
    }
  },
});

intercept({
  regex: /(?<!old\.)reddit\.com/g,
  tags: "id=reddit-remove-after-post-feed site=reddit pronged",
  desc: `Removes the feed that appears after posts`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(
      doc,
      (node) =>
        node.innerText &&
        node.innerText.match(/^More posts from the .* community$/i),
      (node) => node.parentNode.remove()
    );
  },
});

intercept({
  regex: /imgur\.com/g,
  tags: "id=imgur-homepage-feed site=imgur scroller",
  desc: `Removes the feed from the imgur homepage`,
  inject: true,
  impl(lib, doc, url) {
    if (url.pathname === "/")
      lib.watch(doc, ".Spinner-contentWrapper", lib.remove, { one: true });
  },
});

intercept({
  regex: /imgur\.com/g,
  tags: "id=imgur-remove-search site=imgur",
  desc: `Remove the search bar`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(doc, ".Searchbar", lib.remove, { one: true });
  },
});

intercept({
  regex: /imgur\.com/g,
  tags: "id=imgur-remove-right-sidebar site=imgur",
  desc: `Remove the right-hand sidebar from posts`,
  inject: true,
  impl(lib, doc, url) {
    lib.watch(doc, ".Gallery-Sidebar", lib.hide);
  },
});

/* TOOD:

@intercept(
    slug="imgur:left_sidebar",
    regex=imgur_re,
    enabled_by_default=False,
)
def modify(soup, flow, url_obj):
    """Removes the left-hand sidebar from Imgur posts"""
    remove(
        ".Gallery-EngagementBar",
        from_=soup,
        via="opacity-0",
    )


@intercept(
    slug="imgur:after_post_explore_feed",
    regex=imgur_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the 'Explore Posts' feed after Imgur posts"""
    remove(
        ".BottomRecirc",
        from_=soup,
        via="display-none",
    )


facebook_re = re.compile(r"facebook\.com")


@intercept(
    slug="facebook:homepage_feed",
    regex=facebook_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the feed from the Facebook homepage"""
    if is_landing(url_obj):
        remove("div[role=feed]", from_=soup, via="display-none")


@intercept(
    slug="facebook:profile_timeline",
    regex=facebook_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the timeline from user profiles"""
    if re.match("/[^/]+/?", url_obj.path):
        remove("[data-pagelet=ProfileComposer] ~ *", from_=soup, via="display-none")

*/

const seDoms = [
  "stackexchange.com",
  ".stackexchange.com",
  "askubuntu.com",
  "mathoverflow.net",
  "blogoverflow.com",
  "serverfault.com",
  "stackoverflow.com",
  "stackexchange.com",
  "stackapps.com",
  "stackmod.blog",
  "stackoverflow.blog",
  "stackoverflowbusiness.com",
  "superuser.com",
  "tex-talk.net",
  "thesffblog.com",
];

const seRe = RegExp(
  seDoms.map((s) => "(" + escapeRegex(s) + ")").join("|"),
  "g"
);

intercept({
  regex: seRe,
  tags: "id=stackexchange-remove-hot-network-questions pronged",
  desc: `Removes the "Hot Network Questions" sidebar`,
  inject: false,
  impl(lib, doc, url) {
    doc.querySelector("#hot-network-questions").remove();
  },
});

/* TODO:

@intercept(
    slug="stackexchange:landing_feed",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the "Top Question" feed from Stack Exchange site landing pages"""
    if is_landing(url_obj):
        remove("#mainbar", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:all_questions_feed",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the "All Questions" feed under /questsions"""
    if url_obj.path == "/questions":
        remove("#mainbar", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:hot",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the "Hot Network Questions" sidebar"""
    remove("#hot-network-questions", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:related",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the "Related" sidebar"""
    remove(".sidebar-related", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:linked",
    regex=stackexchange_re,
    enabled_by_default=False,
)
def modify(soup, flow, url_obj):
    """Removes the "Linked" sidebar"""
    remove(".sidebar-linked", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:rss_link",
    regex=stackexchange_re,
    enabled_by_default=False,
)
def modify(soup, flow, url_obj):
    """Removes the "Question feed" link"""
    remove("#feed-link", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:sticky_note",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the yellow "sticky note" on the right side of the page"""
    remove("#sidebar .s-sidebarwidget", from_=soup, via="node-removal")


@intercept(
    slug="stackexchange:left_sidebar",
    regex=stackexchange_re,
    enabled_by_default=False,
)
def modify(soup, flow, url_obj):
    """Removes the left navigation bar"""
    remove("#left-sidebar", from_=soup, via="opacity-0")


@intercept(
    slug="stackexchange:se_landing_feed",
    regex=stackexchange_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the feed on the landing page of stackexchange.com"""
    is_parent_se_site = url_obj.netloc == "stackexchange.com"
    if is_landing(url_obj) and is_parent_se_site:
        remove("#question-list", from_=soup, via="node-removal")

*/