"""Sécurité et authentification.

Ce module gère le hachage des mots de passe avec PBKDF2 et la gestion des
jetons JWT (création et validation) pour sécuriser les routes de l'API.
"""

import hashlib
import os
from datetime import datetime, timedelta

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import ALGORITHM, SECRET_KEY

# Instance de sécurité pour la récupération du token Authorization
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hache un mot de passe en utilisant PBKDF2-HMAC-SHA256.

    Args:
        password: Le mot de passe en clair.

    Returns:
        str: Le sel et la clé hachée au format hexadécimal, séparés par un deux-points.
    """
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Vérifie qu'un mot de passe correspond à son hash.

    Args:
        password: Le mot de passe en clair à vérifier.
        hashed: Le hash stocké au format "sel:clé".

    Returns:
        bool: True si le mot de passe correspond, False sinon.
    """
    try:
        salt_hex, key_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return key == new_key
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Génère un token JWT signé pour un club.

    Args:
        data: Les données à encoder dans le payload du token (ex: sub).
        expires_delta: Durée de validité optionnelle du token.

    Returns:
        str: Le jeton JWT signé sous forme de chaîne de caractères.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_club_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Valide le token JWT transmis et retourne l'identifiant du club.

    Cette fonction sert de dépendance FastAPI pour protéger les routes.

    Args:
        credentials: Les identifiants d'autorisation extraits du header Bearer.

    Returns:
        str: L'identifiant unique du club (club_id).

    Raises:
        HTTPException: Si le jeton est manquant, expiré ou invalide.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        club_id: str = payload.get("sub")
        if club_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        return club_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
