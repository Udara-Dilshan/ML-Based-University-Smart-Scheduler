import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import threading

def send_reset_password_email(to_email: str, token: str):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if not smtp_username or not smtp_password:
        print("SMTP credentials not configured. Cannot send email.")
        return

    reset_link = f"{frontend_url}/reset-password?token={token}"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Reset Your Password - UWU Scheduler"
    msg["From"] = f"UWU Scheduler <{smtp_username}>"
    msg["To"] = to_email

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your UWU Scheduler account.</p>
        <p>Click the button below to set a new password. This link will expire in 15 minutes.</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 14px;">{reset_link}</p>
        <br>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is an automated message from the Uva Wellassa University Smart Scheduling System. Please do not reply.</p>
    </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    def _send():
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, to_email, msg.as_string())
            server.quit()
            print(f"Password reset email sent to {to_email}")
        except Exception as e:
            print(f"Failed to send email to {to_email}: {e}")

    # Send in a background thread to avoid blocking the API response
    thread = threading.Thread(target=_send)
    thread.start()

def send_timetable_update_email(to_emails: list, role: str, subject: str, details: dict):
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if not smtp_username or not smtp_password:
        print("SMTP credentials not configured. Cannot send email.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"UWU Scheduler <{smtp_username}>"
    msg["To"] = ", ".join(to_emails)

    if role == "LECTURER":
        greeting = f"Dear {details.get('lecturer_name', 'Lecturer')},"
        msg_body = "A published timetable session you are assigned to has been updated."
    else:
        greeting = f"Dear Students of Batch {details.get('batch_code', '')},"
        msg_body = "A published timetable session for your batch has been updated."

    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Timetable Update Notification</h2>
        <p>{greeting}</p>
        <p>{msg_body}</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Module:</strong> {details.get('module_code')} - {details.get('module_name')}</p>
            <p><strong>Day:</strong> {details.get('day')}</p>
            <p><strong>Time:</strong> {details.get('start_time')} to {details.get('end_time')}</p>
            <p><strong>Room:</strong> {details.get('room_name')}</p>
            <p><strong>Lecturer:</strong> {details.get('lecturer_name')}</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{frontend_url}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Timetable</a>
        </div>
        <p>If you have any concerns regarding this change, please contact your department coordinator.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is an automated message from the Uva Wellassa University Smart Scheduling System. Please do not reply.</p>
    </body>
    </html>
    """

    part = MIMEText(html_content, "html")
    msg.attach(part)

    def _send():
        try:
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.sendmail(smtp_username, to_emails, msg.as_string())
            server.quit()
            print(f"Timetable update email sent to {len(to_emails)} recipients")
        except Exception as e:
            print(f"Failed to send email to {to_emails}: {e}")

    thread = threading.Thread(target=_send)
    thread.start()
