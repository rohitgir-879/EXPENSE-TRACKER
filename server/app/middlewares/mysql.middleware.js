const { Sequelize } = require("sequelize");
const keys = require("../config/keys");

const sequelize = new Sequelize(
  keys.DB_NAME,
  keys.DB_USERNAME,
  keys.CONNECTION_PASSWORD,
  {
    host: "localhost",
    dialect: "mysql",
    logging: false,
  }
);

const connectToDB = (handler) => async (req, res) => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
    return handler(req, res);
  } catch (err) {
    console.error("Unable connecting to the database:", err);
    res
      .status(500)
      .json({ message: "Unable connecting to the database.", err });
  }
};

module.exports = { sequelize, connectToDB };
