import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta
from typing import List, Optional

import jwt
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Responsen, FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ValidationError

try:
    from .generator import NDFData, compile_ndf_document
except ImportError:
    from generator import NDFData, compile_ndf_document


# Importation de la couche base de données
try:
    from .database import (
        get_admin_db,
        get_club_db,
        hash_password,
        init_databases,
        verify_password,
    )
except ImportError:
    from database import (
        get_admin_db,
        get_club_db,
        hash_password,
        init_databases,
        verify_password,
    )

# =============================================================================
# INITIALISATION DE FASTAPI
# =============================================================================
app = FastAPI(title="N7 Trésorerie API", version="1.0")

# Autoriser ton front-end à communiquer avec cette API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, mettre l'URL exacte du front-end
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration de la sécurité JWT
SECRET_KEY = secrets.token_hex(32)
ALGORITHM = "HS256"
security = HTTPBearer()

# Chemin vers le dossier contenant le template LaTeX
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(os.getcwd(), "assets")


# Initialisation de la base de données au démarrage
@app.on_event("startup")
def startup_event():
    init_databases()


# =============================================================================
# MODÈLES DE DONNÉES ET PROTOCOLES
# =============================================================================


class LoginRequest(BaseModel):
    club_id: str
    password: str


class UpdateSettingsRequest(BaseModel):
    nom: str
    prenom: str
    email: str
    mandat: str
    location:str


class BeneficiaireRequest(BaseModel):
    prenom: str
    nom: str
    adresse: str
    postal: str
    ville: str
    email: str
    tel: str
    iban: str


class CreateClubRequest(BaseModel):
    club_id: str
    nom: str
    password: str


class ResetPasswordRequest(BaseModel):
    club_id: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# =============================================================================
# FONCTIONS DE SÉCURITÉ (JWT)
# =============================================================================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Génère un token JWT signé."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_club_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """Valide le token JWT et retourne l'identifiant du club."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        club_id: str = payload.get("sub")
        if club_id is None:
            raise HTTPException(status_code=401, detail="Token invalide")
        return club_id
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")


# =============================================================================
# ENDPOINTS D'AUTHENTIFICATION ET DE GESTION
# =============================================================================
@app.post("/api/login")
def login(data: LoginRequest, db=Depends(get_admin_db)):
    """Route d'authentification pour les clubs et l'admin."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT club_id, nom, hashed_password FROM clubs WHERE club_id = ?",
        (data.club_id,),
    )
    row = cursor.fetchone()

    if not row or not verify_password(data.password, row["hashed_password"]):
        raise HTTPException(
            status_code=400, detail="Identifiant ou mot de passe incorrect"
        )

    # Génération du token JWT
    access_token = create_access_token(data={"sub": row["club_id"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "club_id": row["club_id"],
        "nom": row["nom"],
    }


# --- Routes Admin (réservées à club_id = 'admin') ---
@app.get("/api/admin/clubs")
def list_clubs(
    current_club_id: str = Depends(get_current_club_id), db=Depends(get_admin_db)
):
    """Liste tous les clubs enregistrés."""
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    cursor = db.cursor()
    cursor.execute("SELECT club_id, nom FROM clubs WHERE club_id != 'admin'")
    rows = cursor.fetchall()
    # Simuler un état actif de base
    return [{"id": r["club_id"], "nom": r["nom"], "lastLogin": "Actif"} for r in rows]


@app.post("/api/admin/clubs")
def create_club(
    data: CreateClubRequest,
    current_club_id: str = Depends(get_current_club_id),
    db=Depends(get_admin_db),
):
    """Crée un nouveau club (base de données et identifiants)."""
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    # Validation basique du club_id
    if not data.club_id.isalnum() and "_" not in data.club_id:
        raise HTTPException(
            status_code=400,
            detail="Identifiant de club invalide (alphanumérique uniquement)",
        )

    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO clubs (club_id, nom, hashed_password) VALUES (?, ?, ?)",
            (data.club_id, data.nom, hash_password(data.password)),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400, detail="L'identifiant de ce club existe déjà"
        )

    # L'appel à get_club_db initialisera aussi sa structure SQLite isolée
    try:
        conn = get_club_db(data.club_id)
        conn.close()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur d'initialisation de la DB du club : {str(e)}",
        )

    return {"status": "ok", "message": f"Club '{data.nom}' créé avec succès"}


@app.post("/api/admin/clubs/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    current_club_id: str = Depends(get_current_club_id),
    db=Depends(get_admin_db),
):
    """Régénère le mot de passe d'un club et renvoie le mot de passe en clair pour affichage unique."""
    if current_club_id != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")

    import secrets
    import string

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

    return {"new_password": new_password}


@app.delete("/api/admin/clubs/{club_id}")
def delete_club(
    club_id: str,
    current_club_id: str = Depends(get_current_club_id),
    db=Depends(get_admin_db),
):
    """Supprime un club et sa base de données."""
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

    # Suppression du fichier de base de données physique
    try:
        from database import DB_DIR

        db_path = os.path.join(DB_DIR, f"{club_id}.db")
        if os.path.exists(db_path):
            os.remove(db_path)
    except Exception as e:
        print(f"Erreur de suppression du fichier de base de données {club_id}.db : {e}")

    return {"status": "ok"}


# --- Routes Club (Settings et Bénéficiaires) ---
@app.get("/api/settings")
def get_settings(current_club_id: str = Depends(get_current_club_id)):
    """Récupère les paramètres du club authentifié."""
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM settings")
        rows = cursor.fetchall()
        return {row["key"]: row["value"] for row in rows}
    finally:
        conn.close()


@app.put("/api/settings")
def update_settings(
    data: UpdateSettingsRequest, current_club_id: str = Depends(get_current_club_id)
):
    """Met à jour les paramètres du club authentifié."""
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        for k, v in data.dict().items():
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v)
            )
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@app.get("/api/beneficiaires")
def get_beneficiaires(current_club_id: str = Depends(get_current_club_id)):
    """Liste tous les bénéficiaires enregistrés pour le club authentifié."""
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, prenom, nom, adresse, postal, ville, email, tel, iban FROM beneficiaires"
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


@app.post("/api/beneficiaires")
def add_beneficiaire(
    data: BeneficiaireRequest, current_club_id: str = Depends(get_current_club_id)
):
    """Ajoute un nouveau bénéficiaire pour le club authentifié."""
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO beneficiaires (prenom, nom, adresse, postal, ville, email, tel, iban) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (data.prenom, data.nom, data.adresse, data.postal, data.ville, data.email, data.tel, data.iban),
        )
        conn.commit()
        new_id = cursor.lastrowid
        return {"id": new_id, "status": "ok"}
    finally:
        conn.close()


@app.delete("/api/beneficiaires/{benef_id}")
def delete_beneficiaire(
    benef_id: int, current_club_id: str = Depends(get_current_club_id)
):
    """Supprime un bénéficiaire du club authentifié."""
    conn = get_club_db(current_club_id)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM beneficiaires WHERE id = ?", (benef_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Bénéficiaire non trouvé")
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()


@app.post("/api/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_club_id: str = Depends(get_current_club_id),
    db=Depends(get_admin_db),
):
    """Permet à tout club connecté (y compris l'admin) de changer son mot de passe."""
    cursor = db.cursor()
    cursor.execute(
        "SELECT hashed_password FROM clubs WHERE club_id = ?", (current_club_id,)
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


# =============================================================================
# ROUTE PRINCIPALE DE L'API
# =============================================================================
@app.post("/generate-ndf")
async def create_ndf(
    data_json: str = Form(...),
    format: str = Form("pdf"),  # "pdf" ou "latex"
    signature: Optional[UploadFile] = File(None),
    logo: Optional[UploadFile] = File(None),
    receipts: List[UploadFile] = File(default=[]),
    current_club_id: str = Depends(get_current_club_id),
):
    # 1. Validation du JSON entrant
    try:
        parsed_dict = json.loads(data_json)
        ndf_data = NDFData(**parsed_dict)
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Données invalides: {str(e)}")

    # 2. Lecture des fichiers uploadés en mémoire (bytes)
    signature_content = (
        await signature.read() if signature and signature.filename else None
    )
    logo_content = await logo.read() if logo and logo.filename else None

    receipts_files = []
    for r in receipts:
        if r.filename:
            content = await r.read()
            receipts_files.append((r.filename, content))

    # 3. Appel de la logique métier de génération
    try:
        content_bytes, media_type = compile_ndf_document(
            data=ndf_data,
            format_type=format,
            signature_content=signature_content,
            logo_content=logo_content,
            receipts=receipts_files,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur de génération : {str(e)}")

    # 4. Détermination du nom de fichier de retour
    filename = f"NDF_{ndf_data.ER_number}"
    if format.lower() == "latex":
        headers = {"Content-Disposition": f'attachment; filename="{filename}.tex"'}
    else:
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}_{ndf_data.beneficiary_name}.pdf"'
        }

    return Response(content=content_bytes, media_type=media_type, headers=headers)


# Point d'entrée pour démarrer l'API (uvicorn) en mode dev
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
