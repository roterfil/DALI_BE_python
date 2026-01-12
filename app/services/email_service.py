"""
Email service for sending emails (password reset, order confirmation, etc.).
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails."""
    
    @staticmethod
    def send_verification_email(to_email: str, token: str, first_name: str = ""):
        """Send email verification link to new user."""
        verify_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        
        greeting = f"Hi {first_name}," if first_name else "Hi,"
        
        subject = "Verify Your Email - DALI E-Commerce"
        body = f"""
        <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #D5A8B0;">DALI</h1>
                </div>
                <h2>Verify Your Email Address</h2>
                <p>{greeting}</p>
                <p>Thank you for creating an account with DALI E-Commerce!</p>
                <p>Please click the button below to verify your email address:</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{verify_link}" style="background: #D5A8B0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p><a href="{verify_link}">{verify_link}</a></p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">If you did not create an account, please ignore this email.</p>
            </body>
        </html>
        """
        
        EmailService._send_email(to_email, subject, body)
    
    @staticmethod
    def send_password_reset_email(to_email: str, token: str):
        """Send password reset email with token link."""
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        
        subject = "Password Reset Request - DALI E-Commerce"
        body = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>You requested to reset your password for your DALI E-Commerce account.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">{reset_link}</a></p>
                <p>If you did not request this, please ignore this email.</p>
                <p>This link will expire in 24 hours.</p>
            </body>
        </html>
        """
        
        EmailService._send_email(to_email, subject, body)
    
    @staticmethod
    def _send_email(to_email: str, subject: str, html_body: str):
        """Send an HTML email."""
        if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
            logger.warning(f"Email service not configured. Would send email to {to_email} with subject: {subject}")
            return
        
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg['To'] = to_email
            msg['Subject'] = subject
            
            # Attach HTML body
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
                
            logger.info(f"Email sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
