const Bull = require('bull');
const Queue = require('bull');
const User = require('./models/User');
const nodemailer = require('nodemailer');

const userQueue = new Queue('userQueue');

userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  // Fetch user from database
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Simulate sending welcome email
  console.log(`Welcome ${user.email}!`);

  // In a real application, you would use a service like Mailgun to send the email
  // Example using nodemailer for sending email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-password'
    }
  });

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: user.email,
    subject: 'Welcome to our application!',
    text: `Dear ${user.email},\n\nWelcome to our application! We are excited to have you with us.\n\nBest regards,\nThe Application Team`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

console.log('Worker started');