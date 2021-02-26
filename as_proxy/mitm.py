import json
import os
import re
from collections import namedtuple

from fifo_client import FifoClient

fifo = FifoClient("./ipc.sock")
fifo.open()


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

    html = flow.response.text
    modified = fifo.call(
        json.dumps(
            {
                "html": html,
                "url": flow.request.pretty_url,
            }
        )
    )
    flow.response.text = modified
