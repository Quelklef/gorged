# Gorged

**What:** Gorged remove feeds, recommendation lists, and other browsing/exploration-related elements from websites like Reddit and Twitter

**Why:** Social media was incredibly detrimental to my life, so I blocked it on my computer. But then I couldn't access these sites *at all*, even for productive/positive tasks. The better solution is to leave these websites accessible, but remove their features related to browsing and exploring. (I got the idea from a coworker who uses [improvedtube](https://chrome.google.com/webstore/detail/improve-youtube-open-sour/bnomihfieiccainjcjblhegjgglakjdd?hl=en))

**How:** Gorged uses [mitmproxy](https://mitmproxy.org/) to intercept incoming network traffic and modify the web pages, removing feeds, before they even hit the browser.

_Why not a browser extension?_ Browser extensions are easy to get around: use incognito, switch browsers, or disable the extension, and boom, in five seconds you're back to an attention-grabbing web. For me, that meant they weren't effective, so I needed a bigger hammer.

## Effects

_Or skip right to [installation](#installation)_

Gorged has a number of effects on websites. All effects are given a name and can be turned on or off by passing regexes to `--enable` and/or `--disable`, like so:

```bash
./run.sh \
  --disable '^stackechange:' \
  --enable  '^(twitter|facebook):' \
  --disable '^twitter:sub_feed$'  # later rules take precedence over earlier rules
```

Here are all the effects:

[comment]: # (BEGIN FLAG DOCS)

|Name|Enabled by default?|Description|
|-|-|-|
|`twitter:home_feed`|✅|Remove the Home feed|
|`twitter:trending`|✅|Remove the "What's happening" block|
|`twitter:follow_suggestions`|✅|Remove the "Who to follow" block|
|`reddit:landing_feed`|✅|Removes the feed from the homepage of Reddit|
|`reddit:sub_feed`|✅|Removes the feed from subreddits|
|`reddit:after_post_feed`|✅|Removes the "More posts from the <subreddit> community" below posts|
|`facebook:homepage_feed`|✅|Removes the feed from the Facebook homepage|
|`facebook:profile_timeline`|✅|Removes the timeline from user profiles|
|`stackexchange:landing_feed`|✅|Removes the "Top Question" feed from Stack Exchange site landing pages|
|`stackexchange:all_questions_feed`|✅|Removes the "All Questions" feed under /questsions|
|`stackexchange:hot`|✅|Removes the "Hot Network Questions" sidebar|
|`stackexchange:related`|✅|Removes the "Related" sidebar|
|`stackexchange:rss_link`|⛔|Removes the "Question feed" link|
|`stackexchange:sticky_note`|✅|Removes the yellow "sticky note" on the right side of the page|
|`stackexchange:left_sidebar`|⛔|Removes the left navigation bar|
|`stackexchange:se_landing_feed`|✅|Removes the feed on the landing page of stackexchange.com|

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

This starts the proxy, but your system won't be connected to it yet. You can route all your computer's traffic through the proxy or, if you're using a browser that supports it (such as Firefox), only your browser's traffic.
  - If you want to route all traffic, look for a system option called something like "Network Proxy"
  - If you want to do browser-local proxying, you have to set it up in the browser
    - As of Firefox 85.0, naviage to Preferences > General > Network Settings > Settings
    - As of Chrome ~88.0, browser-local proxies seem to to be unsupported
  - Having found the setting, select "Manual" or a similar option then plug in `127.0.0.1` for the address and `8080` for the port for both HTTP and HTTPS.

At this point, Gorged should be successfully intercepting all HTTP traffic, but attempts to connect to HTTPS websites will fail. We need to add mitmproxy, the tool that Gorged uses to intercept network requests, as a trusted source of HTTPS traffic.

- If you're using a browser with its own certificate store, such as Chrome or Firefox, you'll need to manually register the certificate in the browser as well
  - As of Chrome ~88.0, this is done in Settings > Security > Manage certificates > Authorities > import.
  - As of Firefox 85.0, this is done in Preferences > Privacy & Security > Certificates > View Certificates > import.
- If you're on a browser that uses the system certificate store, or if you set up the proxy system-wide, then you should register `~/.mitmproxy/mitmproxy-ca-cert.pem` as a trusted certificate on your system.
  - If you're using Ubuntu, instructions can be found  [here](https://askubuntu.com/a/377570/437551).

TODO: on-startup execution
