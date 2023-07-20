const express = require('express');
const bcrypt = require('bcrypt');
// Creating express object
const app = express();
const cors = require('cors');
app.use(cors());
const multer = require('multer');
app.set("view engine", "ejs");

const jwt = require("jsonwebtoken");
const JWT_SECRED = "hvdvay6ert72839289()aiyg8t87qt72393293883uhefiuh78ttq3ifi78272jbkj?[]]pou89ywe";
var nodemailer = require("nodemailer");


//connect to mongodb
const mongoose = require('mongoose');
const mongourl = "mongodb+srv://login:Ulfath+123@cluster0.dhuj3ry.mongodb.net/?retryWrites=true&w=majority";


mongoose.connect(mongourl, { useNewUrlParser: true }).then(() => {
  console.log('connection successful');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err.message);
  process.exit(1);
});


const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: { type: String, default: null }, // Adding the resetToken field
});

  
  // Create User model
  const User = mongoose.model('User', userSchema);
  
  
  // Middleware to parse JSON
  app.use(express.json());
  
  // Api for signup
  app.post('/api/signup', async (req, res) => {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email : req.body.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Save the user to the database
      await new User({...req.body}).save();
  
      // Return a success response
      return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Server error' });
    }
  });

//Api for login
  app.post("/api/auth", async (req, res) => {
    try {
      const user = await User.findOne({ email: req.body.email });
      if (!user)
        return res.status(401).send({ message: "Invalid Email" });
  
     
        if (user.password !== req.body.password) {
          return res.status(401).send({ message: "Invalid Password" });
        }
    
  
      res.status(200).send({ message: "logged in successfully" });
    } catch (error) {
      res.status(500).send({ message: "Internal Server Error" });
    }
  });

  //Api for forgot password
  app.post('/forgot-password', (req, res, next) => {
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          return res.status(404).json({
            message: 'User not found'
          });
        }
        const token = jwt.sign(
          { email: user.email, userId: user._id },
          'reset-password-secret',
          { expiresIn: '1h' }
        );

        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
        user.save();
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com', // Your SMTP server host
          port: 587, // Your SMTP server port
          secure: false, // Set to true if using SMTPS (SMTP over SSL/TLS)
          auth: {
            user: 'fathimaulfath2021@gmail.com', // Replace with your Gmail email address
            pass: 'pvfeclfbnbsleayd' // Replace with your Gmail password
          }
        });
  
        const mailOptions = {
          from: 'fathimaulfath2021@gmail.com', // Replace with your Gmail email address
          to: user.email,
          subject: 'Reset Password',
          html: `<p>Click <a href="http://localhost:3000/reset-password/${token}">here</a> to reset your password.</p>`
        };
  
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.log(error);
            return res.status(500).json({
              message: 'Failed to send reset password email'
            });
          } else {
            console.log('Email sent: ' + info.response);
            return res.status(200).json({
             
              message: 'Reset password email sent successfully'
            });
          }
        });
      })
      .catch(error => {
        console.log(error);
        return res.status(500).json({
          message: 'Failed to process request'
        });
      });
  });
  

// API endpoint for updating password
app.post('/reset-password', (req, res) => {
  const {  password, token } = req.body;

  jwt.verify(token, 'reset-password-secret', (err, decoded) => {
    if (err) {
      return res.status(401).json({
        message: 'Invalid or expired token',
      });
    }

    User.findOne({ resetToken: token })
    .then(user => {
      if (!user) {
        return res.status(404).json({
          message: 'User not found',
        });
      }

        // Check if the token in the request matches the user's stored token
        if (user.resetToken !== token) {
          return res.status(401).json({
            message: 'Token mismatch',
          });
        }

        // Check if the token has expired
        const currentTimestamp = Date.now();
        if (user.resetTokenExpiry < currentTimestamp) {
          return res.status(401).json({
            message: 'Token has expired',
          });
        }

        // Proceed with password update
        bcrypt.hash(password, 10, (err, hashedPassword) => {
          if (err) {
            return res.status(500).json({
              message: 'Failed to hash password',
            });
          }

          // Update the user's password and reset token
          user.password = hashedPassword;
          user.resetToken = null;
          user.resetTokenExpiry = null;
          user.save()
            .then(() => {
              return res.status(200).json({
                message: 'Password reset successful',
              });
            })
            .catch(error => {
              console.log(error);
              return res.status(500).json({
                message: 'Failed to update password',
              });
            })
        });
      })
      .catch(error => {
        console.log(error);
        return res.status(500).json({
          message: 'Failed to process request',
        });
      });
  });
});



// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + file.originalname.slice(file.originalname.lastIndexOf('.')));
  }
});

// Multer file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Multer upload instance
const upload = multer({ storage, fileFilter });


  // MongoDB Atlas schema and model
const imageSchema = new mongoose.Schema({
  filename: String,
  path: String
});

const Image = mongoose.model('Image', imageSchema);


  //Api for File upload
  app.post('/submit', upload.single('image'), (req, res) => {
    if (req.file) {
      const newImage = new Image({
        filename: req.file.filename,
        path: req.file.path
      });
  
      newImage.save()
        .then(() => {
          res.json({ message: 'Image submitted successfully!' });
        })
        .catch((error) => {
          res.status(400).json({ error: 'Error saving the image!' });
        });
    } else {
      res.status(400).json({ error: 'No image submitted!' });
    }
  });
 
// Port Number
const PORT = process.env.PORT ||3001;
 
// Server Setup
app.listen(PORT,console.log(
  `Server started on port ${PORT}`));

  
  




