"""Générateur de notes de frais (PDF et LaTeX).

Ce module gère le rendu du template LaTeX à l'aide de Jinja2 et sa compilation
en PDF via le moteur Tectonic.
"""

import os
import subprocess
import tempfile
from datetime import datetime
from typing import List, Optional

import jinja2
from PIL import Image, ImageOps

from .config import ASSETS_DIR
from .models import ExpenseReportData


def tex_safe(value: str) -> str:
    """Échappe ou nettoie une valeur textuelle pour l'intégration dans LaTeX.

    Args:
        value: Le texte brut à nettoyer.

    Returns:
        str: Le texte nettoyé ou '~' (espace insécable LaTeX) si vide.
    """
    if not value or str(value).strip() == "":
        return "~"
    return str(value)


def generate_latex(
    data: ExpenseReportData,
    receipt_file_paths: List[str],
    signature_path: str,
    logo_path: str,
) -> str:
    """Génère le code source LaTeX à partir des données et du template.

    Args:
        data: Les données de la note de frais.
        receipt_file_paths: Liste des chemins des images de justificatifs.
        signature_path: Chemin vers l'image de la signature.
        logo_path: Chemin vers l'image du logo de l'association.

    Returns:
        str: Le code source LaTeX généré.
    """
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(ASSETS_DIR),
        block_start_string=r"\BLOCK{",
        block_end_string="}",
        variable_start_string=r"\VAR{",
        variable_end_string="}",
        comment_start_string=r"\#{",
        comment_end_string="}",
        trim_blocks=True,
        autoescape=False,
    )

    template = env.get_template("export-report-template.tex")

    formatted_items = [
        {
            "quantity": item.quantity,
            "reference": item.reference,
            "unit_price": f"{item.unit_price:.2f}",
            "total_price": f"{item.total_price:.2f}",
        }
        for item in data.items
    ]

    context = {
        # Adresse de l'association fixe (Toulouse)
        "association_address": tex_safe("2 rue Charles Camichel"),
        "association_postal_code": tex_safe("31000"),
        "association_city": tex_safe("Toulouse"),
        "signature_location": tex_safe(data.signature_location),
        "association_name": tex_safe(data.association_name),
        "association_email": tex_safe(data.association_email),
        "mandate": tex_safe(data.mandate),
        "treasurer_first_name": tex_safe(data.treasurer_first_name),
        "treasurer_last_name": tex_safe(data.treasurer_last_name),
        "beneficiary_first_name": tex_safe(data.beneficiary_first_name),
        "beneficiary_last_name": tex_safe(data.beneficiary_last_name),
        "refund_method": tex_safe(data.refund_method),
        "attachment_list": tex_safe(data.attachment_list),
        "er_number": tex_safe(data.er_number),
        "beneficiary_address": tex_safe(data.beneficiary_address),
        "beneficiary_postal_code": tex_safe(data.beneficiary_postal_code),
        "beneficiary_city": tex_safe(data.beneficiary_city),
        "beneficiary_phone": tex_safe(data.beneficiary_phone),
        "beneficiary_email": tex_safe(data.beneficiary_email),
        "beneficiary_iban": tex_safe(data.beneficiary_iban),
        "items": formatted_items,
        "final_price": f"{data.final_price:.2f}",
        "receipt_files": receipt_file_paths,
        "signature_path": signature_path,
        "logo_path": logo_path,
        "date": datetime.now().strftime("%d/%m/%Y"),
    }

    return template.render(context)


def compile_ndf_document(
    data: ExpenseReportData,
    format_type: str,
    signature_content: Optional[bytes] = None,
    logo_content: Optional[bytes] = None,
    receipts: List[tuple[str, bytes]] = [],
) -> tuple[bytes, str]:
    """Compile la note de frais et fusionne les pièces jointes si nécessaire.

    Args:
        data: Les données structurées de la note de frais.
        format_type: Format souhaité ("pdf" ou "latex").
        signature_content: Contenu brut de l'image de la signature.
        logo_content: Contenu brut de l'image du logo.
        receipts: Liste de tuples (nom_fichier, contenu_brut) des justificatifs.

    Returns:
        tuple[bytes, str]: Contenu brut du fichier généré et son type MIME.

    Raises:
        ValueError: Si le template Jinja ou la compilation LaTeX échoue.
        FileNotFoundError: Si le compilateur Tectonic ne produit pas de PDF.
    """
    # Import local pour éviter l'import lourd de PdfWriter si non requis
    from pypdf import PdfWriter

    with tempfile.TemporaryDirectory() as temp_dir:
        signature_path = ""
        logo_path = ""
        pdf_receipts = []
        images_receipts = []

        if signature_content:
            signature_path = os.path.join(temp_dir, "signature.png")
            with open(signature_path, "wb") as f:
                f.write(signature_content)

        if logo_content:
            logo_path = os.path.join(temp_dir, "logo.png")
            with open(logo_path, "wb") as f:
                f.write(logo_content)

        # Traitement et redressement des pièces jointes d'après les métadonnées EXIF
        for filename, content in receipts:
            if not filename:
                continue

            receipt_path = os.path.join(temp_dir, filename)
            with open(receipt_path, "wb") as f:
                f.write(content)

            extension = os.path.splitext(filename)[1].lower()
            if extension == ".pdf":
                pdf_receipts.append(receipt_path)
            else:
                try:
                    img = Image.open(receipt_path)
                    transposed_img = ImageOps.exif_transpose(img)
                    transposed_img.save(receipt_path)
                    images_receipts.append(receipt_path)
                except Exception as e:
                    print(f"Erreur de traitement de l'image {filename}: {e}")

        try:
            latex_code = generate_latex(
                data, images_receipts, signature_path, logo_path
            )
        except Exception as e:
            raise ValueError(f"Erreur du template Jinja : {str(e)}")

        if format_type.lower() == "latex":
            return latex_code.encode("utf-8"), "application/x-tex"

        generated_tex = os.path.join(temp_dir, "temp.tex")
        with open(generated_tex, "w", encoding="utf-8") as f:
            f.write(latex_code)

        try:
            subprocess.run(
                ["tectonic", "-o", temp_dir, generated_tex],
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            raise ValueError(f"Erreur de compilation Tectonic : {e.stderr}")

        generated_pdf = os.path.join(temp_dir, "temp.pdf")
        final_pdf_path = os.path.join(temp_dir, "final.pdf")

        if not os.path.exists(generated_pdf):
            raise FileNotFoundError("Le PDF n'a pas pu être généré par Tectonic.")

        # Concaténation de la note de frais générée avec les justificatifs PDF
        merger = PdfWriter()
        merger.append(generated_pdf)
        for pdf_path in pdf_receipts:
            merger.append(pdf_path)

        with open(final_pdf_path, "wb") as f_out:
            merger.write(f_out)
        merger.close()

        with open(final_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return pdf_bytes, "application/pdf"
