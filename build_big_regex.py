import re
import sys

import flags
from intercepts import make_intercepts

if __name__ != "__main__":
    print("Can only run as main module")
    sys.exit(1)

intercepts = make_intercepts(flags.make_flagset())
print("|".join("(" + intercept.regex.pattern + ")" for intercept in intercepts))
