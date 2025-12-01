"""
Email service for sending emails (password reset, order confirmation, etc.).
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


class EmailService:
    """Service for sending emails."""
    
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
            print(f"Email service not configured. Would send email to {to_email}")
            print(f"Subject: {subject}")
            print(f"Body: {html_body}")
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
                
            print(f"Email sent successfully to {to_email}")
        except Exception as e:
            print(f"Failed to send email: {str(e)}")
