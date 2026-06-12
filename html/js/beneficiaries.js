/**
 * @file beneficiaries.js
 * @description Gestion des bénéficiaires : suppression avec confirmation, création et formateurs de saisie.
 */

import { deleteBeneficiary, addBeneficiary } from './api.js';
import { openModal, closeModal, showToast } from './ui.js';

/**
 * Supprime un bénéficiaire de l'application après confirmation visuelle.
 *
 * @param {number|string} id Identifiant du bénéficiaire.
 * @param {string} name Nom complet du bénéficiaire pour affichage dans la modale.
 * @param {Function} onUpdate Callback à déclencher après suppression réussie.
 */
export async function handleDeleteBeneficiary(id, name, onUpdate) {
    const content = `
        <div class="text-center">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="ph ph-trash text-3xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2">Supprimer le bénéficiaire ?</h3>
            <p class="text-sm text-gray-500 mb-6">Voulez-vous vraiment supprimer le bénéficiaire <strong>${name}</strong> ?</p>
            <div class="flex gap-3 justify-center">
                <button id="modal-cancel-btn" class="apple-btn-secondary">Annuler</button>
                <button id="modal-confirm-btn" class="apple-btn-primary !bg-red-500 hover:!bg-red-600">Supprimer</button>
            </div>
        </div>
    `;
    openModal(content);

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        try {
            await deleteBeneficiary(id);
            showToast('Bénéficiaire supprimé', 'info');
            closeModal();
            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            showToast(`Échec de la suppression : ${error.message}`, 'error');
        }
    });
}

/**
 * Traite la soumission du formulaire pour créer un nouveau bénéficiaire.
 *
 * @param {Event} event Événement de soumission.
 * @param {Function} onUpdate Callback à déclencher après création réussie.
 */
export async function handleAddBeneficiary(event, onUpdate) {
    event.preventDefault();

    const beneficiaryData = {
        first_name: document.getElementById('b-first-name').value.trim(),
        last_name: document.getElementById('b-last-name').value.trim(),
        address: document.getElementById('b-address').value.trim(),
        postal_code: document.getElementById('b-postal-code').value.trim(),
        city: document.getElementById('b-city').value.trim(),
        email: document.getElementById('b-email').value.trim(),
        phone: document.getElementById('b-phone').value.trim(),
        iban: document.getElementById('b-iban').value.trim()
    };

    try {
        await addBeneficiary(beneficiaryData);
        showToast('Bénéficiaire ajouté avec succès', 'success');
        event.target.reset();
        if (onUpdate) {
            await onUpdate();
        }
    } catch (error) {
        showToast(`Échec : ${error.message}`, 'error');
    }
}

/**
 * Formate en temps réel la saisie du code postal (chiffres uniquement, longueur max 5).
 *
 * @param {HTMLInputElement} input Élément DOM input.
 */
export function formatPostalCodeInput(input) {
    const rawVal = input.value.replace(/[^0-9]/g, '');
    input.value = rawVal.substring(0, 5);
}

/**
 * Formate en temps réel le numéro de téléphone (espaces tous les 2 chiffres, max 10).
 *
 * @param {HTMLInputElement} input Élément DOM input.
 */
export function formatPhoneInput(input) {
    const rawVal = input.value.replace(/[^0-9]/g, '').substring(0, 10);
    input.value = rawVal.replace(/(.{2})/g, '$1 ').trim();
}

/**
 * Formate en temps réel le code IBAN (espaces tous les 4 caractères, majuscules).
 *
 * @param {HTMLInputElement} input Élément DOM input.
 */
export function formatIbanInput(input) {
    const rawVal = input.value.replace(/[^\w]/g, '').toUpperCase().substring(0, 34);
    input.value = rawVal.replace(/(.{4})/g, '$1 ').trim();
}
