var express = require("express");
var router = new express.Router();
var connection = require("../knexfile");
var config = require("../config.js");
var vroot = config["virtual-root"];
var debug = require("../debug");
var { requiresLogin, catchFiles, insertActivity, async, permissionError } = require("../common.js");
var { provePermission } = require("../permissions");

router.get(vroot + "issues/:issue/edit", async(async function (req, res, next) {
    if (typeof req.params.issue !== typeof "") res.redirect(vroot);
    else if (isNaN(Number(req.params.issue))) res.redirect(vroot);
    else {
        var issues = await connection
            .select("issues.*", "users.fullname")
            .from("issues")
            .leftJoin("users", "issues.authorid", "users.id")
            .where({
                "issues.id": req.params.issue
            });
        if (issues.length < 1)
            res.redirect(vroot);
        else if (!((issues[0].authorid === req.user.id && provePermission(req.user.permissions, "issues.edit.own")) || provePermission(req.user.permissions, "issues.edit.other")))
            permissionError(req, res);
        else {
            res.render("issues/editissue", {
                issue: issues[0],
                files: await connection
                    .select("fileid", "id", "filename")
                    .from("issuefiles")
                    .where({
                        "issueid": issues[0].id
                    }),
                projects: await connection
                    .select("id", "projectname")
                    .from("projects"),
                users: await connection
                    .select("id", "fullname")
                    .from("users")
            });
        }
    }
}));
router.post(vroot + "issues/:issue/edit", catchFiles(), async(async function (req, res, next) {
    if (typeof req.params.issue !== typeof "") res.status(400).end();
    else if (isNaN(Number(req.params.issue))) res.status(400).end();
    else if (isNaN(Number(req.body.newassigneeid))) res.status(400).end();
    else if (isNaN(Number(req.body.newprojectid))) res.status(400).end();
    else if (typeof req.body.newtext !== typeof "") res.status(400).end();
    else if (typeof req.body.newtitle !== typeof "") res.status(400).end();
    else if (typeof req.body.newtags !== typeof "") res.status(400).end();
    else if (typeof req.body.filesremoved !== typeof "") res.status(400).end();
    else {
        var filesremoved;
        try {
            filesremoved = JSON.parse(req.body.filesremoved);
        }
        catch (e) {
            res.status(400).end();
            return;
        }
        if (typeof filesremoved !== typeof []) res.status(400).end();
        else {
            var issues = await connection
                .select("issues.*", "users.fullname")
                .leftJoin("users", "issues.authorid", "users.id")
                .from("issues")
                .where({
                    "issues.id": req.params.issue
                });
            if (issues.length < 1) {
                res.redirect(vroot);
            } else if (!((issues[0].authorid === req.user.id && provePermission(req.user.permissions, "issues.edit.own")) || provePermission(req.user.permissions, "issues.edit.other"))) {
                permissionError(req, res);
            } else {
                await connection("issues")
                    .where({
                        "id": req.params.issue
                    })
                    .update({
                        "description": req.body.newtext,
                        "issuename": req.body.newtitle,
                        "issuetags": req.body.newtags,
                        "assigneeid": req.body.newassigneeid === "-1" ? null : Number(req.body.newassigneeid),
                        "projectid": req.body.newprojectid,
                        // "dateofedit": new Date()
                    });

                await insertActivity(req.params.issue, req.user.id, {
                    type: "editissue",
                    issueid: req.params.issue,
                    from: {
                        text: issues[0].description,
                        tags: issues[0].issuetags,
                        title: issues[0].issuename,
                        assigneeid: issues[0].assigneeid
                    },
                    to: {
                        text: req.body.newtext,
                        tags: req.body.newtags,
                        title: req.body.newtitle,
                        assigneeid: req.body.newassigneeid
                    }
                });
                for (var fileid of filesremoved) {
                    await connection("issuefiles")
                        .where({
                            "fileid": fileid
                        })
                        .del();
                    req.logger.log("debug", "removed issuefile %s", fileid);
                }
                for (var filefield in req.files) {
                    for (var fileobj of req.files[filefield]) {
                        await connection("issuefiles")
                            .insert({
                                "issueid": req.params.issue,
                                "fileid": fileobj.uid,
                                "filename": fileobj.filename
                            });
                        req.logger.log("debug", "created issue-file link for " + fileobj.uid);
                    }
                }
                res.redirect(vroot + "issues/" + req.params.issue + "/posts");
            }
        }
    }
}));

module.exports = router;
