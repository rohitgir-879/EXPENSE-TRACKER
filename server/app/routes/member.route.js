const express = require("express");
const router = express.Router();
const { connectToDB } = require("../middlewares/mysql.middleware");
const memberController = require("../controllers/member.controller");

router.post("/login", memberController.login);
router.post("/register", memberController.register);
router.post("/assign-credit/:_id", memberController.assignCredit);
router.post("/password-settings/:_action", memberController.passwordSettings);
router.get("/read/:_id", memberController.read);
router.patch("/update-profile/:_id", memberController.updateMemberProfile);
router.patch("/toggle-member-status/:_id", memberController.toggleMemberStatus);

module.exports = connectToDB(router);
