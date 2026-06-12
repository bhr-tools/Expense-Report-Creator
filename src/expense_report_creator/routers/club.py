"""Routeur pour les opérations spécifiques au club connecté.

Ce module gère la récupération/sauvegarde des paramètres du club, la gestion
des bénéficiaires (CRUD) et le changement de mot de passe du compte club.
"""

import sqlite3
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_club_id
from ..database import get_admin_db, get_club_db
from ..models import (
    BeneficiaryRequest,
    SettingsUpdateRequest,
)

router = APIRouter(tags=["club"])


@router.get("/api/settings", response_model=Dict[str, str])
def get_settings(
    current_club_id: str = Depends(get_current_club_id),
) -> Dict[str, str]:
    """Récupère les paramètres de l'association pour le club connecté.

    Args:
        current_club_id: L'identifiant du club authentifié.

    Returns:
        Dict[str, str]: Un dictionnaire clé/valeur des paramètres enregistrés.
    """
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}
    finally:
        conn.close()


@router.put("/api/settings")
def update_settings(
    data: SettingsUpdateRequest,
    current_club_id: str = Depends(get_current_club_id),
) -> Dict[str, str]:
    """Met à jour les paramètres de l'association pour le club connecté.

    Args:
        data: Les nouvelles valeurs de configuration de l'association.
        current_club_id: L'identifiant du club authentifié.

    Returns:
        Dict[str, str]: Le statut de l'opération.
    """
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        for key, value in data.dict().items():
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, value),
            )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@router.get("/api/beneficiaries", response_model=List[Dict[str, Any]])
def get_beneficiaries(
    current_club_id: str = Depends(get_current_club_id),
) -> List[Dict[str, Any]]:
    """Liste tous les bénéficiaires enregistrés pour le club connecté.

    Args:
        current_club_id: L'identifiant du club authentifié.

    Returns:
        List[Dict[str, Any]]: Liste des bénéficiaires avec leurs coordonnées.
    """
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, first_name, last_name, address, postal_code, city, email, phone, iban
            FROM beneficiaries
            """
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@router.post("/api/beneficiaries")
def add_beneficiary(
    data: BeneficiaryRequest,
    current_club_id: str = Depends(get_current_club_id),
) -> Dict[str, Any]:
    """Ajoute un nouveau bénéficiaire pour le club connecté.

    Args:
        data: Les coordonnées complètes du bénéficiaire.
        current_club_id: L'identifiant du club authentifié.

    Returns:
        Dict[str, Any]: L'identifiant unique généré pour le bénéficiaire.
    """
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO beneficiaries
            (first_name, last_name, address, postal_code, city, email, phone, iban)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.first_name,
                data.last_name,
                data.address,
                data.postal_code,
                data.city,
                data.email,
                data.phone,
                data.iban,
            ),
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {"id": new_id, "status": "ok"}
    finally:
        conn.close()


@router.delete("/api/beneficiaries/{beneficiary_id}")
def delete_beneficiary(
    beneficiary_id: int,
    current_club_id: str = Depends(get_current_club_id),
) -> Dict[str, str]:
    """Supprime un bénéficiaire de la base de données du club connecté.

    Args:
        beneficiary_id: L'ID numérique du bénéficiaire à supprimer.
        current_club_id: L'identifiant du club authentifié.

    Returns:
        Dict[str, str]: Le statut de l'opération.

    Raises:
        HTTPException: Si le bénéficiaire n'existe pas pour ce club.
    """
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM beneficiaries WHERE id = ?", (beneficiary_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()
