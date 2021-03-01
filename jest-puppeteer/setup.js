const fs = require("fs");
const os = require("os");
const path = require("path");
const mkdirp = require("mkdirp");
const puppeteer = require("puppeteer");

const DIR = path.join(os.tmpdir(), "jest_puppeteer_global_setup");

const chromeProfileLoc =
  path.dirname(path.dirname(__filename)) + "/chrome-profile";

module.exports = async function () {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--user-data-dir=${chromeProfileLoc}`,
      "--proxy-server=127.0.0.1:8080",
    ],
  });

  // store the browser instance so we can teardown it later
  // this global is only available in the teardown but not in TestEnvironments
  global.__BROWSER_GLOBAL__ = browser;

  // use the file system to expose the wsEndpoint for TestEnvironments
  mkdirp.sync(DIR);
  fs.writeFileSync(path.join(DIR, "wsEndpoint"), browser.wsEndpoint());
};
