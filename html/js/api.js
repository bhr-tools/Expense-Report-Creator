/**
 * @file api.js
 * @description Fonctions d'appel à l'API de gestion des notes de frais.
 */

const BASE_URL = 'http://localhost:8000';

/**
 * Construit les en-têtes HTTP requis pour les requêtes de l'API.
 * Injection automatique du token Bearer si présent dans le localStorage.
 *
 * @param {Object} [extraHeaders={}] En-têtes supplémentaires à fusionner.
 * @returns {Object} Dictionnaire d'en-têtes HTTP configurés.
 */
function getHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...extraHeaders };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * Intercepte et valide la réponse HTTP de l'API. Levée d'erreur si statut non-ok.
 *
 * @param {Response} response Réponse brute de fetch.
 * @returns {Promise<Response>} Promesse résolvant la réponse d'origine si valide.
 * @throws {Error} Message extrait du détail de l'erreur API ou statut HTTP.
 */
async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = `HTTP error: ${response.status}`;
        try {
            const errData = await response.json();
            errorMessage = errData.detail || errorMessage;
        } catch (_) {
            // Ignoré si le corps n'est pas un JSON valide
        }
        throw new Error(errorMessage);
    }
    return response;
}

/**
 * Connecte un club ou l'administrateur.
 *
 * @param {string} clubId Identifiant unique du club.
 * @param {string} password Mot de passe associé.
 * @returns {Promise<Object>} Promesse résolvant les données de session (token, nom du club).
 */
export async function login(clubId, password) {
    const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, password })
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Récupère les paramètres de l'association pour le club connecté.
 *
 * @returns {Promise<Object>} Les données de configuration de l'association.
 */
export async function fetchSettings() {
    const response = await fetch(`${BASE_URL}/api/settings`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Sauvegarde les paramètres de l'association pour le club connecté.
 *
 * @param {Object} settingsData Données à enregistrer (first_name, last_name, etc.).
 * @returns {Promise<Object>} Résultat de la mise à jour.
 */
export async function saveSettings(settingsData) {
    const response = await fetch(`${BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(settingsData)
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Récupère la liste des bénéficiaires enregistrés pour le club connecté.
 *
 * @returns {Promise<Array<Object>>} Liste des bénéficiaires.
 */
export async function fetchBeneficiaries() {
    const response = await fetch(`${BASE_URL}/api/beneficiaries`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Crée un nouveau bénéficiaire pour le club connecté.
 *
 * @param {Object} beneficiaryData Coordonnées du bénéficiaire.
 * @returns {Promise<Object>} Statut et ID créé.
 */
export async function addBeneficiary(beneficiaryData) {
    const response = await fetch(`${BASE_URL}/api/beneficiaries`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(beneficiaryData)
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Supprime un bénéficiaire de la base du club.
 *
 * @param {number|string} id Identifiant numérique du bénéficiaire.
 * @returns {Promise<Object>} Statut de l'opération.
 */
export async function deleteBeneficiary(id) {
    const response = await fetch(`${BASE_URL}/api/beneficiaries/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Récupère la liste de tous les clubs (réservé admin).
 *
 * @returns {Promise<Array<Object>>} Liste des clubs enregistrés.
 */
export async function fetchClubs() {
    const response = await fetch(`${BASE_URL}/api/admin/clubs`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Crée un nouveau compte de club (réservé admin).
 *
 * @param {Object} clubData Informations du club (club_id, name, password).
 * @returns {Promise<Object>} Statut de la création.
 */
export async function createClub(clubData) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(clubData)
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Réinitialise le mot de passe d'un club et renvoie un mot de passe temporaire (réservé admin).
 *
 * @param {string} clubId Identifiant du club ciblé.
 * @returns {Promise<Object>} Contient le mot de passe généré en clair.
 */
export async function resetPassword(clubId) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs/reset-password`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ club_id: clubId })
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Supprime définitivement un club et toutes ses données (réservé admin).
 *
 * @param {string} clubId Identifiant du club.
 * @returns {Promise<Object>} Statut de l'opération.
 */
export async function deleteClub(clubId) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs/${clubId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Modifie le mot de passe du compte actuellement authentifié.
 *
 * @param {string} oldPassword Ancien mot de passe.
 * @param {string} newPassword Nouveau mot de passe.
 * @returns {Promise<Object>} Statut de l'opération.
 */
export async function changePassword(oldPassword, newPassword) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs/change-password`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    });
    const validResponse = await handleResponse(response);
    return validResponse.json();
}

/**
 * Envoie la requête multipart de compilation de la note de frais.
 *
 * @param {FormData} formData Objet FormData contenant le JSON et les fichiers joints.
 * @returns {Promise<Blob>} Le fichier PDF ou LaTeX compilé sous forme de Blob.
 */
export async function generateExpenseReport(formData) {
    const response = await fetch(`${BASE_URL}/api/expense-reports/generate`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
    });
    const validResponse = await handleResponse(response);
    return validResponse.blob();
}