const { spawn } = require("child_process");
const fs = require("fs");

const { mods } = require("../mods.js");
const bigRegex = mods
  .flatMap(mod => mod.impls)
  .map(impl => impl.hostRegex)
  .map(regex => "(" + regex.source + ")")
  .join("|");

async function waitTilFileExists(loc, timeout = 250) {
  await new Promise(resolve => {
    const go = () =>
      fs.access(loc, fs.constants.R_OK, err =>
        err ? setTimeout(go, timeout) : resolve()
      );
    go();
  });
}

function spawnVerbose(label, ...args) {
  const child = spawn(...args);

  for (const channel of ["stdout", "stderr"])
    child[channel].on("data", d => {
      process[channel].write("[" + label + "] " + d.toString());
    });

  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));

  return child;
}

(async function () {
  const server = spawnVerbose("server", "node", ["./gorged.js"]);

  await waitTilFileExists("./ipc.sock");

  const proxy = spawnVerbose("mitmproxy", "mitmdump", [
    "-s",
    "./mitm.py",
    "--allow-hosts",
    bigRegex,
  ]);
})();
