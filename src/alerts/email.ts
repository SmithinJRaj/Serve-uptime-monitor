import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,       // SSL port
  secure: true,    // IMPORTANT
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
});

export async function sendEmailAlert(subject: string, body: string) {
  const mailOptions = {
    from: '"Uptime Monitor" <alerts@yourdomain.com>',
    to: process.env.ALERT_RECIPIENT_EMAIL,
    subject: subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('📧 Alert email sent.');
  } catch (err) {
    console.error('❌ Failed to send email:', err);
  }
}