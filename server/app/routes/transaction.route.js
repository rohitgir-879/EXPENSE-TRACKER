const express = require("express");
const router = express.Router();
const { connectToDB } = require("../middlewares/mysql.middleware.js");
const transactionController = require("../controllers/transaction.controller");

router.get("/read/:_id", transactionController.read);
router.post("/init", transactionController.init);

module.exports = connectToDB(router);
