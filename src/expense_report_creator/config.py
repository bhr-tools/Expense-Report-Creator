"""Configuration du projet.

Ce module contient les constantes de sécurité JWT et les chemins vers
les dossiers de données du projet.
"""

import os
import secrets

# Chemins des répertoires du projet
BASE_DIR = os.getcwd()
DB_DIR = os.path.join(BASE_DIR, "databases")
LOGO_DIR = os.path.join(DB_DIR, "logos")
ASSETS_DIR = os.path.join(BASE_DIR, "assets")

# Configuration de la sécurité JWT
# Une clé secrète aléatoire est générée à chaque démarrage de l'application
SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"
