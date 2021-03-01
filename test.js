const fs = require("fs");

const { intercepts } = require("./intercepts.js");

function pauseGorged() {
  fs.writeFileSync("./as-proxy/is-paused", "true");
}

function resumeGorged() {
  fs.writeFileSync("./as-proxy/is-paused", "false");
}

jest.setTimeout(60 * 1000);
const antiFlakeDelay = 3250;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function intercept(id) {
  if (!intercepts.some(intercept => intercept.id === id))
    throw Error(`No intercept with id ${id}`);
  return "intercept " + id;
}

async function tangible(node) {
  return (
    // exists
    !!node &&
    // is visible
    node.evaluate(node => {
      for (let anc = node; anc instanceof Element; anc = anc.parentNode) {
        const styles = getComputedStyle(anc);
        if (
          styles.opacity === "0" ||
          styles.display === "none" ||
          styles.visibility === "hidden"
        ) {
          return false;
        }
      }
      return true;
    })
  );
}

function pausedResumed(body) {
  return async function () {
    pauseGorged();
    await body(true);
    await sleep(antiFlakeDelay);
    resumeGorged();
    await body(false);
  };
}

async function hardRefresh(page) {
  await page.evaluate(_ => location.reload(true));
  await page.waitForTimeout(antiFlakeDelay);
  // v https://github.com/puppeteer/puppeteer/issues/1353#issuecomment-723164059
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    page.evaluate(() => history.pushState(null, null, null)),
  ]);
}

describe("Gorged", () => {
  /*

  == NOTE ==

  Some tests, such as those for Twitter, rely on being logged in,
  so when we run Puppeteer we tell it to use the Chrome user
  profile kept at ./chrome-profile.

  To set this up, run
    mkdir ./chrome-profile &&
    chromium --user-data-dir="$(realpath ./chrome-profile)"
  and then:
    1. Add the MITM certificate
       (actually, this doesn't seem to be necessary)
    2. Log in to the requisite sites

  */

  // TODO: during testing, put the proxy at a different location
  //       (i.e. not 127.0.0.1:8080) than normal in order to
  //       better isolate tests

  let page;
  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    await page.setViewport({ width: 1400, height: 800 });
    await page.setCacheEnabled(false);
  });

  afterAll(() => {
    resumeGorged();
  });

  afterEach(async () => {
    // seems to possibly reduce test flakiness
    await sleep(antiFlakeDelay);
  });

  // ======================================================================== //
  // Twitter

  describe("twitter", () => {
    test(
      intercept("twitter-remove-homepage-feed"),
      pausedResumed(async isPaused => {
        await hardRefresh(page);
        await page.goto("https://twitter.com", {
          waitUntil: "networkidle2",
        });
        const feed = await page.$(
          '[aria-label="Timeline: Your Home Timeline"]'
        );
        expect(await tangible(feed)).toBe(isPaused);
      })
    );

    test(
      intercept("twitter-remove-trending"),
      pausedResumed(async isPaused => {
        await hardRefresh(page);
        await page.goto("https://twitter.com", {
          waitUntil: "networkidle2",
        });
        const trending = await page.$('[aria-label="Timeline: Trending now"]');
        expect(await tangible(trending)).toBe(isPaused);
      })
    );

    test(
      intercept("twitter-remove-follow-suggestions"),
      pausedResumed(async isPaused => {
        await hardRefresh(page);
        await page.goto("https://twitter.com", {
          waitUntil: "networkidle2",
        });
        const suggestions = await page.$('[aria-label="Who to follow"]');
        expect(await tangible(suggestions)).toBe(isPaused);
      })
    );
  });

  // ======================================================================== //
  // Reddit

  describe("reddit", () => {
    test(
      intercept("reddit-void-homepage"),
      pausedResumed(async isPaused => {
        await page.goto("https://reddit.com");
        const container = await page.$(".ListingLayout-outerContainer");
        expect(await tangible(container)).toBe(isPaused);
      })
    );

    test(
      intercept("reddit-remove-sub-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://reddit.com/r/cats");
        const feed = await page.$(".Post");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );

    test(
      intercept("reddit-remove-after-post-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://www.reddit.com/r/cats/comments/ln1fep/");
        await page.waitForTimeout(1800);
        await page.evaluate(_ => window.scrollBy(0, 1000));
        await page.waitForTimeout(1800);
        const posts = await page.$$(".Post");
        expect(posts.length === 1).toBe(isPaused);
      })
    );
  });

  // ======================================================================== //
  // Imgur

  describe("imgur", () => {
    test(
      intercept("imgur-remove-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://imgur.com");
        const feed = await page.$(".Spinner-contentWrapper");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );

    test(
      intercept("imgur-remove-search"),
      pausedResumed(async isPaused => {
        await page.goto("https://imgur.com");
        const search = await page.$(".Searchbar");
        expect(await tangible(search)).toBe(isPaused);
      })
    );

    describe(intercept("imgur-remove-right-sidebar"), () => {
      test(
        "in /gallery/",
        pausedResumed(async isPaused => {
          await page.goto("https://imgur.com/gallery/u6tPISU");
          const bar = await page.$(".Gallery-Sidebar");
          expect(await tangible(bar)).toBe(isPaused);
        })
      );

      test(
        "in /r/",
        pausedResumed(async isPaused => {
          await page.goto("https://imgur.com/r/cats/s9rgOPX");
          const bar = await page.$("#side-gallery");
          expect(await tangible(bar)).toBe(isPaused);
        })
      );
    });

    test(
      intercept("imgur-remove-after-post-explore-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://imgur.com/gallery/NObjUFk", {
          waitUntil: "networkidle2",
        });
        for (let i = 0; i < 3; i++) {
          await page.waitForTimeout(1800);
          await page.evaluate(_ => window.scrollBy(0, 1000));
        }
        const feed = await page.$(".BottomRecirc");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );
  });

  // ======================================================================== //
  // Facebook

  describe("facebook", () => {
    test(
      intercept("facebook-remove-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://facebook.com");
        const feed = await page.$("div[role=feed]");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );
  });

  // ======================================================================== //
  // Stack Exchange

  // TODO: a lot of these tests are not great due to SE's A/B testing

  function flaky(retries, body) {
    return async function () {
      while (retries--) {
        try {
          return await body();
        } catch (err) {
          // swallow it
        }
      }
      return await body();
    };
  }

  describe("stack exchange", () => {
    test(
      intercept("stackexchange-remove-hot-network-questions"),
      flaky(
        5,
        pausedResumed(async isPaused => {
          await page.goto("https://stackoverflow.com/questions/1699748/", {
            waitUntil: "domcontentloaded",
          });
          const widget = await page.$("#hot-network-questions");
          expect(await tangible(widget)).toBe(isPaused);
        })
      )
    );

    test(
      intercept("stackexchange-remove-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://stackexchange.com/", {
          waitUntil: "domcontentloaded",
        });
        const aQuestion = await page.$(".question-link");
        expect(await tangible(aQuestion)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-all-questions-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://worldbuilding.stackexchange.com/questions/", {
          waitUntil: "domcontentloaded",
        });
        const aQuestionLink = await page.$(".question-hyperlink");
        expect(await tangible(aQuestionLink)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-related"),
      flaky(
        5,
        pausedResumed(async isPaused => {
          await page.goto(
            "https://worldbuilding.stackexchange.com/questions/196909",
            { waitUntil: "domcontentloaded" }
          );
          const relatedH4 = await page.$("#h-related");
          expect(await tangible(relatedH4)).toBe(isPaused);
        })
      )
    );

    test(
      intercept("stackexchange-remove-linked"),
      flaky(
        5,
        pausedResumed(async isPaused => {
          await page.goto(
            "https://worldbuilding.stackexchange.com/questions/196909",
            { waitUntil: "domcontentloaded" }
          );
          const linkedH4 = await page.$("#h-linked");
          expect(await tangible(linkedH4)).toBe(isPaused);
        })
      )
    );

    test(
      intercept("stackexchange-remove-rss-link"),
      pausedResumed(async isPaused => {
        await page.goto(
          "https://worldbuilding.stackexchange.com/questions/196909",
          { waitUntil: "domcontentloaded" }
        );
        const rss = await page.$("#feed-link");
        expect(await tangible(rss)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-sticky-note"),
      flaky(
        5,
        pausedResumed(async isPaused => {
          await page.goto(
            "https://worldbuilding.stackexchange.com/questions/196909",
            { waitUntil: "domcontentloaded" }
          );
          const stickyNote = await page.$(".s-sidebarwidget");
          expect(await tangible(stickyNote)).toBe(isPaused);
        })
      )
    );

    test(
      intercept("stackexchange-remove-left-sidebar"),
      pausedResumed(async isPaused => {
        await page.goto(
          "https://worldbuilding.stackexchange.com/questions/196909",
          { waitUntil: "domcontentloaded" }
        );
        const usersLink = await page.$("#nav-users");
        expect(await tangible(usersLink)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-se-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://stackexchange.com/", {
          waitUntil: "domcontentloaded",
        });
        const feed = await page.$("#question-list");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );
  });
});
