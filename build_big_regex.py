import re
import sys
from intercepts import intercepts

if __name__ != '__main__':
    print('Can only run as main module')
    sys.exit(1)

print('|'.join("(" + intercept.regex.pattern + ")" for intercept in intercepts))
