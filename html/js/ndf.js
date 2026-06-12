/**
 * @file ndf.js
 * @description Gestion de l'envoi et de la génération des notes de frais (PDF/LaTeX).
 */

import { generateExpenseReport } from './api.js';
import { showToast } from './ui.js';
import { state } from './state.js';

/**
 * Récupère les données saisies, construit la requête FormData et télécharge le fichier généré.
 *
 * @param {string} format Format de sortie souhaité ('pdf' ou 'latex').
 */
export async function handleGenerateNDF(format) {
    const num = document.getElementById('expense-report-number').value;
    const mandate = document.getElementById('set-mandate').value;
    const beneficiaryId = document.getElementById('select-beneficiary').value;
    const isFormValid = document.getElementById('settings-form').checkValidity();
    const signatureFile = document.getElementById('set-signature').files[0];

    if (!isFormValid) {
        showToast("Veuillez remplir toutes les informations de l'association.", 'error');
        return;
    }
    if (!signatureFile) {
        showToast('La signature est requise pour générer la note de frais.', 'error');
        return;
    }
    if (!beneficiaryId) {
        showToast('Veuillez sélectionner un bénéficiaire.', 'error');
        return;
    }
    if (!num || !mandate.match(/^\d{4}-\d{4}$/)) {
        showToast('Format de mandat ou numéro NDF invalide.', 'error');
        return;
    }

    const totalAmountStr = document.getElementById('grand-total').textContent;
    const totalAmount = parseFloat(totalAmountStr) || 0;
    if (totalAmount === 0) {
        showToast('Veuillez ajouter au moins une dépense valide.', 'error');
        return;
    }

    const year = mandate.split('-')[1];
    const paddedNum = String(num).padStart(3, '0');
    const finalFileName = `NDF-${year}-${paddedNum}`;

    showToast(`Génération du ${format.toUpperCase()} en cours...`, 'info');

    const beneficiary = state.beneficiaries.find(x => x.id == beneficiaryId);

    const items = [];
    document.querySelectorAll('.expense-row').forEach((row) => {
        const qty = parseInt(row.querySelector('.expense-qty').value, 10) || 0;
        const ref = row.querySelector('.expense-label').value || 'Sans libellé';
        const price = parseFloat(row.querySelector('.expense-price').value) || 0;
        if (qty > 0) {
            items.push({
                quantity: qty,
                reference: ref,
                unit_price: price,
                total_price: qty * price
            });
        }
    });

    // Données correspondant au schéma Pydantic ExpenseReportData
    const expenseReportData = {
        association_name: localStorage.getItem('club_nom'),
        association_email: document.getElementById('set-email').value,
        mandate,
        treasurer_first_name: document.getElementById('set-first-name').value,
        treasurer_last_name: document.getElementById('set-last-name').value,
        signature_location: document.getElementById('set-location').value,
        beneficiary_first_name: beneficiary.first_name,
        beneficiary_last_name: beneficiary.last_name,
        beneficiary_address: beneficiary.address,
        beneficiary_postal_code: beneficiary.postal_code,
        beneficiary_city: beneficiary.city,
        beneficiary_phone: beneficiary.phone || '',
        beneficiary_email: beneficiary.email,
        beneficiary_iban: beneficiary.iban,
        er_number: paddedNum,
        refund_method: 'Virement bancaire',
        attachment_list: 'Voir justificatifs joints',
        items,
        final_price: totalAmount
    };

    const formData = new FormData();
    formData.append('data_json', JSON.stringify(expenseReportData));
    formData.append('format', format);
    formData.append('signature', signatureFile);

    // Ajout des fichiers justificatifs collectés dans l'état global
    state.selectedReceipts.forEach((file) => {
        formData.append('receipts', file);
    });

    try {
        const blob = await generateExpenseReport(formData);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `${finalFileName}.${format === 'latex' ? 'tex' : format}`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

        showToast('Document généré avec succès !', 'success');
    } catch (error) {
        console.error(error);
        showToast(`Échec de la génération : ${error.message}`, 'error');
    }
}
