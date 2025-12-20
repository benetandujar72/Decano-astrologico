import os
import smtplib
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    message: str = Field(min_length=10, max_length=5000)

    # Campo honeypot (si viene relleno, es probablemente spam)
    company: str | None = Field(default=None, max_length=200)


def _send_email_via_smtp(*, subject: str, body: str, reply_to: str | None) -> None:
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")

    to_email = os.getenv("CONTACT_TO_EMAIL")
    from_email = os.getenv("CONTACT_FROM_EMAIL") or smtp_username

    if not smtp_username or not smtp_password or not to_email or not from_email:
        raise HTTPException(
            status_code=503,
            detail=(
                "Email service not configured. Set SMTP_USERNAME, SMTP_PASSWORD, CONTACT_TO_EMAIL "
                "(and optionally CONTACT_FROM_EMAIL)."
            ),
        )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to

    msg.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to send email")


@router.post("/send")
async def send_contact_email(payload: ContactRequest):
    # Honeypot: si se rellena, responder OK sin enviar
    if payload.company:
        return {"ok": True}

    email = payload.email.strip()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Invalid email")

    subject = f"Nuevo contacto (FRAKTAL) — {payload.name}".strip()
    body = (
        "Has recibido un nuevo mensaje desde el formulario de contacto.\n\n"
        f"Nombre: {payload.name}\n"
        f"Email: {email}\n\n"
        "Mensaje:\n"
        f"{payload.message}\n"
    )

    _send_email_via_smtp(subject=subject, body=body, reply_to=email)
    return {"ok": True}
