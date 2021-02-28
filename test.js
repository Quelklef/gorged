const fs = require("fs");

const { intercepts } = require("./intercepts.js");

function pauseGorged() {
  fs.writeFileSync("./as-proxy/is-paused", "true");
}

function resumeGorged() {
  fs.writeFileSync("./as-proxy/is-paused", "false");
}

jest.setTimeout(60 * 1000);

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
    !!node.boundingBox()
  );
}

function pausedResumed(body) {
  return async function () {
    pauseGorged();
    await body(true);
    resumeGorged();
    await body(false);
  };
}

describe("Gorged", () => {
  let page;
  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();
    await page.setViewport({ width: 1400, height: 800 });
  });

  afterAll(() => {
    resumeGorged();
  });

  // ======================================================================== //
  // Twitter

  describe("twitter", () => {
    beforeAll(async () => {
      // Log in
      await page.goto("https://twitter.com/login", {
        waitUntil: "networkidle2",
      });
      await page.type("input[type=text]", "gorgedtesting");
      await page.type("input[type=password]", "gorged-testing-Z");
      await page.click("[role=button]");
      await page.waitForNavigation();
    });

    test(
      intercept("twitter-remove-homepage-feed"),
      pausedResumed(async isPaused => {
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
        const feed = await page.$(".ListingLayout-outerContainer");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );

    test(
      intercept("reddit-remove-after-post-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://www.reddit.com/r/cats/comments/ln1fep/");

        const feed = await page.$eval("html", html => {
          const nodes = [html];
          let node;
          while ((node = nodes.pop())) {
            if (node.innerText.match(/^More posts from the .* community$/i)) {
              return node;
            } else {
              nodes.push(...node.childNodes);
            }
          }
        });

        expect(await tangible(feed)).toBe(isPaused);
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
        await page.goto("https://imgur.com/gallery/NObjUFk");
        const feed = await page.$(".BottomRecirc");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );
  });

  // ======================================================================== //
  // Facebook

  describe("facebook", () => {
    beforeAll(async () => {
      // Log in
      await page.goto("https://facebook.com/");
      await page.type("#email", "gorged.testing@gmail.com");
      await page.type("#pass", "gorged-testing-Z");
      await page.click("[data-testid=royal_login_button]");
      await page.waitForNavigation();
    });

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
          await page.goto("https://stackoverflow.com/questions/1699748/");
          const widget = await page.$("#hot-network-questions");
          expect(await tangible(widget)).toBe(isPaused);
        })
      )
    );

    test(
      intercept("stackexchange-remove-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://stackexchange.com/");
        const aQuestion = await page.$(".question-link");
        expect(await tangible(aQuestion)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-all-questions-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://worldbuilding.stackexchange.com/questions/");
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
            "https://worldbuilding.stackexchange.com/questions/196909"
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
            "https://worldbuilding.stackexchange.com/questions/196909"
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
          "https://worldbuilding.stackexchange.com/questions/196909"
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
            "https://worldbuilding.stackexchange.com/questions/196909"
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
          "https://worldbuilding.stackexchange.com/questions/196909"
        );
        const usersLink = await page.$("#nav-users");
        expect(await tangible(usersLink)).toBe(isPaused);
      })
    );

    test(
      intercept("stackexchange-remove-se-homepage-feed"),
      pausedResumed(async isPaused => {
        await page.goto("https://stackexchange.com/");
        const feed = await page.$("#question-list");
        expect(await tangible(feed)).toBe(isPaused);
      })
    );
  });
});
