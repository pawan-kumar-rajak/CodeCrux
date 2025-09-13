import nodemailer from "nodemailer";

import { Resident } from "../models/resident.model.js";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  secure: true,
  port: 465,
  auth: {
    user: process.env.EMAIL, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your email password or app password
  },
});


const sendOTPs = async (to, subject, otp, validity) => {
  const currentYear = new Date().getFullYear();

  // Customizable company info
  const companyName = "Eco-Chain";
  const companyLogo = "https://lh3.googleusercontent.com/a/ACg8ocLP_B8IvQ4I3yVculKHuu-C0GCKK5rL_J6zvRKJrVfKXLCpzqw=s360-c-no"; // Replace with your actual logo URL
  const companyWebsite = "https://Eco-Chain.onrender.com/"; // Replace with your actual website
  const companyAddress = "H No. 1 Malka Park Near Big Water Tank, Bulandshahr (U.P.) India";

  // Ensure sender domain matches the from address domain
  await transporter.sendMail({
    from: `"${companyName} Support" <${process.env.EMAIL}>`, // Use your actual authenticated domain
    to,
    subject: ` ${companyName} verification code`, // Include OTP in subject to improve recognition
    priority: "high", // Mark the email as high priority
    headers: {
      "X-Priority": "1", // Additional priority marker for some email clients
      "X-MSMail-Priority": "High",
      "Importance": "High"
    },
    replyTo: "noreply@EcoChain.com", // Clarifies this is not for replies
    messageId: `<${Date.now()}.${Math.random().toString(36).substring(2, 15)}@EcoChain.com>`, // Unique message ID
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="color-scheme" content="light">
          <meta name="supported-color-schemes" content="light">
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

          <title>${companyName} Verification Code</title>
          <!--[if mso]>
          <noscript>
            <xml>
              <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
              </o:OfficeDocumentSettings>
            </xml>
          </noscript>
          <![endif]-->
          <style>
            /* Reset styles */
            body, p, h1, h2, h3, h4, h5, h6 {
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
              -webkit-font-smoothing: antialiased;
              font-size: 16px;
              line-height: 1.4;
              -ms-text-size-adjust: 100%;
              -webkit-text-size-adjust: 100%;
              background-color: #f8f9fa;
              color: #333333;
              margin: 0;
              padding: 0;
            }
            
            /* Main container */
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              overflow: hidden;
            }
            
            /* Header */
            .email-header {
              padding: 25px 30px;
              text-align: center;
              background-color: #ffffff;
              border-bottom: 1px solid #eaeaea;
            }
            
            .logo {
             /* max-height: 60px;*/
             /* max-width: 200px;*/

             display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--primary);
            font-size: 1.5rem;
            font-weight: 700;
            }

            .logo i {
                font-size: 2rem;
                color: var(--secondary);
            }
            
            /* Content */
            .email-content {
              padding: 30px;
              background-color: #ffffff;
            }
            
            .email-title {
              font-size: 22px;
              font-weight: 600;
              color: #333333;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .content-text {
              font-size: 16px;
              color: #555555;
              margin-bottom: 25px;
              text-align: center;
            }
            
            /* OTP Box */
            .otp-container {
              text-align: center;
              margin: 30px 0;
            }
            
            .otp-box {
              display: inline-block;
              padding: 15px 40px;
              background-color: #f2f6ff;
              border-radius: 8px;
              border: 1px solid #e1e8fd;
            }
            
            .otp-code {
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #1a73e8;
            }
            
            .validity {
              font-size: 15px;
              color: #555555;
              margin-top: 10px;
              font-weight: 600;
            }
            
            /* Security notice */
            .security-notice {
              background-color: #fef7e8;
              border-left: 4px solid #fbbc04;
              padding: 15px;
              margin: 25px 0;
              border-radius: 4px;
            }
            
            .security-text {
              font-size: 14px;
              color: #5f5b55;
              text-align: left;
            }
            
            /* Footer */
            .email-footer {
              padding: 20px 30px;
              background-color: #f8f9fa;
              text-align: center;
              border-top: 1px solid #eaeaea;
            }
            
            .social-links {
              margin: 15px 0;
            }
            
            .social-link {
              display: inline-block;
              margin: 0 8px;
              color: #1a73e8;
              text-decoration: none;
            }
            
            .footer-text {
              font-size: 13px;
              color: #888888;
              margin-bottom: 10px;
            }
            
            .company-address {
              font-size: 12px;
              color: #999999;
              margin-top: 5px;
            }
            
            /* Utilities */
            .mt-20 {
              margin-top: 20px;
            }
            
            .mb-20 {
              margin-bottom: 20px;  
            }
            
            @media only screen and (max-width: 480px) {
              .email-container {
                width: 100% !important;
                border-radius: 0;
              }
              
              .email-content {
                padding: 20px 15px;
              }
              
              .otp-code {
                font-size: 28px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="email-header">
              <!-- If you have a logo image, uncomment this -->
              <!-- <img src="${companyLogo}" alt="${companyName}" class="logo"> -->
               <a href="https://Eco-Chain.onrender.com/" class="logo">
                <i class="fas fa-leaf"></i>
                <span>EcoChain</span>
                <!-- <img src="/public/images/logo.png" alt="EcoChain Logo"> -->
            </a>
              <h2 style="color: #1a73e8;">${companyName}</h2>
            </div>
            
            <!-- Main Content -->
            <div class="email-content">
              <h1 class="email-title">Verification Code</h1>
              
              <p class="content-text">Please use the following code to complete your verification.</p>
              
              <div class="otp-container">
                <div class="otp-box">
                  <div class="otp-code">${otp}</div>
                </div>
                <p class="validity">Valid for: <strong>${validity}</strong></p>
              </div>
              
              <div class="security-notice">
                <p class="security-text">🔒 <strong>Security Notice:</strong> If you didn't request this code, you can safely ignore this email. For account security, never share this code with anyone, including ${companyName} staff.</p>
              </div>
              
              <p class="content-text mt-20">If you're having trouble, please contact our support team.</p>
            </div>
            
            <!-- Footer -->
            <div class="email-footer">
              <div class="social-links">
                <!-- Replace # with your actual social links -->
                <a href="https://Eco-Chain.com/enquiry" class="social-link">Help Center</a> | 
               <a href="mailto:pkpawanrajak@gmail.com" class="social-link">Contact Us</a> | 
                <a href="${companyWebsite}" class="social-link">Website</a>
              </div>
              
              <p class="footer-text">This is an automated message, please do not reply to this email.</p>
              <p class="footer-text">&copy; ${currentYear} ${companyName}. All rights reserved.</p>
              <p class="company-address">${companyAddress}</p>
            </div>
          </div>
        </body>
        </html>
      `,
    // Plain text version is important for spam prevention
    text: `${companyName} VERIFICATION CODE
  
  Your verification code is: ${otp}
  
  This code is valid for: ${validity}
  
  SECURITY NOTICE: If you didn't request this code, you can safely ignore this email. For security reasons, never share this code with anyone, including ${companyName} staff.
  
  If you're having trouble, please contact our support team.
  
  © ${currentYear} ${companyName}. All rights reserved.
  ${companyAddress}
  ${companyWebsite}
  
  This is an automated message, please do not reply to this email.`,
  });
}


const sendFollowUp = async (user) => {
  const currentYear = new Date().getFullYear();

  await transporter.sendMail({
    from: `"Eco-Chain" <${process.env.EMAIL}>`,
    to: user.email,
    subject: "Welcome to Our Platform!",
    html: `
        <html>
          <head>
            <style>
              body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
              }
              .email-container {
                width: 100%;
                padding: 20px;
                box-sizing: border-box;
                background-color: #ffffff;
                border: 10px solid #f4b400; /* Floral Border color */
                background-image: url('https://t4.ftcdn.net/jpg/09/67/05/63/360_F_967056341_X6fQBd2Jz3bcFi7Wk8Acv6uCu5uj5FiM.jpg');
                background-size: cover;
                border-radius: 10px;
              }
              .email-content {
                padding: 20px;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #1a73e8;
                font-size: 28px;
                text-align: center;
              }
              p {
                color: #333333;
                font-size: 16px;
                line-height: 1.6;
                text-align: center;
              }
              .cta-button {
                display: inline-block;
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                font-size: 16px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                text-align: center;
              }
              .cta-button:hover {
                background-color: #0c59c1;
              }
              footer {
                text-align: center;
                font-size: 12px;
                color: #888888;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="email-content">
                <h1>Welcome to Our Platform Eco-Chain!</h1>
                <p>Dear ${user.fullName},\n\nThank you for registering. We're excited to have you onboard!\n\nBest regards,\nThe Team Eco-Chain India</p>
            
                <footer>
                  <p>&copy; ${currentYear} Eco-Chain India. All Rights Reserved.</p>
                </footer>
              </div>
            </div>
          </body>
        </html>
      `,
    text: `Dear ${user.fullName},\n\nThank you for registering. We're excited to have you onboard!\n\nBest regards,\nThe Team Eco-Chain India`,
  })
}



export {
  sendOTPs,
  sendFollowUp,
}