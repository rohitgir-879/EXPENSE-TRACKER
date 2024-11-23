const { sendEmail } = require("../middlewares/sendmail.middleware");
const Transaction = require("../models/Transaction.model");
const User = require("../models/User.model");
const { v4: uuidv4 } = require("uuid");

const read = async (req, res) => {
  const { _id } = req.params;
  if (_id === "all-transactions") {
    const initby = req.headers.initby;
    await User.findOne({ where: { _id: initby, isActive: true } })
      .then((user) => {
        if (user.role === "admin") {
          Transaction.sync()
            .then(() => {
              Transaction.findAndCountAll()
                .then((result) => {
                  Transaction.sum("amount", { where: { initBy: initby } })
                    .then((sum) => {
                      res.status(200).json({ assignedTotal: sum, ...result });
                    })
                    .catch((error) => {
                      console.log(error);
                      res
                        .status(500)
                        .json({ message: "Some error occured", error: error });
                    });
                })
                .catch((error) => {
                  console.log(error);
                  res
                    .status(404)
                    .json({ message: "transactions not found", error });
                });
            })
            .catch((error) => {
              console.log(error);
              res
                .status(500)
                .json({ message: "Some error occured", error: error });
            });
        } else if (user.role === "manager") {
          Transaction.sync()
            .then(() => {
              Transaction.findAndCountAll({ where: { initBy: initby } })
                .then((result) => {
                  Transaction.sum("amount", { where: { initBy: initby } })
                    .then((totalExpense) => {
                      Transaction.sum("amount", {
                        where: { creditTo: initby },
                      })
                        .then((recievedTotal) => {
                          Transaction.findAndCountAll({
                            where: { creditTo: initby },
                          })
                            .then((adminsCreditTransactions) => {
                              res.status(200).json({
                                totalExpense: totalExpense,
                                recievedTotal: recievedTotal,
                                count:
                                  Number(result.count) +
                                  Number(adminsCreditTransactions.count),
                                rows: [
                                  ...result.rows,
                                  ...adminsCreditTransactions.rows,
                                ],
                              });
                            })
                            .catch((error) => {
                              console.log(error),
                                res.status(500).json({
                                  message: "Some error occured",
                                  error: error,
                                });
                            });
                        })
                        .catch((error) => {
                          console.log(error),
                            res.status(500).json({
                              message: "Some error occured",
                              error: error,
                            });
                        });
                    })
                    .catch((error) => {
                      console.log(error);
                      res
                        .status(500)
                        .json({ message: "Some error occured", error: error });
                    });
                })
                .catch((error) => {
                  console.log(error);
                  res
                    .status(404)
                    .json({ message: "transactions not found", error });
                });
            })
            .catch((error) => {
              console.log(error);
              res
                .status(200)
                .json({ message: "Some error occured", error: error });
            });
        }
      })
      .catch((error) => {
        res.status(401).json({ message: "Unauthorised attempt", error });
      });
  } else {
    res.status(401).json({ message: "Some error occured" });
  }
};

const init = async (req, res) => {
  const initBy = req.headers.initby;
  await Transaction.sync()
    .then(() => {
      User.findOne({ where: { _id: initBy, role: "manager", isActive: true } })
        .then((user) => {
          let prevCredit = Number(user.credit);
          user
            .update({
              credit: Number(user.credit) - Number(req.body.amount),
            })
            .then((updatedManager) => {
              const expecV = prevCredit - Number(req.body.amount);
              if (updatedManager.credit === expecV) {
                Transaction.create({
                  _id: uuidv4(),
                  initBy: initBy,
                  amount: req.body.amount,
                  detail: req.body.detail,
                  trType: "Db.",
                })
                  .then((newTransaction) => {
                    Transaction.sum("amount", { where: { initBy: initBy } })
                      .then((totalExpense) => {
                        User.findOne({
                          where: {
                            _id: updatedManager.adminRef,
                            role: "admin",
                          },
                        })
                          .then((managersAdmin) => {
                            // console.log("managersAdmin", managersAdmin);
                            sendEmail(
                              managersAdmin.email,
                              "Kaival Enterprise",
                              `Expense added , \nAmount : ₹ ${newTransaction.amount} \nExpense Detail : ${newTransaction.detail} \nSpent by : ${updatedManager.firstName} ${updatedManager.lastName}`
                            )
                              .then(() => {
                                res.status(200).json({
                                  newTransaction: newTransaction,
                                  totalExpense: totalExpense,
                                  updatedManager: updatedManager,
                                  message: "Expense added successfully",
                                });
                              })
                              .catch(() => {
                                res.status(200).json({
                                  newTransaction: newTransaction,
                                  totalExpense: totalExpense,
                                  updatedManager: updatedManager,
                                  message: "Expense added successfully",
                                });
                              });
                          })
                          .catch(() => {
                            res.status(200).json({
                              newTransaction: newTransaction,
                              totalExpense: totalExpense,
                              updatedManager: updatedManager,
                              message: "Expense added successfully",
                            });
                          });
                      })
                      .catch((error) => {
                        console.log(error);
                        res.status(500).json({
                          message: "Some error occured 1",
                          error: error,
                        });
                      });
                  })
                  .catch((error) => {
                    updatedManager
                      .update({ credit: prevCredit })
                      .then(() => {
                        res.status(500).json({
                          message: "Some error occured 2",
                          error: error,
                        });
                      })
                      .catch((error) => {
                        res.status(500).json({
                          message: "Some error occured 3",
                          error: error,
                        });
                      });
                  });
              } else {
                updatedManager
                  .update({ credit: prevCredit })
                  .then(() => {
                    res.status(500).json({ message: "Some error occured 4" });
                  })
                  .catch((error) => {
                    res
                      .status(500)
                      .json({ message: "Some error occured 5", error: error });
                  });
              }
            })
            .catch((error) => {
              console.log({
                message: Object.keys(error),
                fields: error["errors"],
              });

              res.status(401).json({
                message:
                  error["errors"][0].validatorName === "min"
                    ? "Credit limit exceeded"
                    : error["errors"][0].message,
              });
            });
        })
        .catch((error) => {
          res.status.json({ message: "Unauthorised", error: error });
        });
    })
    .catch((error) => console.log(error));
};

module.exports = {
  read,
  init,
};
