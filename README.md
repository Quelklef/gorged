# Gorged

**What:** Gorged remove feeds, recommendation lists, and other browsing/exploration-related elements from websites like Reddit and Twitter

**Why:** Social media was incredibly detrimental to my life, so I blocked it on my computer. But then I couldn't access these sites *at all*, even for productive/positive tasks. The better solution is to leave these websites accessible, but remove their features related to browsing and exploring. (I got the idea from a coworker who uses [improvedtube](https://chrome.google.com/webstore/detail/improve-youtube-open-sour/bnomihfieiccainjcjblhegjgglakjdd?hl=en))

**How:** Gorged uses [mitmproxy](https://mitmproxy.org/) to intercept incoming network traffic and modify the web pages, removing feeds, before they even hit the browser.

_Why not a browser extension?_ Browser extensions are easy to get around: use incognito, switch browsers, or disable the extension, and boom, in five seconds you're back to an attention-grabbing web. For me, that meant they weren't effective, so I needed a bigger hammer.

## Effects

_Or skip right to [installation](#installation)_

These are all the changes that the program is capable of making. To disable some, pass a regex to `--disable`, like
```bash
./run.sh --disable 'twitter_remove_home_feed|stackexchange.*'
```

The list is as follows:

[comment]: # (BEGIN FLAG DOCS)

- `twitter_remove_home_feed`: Remove the Home feed
- `twitter_remove_trending`: Remove the "What's happening" block
- `twitter_remove_follow_suggestions`: Remove the "Who to follow" block
- `reddit_remove_landing_feed`: Removes the feed from the homepage of Reddit
- `reddit_remove_sub_feed`: Removes the feed from subreddits
- `facebook_remove_homepage_feed`: Removes the feed from the Facebook homepage
- `stackexchange_remove_landing_feed`: Removes the "Top Question" feed from Stack Exchange site landing pages
- `stackexchange_remove_all_questions_feed`: Removes the "All Questions" feed under /questsions
- `stackexchange_remove_hot`: Removes the "Hot Network Questions" sidebar
- `stackexchange_remove_related`: Removes the "Related" sidebar
- `stackexchange_remove_rss_link`: Removes the "Question feed" link
- `stackexchange_remove_sticky_note`: Removes the yellow "sticky note" on the right side of the page
- `stackexchange_remove_left_sidebar`: Removes the left navigation bar
- `stackexchange_remove_se_landing_feed`: Removes the feed on the landing page of stackexchange.com

[comment]: # (END FLAG DOCS)

## Installation

Gorged runs on [Python](https://www.python.org/) 3.8+ so make sure you have that first. Then clone this repo and install dependencies. Here, I do that with a Python [virtual environment](https://docs.python.org/3/library/venv.html):

```bash
git clone https://github.com/quelklef/gorged
cd gorged
python -m venv venv       # These two lines only required if you
source venv/bin/activate  # want to use a virtual environment
pip install -r requirements.txt
```

Now we can start Gorged with

```bash
./run.sh
```

This starts the proxy, but your system won't be connected to it yet. Configure both HTTP and HTTPS traffic to be routed through `127.0.0.1:8080` ([here](https://www.serverlab.ca/tutorials/linux/administration-linux/how-to-configure-proxy-on-ubuntu-18-04/) is an example tutorial for Ubuntu).

At this point, Gorged should be successfully intercepting all HTTP traffic, but attempts to connect to HTTPS websites will fail. We need to add mitmproxy, the tool that Gorged uses to intercept network requests, as a trusted source of HTTPS traffic.

- First, register the `~/.mitmproxy/mitmproxy-ca-cert.pem` as a trusted certificate on your system. If you're using Ubuntu, instructions can be found  [here](https://askubuntu.com/a/377570/437551).
- Second, if you're using a browser with its own certificate store, [such as Chrome](https://serverfault.com/questions/946756/ssl-certificate-in-system-store-not-trusted-by-chrome), you'll need to manually register the certificate in the browser as well. As of of Chrome 88.0.4324 150, this is done in Settings > Security > Manage certificates > Authorities > import.

TODO: on-startup execution
