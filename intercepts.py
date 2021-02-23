import re
from collections import namedtuple

Intercept = namedtuple("Intercept", "slug desc regex func enabled_by_default")


def insistent_prepend(soup, node):

    html = soup.find("html")
    if not html:
        soup.insert(0, node)
        return

    body = html.find("body")
    if not body:
        html.insert(0, node)
        return

    body.insert(0, node)


def remove(selector, *, from_, via):
    soup, strategy = from_, via
    del from_, via

    if strategy == "node-removal":
        soup.select_one(selector).decompose()

    elif strategy in ("display-none", "opacity-0"):
        css = {
            "display-none": "display: none !important;",
            "opacity-0": "opacity: 0 !important; pointer-events: none !important;",
        }[strategy]

        for node in soup.select(selector):
            node["style"] = node.attrs.get("style", "") + "; " + css

        style = soup.new_tag("style")
        style.string = selector + " { " + css + " }"
        insistent_prepend(soup, style)

    elif strategy == "javascript":
        script = soup.new_tag("script")
        script.string = r"""
        (function () {

            function infallibly(func) {
                return function(...args) {
                    try {
                        func(...args);
                    } catch (err) {
                        console.error(err);
                    }
                }
            }

            function* walk(root) {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
                let node = walker.currentNode;
                while (node) {
                    yield node;
                    node = walker.nextNode();
                }
            }

            const callback = ( %(callback)s );

            function firstly() {
                for (const node of walk(document)) {
                    infallibly(callback)(node);
                }
            }

            if (document.readyState === 'complete' || document.readyState === 'loaded') {
                firstly();
            } else {
                document.addEventListener('DOMContentLoaded', () => firstly());
            }

            const mo = new MutationObserver(mutations => {
                for (const mut of mutations) {
                    const ofInterest = [mut.target, ...mut.addedNodes];
                    for (const root of ofInterest) {
                        for (const node of walk(root)) {
                            infallibly(callback)(node);
                        }
                    }
                }
            });

            mo.observe(document, {
                subtree: true,
                childList: true,
                attributes: true,
                characterData: true,
            });

        })();
        """ % {
            "callback": selector
        }
        insistent_prepend(soup, script)

    else:
        raise ValueError(f"Unrecognized removal strategy {repr(strategy)}")


def is_landing(url_obj):
    return url_obj.path in ("", "/")


intercepts = []


def intercept(*, slug, regex, enabled_by_default):
    def decorator(func):
        intercepts.append(
            Intercept(
                slug=slug,
                desc=func.__doc__,
                regex=regex,
                func=func,
                enabled_by_default=enabled_by_default,
            )
        )

    return decorator


twitter_re = re.compile(r"twitter\.com")


@intercept(
    slug="twitter:home_feed",
    regex=twitter_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Remove the Home feed"""
    remove(
        '[aria-label="Timeline: Your Home Timeline"]',
        from_=soup,
        via="display-none",
    )


@intercept(
    slug="twitter:trending",
    regex=twitter_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Remove the "What's happening" block"""
    remove(
        '[aria-label="Timeline: Trending now"]',
        from_=soup,
        via="display-none",
    )


@intercept(
    slug="twitter:follow_suggestions",
    regex=twitter_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Remove the "Who to follow" block"""
    remove(
        '[aria-label="Who to follow"]',
        from_=soup,
        via="display-none",
    )


new_reddit_re = re.compile(r"(?<!old\.)reddit\.com")


@intercept(
    slug="reddit:landing_feed",
    regex=new_reddit_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the feed from the homepage of Reddit"""
    if is_landing(url_obj):
        remove("html", from_=soup, via="node-removal")


@intercept(
    slug="reddit:sub_feed",
    regex=new_reddit_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the feed from subreddits"""
    is_sub_landing = bool(re.match(r"/r/[^/?]+/?", url_obj.path))
    if is_sub_landing:
        remove(
            ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
            from_=soup,
            via="display-none",
        )


@intercept(
    slug="reddit:after_post_feed",
    regex=new_reddit_re,
    enabled_by_default=True,
)
def modify(soup, flow, url_obj):
    """Removes the "More posts from the <subreddit> community" below posts"""
    remove(
        r"node => node.innerText && node.innerText.match(/^More posts from the .* community$/i) && node.parentNode.remove()",
        from_=soup,
        via="javascript",
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


stackexchange_domains = [
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
]

stackexchange_re = re.compile("|".join(map(re.escape, stackexchange_domains)))


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
