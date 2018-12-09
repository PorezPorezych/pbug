var connect_busboy = require("connect-busboy");
var fs = require("fs");
var crypto = require("crypto");
var paginate = require("express-paginate");
module.exports = function (app, connection, debug, config) {
    if (!fs.existsSync("./files/")) {
        fs.mkdirSync("./files");
    }
    app.get("/files", async function (req, res) {
        res.redirect("/files/search");
    });
    app.get("/files/upload", async function (req, res, next) {
        if (req.user.id === -1) res.redirect("/");
        res.render("files/upload");
    });
    app.post("/files/upload", connect_busboy({ immediate: true }), async function (req, res, next) {
        if (req.user.id === -1) res.status(403).end();
        else
            req.busboy.on('file', async function (fieldname, file, filename, encoding, mimetype) {
                var fileid = require('crypto').randomBytes(48).toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
                file.pipe(fs.createWriteStream("files/" + fileid));
                await connection("files")
                    .insert({
                        "filename": filename,
                        "authorid": req.user.id,
                        "uid": fileid
                    });
                res.redirect("/");
            });
    });
    app.get("/files/download/:uid", async function (req, res, next) {
        var files = await connection
            .select("filename")
            .from("files")
            .where("uid", req.params.uid);
        if (files.length < 1)
            res.redirect("/files");
        res.setHeader("content-disposition", ";filename=" + files[0].filename);
        res.sendFile("./files/" + req.params.uid, { root: process.cwd() });
        res.end();
    });
    app.get("/files/search", paginate.middleware(), async function (req, res, next) {
        var query = (typeof req.query.q == "undefined") ? "" : req.query.q;
        function buildfrom(q, order) {
            var builder = connection
                .from("files")
                .leftJoin("users AS authors", "files.authorid", "authors.id");
            var orderDesc = true;
            q.split(" ").forEach(function (d) {
                if (d.length == 0) { return; }
                else if (d.startsWith("author:")) {
                    var authorName = d.slice("author:".length);
                    builder = builder.where("authors.username", "ilike", authorName);
                }
                else if (d.startsWith("order:")) {
                    var order = d.slice("order:".length);
                    if (order.match(/asc/gi))
                        orderDesc = false;
                }
                else {
                    builder = builder.where("files.filename", "ilike", "%" + d + "%");
                }
            });
            if (order)
                builder = builder.orderBy("files.id", orderDesc ? "DESC" : "ASC");
            return builder;
        }
        var reslen = (await buildfrom(query, false).count("*"))[0].count;
        var results = await buildfrom(query, true)
            .select("files.*", "authors.username")
            .offset(req.skip)
            .limit(req.query.limit);
        var pagec = Math.ceil(reslen / req.query.limit);
        res.render("files/search",
            {
                query: query,
                results: results,
                pages: paginate.getArrayPages(req)(5, pagec, req.query.page)
            });
    })
};