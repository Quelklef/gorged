cat > globals.js << EOF
  (function() {

    const global = this;
    global.LIBS = {};

    let module;

    module = {};
    (function() {
      $(cat ../lib.js);
    })();
    global.LIBS.lib = module.exports;

    module = {};
    (function() {
      $(cat ../intercepts.js);
    })();
    global.LIBS.intercepts = module.exports;

  })();
EOF
