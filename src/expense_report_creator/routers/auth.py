"""Routeur pour les opérations d'authentification.

Ce module gère le point d'entrée de connexion pour les clubs et l'administrateur
afin d'obtenir un jeton JWT d'accès.
"""

import sqlite3
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException

from ..auth import create_access_token, verify_password
from ..database import get_admin_db
from ..models import LoginRequest

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/login")
def login(
    data: LoginRequest,
    db: sqlite3.Connection = Depends(get_admin_db),
) -> Dict[str, str]:
    """Authentifie un utilisateur et retourne un jeton d'accès JWT.

    Vérifie l'identifiant et le mot de passe hashé dans la table clubs.

    Args:
        data: Requête contenant l'identifiant (club_id) et le mot de passe.
        db: Connexion à la base de données d'administration.

    Returns:
        Dict[str, str]: Les informations de session et le token JWT.

    Raises:
        HTTPException: Si l'identifiant ou le mot de passe est invalide.
    """
    cursor = db.cursor()
    cursor.execute(
        "SELECT club_id, name, hashed_password FROM clubs WHERE club_id = ?",
        (data.club_id,),
    )
    row = cursor.fetchone()

    if not row or not verify_password(data.password, row["hashed_password"]):
        raise HTTPException(
            status_code=400, detail="Identifiant ou mot de passe incorrect"
        )

    # Génération du token d'accès JWT signé
    access_token = create_access_token(data={"sub": row["club_id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "club_id": row["club_id"],
        "name": row["name"],
    }
