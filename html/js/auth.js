/**
 * @file auth.js
 * @description Gestion des sessions, de la connexion et des changements de mots de passe.
 */

import { login, fetchSettings, changePassword } from './api.js';
import { showView, showToast, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { resetExpensesTable } from './expenses.js';
import { updateBeneficiarySelect, updateSelectedBeneficiary } from './ui.js';

/**
 * Configure les éléments graphiques du menu et de la barre de navigation selon la session active.
 *
 * @param {string} clubId Identifiant unique du club connecté.
 * @param {string} clubName Nom humain du club ou de l'association.
 * @param {Function} navigateToView Callback de navigation vers une vue spécifique.
 */
export function setupSessionUI(clubId, clubName, navigateToView) {
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('menu-navigation').classList.remove('hidden');

    if (clubId === 'admin') {
        document.getElementById('nav-admin-btn').classList.remove('hidden');

        document.getElementById('nav-logo').className = 'w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md';
        document.getElementById('nav-title').textContent = 'Admin AE';
        showToast("Connecté en tant qu'Admin", 'success');
        navigateToView('view-admin');
    } else {
        document.getElementById('nav-admin-btn').classList.add('hidden');

        document.getElementById('nav-logo').className = 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md';
        document.getElementById('nav-title').textContent = `${clubName}`;
        showToast(`Connecté : ${clubName}`, 'success');
        navigateToView('view-expenses');
    }
}

/**
 * Gère la déconnexion de l'utilisateur courant en effaçant les tokens en stockage local.
 *
 * @param {Function} navigateToView Callback de navigation.
 */
export function handleLogout(navigateToView) {
    document.getElementById('settings-form')?.reset();
    document.getElementById('login-form')?.reset();
    document.getElementById('form-add-beneficiary')?.reset();
    document.getElementById('expense-report-number').value = '';

    localStorage.removeItem('token');
    localStorage.removeItem('club_id');
    localStorage.removeItem('club_nom');

    window.location.reload();
}

/**
 * Restaure une session active existante stockée dans le localStorage au démarrage.
 *
 * @param {Function} navigateToView Callback de navigation.
 */
export async function restoreSession(navigateToView) {
    const token = localStorage.getItem('token');
    const clubId = localStorage.getItem('club_id');
    const clubName = localStorage.getItem('club_nom');

    if (token && clubId) {
        state.currentUser = clubId;
        try {
            // Validation implicite du token en récupérant les configurations
            await fetchSettings();
            setupSessionUI(clubId, clubName, navigateToView);
        } catch (e) {
            console.warn('Session expirée, déconnexion...');
            handleLogout(navigateToView);
        }
    } else {
        navigateToView('view-login');
    }
}

/**
 * Traite la soumission du formulaire de connexion utilisateur.
 *
 * @param {string} loginID Identifiant.
 * @param {string} loginPass Mot de passe.
 * @param {Function} navigateToView Callback de navigation.
 */
export async function handleLogin(loginID, loginPass, navigateToView) {
    try {
        const data = await login(loginID, loginPass);
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('club_id', data.club_id);
        localStorage.setItem('club_nom', data.name);

        state.currentUser = data.club_id;
        setupSessionUI(data.club_id, data.name, navigateToView);
    } catch (error) {
        console.error(error);
        showToast(`Connexion échouée : ${error.message}`, 'error');
    }
}

/**
 * Affiche la fenêtre modale permettant de changer le mot de passe actuel du compte.
 */
export function openChangePasswordModal() {
    const content = `
        <div class="text-left">
            <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
                <i class="ph ph-key text-orange-500"></i> Changer de mot de passe
            </h3>
            <form id="form-change-password" class="space-y-4">
                <div>
                    <label class="block text-xs font-medium text-gray-500 ml-1 mb-1">Ancien mot de passe</label>
                    <input type="password" id="chg-old-pass" class="apple-input bg-gray-50/50" required>
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 ml-1 mb-1">Nouveau mot de passe</label>
                    <input type="password" id="chg-new-pass" class="apple-input bg-gray-50/50" required>
                </div>
                <div class="flex gap-3 justify-end pt-4">
                    <button type="button" id="modal-cancel-btn" class="apple-btn-secondary">Annuler</button>
                    <button type="submit" class="apple-btn-primary">Enregistrer</button>
                </div>
            </form>
        </div>
    `;
    openModal(content);

    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);
    document.getElementById('form-change-password').addEventListener('submit', async (e) => {
        e.preventDefault();
        const oldPass = document.getElementById('chg-old-pass').value;
        const newPass = document.getElementById('chg-new-pass').value;
        try {
            await changePassword(oldPass, newPass);
            showToast('Mot de passe changé avec succès', 'success');
            closeModal();
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });
}
