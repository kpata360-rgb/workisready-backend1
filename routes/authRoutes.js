import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { googleAuth } from "../controllers/googleAuthController.js";
import { googleAuthCallback } from "../controllers/googleAuthController.js";
// import { sendVerificationEmail } from "../controllers/authController.js";



const router = express.Router();

router.post("/google", googleAuth);
router.post('/google/callback', googleAuthCallback); // For OAuth code exchange

// ✅ Add GET route for OAuth redirect
router.get('/google/callback', async (req, res) => {
  try {
    // Extract the query parameters Google sends
    const { code, state } = req.query;

    // Forward to your existing controller logic
    // Simulate POST body
    req.body = {
      code,
      redirectUri: 'https://workisready-backend-production-5f8d.up.railway.app/api/auth/google/callback',
    };

    // Call existing controller
    await googleAuthCallback(req, res);
  } catch (err) {
    console.error('GET /google/callback error:', err);
    res.status(500).json({ success: false, message: 'OAuth GET callback failed' });
  }
});

// ✅ EMAIL VERIFICATION ENDPOINT

router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { redirect } = req.query; // Optional: redirect to frontend after verification

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      })
      
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    if (user.isApproved || process.env.AUTO_APPROVE_ON_EMAIL_VERIFY === "true") {
      user.isApproved = true;
      user.lastApprovedAt = new Date();
    }

    await user.save();
    const authToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );


    
    res.json({
      success: true,
      message: "Email verified successfully",
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
      }
    });

    
    // Redirect to frontend success page with token
    const redirectUrl = `${process.env.FRONTEND_URL}/verification-success?token=${authToken}&userId=${user._id}`;
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during email verification",
    });
  }

 
});



// ✅ RESEND VERIFICATION EMAIL
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true", 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationUrl = `${process.env.API_URL}/api/auth/verify-email/${verificationToken}`;

    await transporter.sendMail({
      from: `"WorkisReady" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your WorkisReady Account - New Link",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background-color: #0099CC; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1>WorkIsReady</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0099CC;">Email Verification</h2>
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>You requested a new verification link. Click the button below to verify your email:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                style="background-color: #0099CC; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;
                      display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <div style="word-break: break-all; color: #666; background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #ddd; margin: 15px 0;">
              ${verificationUrl}
            </div>
            
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't request this, please ignore this email.</p>
            
            <p>Best regards,<br>The WorkisReady Team</p>
          </div>
        </div>
      `,
    });

    res.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
});

// ✅ UPDATE LOGIN TO SUPPORT DUAL VERIFICATION
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔑 Login attempt for:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ✅ DUAL VERIFICATION CHECK
    // User can login if either email is verified OR admin has approved
    const isVerified = user.isVerified || user.isApproved;
    
    if (!isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email. Check your inbox for verification link.",
        needsVerification: true,
        isVerified: user.isVerified,
        isApproved: user.isApproved,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
  success: true,
  message: "Login successful",
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    userType: user.userType,
    isVerified: user.isVerified,
    isApproved: user.isApproved,
    // ✅ ADD THESE FOR FRONTEND COMPATIBILITY:
    emailVerified: user.isEmailVerified, // Add this
    adminVerified: user.isApproved, // Add this
    profileComplete: user.profileComplete || false, // Add this
  },
  token: token,
});
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login: " + error.message,
    });
  }
});

// ✅ UPDATE REGISTRATION TO SEND VERIFICATION EMAIL
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log("📝 Registration attempt for:", email);

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      // emailVerificationToken,
      // emailVerificationExpires,
      // isEmailVerified: false,
      // isApproved: false,
    });

    const verificationToken = user.generateVerificationToken();
    await user.save();
    console.log("✅ User created:", user._id);


    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ FIXED: Use API_URL instead of FRONTEND_URL
    const verificationUrl = `${process.env.API_URL}/api/auth/verify-email/${verificationToken}`;
    console.log("🔗 Verification URL:", verificationUrl);

    // // Send email asynchronously
    // setTimeout(async () => {
    //   try {
    //     const transporter = nodemailer.createTransport({
    //       service: "gmail",
    //       auth: {
    //         user: process.env.EMAIL_USER,
    //         pass: process.env.EMAIL_PASS,
    //       },
    //     });

        await transporter.sendMail({
          from: `"WorkisReady" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Verify Your WorkisReady Account",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; background-color: #0099CC; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1>WorkIsReady</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0099CC;">Welcome to WorkisReady!</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                style="background-color: #0099CC; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;
                      display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <div style="word-break: break-all; color: #666; background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #ddd; margin: 15px 0;">
              ${verificationUrl}
            </div>
            
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create an account with WorkisReady, please ignore this email.</p>
            
            <p>Best regards,<br>The WorkisReady Team</p>
          </div>
        </div>
          `,
        });
        
        console.log("✅ Verification email sent to:", email);

        //Generate JWT token
        const token = jwt.sign(
          { id: user._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        const userResponse = {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: false,
          isApproved: false,
        };

        res.status(201).json({
          success: true,
          message: "Registration successful! Please check your email to verify your account.",
          user: userResponse,
          token: token,
        });

        
      } catch (error) {
        console.error("❌ Registration error:", error);

        if (error.code === 11000) {
          return res.status(400).json({
            success: false,
            message: "User already exists with this email",
          });
        }

        res.status(500).json({
          success: false,
          message: "Server error during registration: " + error.message,
        });
      }
    });

   

//     res.status(201).json({
//       success: true,
//       message: "Registration successful! Please check your email to verify your account.",
//       user: userResponse,
//       token: token,
//       // Include direct link in response for debugging
//       verificationLink: verificationUrl,
//     });

//   } catch (error) {
//     console.error("❌ Registration error:", error);
    
//     if (error.code === 11000) {
//       return res.status(400).json({
//         success: false,
//         message: "User already exists with this email",
//       });
//     }
    
//     res.status(500).json({
//       success: false,
//       message: "Server error during registration: " + error.message,
//     });
//   }
// });

// Test route to check if user model works
router.post("/test-password", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Test the comparePassword method
    const isMatch = await user.comparePassword(password);
    
    res.json({
      userExists: true,
      passwordMatch: isMatch,
      hasComparePassword: typeof user.comparePassword === 'function'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 1000 * 60 * 10;

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;

    await user.save({ validateBeforeSave: false });

    const resetURL = `${process.env.BASE_URL}/reset-password/${resetToken}`;

    // ✅ Make sure transporter is defined
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: "WorkisReady <yourgmail@gmail.com>",
      to: email,
      subject: "Reset Your WorkisReady Password",
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetURL}" target="_blank">${resetURL}</a></p>
        <p>This link expires in 10 minutes.</p>
      `,
    });

    res.json({ success: true, message: "Password reset email sent!" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validations...
    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ success: false, message: "Invalid or expired token" });

    // Manually hash password
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    // 🚀 Prevent pre-save hook from hashing it again
    user.skipPasswordHashing = true;

    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: "Password has been reset successfully!" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



export default router;
