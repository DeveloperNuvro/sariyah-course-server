# Email Verification Setup Guide

## ✅ Implementation Complete

Email verification has been successfully implemented for student registration. Users must verify their email before they can log in.

## 🔧 Environment Variables Required

Add these to your `.env` file:

```env
# Email Configuration (SMTP - Hostinger)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@sariyahtech.com
SMTP_PASS=2008065439@Imran

# Frontend URL (for email verification links)
FRONTEND_URL=http://localhost:5173
# In production, use: FRONTEND_URL=https://www.sariyahtech.com
```

## 📋 What Was Implemented

### Backend Changes

1. **User Model** (`models/user.model.js`)
   - Added `emailVerified` (Boolean, default: false)
   - Added `emailVerificationToken` (String, hidden from queries)
   - Added `emailVerificationExpires` (Date, hidden from queries)

2. **Email Service** (`services/email.service.js`)
   - Professional HTML email templates
   - SMTP configuration for Hostinger
   - Token generation utilities
   - Password reset email template (for future use)

3. **User Controller** (`controllers/user.controller.js`)
   - Updated `registerUser`: Now sends verification email instead of auto-login
   - Updated `loginUser`: Checks if email is verified before allowing login
   - New `verifyEmail`: Verifies email token
   - New `resendVerificationEmail`: Resends verification email if token expired

4. **Routes** (`routes/auth.routes.js`)
   - Added `GET /api/users/verify-email?token=xxx`
   - Added `POST /api/users/resend-verification`

### Frontend Changes

1. **Verification Page** (`src/pages/auth/VerifyEmail.jsx`)
   - Beautiful verification page with status indicators
   - Handles expired tokens
   - Resend verification email functionality
   - Auto-redirect to login on success

2. **Registration Page** (`src/pages/auth/Register.jsx`)
   - Updated to show verification message after registration
   - No longer auto-logs in users
   - Clear instructions for next steps

3. **Auth Slice** (`src/features/auth/authSlice.js`)
   - Updated registration flow to not auto-authenticate
   - Proper error handling for verification failures

4. **App Routes** (`src/App.jsx`)
   - Added `/verify-email` route

## 🔒 Security Features

- ✅ Secure random token generation (32 bytes, hex)
- ✅ 24-hour token expiration
- ✅ Tokens stored securely (hidden from default queries)
- ✅ Email validation before registration
- ✅ Password validation (minimum 6 characters)
- ✅ Users cannot log in until email is verified
- ✅ Role restriction (only students can register via regular form)

## 📧 Email Template Features

- Professional HTML design
- Responsive layout
- Clear call-to-action button
- Plain text fallback
- Token expiration warning
- Branding (SariyahTech)

## 🧪 Testing Checklist

1. **Registration Flow**
   - [ ] Register a new user with valid email
   - [ ] Check email inbox for verification email
   - [ ] Click verification link
   - [ ] Verify redirect to login page
   - [ ] Try to login before verification (should fail)
   - [ ] Login after verification (should succeed)

2. **Error Handling**
   - [ ] Try to register with existing email (should fail)
   - [ ] Use expired verification link (should show error)
   - [ ] Resend verification email
   - [ ] Try invalid verification token

3. **Edge Cases**
   - [ ] Register with invalid email format
   - [ ] Register with password < 6 characters
   - [ ] Try to verify already verified email

## 🚀 Production Checklist

Before deploying to production:

1. Update environment variables:
   ```env
   FRONTEND_URL=https://www.sariyahtech.com
   SMTP_USER=info@sariyahtech.com
   SMTP_PASS=your-production-password
   ```

2. Test email delivery from production server

3. Verify email links work correctly (HTTPS)

4. Set up email monitoring/alerts for failed sends

5. Consider adding:
   - Email queue system (Bull/BullMQ) for high volume
   - Email delivery tracking
   - Rate limiting on resend verification endpoint

## 📝 API Endpoints

### POST /api/users/register
**Before**: Returns tokens and logs user in
**After**: Returns success message, sends verification email

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "email": "user@example.com"
}
```

### GET /api/users/verify-email?token=xxx
Verifies email token

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully! You can now log in to your account."
}
```

### POST /api/users/resend-verification
Resends verification email

**Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent successfully. Please check your inbox."
}
```

### POST /api/users/login
**Updated**: Now checks `emailVerified` field

**If not verified:**
```json
{
  "success": false,
  "error": "Please verify your email address before logging in. Check your inbox for the verification link."
}
```

## 🔄 Migration Notes

**Existing Users**: 
- Existing users in database will have `emailVerified: false`
- They will need to verify their email to log in
- Consider sending bulk verification emails or manually updating existing verified users

**To manually verify existing users:**
```javascript
// In MongoDB or via admin panel
db.users.updateMany(
  { emailVerified: { $exists: false } },
  { $set: { emailVerified: true } }
)
```

## 🐛 Troubleshooting

### Emails not sending
1. Check SMTP credentials in `.env`
2. Verify Hostinger email account is active
3. Check server logs for email errors
4. Ensure port 465 is not blocked by firewall

### Verification link not working
1. Check `FRONTEND_URL` environment variable
2. Verify token is not expired (24 hours)
3. Check token in database matches URL token

### Users can't log in after verification
1. Verify `emailVerified` field is set to `true` in database
2. Check login endpoint error messages
3. Verify user status is 'active'

## 📞 Support

For issues or questions about email verification, check:
- Server logs: `console.log` statements in email service
- Database: Check `emailVerificationToken` and `emailVerificationExpires` fields
- Email delivery: Check Hostinger email account for sent emails

