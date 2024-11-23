const { v4: uuidv4 } = require("uuid");
const CryptoJs = require("crypto-js");
const jwt = require("jsonwebtoken");
const keys = require("../config/keys");
const User = require("../models/User.model");
const Transaction = require("../models/Transaction.model");
const { sendEmail } = require("../middlewares/sendmail.middleware");

const register = async (req, res) => {
  // Create a new member
  const encryptedPassword = CryptoJs.AES.encrypt(
    req.body.password,
    keys.USER_SECRET
  ).toString();

  await User.findOne({ where: { _id: req.body.adminRef } })
    .then((response) => {
      if (response.role === "admin") {
        User.create({
          ...req.body,
          _id: uuidv4(),
          password: encryptedPassword,
        })
          .then((newuser) => {
            const { password, ...rest } = newuser.dataValues;
            sendEmail(
              req.body.email,
              "Account created successfully",
              `Your login credentials as a manager are \n email : ${req.body.email} \n password : ${req.body.password}`
            )
              .then((info) => {
                console.log(info);
                res.status(200).json({
                  message: "Member added successfully",
                  newManager: rest,
                });
              })
              .catch((error) => {
                console.log(error);
                User.destroy({ where: { _id: newuser._id }, force: true }).then(
                  () => {
                    res.status(500).json({
                      message: "Could not add member, plese try again",
                      error: error,
                    });
                  }
                );
              });
          })
          .catch((error) => {
            console.log({
              message: Object.keys(error),
              fields: error["errors"],
            });
            res.status(500).json({ errorObj: error["errors"] });
          });
      } else {
        res.status(401).json({ message: "Error registering the manager" });
      }
    })
    .catch((error) => {
      res.status(401).json({ message: "Error registering the manager" });
    });
};
const login = async (req, res) => {
  const { email, password } = req.body;
  await User.findOne({
    where: { email: email, role: req.body.role, isActive: true },
  })
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
          const { password, ...rest } = user.dataValues;
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
            .json({ message: `login Successfull`, user: rest, token: token });
        } else {
          res.status(401).json({ message: "!Invalid password" });
        }
      } else {
        res.status(401).json({ message: "!Invaid user" });
      }
    })
    .catch((error) => {
      res.status(401).json({ message: "!User not found" });
    });
};

const read = async (req, res) => {
  let data;
  const { _id } = req.params;
  const adminRef = req.headers.adminref;

  await User.findOne({ where: { _id: adminRef, role: "admin" } })
    .then(() => {
      if (_id !== "all-managers") {
        User.findOne({ where: { _id: _id, role: "manager" } })
          .then((response) => {
            const { password, ...rest } = response.dataValues;
            data = rest;
            res.status(200).json(data);
          })
          .catch((error) => {
            res.status(404).json({
              message: `Error finding a manager of id : ${_id}`,
              error,
            });
          });
      } else {
        User.findAll({ where: { role: "manager" } })
          .then((response) => {
            data = response.map((manager) => {
              const { password, ...rest } = manager.dataValues;
              return rest;
            });
            res.status(200).json(data);
          })
          .catch((error) => {
            res
              .status(404)
              .json({ message: "Error finding the managers", error });
          });
      }
    })
    .catch(() => {
      User.findOne({ where: { _id: _id, role: "manager" } })
        .then((response) => {
          const { password, ...rest } = response.dataValues;
          data = rest;
          res.status(200).json({ user: data });
        })
        .catch((error) => {
          res.status(404).json({ message: `Error finding user : ${_id}` });
        });
    });
};

const assignCredit = async (req, res) => {
  const { _id } = req.params;
  const adminRef = req.headers.adminref;
  await User.findOne({ where: { _id: adminRef, role: "admin" } }).then(() => {
    let prevCredit;
    User.findOne({ where: { _id: _id, role: "manager" } })
      .then((manager) => {
        prevCredit = Number(manager.credit);
        manager
          .update({
            credit: Number(req.body.amount) + Number(manager.credit),
          })
          .then((updatedManager) => {
            const expecV = prevCredit + Number(req.body.amount);
            if (updatedManager.dataValues.credit === expecV) {
              Transaction.sync()
                .then(() => {
                  Transaction.create({
                    _id: uuidv4(),
                    initBy: adminRef,
                    amount: req.body.amount,
                    creditTo: _id,
                    trType : "Cr."
                  }).then((transaction) => {
                    sendEmail(
                      updatedManager.email,
                      "Kaival Enterprise",
                      `Credit assigned into your account \nCredited : ₹ ${req.body.amount}`
                    )
                      .then(() => {
                        res.status(200).json({
                          message: "Amount credited successfully",
                          transaction: transaction,
                        });
                      })
                      .catch(() => {
                        res.status(200).json({
                          message: "Amount credited successfully",
                          transaction: transaction,
                        });
                      });
                  });
                })
                .catch((error) => {
                  updatedManager
                    .update({ credit: prevCredit })
                    .then(() => {
                      res.status(500).json({ message: "Some error occured" });
                    })
                    .catch(() => {
                      res.status(500).json({ message: "Some error occured" });
                    });
                  res
                    .status(500)
                    .json({ message: "Some error occured", error: error });
                });
            } else {
              updatedManager
                .update({ credit: prevCredit })
                .then(() => {
                  res.status(500).json({ message: "Some error occured" });
                })
                .catch(() => {
                  res.status(500).json({ message: "Some error occured" });
                });
            }
          })
          .catch((error) => {
            res.status(401).json(error);
          });
      })
      .catch((error) => {
        console.log(error);
        res.status(404).json({ message: "Manager not found", error: error });
      });
    // }
  });
};

const passwordSettings = async (req, res) => {
  const actions = ["forgot-password", "change-password"];
  const { _action } = req.params;
  const authuser = req.headers.authuser;

  console.log(_action, authuser);

  const changePassword = () => {
    User.findOne({ where: { _id: authuser, isActive: true } })
      .then((user) => {
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
              res
                .status(200)
                .json({ message: "Password updated successfully" });
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
      })
      .catch((error) => {
        res.status(401).json({ message: "Unauthorised", error: error });
      });
  };

  const recoverPassword = () => {
    User.findOne({
      where: { email: authuser, role: req.body.role, isActive: true },
    })
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
        res.status(401).json({ error: "unauthorised" });
        break;
    }
  } else {
    res.status(401).json({ error: "unauthorised" });
  }
};

const toggleMemberStatus = async (req, res) => {
  const { _id } = req.params;
  const adminRef = req.headers.adminref;
  // console.log(_id, req.headers)
  await User.findOne({ where: { _id: adminRef, role: "admin" } })
    .then(() => {
      // toggle member status logic
      User.findOne({ where: { _id: _id, role: "manager" } })
        .then((user) => {
          user
            .update({ isActive: !user.isActive })
            .then((updatedUser) => {
              res.status(200).json({
                message: `Status updated successfully`,
                updatedUser: updatedUser,
              });
            })
            .catch((error) => {
              res.status(500).json({
                message: "Couldn't update status, please try again",
                error: error,
              });
            });
        })
        .catch((error) => {
          res.status(404).json({ message: "Some error occured", error: error });
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(401).json({ message: "Unauthorised", error: error });
    });
};

const updateMemberProfile = async (req, res) => {
  console.log(req.body);
  const adminref = req.headers.adminref;
  const { _id } = req.params;
  User.findOne({ where: { _id: adminref, role: "admin" } })
    .then(() => {
      User.findOne({ where: { _id: _id, role: "manager" } })
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
              res.status(500).json({
                message: "Please try again",
                errorObj: error["errors"],
              });
            });
        })
        .catch((error) => {
          res.status(404).json({ message: "Some error occured", error: error });
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(401).json({ message: "Unauthorised", error: error });
    });
};

module.exports = {
  register,
  login,
  read,
  toggleMemberStatus,
  updateMemberProfile,
  assignCredit,
  passwordSettings,
};
