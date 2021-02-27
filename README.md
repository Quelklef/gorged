# Gorged

**What:** Gorged remove feeds, recommendation lists, and other browsing/exploration-related elements from websites like Reddit and Twitter

**Why:** Social media was incredibly detrimental to my life, so I blocked it on my computer. But then I couldn't access these sites *at all*, even for productive/positive tasks. The better solution is to leave these websites accessible, but remove their features related to browsing and exploring. (I got the idea from a coworker who uses [improvedtube](https://chrome.google.com/webstore/detail/improve-youtube-open-sour/bnomihfieiccainjcjblhegjgglakjdd?hl=en))

**How:** Gorged offers several different installations, each of which use their own strategy.

- As a browser extension for Google Chrome or Firefox (coming soon): Gorged removes distracting content from webpages as your browser loads them.
  - Choose this installation for the easiest setup.
- As a proxy: Gorged intercepts the network traffic on your computer, removing distracting content from webpages before they even hit the browser.
  - Choose this installation if you want Gorged to work system-wide instead of in a particular browser.
  - This can also be a good choice if you, like me, find browser extensions too easy to get around: use incognito, switch browsers, or disable the extension, and boom, in five seconds you're back to an attention-disrespecting web.
- As a Tampermonkey script (coming soon): Same as the browser extensions, but via Tampermonkey.
  - Choose this installation if you want to fiddle with Gorged.

See [installation](#installation) for installation details.

## Effects

[comment]: # (BEGIN FLAG DOCS)

|Name|Description|
|-|-|
|`twitter-remove-homepage-feed`|Removes the timeline from the homepage of Twitter.|
|`twitter-remove-trending`|Removes the "What's happening" block from Twitter|
|`twitter-follow-suggestions`|Removes the "Who to follow" block|
|`reddit-remove-homepage-feed`|Removes the homepage feed|
|`reddit-remove-sub-feed`|Removes the feed from subreddits|
|`reddit-remove-after-post-feed`|Removes the feed that appears after posts|
|`imgur-homepage-feed`|Removes the feed from the imgur homepage|
|`imgur-remove-search`|Remove the search bar|
|`imgur-remove-right-sidebar`|Remove the right-hand sidebar from posts|
|`imgur-remove-after-post-explore-feed`|Remove the "Explore Posts" section after posts|
|`facebook-remove-homepage-feed`|Remove the homepage feed|
|`stackexchange-remove-hot-network-questions`|Removes the "Hot Network Questions" sidebar|
|`stackexchange-landing-feed`|Removes the "Top Question" feed from Stack Exchange site landing pages|
|`stackexchange-all-questions-feed`|Removes the "All Questions" feed under /questsions|
|`stackexchange-related`|Removes the "Related" sidebar|
|`stackexchange-linked`|Removes the "Linked" sidebar|
|`stackexchange-rss-link`|Removes the "Question feed" link|
|`stackexchange-sticky-note`|Removes the yellow "sticky note" on the right side of the page|
|`stackexchange-left-sidebar`|Removes the left navigation bar|
|`stackexchange-se-landing-feed`|Removes the feed on the landing page of stackexchange.com|

[comment]: # (END FLAG DOCS)

## Installation

- [As a browser extension](#installation-as-a-browser-extension)
- [As a proxy](#installation-as-a-proxy)
- [As a Tampermonkey script](#installation-as-a-tampermonkey-script)

### Installation as a Browser Extension

Coming soon

### Installation As a Proxy

Gorged runs on [Python](https://www.python.org/) 3.8+ so make sure you have that first. Then clone this repo and install dependencies. Here, I do that with a Python [virtual environment](https://docs.python.org/3/library/venv.html):

```bash
git clone https://github.com/quelklef/gorged
cd gorged/as_proxy
python -m venv venv       # These two lines only required if you
source venv/bin/activate  # want to use a virtual environment
pip install -r requirements.txt
```

Now we can start Gorged with

```bash
./proxy.sh
```

This starts the proxy, but your system won't be connected to it yet. You can route all your computer's traffic through the proxy or, if you're using a browser that supports it (such as Firefox), only your browser's traffic.
  - If you want to route all traffic, look for a system option called something like "Network Proxy"
  - If you want to do browser-local proxying, you have to set it up in the browser
    - As of Firefox 85.0, naviage to Preferences > General > Network Settings > Settings
    - As of Chrome ~88.0, browser-local proxies seem to to be unsupported
  - Having found the setting, select "Manual" or a similar option then plug in `127.0.0.1` for the address and `8080` for the port for both HTTP and HTTPS.

At this point, Gorged should be successfully intercepting all HTTP traffic, but attempts to connect to HTTPS websites will fail. We need to add [mitmproxy](https://mitmproxy.org/), the tool that Gorged uses to intercept network requests, as a trusted source of HTTPS traffic.

- If you're using a browser with its own certificate store, such as Chrome or Firefox, you'll need to manually register the certificate in the browser as well
  - As of Chrome ~88.0, this is done in Settings > Security > Manage certificates > Authorities > import.
  - As of Firefox 85.0, this is done in Preferences > Privacy & Security > Certificates > View Certificates > import.
- If you're on a browser that uses the system certificate store, or if you set up the proxy system-wide, then you should register `~/.mitmproxy/mitmproxy-ca-cert.pem` as a trusted certificate on your system.
  - If you're using Ubuntu, instructions can be found  [here](https://askubuntu.com/a/377570/437551).

[comment]: # (TODO: on-startup execution?)

### Installation as a Tampermonkey script

Coming soon
