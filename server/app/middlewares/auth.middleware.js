const jwt = require("jsonwebtoken");
const keys = require("../config/keys");

function authenticateToken(req, res, next) {
  const token = req.session.token;

  if (!token) {
    return res.status(401).send("Unauthorized");
  }

  jwt.verify(token, keys.TOKEN_SECRET, (err, user) => {
    if (err) {
      return res.status(403).send("Forbidden");
    }
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken,
};
