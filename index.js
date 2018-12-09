require("dotenv").config();
var express = require("express");
var session = require("express-session");
var sha512 = require("sha512");
var compression = require("compression");
var Knex = require("knex");
var errors = require("./errors");
var debug = {};
debug.all = require("debug")("pbug*");
debug.request = require("debug")("pbug:request");
debug.userapi = require("debug")("pbug:userapi");
debug.issueapi = require("debug")("pbug:issueapi");
var marked = require("marked");
marked.setOptions({
    highlight: function (code) {
        return require("highlight.js").highlightAuto(code).value;
    },
    // sanitize: true,
    headerIds: false,
    gfm: true
});
debug.all("starting pbug");
var connection = new Knex({
    client: process.env.DB_TYPE,
    connection: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_DB
    }
});
var KnexStore = require("connect-session-knex")(session);
var app = express();
// app.use(compression());
app.use(session({
    name: "pbug.sid",
    secret: "pbugpbugpbugpbug",
    resave: true,
    saveUninitialized: false,
    store: new KnexStore({
        knex: connection
    })
}));
app.locals.parseMarkdown = marked;
app.use(function (req, res, next) {
    debug.request("(%s) %s %s - %s", req.connection.remoteAddress, req.method, req.path, req.headers["user-agent"]);
    if (typeof req.session.loginid === typeof undefined) req.session.loginid = -1;
    if (req.session.loginid === -1) req.session.loginadmin = false;
    req.user = {};
    req.user.id = req.session.loginid;
    req.user.isadmin = req.session.loginadmin;
    req.user.fullname = req.session.loginfullname;
    req.user.username = req.session.loginusername;
    res.locals.req = req;
    res.locals.errors = errors;
    next();
});
app.use(express.urlencoded({
    extended: false
}));
app.use("/static/highlightstyles", express.static("node_modules/highlight.js/styles"));
app.use("/static", express.static("static"));
app.set("view engine", "pug");
app.get("/", async function (req, res, next) {
    if (req.user.id === -1) {
        debug.issueapi("showing all open issues");
        var results = await connection
            .select("issues.id", "issues.issuename", "issues.isclosed", "projects.shortprojectid")
            .from("issues")
            .leftJoin("projects", "issues.projectid", "projects.id")
            .where({
                "issues.isclosed": false
            })
            .orderBy("issues.id", "desc")
        debug.issueapi("issues retrieved, sending body");
        res.render("issues/listall", {
            issues: results,
            title: "List of open issues"
        });
    } else {
        debug.issueapi("showing all open issues assigned to %s", req.user.username);
        var results = await connection
            .select("issues.id", "issues.issuename", "issues.isclosed", "projects.shortprojectid")
            .from("issues")
            .leftJoin("projects", "issues.projectid", "projects.id")
            .where({
                "issues.isclosed": false,
                "issues.assigneeid": req.user.id
            })
            .orderBy("issues.id", "desc")
            .limit(50);
        debug.issueapi("retrieving issues authored by user");
        var aresults = await connection
            .select("issues.id", "issues.issuename", "issues.isclosed", "projects.shortprojectid")
            .from("issues")
            .leftJoin("projects", "issues.projectid", "projects.id")
            .where({
                "issues.isclosed": false,
                "issues.authorid": req.user.id
            })
            .orderBy("issues.id", "desc")
            .limit(50);
        debug.issueapi("issues retrieved, sending body");
        res.render("issues/listall", {
            issues: results,
            aissues: aresults,
            title: "List of open issues assigned to you"
        });
    }
});
app.get("/createproject", async function (req, res, next) {
    if (!req.user.isadmin) res.redirect("/");
    else res.render("createproject");
});
app.post("/createproject", async function (req, res, next) {
    if (!req.user.isadmin) res.redirect("/");
    else if (typeof req.body.name !== typeof "string") res.status(400).end();
    else if (typeof req.body.shortprojectid !== typeof "string") res.status(400).end();
    else if (req.body.shortprojectid.length > 3 || req.body.shortprojectid === 0) res.status(400).end();
    else {
        await connection("projects")
            .insert({
                "projectname": req.body.name,
                "authorid": req.session.loginid,
                "shortprojectid": req.body.shortprojectid
            })
        res.redirect("/");
    }
});

require("./users.js")(app, connection, debug);
require("./files.js")(app, connection, debug);
require("./kb.js")(app, connection, debug);
require("./issues.js")(app, connection, debug);

app.use(function (req, res) {
    res.status(404).render("404");
});
app.listen(Number(process.env.PBUG_PORT || process.env.PORT || 8080));
debug.all("listening on " + Number(process.env.PBUG_PORT || process.env.PORT || 8080));