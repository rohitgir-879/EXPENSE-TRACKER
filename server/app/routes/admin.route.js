const express = require("express");
const router = express.Router();
const { connectToDB } = require("../middlewares/mysql.middleware");
const adminController = require("../controllers/admin.controller");

router.post("/login", adminController.login);
router.post("/register", adminController.register);
router.get("/read/:_id", adminController.read);
router.post("/password-settings/:_action", adminController.passwordSettings);
router.patch("/update-profile", adminController.updateProfile);

module.exports = connectToDB(router);
