/**
 * @file admin.js
 * @description Opérations d'administration : réinitialisation de mot de passe et suppression de club.
 */

import { resetPassword, deleteClub, uploadLogo } from './api.js';
import { openModal, closeModal, showToast } from './ui.js';


export function modalNewPassword(clubName, newPass) {
    const copyContent = `
        <div class="text-center">
            <div class="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="ph ph-check-circle text-3xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2">Nouveau mot de passe</h3>
            <p class="text-sm text-gray-500 mb-4">Voici le nouveau mot de passe pour <strong>${clubName}</strong>. Copiez-le soigneusement et transmettez-le au club.</p>
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                <span class="font-mono text-2xl font-bold text-gray-800 tracking-wider">${newPass}</span>
            </div>
            <button id="modal-close-btn" class="apple-btn-primary w-full">Fermer</button>
        </div>
    `;
    openModal(copyContent);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
}

/**
 * Déclenche le flux de réinitialisation de mot de passe d'un club après confirmation.
 * Affiche ensuite le nouveau mot de passe généré dans une boîte de dialogue.
 *
 * @param {string} clubId Identifiant unique du club.
 * @param {string} clubName Nom humain du club.
 */
export async function handleResetPassword(clubId, clubName) {
    const content = `
        <div class="text-center">
            <div class="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="ph ph-warning text-3xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2">Régénérer le mot de passe ?</h3>
            <p class="text-sm text-gray-500 mb-6">Êtes-vous sûr de vouloir générer un nouveau mot de passe pour <strong>${clubName}</strong> ? L'ancien ne fonctionnera plus.</p>
            <div class="flex gap-3 justify-center">
                <button id="modal-cancel-btn" class="apple-btn-secondary">Annuler</button>
                <button id="modal-confirm-btn" class="apple-btn-primary !bg-orange-500 hover:!bg-orange-600">Confirmer</button>
            </div>
        </div>
    `;
    openModal(content);

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', async () => {
        try {
            const resData = await resetPassword(clubId);
            const newPass = resData.password;
            modalNewPassword(clubName, newPass);
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });
}

/**
 * Supprime définitivement un club du système après validation de l'administrateur.
 *
 * @param {string} clubId Identifiant du club à supprimer.
 * @param {string} clubName Nom du club.
 * @param {Function} onUpdate Callback à déclencher pour actualiser le tableau après suppression.
 */
export async function handleDeleteClub(clubId, clubName, onUpdate) {
    const content = `
        <div class="text-center">
            <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="ph ph-trash text-3xl"></i>
            </div>
            <h3 class="text-xl font-bold mb-2">Supprimer le club ?</h3>
            <p class="text-sm text-gray-500 mb-6">Êtes-vous sûr de vouloir supprimer définitivement le club <strong>${clubName}</strong> et toutes ses données ? Cette action est irréversible.</p>
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
            await deleteClub(clubId);
            showToast(`Club '${clubName}' supprimé avec succès`, 'info');
            closeModal();
            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });
}

/**
 * Upload le nouveau logo d'un club.
 *
 * @param {File} logo
 */
export async function handleUploadLogo(clubId, clubName, logo) {
    const formData = new FormData();
    formData.append('club_id', clubId)
    formData.append('logo', logo)
    try {
        await uploadLogo(clubId, formData)
        showToast(`Logo de ${clubName} modifié avec succès`)
    } catch (error) {
        showToast(`Échec : ${error.message}`, 'error');
    }
}
