import os
import hashlib
import sqlite3
from typing import Generator


DB_DIR = os.path.join(os.getcwd(), "databases")
LOGO_DIR = os.path.join(DB_DIR, "logos")


def hash_password(password: str) -> str:
    """Hache un mot de passe en utilisant PBKDF2-HMAC-SHA256 (standard Python, aucun paquet externe)."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt_hex, key_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 100000)
        return key == new_key
    except Exception:
        return False;


def init_databases() -> None:
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    if not os.path.exists(LOGO_DIR):
        os.makedirs(LOGO_DIR)

    admin_db_path = os.path.join(DB_DIR, "admin.db")
    conn = sqlite3.connect(admin_db_path)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clubs (
            club_id TEXT PRIMARY KEY, 
            nom TEXT NOT NULL, 
            hashed_password TEXT NOT NULL
        )
    """)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM clubs")
    if cursor.fetchone()[0] == 0:
        hashed_password = hash_password("admin123")
        admin = ("admin", "AEN7", hashed_password)
        cursor.execute(
            "INSERT INTO clubs (club_id, nom, hashed_password) VALUES (?, ?, ?)",
            admin
        )
    conn.commit()
    conn.close()




def get_admin_db() -> Generator[sqlite3.Connection, None, None]:
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
    parts_club_id = club_id.split("_")
    for part in parts_club_id:
        if not part.isalnum():
            raise ValueError("club_id invalide")

    # On empêche qu'un club "normal" soit créer et accède à admin_club.db
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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, 
            value TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS beneficiaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prenom TEXT NOT NULL,
            nom TEXT NOT NULL,
            adresse TEXT NOT NULL,
            postal TEXT NOT NULL,
            ville TEXT NOT NULL,
            email TEXT NOT NULL,
            tel TEXT NOT NULL,
            iban TEXT NOT NULL
        )
    """)

    conn.commit()
    return conn