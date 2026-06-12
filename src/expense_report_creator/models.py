"""Modèles de données Pydantic.

Ce module définit tous les schémas de validation des requêtes et des
réponses de l'API.
"""

from typing import List

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Requête d'authentification pour un club ou l'administrateur."""

    club_id: str
    password: str


class SettingsUpdateRequest(BaseModel):
    """Requête de mise à jour des paramètres de l'association."""

    first_name: str
    last_name: str
    email: str
    mandate: str
    location: str


class BeneficiaryRequest(BaseModel):
    """Requête de création/mise à jour d'un bénéficiaire."""

    first_name: str
    last_name: str
    address: str
    postal_code: str
    city: str
    email: str
    phone: str
    iban: str


class ClubCreateRequest(BaseModel):
    """Requête de création d'un nouveau club par l'administrateur."""

    club_id: str
    name: str


class ResetPasswordRequest(BaseModel):
    """Requête de réinitialisation de mot de passe par l'administrateur."""

    club_id: str


class ChangePasswordRequest(BaseModel):
    """Requête de changement de mot de passe par un utilisateur connecté."""

    old_password: str
    new_password: str


class ExpenseItem(BaseModel):
    """Représente une ligne individuelle de dépense dans la note de frais."""

    quantity: int
    reference: str
    unit_price: float
    total_price: float


class ExpenseReportData(BaseModel):
    """Modèle contenant toutes les données nécessaires pour générer la note de frais."""

    association_name: str
    association_email: str
    mandate: str
    treasurer_first_name: str
    treasurer_last_name: str
    signature_location: str

    beneficiary_first_name: str
    beneficiary_last_name: str
    beneficiary_address: str
    beneficiary_postal_code: str
    beneficiary_city: str
    beneficiary_phone: str
    beneficiary_email: str
    beneficiary_iban: str

    er_number: str
    refund_method: str = "Virement bancaire"
    attachment_list: str = "Voir justificatifs joints"

    items: List[ExpenseItem]
    final_price: float
