import hashlib
import os
import sqlite3
from typing import Generator

# Chemin global pour stocker les bases de données SQLite
DB_DIR = os.path.join(os.getcwd(), "databases")

def hash_password(password: str) -> str:
    """Hache un mot de passe en utilisant PBKDF2-HMAC-SHA256 (standard Python, aucun paquet externe)."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """Vérifie un mot de passe par rapport à son empreinte hachée."""
    try:
        salt_hex, key_hex = hashed.split(':')
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return new_key == key
    except Exception:
        return False

def init_databases() -> None:
    """Initialise le dossier des bases de données et la base centrale admin.db."""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
        print(f"Dossier de base de données créé : {DB_DIR}")

    admin_db_path = os.path.join(DB_DIR, "admin.db")
    conn = sqlite3.connect(admin_db_path)
    cursor = conn.cursor()
    
    # Création de la table des accès des clubs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS clubs (
            club_id TEXT PRIMARY KEY,
            nom TEXT NOT NULL,
            hashed_password TEXT NOT NULL
        )
    """)
    conn.commit()

    # Si la base est neuve, on crée les comptes par défaut pour le développement
    cursor.execute("SELECT COUNT(*) FROM clubs")
    if cursor.fetchone()[0] == 0:
        # On insère l'administrateur de l'AE (Association des Élèves)
        # Identifiants par défaut pour le dev : admin / admin123
        cursor.execute(
            "INSERT INTO clubs (club_id, nom, hashed_password) VALUES (?, ?, ?)",
            ("admin", "Association des Élèves (AE)", hash_password("admin123"))
        )
        # Comptes de clubs de test : club_photo / photo123, net7 / net123
        cursor.execute(
            "INSERT INTO clubs (club_id, nom, hashed_password) VALUES (?, ?, ?)",
            ("club_photo", "Club Photo N7", hash_password("photo123"))
        )
        cursor.execute(
            "INSERT INTO clubs (club_id, nom, hashed_password) VALUES (?, ?, ?)",
            ("net7", "Net7", hash_password("net123"))
        )
        conn.commit()
        print("Comptes par défaut créés dans admin.db :")
        print(" - admin / admin123")
        print(" - club_photo / photo123")
        print(" - net7 / net123")

    conn.close()

def get_admin_db() -> Generator[sqlite3.Connection, None, None]:
    """Générateur Depends pour la base admin.db."""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)
    admin_db_path = os.path.join(DB_DIR, "admin.db")
    conn = sqlite3.connect(admin_db_path)
    conn.row_factory = sqlite3.Row  # Permet d'accéder aux colonnes par leur nom
    try:
        yield conn
    finally:
        conn.close()

def get_club_db(club_id: str) -> sqlite3.Connection:
    """
    Ouvre et initialise la base SQLite d'un club spécifique.
    Retourne la connexion sqlite3.
    """
    # Validation du club_id pour éviter les injections de chemin (Directory Traversal)
    if not club_id.isalnum() and "_" not in club_id:
        raise ValueError("club_id invalide")

    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    db_name = "admin_club.db" if club_id == "admin" else f"{club_id}.db"
    club_db_path = os.path.join(DB_DIR, db_name)
    conn = sqlite3.connect(club_db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Table des paramètres (Settings) du club
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    # Table des bénéficiaires
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS beneficiaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prenom TEXT NOT NULL,
            nom TEXT NOT NULL,
            adresse TEXT NOT NULL,
            mail TEXT NOT NULL,
            tel TEXT,
            iban TEXT NOT NULL
        )
    """)
    conn.commit()

    # Initialisation des paramètres par défaut si la base est vide
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        defaults = {
            "nom": club_id.replace("_", " ").title(),
            "mandat": "2025-2026",
            "tresorier": "",
            "email": f"{club_id}@n7.fr"
        }
        for k, v in defaults.items():
            cursor.execute("INSERT INTO settings (key, value) VALUES (?, ?)", (k, v))
        conn.commit()

    return conn
