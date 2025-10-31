import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'cihcihdhcdich',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || 'eofheofhe',
      pass: process.env.SMTP_PASS || '1234566',
    },
    tls: {
      rejectUnauthorized: false // Only use in development if needed
    }
  });
};

/**
 * Generate a secure random token for email verification
 * @returns {string} Random token
 */
export const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send verification email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.token - Verification token
 * @returns {Promise<Object>} Email send result
 */
export const sendVerificationEmail = async ({ email, name, token }) => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SariyahTech" <${process.env.SMTP_USER || 'info@sariyahtech.com'}>`,
    to: email,
    subject: 'Verify Your Email - SariyahTech',
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - SariyahTech</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header-banner {
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .title {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
          }
          .container {
            padding: 40px;
            background-color: #ffffff;
          }
          .content {
            color: #4b5563;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .intro-text {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 18px 48px;
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: none;
            position: relative;
            overflow: hidden;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(6, 182, 212, 0.6);
          }
          .button:active {
            transform: translateY(0);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
          }
          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .feature-icon {
            font-size: 24px;
            min-width: 30px;
            text-align: center;
          }
          .feature-text {
            font-size: 14px;
            color: #4b5563;
            font-weight: 500;
          }
          .alternative-link {
            margin-top: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-radius: 12px;
            font-size: 13px;
            color: #64748b;
            word-break: break-all;
            border: 2px dashed #cbd5e1;
            text-align: center;
          }
          .warning {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 5px solid #f59e0b;
            padding: 20px;
            margin: 30px 0;
            border-radius: 12px;
            color: #92400e;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
          }
          .warning strong {
            display: block;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            text-align: center;
            color: #9ca3af;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.8;
            color: #d1d5db;
          }
          .footer-signature {
            margin-top: 15px;
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
          }
          .divider {
            height: 3px;
            background: linear-gradient(90deg, transparent, #06b6d4, #ec4899, transparent);
            margin: 30px 0;
            border-radius: 2px;
          }
          @media only screen and (max-width: 600px) {
            .features-grid {
              grid-template-columns: 1fr;
            }
            .button {
              padding: 16px 36px;
              font-size: 14px;
            }
            .logo {
              font-size: 28px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-banner">
            <div class="logo">✨ SariyahTech</div>
            <h1 class="title">Verify Your Email</h1>
          </div>
          
          <div class="container">
            <div class="content">
              <p class="greeting">Hello ${name}! 👋</p>
              
              <p class="intro-text">
                Thank you for joining <strong>SariyahTech</strong>! We're excited to have you on board. 
                To complete your registration and unlock all features, please verify your email address 
                by clicking the button below.
              </p>
              
              <div class="button-container">
                <a href="${verificationUrl}" class="button" style="color: #ffffff !important;">Verify Email Address</a>
              </div>
              
              <div class="divider"></div>
              
              <div class="features-grid">
                <div class="feature-item">
                  <div class="feature-icon">📚</div>
                  <div class="feature-text">Access Premium Courses</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">📊</div>
                  <div class="feature-text">Track Your Progress</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">🏆</div>
                  <div class="feature-text">Earn Certificates</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">👥</div>
                  <div class="feature-text">Join Our Community</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Reminder</strong>
                This verification link will expire in <strong>24 hours</strong>. If you didn't create an account with SariyahTech, please ignore this email.
              </div>
              
              <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">
                <strong>Having trouble?</strong> If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <div class="alternative-link">
                ${verificationUrl}
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Best regards,<br>
                <span class="footer-signature">The SariyahTech Team</span>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Verify Your Email - SariyahTech
      
      Hello ${name},
      
      Thank you for signing up with SariyahTech! To complete your registration, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create an account with SariyahTech, please ignore this email.
      
      Best regards,
      The SariyahTech Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset email (for future use)
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.token - Reset token
 * @returns {Promise<Object>} Email send result
 */
export const sendPasswordResetEmail = async ({ email, name, token }) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SariyahTech" <${process.env.SMTP_USER || 'info@sariyahtech.com'}>`,
    to: email,
    subject: 'Reset Your Password - SariyahTech',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - SariyahTech</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header-banner {
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .title {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
          }
          .container {
            padding: 40px;
            background-color: #ffffff;
          }
          .content {
            color: #4b5563;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .intro-text {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 18px 48px;
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: none;
            position: relative;
            overflow: hidden;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .warning {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 5px solid #f59e0b;
            padding: 20px;
            margin: 30px 0;
            border-radius: 12px;
            color: #92400e;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
          }
          .warning strong {
            display: block;
            margin-bottom: 8px;
            font-size: 16px;
          }
          .footer {
            margin-top: 40px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            text-align: center;
            color: #9ca3af;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.8;
            color: #d1d5db;
          }
          .footer-signature {
            margin-top: 15px;
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
          }
          @media only screen and (max-width: 600px) {
            .button {
              padding: 16px 36px;
              font-size: 14px;
            }
            .logo {
              font-size: 28px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-banner">
            <div class="logo">✨ SariyahTech</div>
            <h1 class="title">Reset Your Password 🔒</h1>
          </div>
          
          <div class="container">
            <div class="content">
              <p class="greeting">Hello ${name}! 👋</p>
              
              <p class="intro-text">
                You requested to reset your password for your <strong>SariyahTech</strong> account. 
                Click the button below to reset your password.
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="button" style="color: #ffffff !important;">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice</strong>
                This password reset link will expire in <strong>1 hour</strong>. If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p style="margin-top: 25px; color: #6b7280; font-size: 14px;">
                <strong>Having trouble?</strong> If the button doesn't work, copy and paste this link into your browser:
              </p>
              
              <div style="margin-top: 10px; padding: 15px; background: #f1f5f9; border-radius: 8px; font-size: 12px; color: #64748b; word-break: break-all;">
                ${resetUrl}
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Best regards,<br>
                <span class="footer-signature">The SariyahTech Team</span>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                This is an automated email. Please do not reply to this message.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

/**
 * Send course purchase confirmation email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.courseTitle - Course title
 * @param {string} options.courseSlug - Course slug for URL
 * @param {number} options.amount - Purchase amount
 * @param {string} options.orderId - Order ID
 * @returns {Promise<Object>} Email send result
 */
export const sendCoursePurchaseConfirmation = async ({ email, name, courseTitle, courseSlug, amount, orderId, groupLink }) => {
  const courseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/course/${courseSlug}`;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/my-courses`;
  const formattedAmount = amount === 0 ? 'FREE' : `৳${amount.toLocaleString()}`;
  const hasGroupLink = groupLink && groupLink.trim() !== '';
  
  const transporter = createTransporter();

  const mailOptions = {
    from: `"SariyahTech" <${process.env.SMTP_USER || 'info@sariyahtech.com'}>`,
    to: email,
    subject: '🎉 Course Purchase Confirmed - SariyahTech',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Course Purchase Confirmed - SariyahTech</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header-banner {
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .title {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
          }
          .container {
            padding: 40px;
            background-color: #ffffff;
          }
          .content {
            color: #4b5563;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 700;
            text-align: center;
          }
          .congrats-emoji {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
          }
          .intro-text {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.8;
            text-align: center;
          }
          .course-details {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 2px solid #e9ecef;
          }
          .course-title {
            font-size: 22px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 15px;
            text-align: center;
          }
          .order-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-top: 1px solid #dee2e6;
            border-bottom: 1px solid #dee2e6;
            margin: 15px 0;
          }
          .order-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }
          .order-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 700;
          }
          .amount-highlight {
            font-size: 28px;
            color: #059669;
            font-weight: 800;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 18px 48px;
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: none;
            position: relative;
            overflow: hidden;
            margin: 10px;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(6, 182, 212, 0.6);
          }
          .button-secondary {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            box-shadow: 0 10px 30px rgba(79, 70, 229, 0.4);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
          }
          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .feature-icon {
            font-size: 24px;
            min-width: 30px;
            text-align: center;
          }
          .feature-text {
            font-size: 14px;
            color: #4b5563;
            font-weight: 500;
          }
          .footer {
            margin-top: 40px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            text-align: center;
            color: #9ca3af;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.8;
            color: #d1d5db;
          }
          .footer-signature {
            margin-top: 15px;
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
          }
          .divider {
            height: 3px;
            background: linear-gradient(90deg, transparent, #06b6d4, #ec4899, transparent);
            margin: 30px 0;
            border-radius: 2px;
          }
          @media only screen and (max-width: 600px) {
            .features-grid {
              grid-template-columns: 1fr;
            }
            .button {
              padding: 16px 36px;
              font-size: 14px;
              display: block;
              margin: 10px 0;
            }
            .logo {
              font-size: 28px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-banner">
            <div class="logo">✨ SariyahTech</div>
            <h1 class="title">Purchase Confirmed! 🎉</h1>
          </div>
          
          <div class="container">
            <div class="content">
              <p class="greeting">Congratulations, ${name}! 🎊</p>
              
              <div class="congrats-emoji">🎓✨</div>
              
              <p class="intro-text">
                Your course purchase has been confirmed! We're thrilled to have you join us on this learning journey.
              </p>
              
              <div class="course-details">
                <div class="course-title">📚 ${courseTitle}</div>
                
                <div class="order-info">
                  <span class="order-label">Order ID:</span>
                  <span class="order-value">#${orderId}</span>
                </div>
                
                <div class="order-info">
                  <span class="order-label">Amount Paid:</span>
                  <span class="order-value amount-highlight">${formattedAmount}</span>
                </div>
              </div>
              
              ${hasGroupLink ? `
              <div class="course-details" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; margin-top: 30px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="font-size: 32px; margin-bottom: 10px;">👥</div>
                  <div style="font-size: 18px; font-weight: 700; color: #059669; margin-bottom: 10px;">Join Our Community Group</div>
                  <p style="font-size: 14px; color: #047857; margin-bottom: 20px;">
                    Connect with fellow students, get support, and stay updated with course announcements!
                  </p>
                  <a href="${groupLink}" class="button" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff !important; margin: 0;">Join Group Now</a>
                </div>
              </div>
              ` : ''}
              
              <div class="button-container">
                <a href="${courseUrl}" class="button" style="color: #ffffff !important;">Start Learning Now</a>
                <a href="${dashboardUrl}" class="button button-secondary" style="color: #ffffff !important;">View My Dashboard</a>
              </div>
              
              <div class="divider"></div>
              
              <div class="features-grid">
                <div class="feature-item">
                  <div class="feature-icon">📖</div>
                  <div class="feature-text">Access All Lessons</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">📊</div>
                  <div class="feature-text">Track Your Progress</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">🏆</div>
                  <div class="feature-text">Earn Certificates</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">💬</div>
                  <div class="feature-text">Join Discussions</div>
                </div>
              </div>
              
              <p style="margin-top: 25px; color: #4b5563; font-size: 15px; text-align: center; line-height: 1.8;">
                <strong>What's Next?</strong><br>
                You can now access all course materials, watch video lessons, complete assignments, and interact with your instructors and fellow students. Start your learning journey today!
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Happy Learning!<br>
                <span class="footer-signature">The SariyahTech Team</span>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                If you have any questions, feel free to contact us at <a href="mailto:info@sariyahtech.com" style="color: #06b6d4;">info@sariyahtech.com</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Course Purchase Confirmed - SariyahTech
      
      Congratulations, ${name}!
      
      Your course purchase has been confirmed!
      
      Course: ${courseTitle}
      Order ID: #${orderId}
      Amount: ${formattedAmount}
      ${hasGroupLink ? `\n\nJoin Our Community Group:\n${groupLink}\n\nConnect with fellow students, get support, and stay updated with course announcements!` : ''}
      
      Start learning now: ${courseUrl}
      View dashboard: ${dashboardUrl}
      
      Happy Learning!
      The SariyahTech Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Course purchase confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending course purchase confirmation email:', error);
    throw new Error('Failed to send course purchase confirmation email');
  }
};

/**
 * Send product purchase confirmation email
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.name - Recipient name
 * @param {Array} options.items - Array of purchased items {title, price}
 * @param {number} options.totalAmount - Total purchase amount
 * @param {string} options.orderId - Order ID
 * @returns {Promise<Object>} Email send result
 */
export const sendProductPurchaseConfirmation = async ({ email, name, items, totalAmount, orderId }) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/my-courses`;
  const formattedAmount = totalAmount === 0 ? 'FREE' : `৳${totalAmount.toLocaleString()}`;
  
  const transporter = createTransporter();

  // Build items list HTML
  const itemsList = items.map(item => `
    <div style="padding: 12px; background: #ffffff; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #06b6d4;">
      <div style="font-weight: 600; color: #1f2937; margin-bottom: 5px;">${item.title}</div>
      <div style="font-size: 14px; color: #059669; font-weight: 600;">৳${item.price.toLocaleString()}</div>
    </div>
  `).join('');

  const mailOptions = {
    from: `"SariyahTech" <${process.env.SMTP_USER || 'info@sariyahtech.com'}>`,
    to: email,
    subject: '🎉 Product Purchase Confirmed - SariyahTech',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Product Purchase Confirmed - SariyahTech</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header-banner {
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .title {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
          }
          .container {
            padding: 40px;
            background-color: #ffffff;
          }
          .content {
            color: #4b5563;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 700;
            text-align: center;
          }
          .congrats-emoji {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
          }
          .intro-text {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.8;
            text-align: center;
          }
          .order-details {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 2px solid #e9ecef;
          }
          .items-list {
            margin: 20px 0;
          }
          .order-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            background: #ffffff;
            border-radius: 10px;
            margin-top: 20px;
            border: 2px solid #e9ecef;
          }
          .summary-label {
            font-size: 18px;
            color: #1f2937;
            font-weight: 700;
          }
          .summary-value {
            font-size: 28px;
            color: #059669;
            font-weight: 800;
          }
          .order-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-top: 1px solid #dee2e6;
            margin-top: 15px;
          }
          .order-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }
          .order-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 700;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .button {
            display: inline-block;
            padding: 18px 48px;
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(6, 182, 212, 0.4);
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            border: none;
            position: relative;
            overflow: hidden;
            margin: 10px;
          }
          .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }
          .button:hover::before {
            left: 100%;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(6, 182, 212, 0.6);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
          }
          .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: #ffffff;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .feature-icon {
            font-size: 24px;
            min-width: 30px;
            text-align: center;
          }
          .feature-text {
            font-size: 14px;
            color: #4b5563;
            font-weight: 500;
          }
          .footer {
            margin-top: 40px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            text-align: center;
            color: #9ca3af;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.8;
            color: #d1d5db;
          }
          .footer-signature {
            margin-top: 15px;
            color: #ffffff;
            font-weight: 600;
            font-size: 16px;
          }
          .divider {
            height: 3px;
            background: linear-gradient(90deg, transparent, #06b6d4, #ec4899, transparent);
            margin: 30px 0;
            border-radius: 2px;
          }
          @media only screen and (max-width: 600px) {
            .features-grid {
              grid-template-columns: 1fr;
            }
            .button {
              padding: 16px 36px;
              font-size: 14px;
              display: block;
              margin: 10px 0;
            }
            .logo {
              font-size: 28px;
            }
            .title {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-banner">
            <div class="logo">✨ SariyahTech</div>
            <h1 class="title">Purchase Confirmed! 🎉</h1>
          </div>
          
          <div class="container">
            <div class="content">
              <p class="greeting">Congratulations, ${name}! 🎊</p>
              
              <div class="congrats-emoji">📦✨</div>
              
              <p class="intro-text">
                Your product purchase has been confirmed! Your digital products are now available for download.
              </p>
              
              <div class="order-details">
                <div style="font-size: 20px; font-weight: 700; color: #1f2937; margin-bottom: 20px; text-align: center;">
                  📦 Purchased Items
                </div>
                
                <div class="items-list">
                  ${itemsList}
                </div>
                
                <div class="order-summary">
                  <span class="summary-label">Total:</span>
                  <span class="summary-value">${formattedAmount}</span>
                </div>
                
                <div class="order-info">
                  <span class="order-label">Order ID:</span>
                  <span class="order-value">#${orderId}</span>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${dashboardUrl}" class="button" style="color: #ffffff !important;">Download My Products</a>
              </div>
              
              <div class="divider"></div>
              
              <div class="features-grid">
                <div class="feature-item">
                  <div class="feature-icon">📥</div>
                  <div class="feature-text">Instant Download</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">🔒</div>
                  <div class="feature-text">Secure Access</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">📱</div>
                  <div class="feature-text">Multiple Formats</div>
                </div>
                <div class="feature-item">
                  <div class="feature-icon">⚡</div>
                  <div class="feature-text">Lifetime Access</div>
                </div>
              </div>
              
              <p style="margin-top: 25px; color: #4b5563; font-size: 15px; text-align: center; line-height: 1.8;">
                <strong>What's Next?</strong><br>
                You can now download your purchased products from your dashboard. Download links are valid for 7 days with up to 5 download attempts per product. Enjoy your purchases!
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                Thank You for Your Purchase!<br>
                <span class="footer-signature">The SariyahTech Team</span>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #6b7280;">
                If you have any questions, feel free to contact us at <a href="mailto:info@sariyahtech.com" style="color: #06b6d4;">info@sariyahtech.com</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Product Purchase Confirmed - SariyahTech
      
      Congratulations, ${name}!
      
      Your product purchase has been confirmed!
      
      Purchased Items:
      ${items.map(item => `- ${item.title} (৳${item.price})`).join('\n')}
      
      Total: ${formattedAmount}
      Order ID: #${orderId}
      
      Download your products: ${dashboardUrl}
      
      Thank You for Your Purchase!
      The SariyahTech Team
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Product purchase confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending product purchase confirmation email:', error);
    throw new Error('Failed to send product purchase confirmation email');
  }
};

/**
 * Send project inquiry email to business
 * @param {Object} options - Email options
 * @param {string} options.clientName - Client name
 * @param {string} options.clientEmail - Client email
 * @param {string} options.clientPhone - Client phone
 * @param {string} options.projectIdea - Project idea/description
 * @returns {Promise<Object>} Email send result
 */
export const sendProjectInquiryEmail = async ({ clientName, clientEmail, clientPhone, projectIdea }) => {
  const transporter = createTransporter();
  const businessEmail = process.env.SMTP_USER || 'info@sariyahtech.com';

  const mailOptions = {
    from: `"SariyahTech Contact Form" <${businessEmail}>`,
    to: businessEmail,
    replyTo: clientEmail,
    subject: `New Project Inquiry from ${clientName}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Project Inquiry - SariyahTech</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .header-banner {
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .header-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          .logo {
            font-size: 36px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            letter-spacing: -1px;
          }
          .title {
            font-size: 28px;
            color: #ffffff;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
            text-shadow: 1px 1px 3px rgba(0,0,0,0.2);
          }
          .container {
            padding: 40px;
            background-color: #ffffff;
          }
          .content {
            color: #4b5563;
            margin-bottom: 30px;
          }
          .greeting {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 20px;
            font-weight: 700;
            text-align: center;
          }
          .info-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 2px solid #e9ecef;
          }
          .info-row {
            display: flex;
            align-items: flex-start;
            gap: 15px;
            padding: 15px 0;
            border-bottom: 1px solid #dee2e6;
          }
          .info-row:last-child {
            border-bottom: none;
          }
          .info-label {
            font-size: 14px;
            color: #6b7280;
            font-weight: 600;
            min-width: 100px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 16px;
            color: #1f2937;
            font-weight: 500;
            flex: 1;
            word-break: break-word;
          }
          .project-idea-box {
            background: #ffffff;
            border-radius: 10px;
            padding: 20px;
            margin-top: 15px;
            border-left: 4px solid #06b6d4;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          }
          .project-idea-text {
            font-size: 15px;
            color: #4b5563;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 40px;
            padding: 30px 40px;
            background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
            text-align: center;
            color: #9ca3af;
          }
          .footer-text {
            font-size: 14px;
            line-height: 1.8;
            color: #d1d5db;
          }
          .action-button {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #06b6d4 0%, #ec4899 100%);
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 14px;
          }
          @media only screen and (max-width: 600px) {
            .logo {
              font-size: 28px;
            }
            .title {
              font-size: 24px;
            }
            .info-row {
              flex-direction: column;
              gap: 5px;
            }
            .info-label {
              min-width: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header-banner">
            <div class="logo">✨ SariyahTech</div>
            <h1 class="title">New Project Inquiry 🚀</h1>
          </div>
          
          <div class="container">
            <div class="content">
              <p class="greeting">You have received a new project inquiry!</p>
              
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Client Name:</span>
                  <span class="info-value">${clientName}</span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">
                    <a href="mailto:${clientEmail}" style="color: #06b6d4; text-decoration: none;">${clientEmail}</a>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Phone:</span>
                  <span class="info-value">
                    <a href="tel:${clientPhone}" style="color: #06b6d4; text-decoration: none;">${clientPhone}</a>
                  </span>
                </div>
                
                <div class="info-row">
                  <span class="info-label">Project Idea:</span>
                  <div class="project-idea-box">
                    <p class="project-idea-text">${projectIdea}</p>
                  </div>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="mailto:${clientEmail}" class="action-button" style="color: #ffffff !important;">Reply to Client</a>
              </div>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This inquiry was submitted through the SariyahTech contact form.<br>
                <strong>Reply to:</strong> ${clientEmail}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      New Project Inquiry - SariyahTech
      
      You have received a new project inquiry!
      
      Client Name: ${clientName}
      Email: ${clientEmail}
      Phone: ${clientPhone}
      
      Project Idea:
      ${projectIdea}
      
      ---
      Reply to: ${clientEmail}
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Project inquiry email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending project inquiry email:', error);
    throw new Error('Failed to send project inquiry email');
  }
};

