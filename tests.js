const fs = require("fs");
const path = require("path");
const assert = require("assert");

const puppeteer = require("puppeteer");
const chalk = require("chalk");

const { mods } = require("./mods.js");

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function mod(id) {
  if (!mods.some(mod => mod.id === id)) throw Error(`No mod with id ${id}`);
  return id;
}

/* Is a node (handle) "visible to the user?" */
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

function setGorged({ isPaused: bool }) {
  fs.writeFileSync("./as-proxy/is-paused", bool + "");
}

function section(t) {
  console.log();
  console.log(chalk.yellow("=== " + t + " ==="));
}

const selectedTestsRegex = new RegExp(process.argv[2] || "|always");

async function withSpinner(body) {
  const states = "⢄⢂⢁⡁⡈⡐⡠";

  let state = 0;
  let backspace = "";
  function spin() {
    process.stdout.write(backspace + chalk.yellow(states[state]) + " ");
    backspace = "\b\b";
    state = (state + 1) % states.length;
  }

  const id = setInterval(spin, 75);

  try {
    return await body();
  } finally {
    clearInterval(id);
    process.stdout.write(backspace);
  }
}

async function testPausedResumed(name, body) {
  process.stdout.write(name + ": ");

  if (!name.match(selectedTestsRegex)) {
    console.log(chalk.yellow.dim("–"));
    return;
  }

  const pass = chalk.greenBright("✓");
  const fail = chalk.bgRedBright.black("✗");

  let pausedEx, resumedEx;

  setGorged({ isPaused: true });

  try {
    await withSpinner(async () => await body(true));
    process.stdout.write(pass);
  } catch (ex) {
    pausedEx = ex;
    process.stdout.write(fail);
  }

  process.stdout.write(" ");

  if (!pausedEx) {
    setGorged({ isPaused: false });

    try {
      await withSpinner(async () => await body(false));
      process.stdout.write(pass);
    } catch (ex) {
      resumedEx = ex;
      process.stdout.write(fail);
    }
  }

  process.stdout.write("\n");

  if (pausedEx && !(pausedEx instanceof assert.AssertionError)) {
    console.error(chalk.redBright("Precondition panicked:"));
    console.trace(chalk.redBright(pausedEx));
    console.log();
  }

  if (resumedEx && !(resumedEx instanceof assert.AssertionError)) {
    console.error(chalk.redBright("Postcondition panicked:"));
    console.trace(chalk.redBright(resumedEx));
    console.log();
  }
}

async function hardGoto(page, dest, opts) {
  // No clue why, but on some tests a .goto seems to load cached content.
  // To get around this, reload it afterwards...
  await page.goto(dest, opts);
  for (let i = 0; i < 3; i++)
    await page.reload({ ...opts, waitUntil: "domcontentloaded" });
  await page.reload(opts);
}

(async function main() {
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

  const chromeProfileLoc = path.dirname(__filename) + "/chrome-profile";

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--user-data-dir=${chromeProfileLoc}`,
      "--proxy-server=127.0.0.1:8080",
      "--disk-cache-dir=/dev/null", // disable cache
      "--mute-audio", // disable sound
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1200 });

  // disable timeouts
  await page.setDefaultTimeout(0);

  // disable cache
  await page.setCacheEnabled(false);

  // disable cache
  const client = await page.target().createCDPSession();
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });

  setGorged({ isPaused: false });

  // ======================================================================== //
  // Twitter

  section("Twitter");

  await testPausedResumed(
    mod("twitter-remove-homepage-feed"),
    async isPaused => {
      await hardGoto(page, "https://twitter.com", {
        waitUntil: "networkidle2",
      });
      const feed = await page.$('[aria-label="Timeline: Your Home Timeline"]');
      assert.equal(await tangible(feed), isPaused);
    }
  );

  await testPausedResumed(mod("twitter-remove-trending"), async isPaused => {
    await hardGoto(page, "https://twitter.com", {
      waitUntil: "networkidle2",
    });
    const trending = await page.$('[aria-label="Timeline: Trending now"]');
    assert.equal(await tangible(trending), isPaused);
  });

  await testPausedResumed(
    mod("twitter-remove-follow-suggestions"),
    async isPaused => {
      await hardGoto(page, "https://twitter.com", {
        waitUntil: "networkidle2",
      });
      const suggestions = await page.$('[aria-label="Who to follow"]');
      assert.equal(await tangible(suggestions), isPaused);
    }
  );

  // ======================================================================== //
  // Youtube

  section("YouTube");

  await testPausedResumed(mod("youtube-remove-suggestions"), async isPaused => {
    await hardGoto(page, "https://www.youtube.com/watch?v=Em7u2BeQGP8", {
      waitUntil: "networkidle2",
    });
    await page.waitForTimeout(2000);
    const suggestions = await page.$$("ytd-compact-video-renderer");
    assert.equal(suggestions.length > 0, isPaused);
  });

  await testPausedResumed(mod("youtube-remove-like-counts"), async isPaused => {
    await hardGoto(page, "https://www.youtube.com/watch?v=Em7u2BeQGP8", {
      waitUntil: "networkidle2",
    });
    await page.waitForTimeout(2000);
    const buttons = await page.$$(
      "#top-level-buttons > ytd-toggle-button-renderer"
    );
    assert.equal(buttons.length > 0, isPaused);
    const bar = await page.$("ytd-sentiment-bar-renderer");
    assert.equal(await tangible(bar), isPaused);
  });

  await testPausedResumed(
    mod("youtube-remove-description-subscribe-button"),
    async isPaused => {
      await hardGoto(page, "https://www.youtube.com/watch?v=Em7u2BeQGP8", {
        waitUntil: "networkidle2",
      });
      await page.waitForTimeout(2000);
      const subscribe = await page.$("#subscribe-button");
      assert.equal(await tangible(subscribe), isPaused);
    }
  );

  // ======================================================================== //
  // Reddit

  section("Reddit");

  await testPausedResumed(mod("reddit-void-homepage"), async isPaused => {
    await page.goto("https://reddit.com", { waitUntil: "networkidle2" });
    const container = await page.$(".ListingLayout-outerContainer");
    assert.equal(await tangible(container), isPaused);
  });

  await testPausedResumed(mod("reddit-remove-sub-feed"), async isPaused => {
    await page.goto("https://reddit.com/r/cats", {
      waitUntil: "networkidle2",
    });
    const feed = await page.$(".Post");
    assert.equal(await tangible(feed), isPaused);
  });

  await testPausedResumed(
    mod("reddit-remove-after-post-feed"),
    async isPaused => {
      await page.goto("https://www.reddit.com/r/Awww/comments/lvx4n1", {
        waitUntil: "networkidle2",
      });
      await page.evaluate(_ => window.scrollBy(0, 1000));
      await page.waitForSelector(".Post");
      const posts = await page.$$(".Post");
      assert.equal(posts.length !== 1, isPaused);
    }
  );

  // ======================================================================== //
  // Imgur

  section("Imgur");

  await testPausedResumed(mod("imgur-remove-homepage-feed"), async isPaused => {
    await page.goto("https://imgur.com", { waitUntil: "networkidle2" });
    const feed = await page.$(".Spinner-contentWrapper");
    assert.equal(await tangible(feed), isPaused);
  });

  await testPausedResumed(mod("imgur-remove-search"), async isPaused => {
    await page.goto("https://imgur.com");
    const search = await page.$(".Searchbar");
    assert.equal(await tangible(search), isPaused);
  });

  await testPausedResumed(
    mod("imgur-remove-right-sidebar") + " in /gallery/",
    async isPaused => {
      await page.goto("https://imgur.com/gallery/u6tPISU", {
        waitUntil: "networkidle2",
      });
      const bar = await page.$(".Gallery-Sidebar");
      assert.equal(await tangible(bar), isPaused);
    }
  );

  await testPausedResumed(
    mod("imgur-remove-right-sidebar") + " in /r/",
    async isPaused => {
      await page.goto("https://imgur.com/r/cats/s9rgOPX", {
        waitUntil: "networkidle2",
      });
      const bar = await page.$("#side-gallery");
      assert.equal(await tangible(bar), isPaused);
    }
  );

  await testPausedResumed(
    mod("imgur-remove-after-post-explore-feed"),
    async isPaused => {
      await page.goto("https://imgur.com/gallery/NObjUFk", {
        waitUntil: "networkidle2",
      });
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(1800);
        await page.evaluate(_ => window.scrollBy(0, 1000));
      }
      const feed = await page.$(".BottomRecirc");
      assert.equal(await tangible(feed), isPaused);
    }
  );

  // ======================================================================== //
  // Facebook

  section("Facebook");

  await testPausedResumed(
    mod("facebook-remove-homepage-feed"),
    async isPaused => {
      await page.goto("https://facebook.com");
      const feed = await page.$("div[role=feed]");
      assert.equal(await tangible(feed), isPaused);
    }
  );

  // ======================================================================== //
  // Stack Exchange

  // TODO: a lot of these testPausedResumeds are not great due to SE's A/B testPausedResumeding

  function flaky(retries, body) {
    return async function (...args) {
      while (retries--) {
        try {
          return await body(...args);
        } catch (err) {
          // swallow it
        }
      }
      return await body();
    };
  }

  section("Stack Exchange");

  await testPausedResumed(
    mod("stackexchange-remove-hot-network-questions"),
    flaky(3, async isPaused => {
      await page.goto("https://stackoverflow.com/questions/1699748/", {
        waitUntil: "domcontentloaded",
      });
      const widget = await page.$("#hot-network-questions");
      assert.equal(await tangible(widget), isPaused);
    })
  );

  await testPausedResumed(
    mod("stackexchange-remove-homepage-feed"),
    async isPaused => {
      await page.goto("https://stackexchange.com/", {
        waitUntil: "domcontentloaded",
      });
      const aQuestion = await page.$(".question-link");
      assert.equal(await tangible(aQuestion), isPaused);
    }
  );

  await testPausedResumed(
    mod("stackexchange-remove-all-questions-feed"),
    async isPaused => {
      await page.goto("https://worldbuilding.stackexchange.com/questions/", {
        waitUntil: "domcontentloaded",
      });
      const aQuestionLink = await page.$(".question-hyperlink");
      assert.equal(await tangible(aQuestionLink), isPaused);
    }
  );

  await testPausedResumed(
    mod("stackexchange-remove-related"),
    flaky(3, async isPaused => {
      await page.goto(
        "https://worldbuilding.stackexchange.com/questions/196909",
        { waitUntil: "domcontentloaded" }
      );
      const relatedH4 = await page.$("#h-related");
      assert.equal(await tangible(relatedH4), isPaused);
    })
  );

  await testPausedResumed(
    mod("stackexchange-remove-linked"),
    flaky(3, async isPaused => {
      await page.goto(
        "https://worldbuilding.stackexchange.com/questions/196909",
        { waitUntil: "domcontentloaded" }
      );
      const linkedH4 = await page.$("#h-linked");
      assert.equal(await tangible(linkedH4), isPaused);
    })
  );

  await testPausedResumed(
    mod("stackexchange-remove-rss-link"),
    async isPaused => {
      await page.goto(
        "https://worldbuilding.stackexchange.com/questions/196909",
        { waitUntil: "domcontentloaded" }
      );
      const rss = await page.$("#feed-link");
      assert.equal(await tangible(rss), isPaused);
    }
  );

  await testPausedResumed(
    mod("stackexchange-remove-sticky-note"),
    flaky(3, async isPaused => {
      await page.goto(
        "https://worldbuilding.stackexchange.com/questions/196909",
        { waitUntil: "domcontentloaded" }
      );
      const stickyNote = await page.$(".s-sidebarwidget");
      assert.equal(await tangible(stickyNote), isPaused);
    })
  );

  await testPausedResumed(
    mod("stackexchange-remove-left-sidebar"),
    async isPaused => {
      await page.goto(
        "https://worldbuilding.stackexchange.com/questions/196909",
        { waitUntil: "domcontentloaded" }
      );
      const usersLink = await page.$("#nav-users");
      assert.equal(await tangible(usersLink), isPaused);
    }
  );

  await testPausedResumed(
    mod("stackexchange-remove-se-homepage-feed"),
    async isPaused => {
      await page.goto("https://stackexchange.com/", {
        waitUntil: "domcontentloaded",
      });
      const feed = await page.$("#question-list");
      assert.equal(await tangible(feed), isPaused);
    }
  );

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ //
  // Cleanup

  await browser.close();
  setGorged({ isPaused: false });
})();
