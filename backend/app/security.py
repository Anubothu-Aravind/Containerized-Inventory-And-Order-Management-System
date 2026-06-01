from __future__ import annotations

import base64
import json
import hashlib
import hmac
import os
import time
from dataclasses import dataclass

from app.core.config import settings


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120000)
    return "pbkdf2_sha256$120000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, rounds, salt_b64, digest_b64 = password_hash.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64.encode())
        expected = base64.b64decode(digest_b64.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(rounds))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


@dataclass(frozen=True)
class TokenPayload:
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    exp: int


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode())


def create_access_token(*, user_id: int, username: str, email: str, full_name: str, role: str) -> str:
    expires_at = int(time.time()) + settings.AUTH_TOKEN_EXPIRE_MINUTES * 60
    payload = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "full_name": full_name,
        "role": role,
        "exp": expires_at,
    }
    body = _base64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.AUTH_SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_base64url_encode(signature)}"


def decode_access_token(token: str) -> TokenPayload | None:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(settings.AUTH_SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _base64url_decode(signature)):
            return None
        payload = json.loads(_base64url_decode(body).decode())
        if int(payload["exp"]) < int(time.time()):
            return None
        return TokenPayload(
            user_id=int(payload["user_id"]),
            username=str(payload["username"]),
            email=str(payload["email"]),
            full_name=str(payload.get("full_name", "")),
            role=str(payload["role"]),
            exp=int(payload["exp"]),
        )
    except Exception:
        return None
