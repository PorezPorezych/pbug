var fs = require("fs");
var dbg = require("debug")("pbug:config");

var savedconfig = null;

module.exports = function () {
    if (savedconfig !== null) return savedconfig;
    var defaultconf = `{
        "database": {
            "type": "",
            "host": "",
            "user": "",
            "password": "",
            "db": ""
        },
        "login": {
            "allowregistration": true
        },
        "design": {
            "logo": "static/PB.svg"
        },
        "port": 8080,
        "extends": "none",
        "include": []
    }`;
    function getuserconf(path, prevs) {
        if (prevs.includes(path))
            return {};
        dbg("loading config %s", path);
        var userconf = JSON.parse(fs.readFileSync(path));
        if (typeof userconf.extends === "undefined") {
            userconf.extends = "default";
        }
        if (userconf.extends !== "default") {
            dbg("config has superconfig %s", userconf.extends);
            var nprevs = prevs;
            nprevs.push(path);
            userconf = Object.assign(getuserconf(userconf.extends, nprevs), userconf);
        }
        else if (userconf.extends === "default") {
            dbg("config has default superconfig");
            userconf = Object.assign(JSON.parse(defaultconf), userconf);
        }
        else if (userconf.extends === "none") {
            dbg("config has no superconfig");
        }
        if (typeof userconf.include === "undefined") {
            userconf.include = [];
        }
        userconf.include.forEach(e => {
            dbg("config has config %s included", e);
            var nprevs = prevs;
            nprevs.push(path);
            userconf = Object.assign(userconf, getuserconf(e, nprevs));
        });
        delete userconf.extends;
        delete userconf.include;
        return userconf;
    }
    savedconfig = getuserconf("./config.json", []);
    return savedconfig;
};