// utils/emailTemplates.js
export const verificationEmailTemplate = (name, verificationLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f7f9fc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          background-color: #0099cc;
          border-radius: 10px 10px 0 0;
          color: white;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: white;
          text-decoration: none;
        }
        .content {
          padding: 30px;
        }
        .title {
          color: #0099cc;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .button {
          display: inline-block;
          background-color: #0099cc;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 14px;
          border-top: 1px solid #eee;
        }
        .verification-link {
          background-color: #f0f8ff;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          word-break: break-all;
          font-family: monospace;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">WorkIsReady</div>
        </div>
        <div class="content">
          <h1 class="title">Verify Your Email Address</h1>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for signing up with WorkIsReady! To complete your registration and start using our platform, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">Verify Email Address</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="verification-link">${verificationLink}</div>
          
          <p>This verification link will expire in <strong>24 hours</strong>.</p>
          
          <p>If you didn't create an account with WorkIsReady, please ignore this email.</p>
          
          <p>Best regards,<br>The WorkIsReady Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} WorkIsReady. All rights reserved.</p>
          <p>If you need help, contact us at support@workisready.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const welcomeEmailTemplate = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Similar styling as above */
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">WorkIsReady</div>
        </div>
        <div class="content">
          <h1 class="title">Welcome to WorkIsReady!</h1>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Congratulations! Your email has been successfully verified and your account is now active.</p>
          
          <div style="background-color: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #0099cc; margin-top: 0;">🎉 Get Started:</h3>
            <ul style="padding-left: 20px;">
              <li>Complete your profile</li>
              <li>Browse available services</li>
              <li>Post your first job request</li>
              <li>Connect with service providers</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          </div>
          
          <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL}/help">help center</a> or contact our support team.</p>
          
          <p>Best regards,<br>The WorkIsReady Team</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} WorkIsReady. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};