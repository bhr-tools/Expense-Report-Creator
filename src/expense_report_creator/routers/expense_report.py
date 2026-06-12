"""Routeur pour la génération des notes de frais.

Ce module définit l'endpoint permettant de recevoir les données de note de frais
et de compiler le document final (PDF ou code source LaTeX).
"""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError

from ..auth import get_current_club_id
from ..generator import compile_ndf_document
from ..models import ExpenseReportData

router = APIRouter(prefix="/api/expense-reports", tags=["expense-reports"])


@router.post("/generate")
async def generate_expense_report(
    data_json: str = Form(...),
    format: str = Form("pdf"),  # "pdf" ou "latex"
    signature: Optional[UploadFile] = File(None),
    logo: Optional[UploadFile] = File(None),
    receipts: List[UploadFile] = File(default=[]),
    current_club_id: str = Depends(get_current_club_id),
) -> Response:
    """Valide les données et compile la note de frais avec les justificatifs.

    Cette route reçoit les données au format JSON, charge les images transmises
    en pièces jointes, appelle la logique de compilation LaTeX/PDF et retourne
    le fichier généré en téléchargement.

    Args:
        data_json: Chaîne JSON contenant les données de note de frais.
        format: Format de sortie souhaité ("pdf" ou "latex").
        signature: Fichier image de la signature.
        logo: Fichier image du logo de l'association.
        receipts: Liste de fichiers justificatifs.
        current_club_id: L'identifiant du club authentifié par son token.

    Returns:
        Response: Fichier binaire brut (PDF ou TeX) avec les headers de
            téléchargement appropriés.

    Raises:
        HTTPException: Si le JSON est invalide, les données incorrectes ou
            si la compilation échoue.
    """
    # 1. Validation du JSON entrant
    try:
        parsed_dict = json.loads(data_json)
        expense_report_data = ExpenseReportData(**parsed_dict)
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=f"Données invalides : {str(e)}")

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
            data=expense_report_data,
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
    filename = f"NDF_{expense_report_data.er_number}"
    if format.lower() == "latex":
        headers = {"Content-Disposition": f'attachment; filename="{filename}.tex"'}
    else:
        beneficiary_name = (
            f"{expense_report_data.beneficiary_first_name}_"
            f"{expense_report_data.beneficiary_last_name}"
        )
        headers = {
            "Content-Disposition": (
                f'attachment; filename="{filename}_{beneficiary_name}.pdf"'
            )
        }

    return Response(content=content_bytes, media_type=media_type, headers=headers)
