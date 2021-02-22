import contextlib
import sys
import traceback


@contextlib.contextmanager
def infallibly():
    try:
        yield
    except:
        print(traceback.format_exc(), file=sys.stderr)
