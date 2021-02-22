import re


class Intercept:
    def __init__(self, regex, func):
        self.regex = regex
        self.modify = func


def remove(node):
    if node:
        node.decompose()


def hide(node):
    if node:
        node["style"] = "opacity: 0 !important"


def is_landing(url_obj):
    return url_obj.path in ("", "/")


def make_intercepts(flagset):
    intercepts = []

    def intercept(regex):
        def decorator(func):
            intercepts.append(Intercept(re.compile(regex), func))
            return func

        return decorator

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

    if flagset.stackexchange:
        """Allow modification of Stack Exchange websites"""

        @intercept("|".join(map(re.escape, stackexchange_domains)))
        def stackexchange(soup, flow, url_obj):

            if flagset.stackexchange_remove_hot:
                """Removes the "Hot Network Questions" sidebar"""
                remove(soup.find(id="hot-network-questions"))

            if flagset.stackexchange_remove_related:
                """Removes the "Related" sidebar"""
                remove(soup.find(class_="sidebar-related"))

            if flagset.stackexchange_remove_rss_link:
                """Removes the "Question feed" link"""
                remove(soup.find(id="feed-link"))

            if flagset.stackexchange_remove_stick_note:
                """Removes the yellow "sticky note" on the right side of the page"""
                remove(soup.find(id="sidebar").find(class_="s-sidebarwidget"))

            if flagset.stackexchange_remove_left_sidebar:
                """Removes the left navigation bar"""
                hide(soup.find(id="left-sidebar"))

            is_parent_se_site = url_obj.netloc == "stackexchange.com"
            if is_landing(url_obj) and not is_parent_se_site:
                remove(soup.find(id="mainbar"))

    if flagset.reddit:
        """Allow modification of Reddit"""

        @intercept(r"(?<!old\.)reddit\.com")
        def reddit_new(soup, flow, url_obj):
            if is_landing(url_obj):
                if flagset.reddit_remove_landing_feed:
                    """Removes the feed from the homepage of Reddit"""
                    remove(soup.find("html"))
            else:
                if flagset.reddit_remove_sub_feed:
                    """Removes the feed from subreddits"""
                    # Remove body from /r/{sub}
                    # Reddit seems to build the page content with JS, so we have to do this with CSS
                    if bool(re.match(r"/r/[^/?]+/?", url_obj.path)):
                        style = soup.new_tag("style")
                        style.string = r"""
                        .ListingLayout-outerContainer > :nth-child(2) > :nth-child(3) {
                            display: none !important;
                        }
                        """
                        soup.find("head").append(style)

    return intercepts
