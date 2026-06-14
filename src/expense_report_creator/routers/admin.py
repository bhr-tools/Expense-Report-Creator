"""Routeur pour les opérations d'administration.

Ce module définit les points d'entrée de l'API réservés à l'administrateur
pour gérer les clubs et leurs accès.
"""

import os
import sqlite3
import string
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from ..auth import get_current_club_id, hash_password, verify_password
from ..config import DB_DIR, LOGO_DIR
from ..database import get_admin_db, get_club_db
from ..models import ClubCreateRequest, ResetPasswordRequest, ChangePasswordRequest

router = APIRouter(prefix="/api/admin/clubs", tags=["admin"])


@router.get("", response_model=List[Dict[str, str]])
def list_clubs(
    current_club_id: str = Depends(get_current_club_id),
    db: sqlite3.Connection = Depends(get_admin_db),
) -> List[Dict[str, str]]:
    """Liste tous les clubs enregistrés dans le système.

    Args:
        current_club_id: Identifiant du club connecté (doit être 'admin').
        db: Connexion à la base de données d'administration.

    Returns:
        List[Dict[str, str]]: Liste de dictionnaires décrivant chaque club.

    Raises:
        HTTPException: Si l'utilisateur connecté n'est pas l'administrateur.
    """
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    cursor = db.cursor()
    cursor.execute("SELECT club_id, name FROM clubs WHERE club_id != 'admin'")
    rows = cursor.fetchall()

    return [
        {"id": row["club_id"], "name": row["name"]}
        for row in rows
    ]


@router.post("")
def create_club(
    data: ClubCreateRequest,
    current_club_id: str = Depends(get_current_club_id),
    db: sqlite3.Connection = Depends(get_admin_db),
) -> Dict[str, str]:
    """Crée un nouveau club et initialise sa base de données isolée.

    Args:
        data: Les informations du nouveau club à créer.
        current_club_id: Identifiant du club connecté (doit être 'admin').
        db: Connexion à la base de données d'administration.

    Returns:
        Dict[str, str]: Un message de succès et le statut.

    Raises:
        HTTPException: Si l'utilisateur n'est pas admin, si l'ID est invalide,
            ou si le club existe déjà.
    """
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    # L'identifiant doit être composé de morceaux alphanumériques séparés par des tirets bas
    parts = data.club_id.split("_")
    for part in parts:
        if not part.isalnum():
            raise HTTPException(
                status_code=400,
                detail="Identifiant de club invalide (alphanumérique et tirets bas uniquement)",
            )

    import secrets

    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(8))

    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO clubs (club_id, name, hashed_password) VALUES (?, ?, ?)",
            (data.club_id, data.name, hash_password(new_password)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400, detail="L'identifiant de ce club existe déjà"
        )

    # Initialisation de la base de données SQLite physique pour le club
    try:
        conn = get_club_db(data.club_id)
        conn.close()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur d'initialisation de la DB du club : {str(e)}",
        )

    return {"status": "ok", "message": f"Club '{data.name}' créé avec succès", "password": new_password}


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    current_club_id: str = Depends(get_current_club_id),
    db: sqlite3.Connection = Depends(get_admin_db),
) -> Dict[str, str]:
    """Régénère un mot de passe temporaire pour un club donné.

    Args:
        data: Requête contenant l'identifiant du club ciblé.
        current_club_id: Identifiant du club connecté (doit être 'admin').
        db: Connexion à la base de données d'administration.

    Returns:
        Dict[str, str]: Le nouveau mot de passe généré en clair.

    Raises:
        HTTPException: Si l'utilisateur n'est pas admin ou si le club n'existe pas.
    """
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    import secrets

    alphabet = string.ascii_letters + string.digits
    new_password = "".join(secrets.choice(alphabet) for _ in range(8))

    cursor = db.cursor()
    cursor.execute(
        "UPDATE clubs SET hashed_password = ? WHERE club_id = ?",
        (hash_password(new_password), data.club_id),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Club non trouvé")
    db.commit()

    return {"password": new_password}


@router.delete("/{club_id}")
def delete_club(
    club_id: str,
    current_club_id: str = Depends(get_current_club_id),
    db: sqlite3.Connection = Depends(get_admin_db),
) -> Dict[str, str]:
    """Supprime définitivement un club et son fichier de base de données.

    Args:
        club_id: L'identifiant du club à supprimer.
        current_club_id: Identifiant du club connecté (doit être 'admin').
        db: Connexion à la base de données d'administration.

    Returns:
        Dict[str, str]: Le statut de l'opération.

    Raises:
        HTTPException: Si l'utilisateur n'est pas admin, s'il tente de supprimer
            l'admin lui-même, ou si le club n'existe pas.
    """
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    if club_id == "admin":
        raise HTTPException(
            status_code=400, detail="Impossible de supprimer l'administrateur"
        )

    cursor = db.cursor()
    cursor.execute("DELETE FROM clubs WHERE club_id = ?", (club_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Club non trouvé")
    db.commit()

    # Suppression du fichier de base de données physique correspondant
    try:
        db_path = os.path.join(DB_DIR, f"{club_id}.db")
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception as e:
        print(f"Erreur lors de la suppression physique de la DB {club_id}.db : {e}")

    return {"status": "ok"}

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_club_id: str = Depends(get_current_club_id),
    db: sqlite3.Connection = Depends(get_admin_db),
) -> Dict[str, str]:
    """Permet au club connecté de modifier son mot de passe.

    Cette méthode est également valide pour le compte 'admin'.

    Args:
        data: Requête contenant l'ancien et le nouveau mot de passe.
        current_club_id: L'identifiant unique du club connecté.
        db: Connexion à la base de données d'administration.

    Returns:
        Dict[str, str]: Le statut de l'opération.

    Raises:
        HTTPException: Si l'ancien mot de passe fourni est invalide.
    """
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    cursor = db.cursor()
    cursor.execute(
        "SELECT hashed_password FROM clubs WHERE club_id = ?",
        (current_club_id,),
    )
    row = cursor.fetchone()
    if not row or not verify_password(data.old_password, row["hashed_password"]):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")

    cursor.execute(
        "UPDATE clubs SET hashed_password = ? WHERE club_id = ?",
        (hash_password(data.new_password), current_club_id),
    )
    db.commit()
    return {"status": "ok"}


@router.post("/{club_id}/logo")
def upload_logo(
    club_id: str,
    logo: UploadFile,
    current_club_id: str = Depends(get_current_club_id),
    db: str = Depends(get_admin_db)
):
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    
    cursor = db.cursor()

    cursor.execute(
        "SELECT club_id FROM clubs WHERE club_id = ?",
        (club_id,)
    )

    row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=400, detail="Ce club n'existe pas")
    
    logo_path = os.path.join(LOGO_DIR, f"{club_id}.png")
    logo_content = logo.file.read()

    with open(logo_path, 'wb') as file:
        file.write(logo_content)

    return {"status": "ok"}