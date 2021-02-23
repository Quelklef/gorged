import os
import re
from collections import namedtuple
from urllib.parse import urlparse

import bs4

from intercepts import intercepts
from util import infallibly

Filter = namedtuple("Filter", "kind regex")

filters = []
for filter_str in set(os.getenv("GORGE_REGEXES", "").split("\n")) - {""}:
    kind, regex_str = filter_str.split(":")
    assert kind in ("enable", "disable")
    filters.append(Filter(kind, re.compile(regex_str)))


def is_enabled(intercept):
    for filter in filters:
        if filter.regex.search(intercept.slug):
            return {"enable": True, "disable": False}[filter.kind]
    return intercept.enabled_by_default


def probably_should_be_ignored(flow):
    return not (
        flow.request.data.method in (b"GET", b"POST")
        and flow.response.data.status_code == 200
        and flow.response.data.headers["content-type"].startswith("text/html")
        and flow.response.content
    )


def response(flow):
    if probably_should_be_ignored(flow):
        return

    url_obj = urlparse(flow.request.pretty_url)
    soup = bs4.BeautifulSoup(flow.response.text, "html.parser")
    for intercept in intercepts:
        if is_enabled(intercept) and intercept.regex.search(url_obj.geturl()):
            with infallibly():
                intercept.func(soup, flow, url_obj)
    flow.response.text = str(soup)
