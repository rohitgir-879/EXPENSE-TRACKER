const { DataTypes } = require("sequelize");
const { sequelize } = require("../middlewares/mysql.middleware");
const User = require("./User.model");

const Transaction = sequelize.define(
  "Transaction",
  {
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    initBy: {
      type: DataTypes.STRING,
      references: {
        model: User,
        key: "_id",
      },
      allowNull: false,
    },
    trType: {
      type: DataTypes.ENUM("Cr.", "Db."),
      allowNull: false,
    },
    creditTo: {
      type: DataTypes.STRING,
      references: {
        model: User,
        key: "_id",
      },
      onDelete: "SET NULL",
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    detail: {
      type: DataTypes.STRING,
    },
  },
  { paranoid: true, timestamps: true }
);

User.hasMany(Transaction, { foreignKey: "initBy" });
Transaction.belongsTo(User, { foreignKey: "initBy" });

module.exports = Transaction;
