const { Sequelize, DataTypes } = require("sequelize");
const { sequelize } = require("../middlewares/mysql.middleware");

const User = sequelize.define(
  "User",

  {
    // Model attributes are defined here
    _id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    middleName: {
      type: DataTypes.STRING,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: Sequelize.ENUM("admin", "manager"),
      allowNull: false,
    },
    adminRef: {
      type: DataTypes.STRING,
    },
    contactNumber: {
      type: DataTypes.BIGINT,
      allowNull: false,
      validate: {
        is: /^[0-9]{10}$/, //The contact number should must be 10 digits.
      },
      unique: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true,
      },
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      validate: {
        is: /^(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/,
        // Strong password: 8+ chars, letter, number, special char.
      },
      allowNull: false,
    },
    credit: {
      type: DataTypes.BIGINT,
      validate: {
        min: 0,
        max: 10000000,
      },
      defaultValue: 0,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

User.hasMany(User, {
  foreignKey: "adminRef",
  as: "manager",
});
User.belongsTo(User, {
  foreignKey: "adminRef",
  as: "admin",
});

module.exports = User;
