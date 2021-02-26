"use strict";

const net = require("net");
const fs = require("fs");

const onExit = require("node-cleanup");

module.exports = { serveFifo };

function serveFifo(path, respond) {
  const server = net.createServer();

  server.on("connection", (sock) => {
    console.log("New connection opened.");

    let initial, size, message;
    const reset = () => ([initial, size, message] = ["", null, ""]);
    reset();

    sock.on("data", (data) => {
      const string = data.toString();

      if (size === null) {
        initial += string;
        if (initial.includes(":")) {
          size = parseInt(initial.slice(0, initial.indexOf(":")), 10);
          message = initial.slice(initial.indexOf(":") + 1);
        }
      } else {
        message += string;
      }

      if (message.length >= size) {
        const response = respond(message);
        sock.write(response.length + ":" + response);
        reset();
      }
    });

    sock.on("end", () => {
      console.log("A connection closed.");
    });
  });

  server.on("close", () => {
    console.log("Server closed.");
  });

  onExit(() => {
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  });

  server.listen(path, () => {
    console.log("Server opened.");
  });
}
