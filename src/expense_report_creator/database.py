"""Gestion de la persistance des données.

Ce module gère l'initialisation des bases de données SQLite pour l'administrateur
et les clubs individuels, ainsi que la fourniture des connexions.
"""

import os
import sqlite3
from typing import Generator

from .config import DB_DIR, LOGO_DIR


def init_databases() -> None:
    """Initialise les dossiers et tables des bases de données et des logos.

    Crée les bases de données d'administration et configure le compte admin
    par défaut s'il n'existe pas encore.
    """
    # Import local pour éviter les imports circulaires
    from .auth import hash_password

    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    if not os.path.exists(LOGO_DIR):
        os.makedirs(LOGO_DIR)

    admin_db_path = os.path.join(DB_DIR, "admin.db")
    conn = sqlite3.connect(admin_db_path)
    cursor = conn.cursor()

    # Table des clubs gérée par l'administrateur
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS clubs (
            club_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            hashed_password TEXT NOT NULL
        )
        """
    )
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM clubs")
    if cursor.fetchone()[0] == 0:
        hashed_password = hash_password("admin123")
        admin = ("admin", "AEN7", hashed_password)
        cursor.execute(
            "INSERT INTO clubs (club_id, name, hashed_password) VALUES (?, ?, ?)",
            admin,
        )
    conn.commit()
    conn.close()


def get_admin_db() -> Generator[sqlite3.Connection, None, None]:
    """Fournit une connexion à la base de données administrateur pour FastAPI.

    Yields:
        sqlite3.Connection: Une connexion SQLite active configurée avec Row.
    """
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    admin_db_path = os.path.join(DB_DIR, "admin.db")
    conn = sqlite3.connect(admin_db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def get_club_db(club_id: str) -> sqlite3.Connection:
    """Renvoie une connexion à la base de données du club spécifié.

    Initialise la structure des tables du club si la base de données vient d'être
    créée. Empêche l'accès direct aux bases système.

    Args:
        club_id: L'identifiant unique du club.

    Returns:
        sqlite3.Connection: Connexion SQLite configurée pour ce club.

    Raises:
        ValueError: Si le club_id est invalide ou s'il s'agit d'un identifiant
            réservé.
    """
    parts_club_id = club_id.split("_")
    for part in parts_club_id:
        if not part.isalnum():
            raise ValueError("club_id invalide")

    if club_id == "admin_club":
        raise ValueError("club_id invalide")

    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    if club_id == "admin":
        club_id = "admin_club"

    club_db = f"{club_id}.db"
    club_db_path = os.path.join(DB_DIR, club_db)

    conn = sqlite3.connect(club_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Configuration des tables spécifiques au club
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
        """
    )

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS beneficiaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            address TEXT NOT NULL,
            postal_code TEXT NOT NULL,
            city TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            iban TEXT NOT NULL
        )
        """
    )

    conn.commit()
    return conn
