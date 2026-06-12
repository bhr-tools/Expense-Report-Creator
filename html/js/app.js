/**
 * @file app.js
 * @description Point d'entrée de l'application front-end. Orchestre les modules et abonne les événements du DOM.
 */

import {
    fetchSettings,
    saveSettings,
    fetchBeneficiaries,
    fetchClubs,
    createClub
} from './api.js';

import {
    showView,
    showToast,
    openModal,
    closeModal,
    renderClubs,
    renderBeneficiaries,
    updateBeneficiarySelect,
    updateSelectedBeneficiary,
    renderUploadedFiles
} from './ui.js';

import {
    handleLogout,
    restoreSession,
    handleLogin,
    openChangePasswordModal
} from './auth.js';

import {
    addNewExpenseRow,
    recalculateTotals,
    handleExcelPaste
} from './expenses.js';

import {
    handleDeleteBeneficiary,
    handleAddBeneficiary,
    formatPostalCodeInput,
    formatPhoneInput,
    formatIbanInput
} from './beneficiaries.js';

import {
    handleResetPassword,
    handleDeleteClub,
    modalNewPassword
} from './admin.js';

import {
    handleGenerateNDF
} from './ndf.js';

import { state } from './state.js';

/**
 * Gère le rechargement de la liste des bénéficiaires et met à jour l'interface.
 */
async function refreshBeneficiaries() {
    try {
        state.beneficiaries = await fetchBeneficiaries();
        renderBeneficiaries(state.beneficiaries, (id, name) => {
            handleDeleteBeneficiary(id, name, refreshBeneficiaries);
        });

        // Met à jour la liste déroulante sur la vue des notes de frais
        const select = document.getElementById('select-beneficiary');
        if (select) {
            updateBeneficiarySelect(state.beneficiaries);
            updateSelectedBeneficiary(state.beneficiaries, select.value);
        }
    } catch (err) {
        showToast(`Erreur d'actualisation des bénéficiaires : ${err.message}`, 'error');
    }
}

/**
 * Gère le rechargement de la liste des clubs (réservé admin).
 */
async function refreshClubs() {
    try {
        state.clubs = await fetchClubs();
        renderClubs(state.clubs, handleResetPassword, (clubId, clubName) => {
            handleDeleteClub(clubId, clubName, refreshClubs);
        });
    } catch (err) {
        showToast(`Erreur d'actualisation des clubs : ${err.message}`, 'error');
    }
}

/**
 * Navigue vers la vue spécifiée et déclenche les appels API requis pour charger la vue.
 *
 * @param {string} viewID Identifiant de la vue (ex: 'view-expenses').
 */
async function navigateToView(viewID) {
    showView(viewID);
    try {
        if (viewID === 'view-beneficiaries') {
            await refreshBeneficiaries();
        } else if (viewID === 'view-expenses') {
            state.beneficiaries = await fetchBeneficiaries();
            updateBeneficiarySelect(state.beneficiaries);
            state.settings = await fetchSettings();
            loadSettingsForm();
            triggerNdfPreviewUpdate();
        } else if (viewID === 'view-admin') {
            if (state.currentUser !== 'admin') {
                showToast('Accès non autorisé', 'error');
                navigateToView('view-expenses');
                return;
            }
            await refreshClubs();
        }
    } catch (err) {
        console.error(err);
        showToast(`Erreur de chargement : ${err.message}`, 'error');
    }
}

/**
 * Remplit les champs du formulaire des paramètres de l'association à partir de l'état global.
 */
function loadSettingsForm() {
    document.getElementById('set-last-name').value = state.settings.last_name || '';
    document.getElementById('set-first-name').value = state.settings.first_name || '';
    document.getElementById('set-email').value = state.settings.email || '';
    document.getElementById('set-mandate').value = state.settings.mandate || '';
    document.getElementById('set-location').value = state.settings.location || '';
}

/**
 * Envoie la sauvegarde automatique des paramètres au serveur.
 */
async function handleSaveSettings() {
    const data = {
        last_name: document.getElementById('set-last-name').value,
        first_name: document.getElementById('set-first-name').value,
        email: document.getElementById('set-email').value,
        mandate: document.getElementById('set-mandate').value,
        location: document.getElementById('set-location').value
    };
    try {
        await saveSettings(data);
        state.settings = data;
    } catch (error) {
        console.error(error);
        showToast('Erreur lors de la sauvegarde automatique des paramètres', 'error');
    }
}

/**
 * Affiche l'aperçu du numéro de note de frais si le format est correct.
 *
 * @param {string} mandate Année de mandat (AAAA-AAAA).
 * @param {string|number} num Numéro incrémentiel de note de frais.
 */
function updateNdfPreview(mandate, num) {
    const preview = document.getElementById('ndf-preview');
    if (!preview) return; // Protection si l'élément n'existe pas dans le DOM

    if (mandate && mandate.match(/^\d{4}-\d{4}$/) && num) {
        const year = mandate.split('-')[1];
        const paddedNum = String(num).padStart(3, '0');
        preview.innerHTML = `Aperçu : <strong class="text-blue-600">NDF-${year}-${paddedNum}</strong>`;
    } else {
        preview.innerHTML = 'Aperçu : En attente de données valides...';
    }
}

/**
 * Déclenche la mise à jour de l'aperçu textuel de la note de frais.
 */
function triggerNdfPreviewUpdate() {
    const mandate = document.getElementById('set-mandate').value;
    const num = document.getElementById('expense-report-number').value;
    updateNdfPreview(mandate, num);
}

/**
 * Supprime un fichier justificatif de l'état global et rafraîchit l'affichage.
 *
 * @param {number} index Index du fichier dans le tableau d'état local.
 */
function handleDeleteUploadedFile(index) {
    state.selectedReceipts.splice(index, 1);
    renderUploadedFiles(state.selectedReceipts, handleDeleteUploadedFile);
}

/**
 * Intègre de nouveaux fichiers justificatifs dans l'état global et rafraîchit l'affichage.
 *
 * @param {FileList} files Liste des fichiers importés.
 */
function handleNewFiles(files) {
    Array.from(files).forEach((file) => {
        // Évite les doublons sur le nom et la taille du fichier
        const isDuplicate = state.selectedReceipts.some(
            oldFile => oldFile.size === file.size && oldFile.name === file.name
        );
        if (!isDuplicate) {
            state.selectedReceipts.push(file);
        }
    });
    renderUploadedFiles(state.selectedReceipts, handleDeleteUploadedFile);
    document.getElementById('file-upload').value = '';
}

// Initialisation globale au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone');

    // Fermeture de la boîte modale sur clic en arrière-plan
    document.getElementById('modal-bg').addEventListener('click', closeModal);

    // Fermeture de la boîte modale sur appui de la touche Échap
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('custom-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });

    // Liaison des boutons du menu de navigation
    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.dataset.target;
            navigateToView(target);
        });
    });

    // Formulaire de connexion
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const loginID = document.getElementById('login-id').value.trim();
        const loginPass = document.getElementById('login-pass').value;
        handleLogin(loginID, loginPass, navigateToView);
    });

    // Bouton de déconnexion
    document.getElementById('logout-btn').addEventListener('click', () => handleLogout(navigateToView));

    // Bouton de changement de mot de passe (modale)
    document.getElementById('change-password-btn').addEventListener('click', openChangePasswordModal);

    // Sauvegarde automatique des paramètres lors de modifications du formulaire
    document.getElementById('settings-form').addEventListener('change', handleSaveSettings);

    // Écouteurs de mise à jour de l'aperçu de la note de frais
    document.getElementById('set-mandate').addEventListener('input', triggerNdfPreviewUpdate);
    document.getElementById('expense-report-number').addEventListener('input', triggerNdfPreviewUpdate);

    // Changement de bénéficiaire sélectionné (note de frais)
    document.getElementById('select-beneficiary').addEventListener('change', (e) => {
        updateSelectedBeneficiary(state.beneficiaries, e.target.value);
    });

    // Formulaire d'ajout de bénéficiaire
    document.getElementById('form-add-beneficiary').addEventListener('submit', (e) => {
        handleAddBeneficiary(e, refreshBeneficiaries);
    });

    // Formatage automatique des masques de saisie (bénéficiaires)
    document.getElementById('b-postal-code').addEventListener('input', (e) => formatPostalCodeInput(e.target));
    document.getElementById('b-phone').addEventListener('input', (e) => formatPhoneInput(e.target));
    document.getElementById('b-iban').addEventListener('input', (e) => formatIbanInput(e.target));

    // Bouton d'ajout d'une ligne de frais
    document.getElementById('add-expense-row-btn').addEventListener('click', () => addNewExpenseRow());

    // Importation de tableau par collage (type Excel)
    document.getElementById('expenses-table').addEventListener('paste', handleExcelPaste);

    // Gestion de la zone d'upload des pièces jointes
    uploadZone.addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-gray-300');
        uploadZone.classList.add('border-blue-500', 'bg-blue-50/30');
    });

    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-blue-500', 'bg-blue-50/30');
        uploadZone.classList.add('border-gray-300');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('border-blue-500', 'bg-blue-50/30');
        uploadZone.classList.add('border-gray-300');
        handleNewFiles(e.dataTransfer.files);
    });

    document.getElementById('file-upload').addEventListener('change', (e) => {
        handleNewFiles(e.target.files);
    });

    // Téléchargement des justificatifs/notes de frais
    document.getElementById('download-pdf-btn').addEventListener('click', () => handleGenerateNDF('pdf'));
    document.getElementById('download-latex-btn').addEventListener('click', () => handleGenerateNDF('latex'));

    // Modale de création de club (Panel d'administration)
    document.getElementById('create-club-btn').addEventListener('click', () => {
        const content = `
            <div class="text-left">
                <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                    <i class="ph ph-plus-circle text-blue-500"></i> Créer un Club
                </h3>
                <form id="form-create-club" class="space-y-4">
                    <div>
                        <label class="block text-xs font-medium text-gray-500 ml-1 mb-1">Identifiant unique (club_id)</label>
                        <input type="text" id="new-club-id" class="apple-input bg-gray-50/50" placeholder="ex: club_photo" required>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-500 ml-1 mb-1">Nom du club</label>
                        <input type="text" id="new-club-nom" class="apple-input bg-gray-50/50" placeholder="ex: Club Photo N7" required>
                    </div>
                    <div class="flex gap-3 justify-end pt-4">
                        <button type="button" id="modal-cancel-btn" class="apple-btn-secondary">Annuler</button>
                        <button type="submit" class="apple-btn-primary">Créer</button>
                    </div>
                </form>
            </div>
        `;
        openModal(content);
        document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
        document.getElementById('form-create-club').addEventListener('submit', async (formEvent) => {
            formEvent.preventDefault();
            const clubId = document.getElementById('new-club-id').value.toLowerCase().trim();
            const name = document.getElementById('new-club-nom').value.trim();
            try {
                const responseData = await createClub({ club_id: clubId, name });
                showToast(`Club '${name}' créé avec succès`, 'success');
                modalNewPassword(name, responseData.password);
                await refreshClubs();
            } catch (error) {
                showToast(`Échec : ${error.message}`, 'error');
            }
        });
    });

    // Ajoute une première ligne par défaut dans le tableau de saisie des frais
    addNewExpenseRow();

    // Restaure la session si l'utilisateur possède déjà un jeton JWT valide
    restoreSession(navigateToView);
});