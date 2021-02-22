import re


class Intercept:
    def __init__(self, regex, func):
        self.regex = regex
        self.modify = func


def remove(selector, *, from_, via):
    soup = from_
    strategy = via

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
        raise ValueError(f"Unrecognized removal strategy {repr(via)}")


def is_landing(url_obj):
    return url_obj.path in ("", "/")


def make_intercepts(flagset):
    intercepts = []

    def intercept(regex):
        def decorator(func):
            intercepts.append(Intercept(regex, func))
            return func

        return decorator

    if flagset.twitter:
        """Allow modification of Twitter"""

        twitter_re = re.compile(r"twitter\.com")

        if flagset.twitter_remove_home_feed:
            """Remove the Home feed"""

            @intercept(twitter_re)
            def modify(soup, flow, url_obj):
                remove(
                    '[aria-label="Timeline: Your Home Timeline"]',
                    from_=soup,
                    via="display-none",
                )

        if flagset.twitter_remove_trending:
            """Remove the "What's happening" block"""

            @intercept(twitter_re)
            def modify(soup, flow, url_obj):
                remove(
                    '[aria-label="Timeline: Trending now"]',
                    from_=soup,
                    via="display-none",
                )

        if flagset.twitter_remove_follow_suggestions:
            """Remove the "Who to follow" block"""

            @intercept(twitter_re)
            def modify(soup, flow, url_obj):
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

    if flagset.stackexchange:
        """Allow modification of Stack Exchange websites"""

        if flagset.stackexchange_remove_hot:
            """Removes the "Hot Network Questions" sidebar"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                remove("#hot-network-questions", from_=soup, via="node-removal")

        if flagset.stackexchange_remove_related:
            """Removes the "Related" sidebar"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                remove(".sidebar-related", from_=soup, via="node-removal")

        if flagset.stackexchange_remove_rss_link:
            """Removes the "Question feed" link"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                remove("#feed-link", from_=soup, via="node-removal")

        if flagset.stackexchange_remove_sticky_note:
            """Removes the yellow "sticky note" on the right side of the page"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                remove("#sidebar .s-sidebarwidget", from_=soup, via="node-removal")

        if flagset.stackexchange_remove_left_sidebar:
            """Removes the left navigation bar"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                remove("#left-sidebar", from_=soup, via="opacity-0")

        if flagset.stackexchange_remove_se_landing_feed:
            """Removes the feed on the landing page of stackexchange.com"""

            @intercept(stackexchange_re)
            def modify(soup, flow, url_obj):
                is_parent_se_site = url_obj.netloc == "stackexchange.com"
                if is_landing(url_obj) and not is_parent_se_site:
                    remove("#mainbar", from_=soup, via="node-removal")

    if flagset.reddit:
        """Allow modification of Reddit"""

        new_reddit_re = re.compile(r"(?<!old\.)reddit\.com")

        if flagset.reddit_remove_landing_feed:
            """Removes the feed from the homepage of Reddit"""

            @intercept(new_reddit_re)
            def modify(soup, flow, url_obj):
                if is_landing(url_obj):
                    remove("html", from_=soup, via="node-removal")

        if flagset.reddit_remove_sub_feed:
            """Removes the feed from subreddits"""

            @intercept(new_reddit_re)
            def modify(soup, flow, url_obj):
                if not is_landing(url_obj):
                    # Remove body from /r/{sub}
                    # Reddit seems to build the page content with JS, so we have to do this with CSS
                    if bool(re.match(r"/r/[^/?]+/?", url_obj.path)):
                        remove(
                            ".ListingLayout-outerContainer > :nth-child(2) > :nth-child(3)",
                            from_=soup,
                            via="display-none",
                        )

    return intercepts
