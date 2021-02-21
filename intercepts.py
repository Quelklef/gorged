import re
import bs4

class Intercept:
    def __init__(self, regex, func):
        self.regex = regex
        self.modify = func

intercepts = []

def intercept(regex):
    def decorator(func):
        intercepts.append(Intercept(re.compile(regex), func))
        return func
    return decorator

# == #

def remove(node):
    if node:
        node.decompose()

def hide(node):
    if node:
        node["style"] = "opacity: 0 !important"

def is_landing(url_obj):
    return url_obj.path in ('', '/')


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


@intercept('|'.join(map(re.escape, stackexchange_domains)))
def stackexchange(soup, flow, url_obj):
    remove(soup.find(id="hot-network-questions"))
    remove(soup.find(class_="sidebar-related"))
    remove(soup.find(id="feed-link"))
    remove(soup.find(id="sidebar").find(class_="s-sidebarwidget"))
    hide(soup.find(id="left-sidebar"))

    is_parent_se_site = url_obj.netloc == 'stackexchange.com'
    if is_landing(url_obj) and not is_parent_se_site:
        remove(soup.find(id="mainbar"))

@intercept(r'(?<!old\.)reddit\.com')
def reddit_new(soup, flow, url_obj):
    if is_landing(url_obj):
        remove(soup.find("html"))
    else:
        # Remove body from /r/{sub}
        # Reddit seems to build the page content with JS, so we have to do this with CSS
        if bool(re.match(r'/r/[^/?]+/?', url_obj.path)):
            style = soup.new_tag('style')
            style.string = r"""
            .ListingLayout-outerContainer > :nth-child(2) > :nth-child(3) {
                display: none !important;
            }
            """
            soup.find("head").append(style)
