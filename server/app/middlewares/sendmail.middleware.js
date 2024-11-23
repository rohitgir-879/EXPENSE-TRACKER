const nodemailer = require("nodemailer");
const keys = require("../config/keys");

const sendEmail = async (email, subject, content) => {
  let mailOptions = {
    from: keys.SITE_EMAIL,
    to: email,
    subject: subject,
    text: content,
  };
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: keys.SITE_EMAIL,
      pass: keys.SITE_EMAIL_PASS,
    },
  });
  const info = await transporter.sendMail(mailOptions);
  return info;
};
module.exports = { sendEmail };
