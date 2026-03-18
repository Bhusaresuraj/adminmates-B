const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, 
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send email with login credentials
exports.sendCredentialsEmail = async (email, name, password, role) => {
    try {
        const transporter = createTransporter();

        const roleName = role === 'vendor' ? 'Vendor' : role === 'user' ? 'User' : 'Sub-Admin';

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Admin'}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: `Welcome! Your ${roleName} Account Credentials`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                        }
                        .header {
                            background-color: #4CAF50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .credentials {
                            background-color: white;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            border-left: 4px solid #4CAF50;
                        }
                        .credential-item {
                            margin: 10px 0;
                            padding: 10px;
                            background-color: #f5f5f5;
                            border-radius: 3px;
                        }
                        .label {
                            font-weight: bold;
                            color: #555;
                        }
                        .value {
                            color: #333;
                            font-size: 16px;
                            margin-top: 5px;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            color: #777;
                            font-size: 12px;
                        }
                        .warning {
                            background-color: #fff3cd;
                            border: 1px solid #ffc107;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome ${name}!</h1>
                        </div>
                        <div class="content">
                            <p>Your ${roleName} account has been successfully created and is ready to use.</p>
                            
                            <div class="credentials">
                                <h3>Your Login Credentials:</h3>
                                <div class="credential-item">
                                    <div class="label">Email:</div>
                                    <div class="value">${email}</div>
                                </div>
                                <div class="credential-item">
                                    <div class="label">Password:</div>
                                    <div class="value">${password}</div>
                                </div>
                            </div>

                            <div class="warning">
                                <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
                            </div>

                            <p>You can now log in to your account using the credentials provided above.</p>
                            
                            <p>If you have any questions or need assistance, please contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Admin'}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Welcome ${name}!

Your ${roleName} account has been successfully created and is ready to use.

Your Login Credentials:
Email: ${email}
Password: ${password}

⚠️ Important: Please change your password after your first login for security purposes.

You can now log in to your account using the credentials provided above.

If you have any questions or need assistance, please contact our support team.

This is an automated email. Please do not reply to this message.
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

// Send OTP email for password reset
exports.sendOTPEmail = async (email, name, otp) => {
    try {
        const transporter = createTransporter();

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'Admin'}" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            border: 1px solid #ddd;
                            border-radius: 5px;
                        }
                        .header {
                            background-color: #ff9800;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .otp-box {
                            background-color: white;
                            padding: 30px;
                            text-align: center;
                            border-radius: 5px;
                            margin: 20px 0;
                            border: 2px solid #ff9800;
                        }
                        .otp-code {
                            font-size: 36px;
                            font-weight: bold;
                            color: #ff9800;
                            letter-spacing: 8px;
                            margin: 20px 0;
                        }
                        .footer {
                            text-align: center;
                            padding: 20px;
                            color: #777;
                            font-size: 12px;
                        }
                        .warning {
                            background-color: #ffebee;
                            border: 1px solid #f44336;
                            padding: 15px;
                            border-radius: 5px;
                            margin: 20px 0;
                            color: #c62828;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Password Reset Request</h1>
                        </div>
                        <div class="content">
                            <p>Hello ${name},</p>
                            
                            <p>We received a request to reset your password. Use the OTP code below to reset your password:</p>
                            
                            <div class="otp-box">
                                <p style="margin: 0; color: #666;">Your OTP Code:</p>
                                <div class="otp-code">${otp}</div>
                                <p style="margin: 0; color: #666; font-size: 14px;">Valid for 10 minutes</p>
                            </div>

                            <div class="warning">
                                <strong>⚠️ Security Notice:</strong><br>
                                • If you didn't request this password reset, please ignore this email.<br>
                                • Never share this OTP with anyone.<br>
                                • This OTP will expire in 10 minutes.
                            </div>

                            <p>If you need assistance, please contact our support team.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                            <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME || 'Admin'}. All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Hello ${name},

We received a request to reset your password.

Your OTP Code: ${otp}
Valid for: 10 minutes

⚠️ Security Notice:
- If you didn't request this password reset, please ignore this email.
- Never share this OTP with anyone.
- This OTP will expire in 10 minutes.

If you need assistance, please contact our support team.

This is an automated email. Please do not reply to this message.
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw error;
    }
};