import re
from collections import namedtuple

Intercept = namedtuple("Intercept", "slug desc regex func")


def remove(selector, *, from_, via):
    soup, strategy = from_, via
    del from_, via

    if strategy == "display-none":
        style = soup.new_tag("style")
        style.string = selector + "{ display: none !important; }"
        soup.find("html").append(style)

    if strategy == "opacity-0":
        style = soup.new_tag("style")
        style.string = selector + "{ opacity: 0 !important; }"
        soup.find("html").append(style)

    elif strategy == "node-removal":
        soup.select_one(selector).decompose()

    else:
        raise ValueError(f"Unrecognized removal strategy {repr(strategy)}")


def is_landing(url_obj):
    return url_obj.path in ("", "/")


intercepts = []


def intercept(regex):
    def decorator(func):
        intercepts.append(
            Intercept(
                slug=func.__name__,
                desc=func.__doc__,
                regex=regex,
                func=func,
            )
        )

    return decorator


twitter_re = re.compile(r"twitter\.com")


@intercept(twitter_re)
def twitter_remove_home_feed(soup, flow, url_obj):
    """Remove the Home feed"""
    remove(
        '[aria-label="Timeline: Your Home Timeline"]',
        from_=soup,
        via="display-none",
    )


@intercept(twitter_re)
def twitter_remove_trending(soup, flow, url_obj):
    """Remove the "What's happening" block"""
    remove(
        '[aria-label="Timeline: Trending now"]',
        from_=soup,
        via="display-none",
    )


@intercept(twitter_re)
def twitter_remove_follow_suggestions(soup, flow, url_obj):
    """Remove the "Who to follow" block"""
    remove(
        '[aria-label="Who to follow"]',
        from_=soup,
        via="display-none",
    )


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


@intercept(stackexchange_re)
def stackexchange_remove_hot(soup, flow, url_obj):
    """Removes the "Hot Network Questions" sidebar"""
    remove("#hot-network-questions", from_=soup, via="node-removal")


@intercept(stackexchange_re)
def stackexchange_remove_related(soup, flow, url_obj):
    """Removes the "Related" sidebar"""
    remove(".sidebar-related", from_=soup, via="node-removal")


@intercept(stackexchange_re)
def stackexchange_remove_rss_link(soup, flow, url_obj):
    """Removes the "Question feed" link"""
    remove("#feed-link", from_=soup, via="node-removal")


@intercept(stackexchange_re)
def stackexchange_remove_sticky_note(soup, flow, url_obj):
    """Removes the yellow "sticky note" on the right side of the page"""
    remove("#sidebar .s-sidebarwidget", from_=soup, via="node-removal")


@intercept(stackexchange_re)
def stackexchange_remove_left_sidebar(soup, flow, url_obj):
    """Removes the left navigation bar"""
    remove("#left-sidebar", from_=soup, via="opacity-0")


@intercept(stackexchange_re)
def stackexchange_remove_se_landing_feed(soup, flow, url_obj):
    """Removes the feed on the landing page of stackexchange.com"""
    is_parent_se_site = url_obj.netloc == "stackexchange.com"
    if is_landing(url_obj) and not is_parent_se_site:
        remove("#mainbar", from_=soup, via="node-removal")


new_reddit_re = re.compile(r"(?<!old\.)reddit\.com")


@intercept(new_reddit_re)
def reddit_remove_landing_feed(soup, flow, url_obj):
    """Removes the feed from the homepage of Reddit"""
    if is_landing(url_obj):
        remove("html", from_=soup, via="node-removal")


@intercept(new_reddit_re)
def reddit_remove_sub_feed(soup, flow, url_obj):
    """Removes the feed from subreddits"""
    is_sub_landing = bool(re.match(r"/r/[^/?]+/?", url_obj.path))
    if is_sub_landing:
        remove(
            ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
            from_=soup,
            via="display-none",
        )
