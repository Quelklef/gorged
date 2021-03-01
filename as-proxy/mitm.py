import json
import re

from fifo_client import FifoClient

fifo = FifoClient("./ipc.sock")
fifo.open()


def is_paused():
    # TODO: terrible terrible :(
    with open("./is-paused", "r") as f:
        return f.read().strip() == "true"


def probably_should_be_ignored(flow):
    return not (
        flow.request.data.method in (b"GET", b"POST")
        and flow.response.data.status_code == 200
        and flow.response.data.headers.get("content-type", "").startswith("text/html")
        and flow.response.content
    )


def get_csp_nonce(flow):
    csp = flow.response.headers.get("content-security-policy")
    if csp is None:
        return None
    match = re.search(r".*;\s*script-src\s+[^;]*\s.nonce-(\w+)", csp)
    if match is None:
        return None
    return match.group(1)


def response(flow):
    if is_paused():
        return

    if probably_should_be_ignored(flow):
        return

    html = flow.response.text
    modified = fifo.call(
        json.dumps(
            {
                "html": html,
                "url": flow.request.pretty_url,
                "csp_nonce": get_csp_nonce(flow),
            }
        )
    )
    flow.response.text = modified
