import hashlib
import hmac
import os
import time
from typing import Optional, Dict, Any

from fastapi import HTTPException, Request, status


def _get_secret() -> str:
    secret = os.getenv("WP_HMAC_SECRET") or os.getenv("FRAKTAL_WP_HMAC_SECRET") or ""
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="WP_HMAC_SECRET no configurado en el backend",
        )
    return secret


def _body_sha256(body: bytes) -> str:
    return hashlib.sha256(body or b"").hexdigest()


async def verify_wp_hmac(request: Request) -> Dict[str, Any]:
    """
    Verifica firma HMAC para integración WordPress->Backend.

    Headers requeridos:
    - X-Fraktal-Timestamp: unix epoch seconds
    - X-Fraktal-WP-User-Id: id numérico/str del usuario en WordPress
    - X-Fraktal-Signature: hex(hmac_sha256(secret, canonical_string))

    canonical_string:
      "{timestamp}.{method}.{path}.{body_sha256}.{wp_user_id}"
    """
    secret = _get_secret().encode("utf-8")

    ts_raw = (request.headers.get("X-Fraktal-Timestamp") or "").strip()
    wp_user_id = (request.headers.get("X-Fraktal-WP-User-Id") or "").strip()
    sig = (request.headers.get("X-Fraktal-Signature") or "").strip()

    if not ts_raw or not wp_user_id or not sig:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Faltan headers de autenticación WP")

    try:
        ts = int(ts_raw)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Timestamp inválido")

    skew = int(os.getenv("WP_HMAC_ALLOWED_SKEW_SECONDS", "300"))
    now = int(time.time())
    if abs(now - ts) > skew:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Timestamp fuera de ventana")

    body = await request.body()
    canonical = f"{ts}.{request.method.upper()}.{request.url.path}.{_body_sha256(body)}.{wp_user_id}".encode("utf-8")
    expected = hmac.new(secret, canonical, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Firma inválida")

    return {"wp_user_id": wp_user_id}


