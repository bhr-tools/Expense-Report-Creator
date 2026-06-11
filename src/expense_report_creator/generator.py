import os
import subprocess
import tempfile
from datetime import datetime
from typing import List, Optional

import jinja2
from PIL import Image, ImageOps
from pydantic import BaseModel
from pypdf import PdfWriter

# Directory containing the LaTeX templates
ASSETS_DIR = os.path.join(os.getcwd(), "assets")


# =============================================================================
# DATA MODELS
# =============================================================================
class ExpenseItem(BaseModel):
    quantity: int
    reference: str
    unit_price: float
    total_price: float


class NDFData(BaseModel):
    association_name: str
    association_email: str
    mandate: str
    treasurer_name: str
    treasurer_surname: str
    signature_location: str

    beneficiary_name: str
    beneficiary_surname: str
    beneficiary_adress: str
    beneficiary_postal: str
    beneficiary_city: str
    beneficiary_phone: str
    beneficiary_email: str
    beneficiary_iban: str

    ER_number: str
    refund_mod: str = "Virement bancaire"
    attachment_list: str = "Voir justificatifs joints"

    items: List[ExpenseItem]
    final_price: float


# =============================================================================
# DOCUMENT RENDERING LOGIC
# =============================================================================
def tex_safe(value: str) -> str:
    """Replaces empty strings with a LaTeX non-breaking space (~) to avoid compilation errors."""
    if not value or str(value).strip() == "":
        return "~"
    return str(value)


def generate_latex(
    data: NDFData, receipt_file_paths: list, signature_path: str, logo_path: str
) -> str:
    """Creates LaTeX code from the provided Pydantic models and file paths."""

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

    # Format items to match the template requirements
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
        # Static Toulouse address for the N7 association
        "association_adress": tex_safe("2 rue Charles Camichel"),
        "association_postal": tex_safe("31000"),
        "association_city": tex_safe("Toulouse"),
        "signature_location": tex_safe(data.signature_location),
        "association_name": tex_safe(data.association_name),
        "association_email": tex_safe(data.association_email),
        "mandate": tex_safe(data.mandate),
        "treasurer_name": tex_safe(data.treasurer_name),
        "treasurer_surname": tex_safe(data.treasurer_surname),
        "beneficiary_name": tex_safe(data.beneficiary_name),
        "beneficiary_surname": tex_safe(data.beneficiary_surname),
        "refund_mod": tex_safe(data.refund_mod),
        "attachment_list": tex_safe(data.attachment_list),
        "ER_number": tex_safe(data.ER_number),
        "beneficiary_adress": tex_safe(data.beneficiary_adress),
        "beneficiary_postal": tex_safe(data.beneficiary_postal),
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
    data: NDFData,
    format_type: str,
    signature_content: Optional[bytes] = None,
    logo_content: Optional[bytes] = None,
    receipts: List[tuple[str, bytes]] = [],
) -> tuple[bytes, str]:
    """
    Main business logic for compiling the PDF or LaTeX document.
    Handles temporary directories, EXIF transposition for image attachments,
    Tectonic compilation, and PDF merging.

    Returns:
        (content_bytes, media_type)
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        signature_path = ""
        logo_path = ""
        pdf_receipts = []
        images_receipts = []

        # Save signature if present
        if signature_content:
            signature_path = os.path.join(temp_dir, "signature.png")
            with open(signature_path, "wb") as f:
                f.write(signature_content)

        # Save logo if present
        if logo_content:
            logo_path = os.path.join(temp_dir, "logo.png")
            with open(logo_path, "wb") as f:
                f.write(logo_content)

        # Save and process attachments
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
                # Transpose image based on EXIF to keep correct orientation
                try:
                    img = Image.open(receipt_path)
                    transposed_img = ImageOps.exif_transpose(img)
                    transposed_img.save(receipt_path)
                    images_receipts.append(receipt_path)
                except Exception as e:
                    print(f"Error processing image {filename}: {e}")

        # Render the LaTeX template
        try:
            latex_code = generate_latex(
                data, images_receipts, signature_path, logo_path
            )
        except Exception as e:
            raise ValueError(f"Jinja template error: {str(e)}")

        # Return raw latex if requested
        if format_type.lower() == "latex":
            return latex_code.encode("utf-8"), "application/x-tex"

        # Otherwise compile to PDF
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
            raise ValueError(f"Tectonic compilation error: {e.stderr}")

        generated_pdf = os.path.join(temp_dir, "temp.pdf")
        final_pdf_path = os.path.join(temp_dir, "final.pdf")

        if not os.path.exists(generated_pdf):
            raise FileNotFoundError("The PDF was not generated by tectonic.")

        # Merge NDF PDF with PDF attachments
        merger = PdfWriter()
        merger.append(generated_pdf)
        for pdf_path in pdf_receipts:
            merger.append(pdf_path)

        with open(final_pdf_path, "wb") as f_out:
            merger.write(f_out)
        merger.close()

        # Read the resulting merged PDF
        with open(final_pdf_path, "rb") as f:
            pdf_bytes = f.read()

        return pdf_bytes, "application/pdf"
