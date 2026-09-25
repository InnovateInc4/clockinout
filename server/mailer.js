const nodemailer = require('nodemailer');

// Set up the transporter using your email credentials
// You'll add these credentials to your .env file in the next step
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can use other services like Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOtpEmail = async (recipientEmail, otpCode) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: 'Your HR Admin OTP Code',
    text: `Your one-time password is: ${otpCode}. It expires in 10 minutes.`,
    html: `<p>Your one-time password is: <b>${otpCode}</b></p><p>It expires in 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${recipientEmail}`);
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
  }
};

module.exports = sendOtpEmail;