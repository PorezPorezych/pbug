var express = require("express");
var router = new express.Router();
var connection = require("../knexfile");
var config = require("../config.js");
var vroot = config["virtual-root"];
var debug = require("../debug");
var { permissionError, async, permissionError } = require("../common.js");
var { provePermission } = require("../permissions.js");
var { proveSecrecy } = require("./common");

router.get(vroot + "kb/editpost/:post", async(async function (req, res, next) {
    if (typeof req.params.post !== typeof "") res.redirect(vroot);
    else if (isNaN(Number(req.params.post))) res.redirect(vroot);
    else {
        var posts = await connection
            .select("infopagecomments.id", "infopagecomments.containedtext", "infopagecomments.authorid",
                "infopagecomments.dateofcreation", "infopagecomments.dateofedit", "users.fullname",
                "infopages.secrecy")
            .from("infopagecomments")
            .leftJoin("users", "infopagecomments.authorid", "users.id")
            .leftJoin("infopages", "infopagecomments.infopageid", "infopages.id")
            .where({
                "infopagecomments.id": req.params.post
            });
        if (posts.length < 1) {
            res.redirect(vroot);
        } else if (!proveSecrecy(req.user.permissions, posts[0].secrecy)) {
            permissionError(req, res);
            return;
        } else if (!((posts[0].authorid === req.user.id && provePermission(req.user.permissions, "kb.editpost.own")) || provePermission(req.user.permissions, "kb.editpost.other"))) {
            permissionError(req, res);
        } else
            res.render("kb/editcomment", {
                post: posts[0]
            });
    }
}));
router.post(vroot + "kb/editpost/:post", async(async function (req, res, next) {
    if (typeof req.params.post !== typeof "") res.status(400).end();
    else if (isNaN(Number(req.params.post))) res.status(400).end();
    else if (typeof req.body.newtext !== typeof "") res.status(400).end();
    else if (req.body.newtext === "") res.redirect("back");
    else {
        var posts = await connection
            .select("infopagecomments.authorid", "infopagecomments.infopageid", "infopages.secrecy", "infopages.path")
            .leftJoin("infopages", "infopagecomments.infopageid", "infopages.id")
            .from("infopagecomments")
            .where({
                "infopagecomments.id": req.params.post
            });
        if (posts.length < 1) {
            res.redirect(vroot);
        } else if (!proveSecrecy(req.user.permissions, posts[0].secrecy)) {
            permissionError(req, res);
            return;
        } else if (!((posts[0].authorid === req.user.id && provePermission(req.user.permissions, "kb.editpost.own")) || provePermission(req.user.permissions, "kb.editpost.other"))) {
            permissionError(req, res);
        } else {
            await connection("infopagecomments")
                .where({
                    "id": req.params.post
                })
                .update({
                    "containedtext": req.body.newtext,
                    "dateofedit": new Date()
                });
            res.redirect(vroot + "kb/talk/" + posts[0].path + "#" + req.params.post);
        }
    }
}));

module.exports = router;
