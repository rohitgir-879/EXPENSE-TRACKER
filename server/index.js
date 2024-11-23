const express = require("express");
const app = express();
const path = require("path");
const keys = require("./app/config/keys");
const adminRoute = require("./app/routes/admin.route");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const transactionRoute = require("./app/routes/transaction.route");
const memberRoute = require("./app/routes/member.route");
require("dotenv").config()
app.use(express.static(path.join(__dirname, "app")));

const options = {
  origin: keys.CORS_ORIGIN,
};

app.use(cors({ options }));
app.use(
  session({
    secret: keys.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/admin", adminRoute);
app.use("/api/member", memberRoute);
app.use("/api/transaction", transactionRoute);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) =>
    res.sendFile(
      path.resolve(__dirname, '../', 'client', 'build', 'index.html')
    )
  );
} else {
  app.get('/', (req, res) => res.send('Please set to production'));
}


app.get("/", (req, res) => {
  res.status(200).json("This is the server of kaival-enterprise");
});

app.listen(process.env.PORT, () => {
  console.log("server is running at ", process.env.PORT);
});
