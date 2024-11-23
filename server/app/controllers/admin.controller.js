const { v4: uuidv4 } = require("uuid");
const CryptoJs = require("crypto-js");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const User = require("../models/User.model");
const { sendEmail } = require("../middlewares/sendmail.middleware");

const login = async (req, res) => {
  const { email, password } = req.body;
  await User.findOne({ where: { email: email, role: req.body.role } })
    .then((user) => {
      // if the user is found
      if (user) {
        const { _id, firstName, email, role } = user.dataValues;
        const bytes = CryptoJs.AES.decrypt(
          user.dataValues.password,
          keys.USER_SECRET
        );
        const decryptedPswd = bytes.toString(CryptoJs.enc.Utf8);
        if (decryptedPswd === password) {
          const { password, ...rest } = user;
          let token = jwt.sign(
            {
              _id: _id,
              email: email,
              firstName: firstName,
              role: role,
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 7200,
            },
            keys.TOKEN_SECRET
          );
          req.session.token = token;
          res
            .status(200)
            .json({ message: `login successfull`, user: rest, token: token });
        } else {
          res.status(401).json({ message: "!Invalid password" });
        }
      } else {
        res.status(401).json({ message: "!Invalid user" });
      }
    })
    .catch((error) => {
      res.status(401).json({ message: "!User not found", error: error });
    });
};
const register = async (req, res) => {
  console.log(req.body);
  await User.sync()
    .then(() => {
      console.log("Database table created!");
      // Create a new user
      const encryptedPassword = CryptoJs.AES.encrypt(
        req.body.password,
        keys.USER_SECRET
      ).toString();

      return User.create({
        ...req.body,
        _id: uuidv4(),
        password: encryptedPassword,
      });
    })
    .then((user) => {
      res.status(200).json({ message: "Admin registered successfully" });
      console.log(user.toJSON());
    })
    .catch((error) => {
      console.error("Error synchronizing the database:", error);
    });
};
const read = async (req, res) => {
  let data;
  const { _id } = req.params;
  await User.findOne({ where: { _id: _id, role: "admin" } })
    .then((response) => {
      const { password, ...rest } = response.dataValues;
      data = rest;
      res.status(200).json({ user: data });
    })
    .catch((error) => {
      res.status(404).json({
        message: `Error finding user : ${_id}`,
        error,
      });
    });
};
const passwordSettings = async (req, res) => {
  const actions = ["forgot-password", "change-password"];
  const { _action } = req.params;
  const authuser = req.headers.authuser;

  const changePassword = () => {
    console.log(authuser);
    User.findOne({ where: { _id: authuser, role: "admin" } }).then((user) => {
      let oldPassword = req.body.currentPassword;
      let newPassword = req.body.newPassword;

      const bytes = CryptoJs.AES.decrypt(
        user.dataValues.password,
        keys.USER_SECRET
      );
      const decryptedPswd = bytes.toString(CryptoJs.enc.Utf8);

      if (oldPassword === decryptedPswd) {
        const encryptedPassword = CryptoJs.AES.encrypt(
          newPassword,
          keys.USER_SECRET
        ).toString();
        user
          .update({
            password: encryptedPassword,
          })
          .then(() => {
            res.status(200).json({ message: "Password updated successfully" });
          })
          .catch((error) => {
            console.log(error);
            res
              .status(500)
              .json({ message: "Some error occured", error: error });
          });
      } else {
        res.status(401).json({ message: "Invalid current password" });
      }
    });
  };
  const recoverPassword = () => {
    console.log(authuser, req.body.role)
    User.findOne({ where: { email: authuser, role: req.body.role } })
      .then((user) => {
        const bytes = CryptoJs.AES.decrypt(
          user.dataValues.password,
          keys.USER_SECRET
        );
        const decryptedPswd = bytes.toString(CryptoJs.enc.Utf8);
        const subject = "Your password for kaival enterprise";
        const content = `This is the password for your kaival enterprise account, once logged in, we recommend changing it for ensured security. \n password : ${decryptedPswd}`;

        sendEmail(req.body.email, subject, content)
          .then((info) => {
            console.log(info);
            res
              .status(200)
              .json({ message: "Success!, Password sent to your email" });
          })
          .catch((error) => {
            console.log(error);
            res.status(500).json({ message: "Email not sent", error: error });
          });
      })
      .catch((error) => {
        res
          .status(401)
          .json({ message: "Incorrent email, please try again", error: error });
      });
  };

  if (actions.includes(_action)) {
    switch (_action) {
      case "forgot-password":
        return recoverPassword();
      case "change-password":
        return changePassword();
      default:
        break;
    }
  } else {
    res.status(401).json({ message: "Unauthorised" });
  }
};

const updateProfile = async (req, res) => {
  const authuser = req.headers.authuser;
  console.log(req.body);
  await User.findOne({ where: { _id: authuser, role: "admin" } })
    .then((user) => {
      user
        .update({ ...req.body })
        .then((updatedUser) => {
          const { password, ...rest } = updatedUser.dataValues;
          res.status(200).json({
            message: "Profile updated successfully",
            updatedProfile: rest,
          });
        })
        .catch((error) => {
          res
            .status(500)
            .json({ message: "Please try again", errorObj: error["errors"] });
        });
    })
    .catch((error) => {
      res.status(401).json({ message: "Unauthorised", error: error });
    });
};

module.exports = {
  read,
  passwordSettings,
  login,
  register,
  updateProfile,
};
