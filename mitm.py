import os
import re
from urllib.parse import urlparse

import bs4

from intercepts import intercepts
from util import infallibly

is_disabled_re = re.compile(os.getenv("GORGE_DISABLED_RE", "") or "never^")


def is_disabled(intercept):
    return bool(is_disabled_re.search(intercept.slug))


def response(flow):
    if (
        flow.request.data.method in b"GET POST"
        and flow.response.data.status_code in range(200, 300)
    ):
        url_obj = urlparse(flow.request.pretty_url)
        soup = bs4.BeautifulSoup(flow.response.text, "html.parser")
        for intercept in intercepts:
            if not is_disabled(intercept) and intercept.regex.search(url_obj.geturl()):
                with infallibly():
                    intercept.func(soup, flow, url_obj)
        flow.response.text = str(soup)
