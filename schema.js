require("dotenv").config();
var Knex = require("knex");
var connection = new Knex({
    client: process.env.DB_TYPE
});
console.log(
    connection.schema
        .dropTableIfExists("sessions")
        .dropTableIfExists("issueposts")
        .dropTableIfExists("issuetags")
        .dropTableIfExists("issueactivities")
        .dropTableIfExists("issues")
        .dropTableIfExists("projects")
        .dropTableIfExists("infopagetags")
        .dropTableIfExists("infopagecomments")
        .dropTableIfExists("infopages")
        .dropTableIfExists("users")
        .createTable("users", function (tbl) {
            tbl.increments("id");
            tbl.string("username", 64).notNullable().unique();
            tbl.string("fullname", 100).notNullable();
            tbl.boolean("isadministrator").defaultTo(false);
            tbl.string("passwordhash", 128);
            tbl.integer("passwordsalt").notNullable();
            tbl.string("apikey", 128).notNullable().unique();
        })
        .createTable("projects", function (tbl) {
            tbl.increments("id");
            tbl.string("projectname", 100).notNullable();
            tbl.string("shortprojectid", 3).unique().notNullable();
            tbl.integer("authorid").references("id").inTable("users").notNullable();
        })
        .createTable("issues", function (tbl) {
            tbl.increments("id");
            tbl.string("issuename", 100).notNullable();
            tbl.integer("authorid").references("id").inTable("users");
            tbl.integer("projectid").references("id").inTable("projects").notNullable();
            tbl.boolean("isclosed").defaultTo(false);
            tbl.integer("assigneeid").references("id").inTable("users");
        })
        .createTable("issueposts", function (tbl) {
            tbl.increments("id");
            tbl.integer("authorid").references("id").inTable("users").notNullable();
            tbl.integer("issueid").references("id").inTable("issues").notNullable();
            tbl.text("containedtext").notNullable();
            tbl.dateTime("dateofcreation").notNullable();
            tbl.dateTime("dateofedit");
        })
        .createTable("issuetags", function (tbl) {
            tbl.increments("id");
            tbl.integer("issueid").references("id").inTable("issues").notNullable();
            tbl.string("tagtext", 64).notNullable();
        })
        .createTable("issueactivities", function (tbl) {
            tbl.increments("id");
            tbl.dateTime("dateofoccurance");
            tbl.integer("issueid").references("id").inTable("issues").notNullable();
            tbl.integer("authorid").references("id").inTable("users").notNullable();
            tbl.jsonb("data");
        })
        .createTable("infopages", function (tbl) {
            tbl.increments("id");
            tbl.dateTime("dateofcreation").notNullable();
            tbl.integer("authorid").references("id").inTable("users").notNullable();
            tbl.dateTime("dateofedit").notNullable();
            tbl.integer("editorid").references("id").inTable("users").notNullable();
            tbl.string("pagename", 100).notNullable();
            tbl.text("containedtext").notNullable();
        })
        .createTable("infopagecomments", function (tbl) {
            tbl.increments("id");
            tbl.dateTime("dateofcreation").notNullable();
            tbl.integer("authorid").references("id").inTable("users");
            tbl.integer("infopageid").references("id").inTable("infopages");
            tbl.dateTime("dateofedit");
            tbl.text("containedtext");
        })
        .createTable("infopagetags", function (tbl) {
            tbl.increments("id");
            tbl.integer("infopageid").references("id").inTable("infopages");
            tbl.string("tagtext", 64).notNullable();
        })
        .toString());