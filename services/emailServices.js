// services/emailService.js
import transporter from "../config/emailConfig.js";
import { verificationEmailTemplate, welcomeEmailTemplate } from "../utils/emailTemplates.js";

export const sendVerificationEmail = async (user, token) => {
  try {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"WorkIsReady" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Verify Your Email - WorkIsReady",
      html: verificationEmailTemplate(user.name, verificationLink),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
    return false;
  }
};

export const sendWelcomeEmail = async (user) => {
  try {
    const mailOptions = {
      from: `"WorkIsReady" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Welcome to WorkIsReady!",
      html: welcomeEmailTemplate(user.name),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    return false;
  }
};

export const sendPasswordResetEmail = async (user, token) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"WorkIsReady" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password - WorkIsReady",
      html: `
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to: ${user.email}`);
    return true;
  } catch (error) {
    console.error("❌ Error sending password reset email:", error);
    return false;
  }
};