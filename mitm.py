import contextlib
import sys
import traceback
from urllib.parse import urlparse

import bs4

import flags
from intercepts import make_intercepts

intercepts = make_intercepts(flags.make_flagset())


@contextlib.contextmanager
def infallibly():
    try:
        yield
    except:
        print(traceback.format_exc(), file=sys.stderr)


def response(flow):
    if (
        flow.request.data.method in b"GET POST"
        and flow.response.data.status_code in range(200, 300)
    ):
        url_obj = urlparse(flow.request.pretty_url)
        soup = bs4.BeautifulSoup(flow.response.text, "html.parser")
        for intercept in intercepts:
            if intercept.regex.search(url_obj.geturl()):
                with infallibly():
                    intercept.modify(soup, flow, url_obj)
        flow.response.text = str(soup)
