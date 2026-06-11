import {
    login,
    fetchSettings,
    saveSettings,
    fetchBeneficiaires,
    addBeneficiaire,
    deleteBeneficiaire,
    fetchClubs,
    createClub,
    resetPassword,
    deleteClub,
    changePassword,
    generateNDF
} from './api.js';

import {
    showView,
    showToast,
    openModal,
    closeModal,
    renderClubs,
    renderBeneficiaires,
    updateBeneficiaireSelect,
    updateSelectedBeneficiary,
    renderUploadedFiles
} from './ui.js';

// Global application state
const state = {
    currentUser: null,
    beneficiaires: [],
    clubs: [],
    settings: {
        nom: '',
        prenom: '',
        email: '',
        mandat: '',
        location: ''
    },
    selectedReceipts: []
};

// =============================================================================
// NAVIGATION & VIEW CONTROLLER
// =============================================================================
async function navigateToView(viewID) {
    showView(viewID);
    try {
        if (viewID === 'view-benef') {
            state.beneficiaires = await fetchBeneficiaires();
            renderBeneficiaires(state.beneficiaires, handleDeleteBeneficiaire);
        } else if (viewID === 'view-frais') {
            state.beneficiaires = await fetchBeneficiaires();
            updateBeneficiaireSelect(state.beneficiaires);
            state.settings = await fetchSettings();
            loadSettingsForm();
            triggerNdfPreviewUpdate();
        } else if (viewID === 'view-admin') {
            if (state.currentUser !== 'admin') {
                showToast("Accès non autorisé", "error");
                navigateToView('view-frais');
                return;
            }
            state.clubs = await fetchClubs();
            renderClubs(state.clubs, handleResetPassword, handleDeleteClub);
        }
    } catch (err) {
        console.error(err);
        showToast(`Erreur de chargement : ${err.message}`, 'error');
    }
}

// =============================================================================
// LOGIN & SESSION MANAGEMENT
// =============================================================================
function setupSessionUI(clubId, clubNom) {
    document.getElementById('navbar').classList.remove('hidden');
    document.getElementById('menu-club').classList.remove('hidden');

    if (clubId === 'admin') {
        document.getElementById('nav-admin-btn').classList.remove('hidden');
        document.getElementById('nav-admin-btn').classList.add('flex');

        document.getElementById('nav-logo').className = 'w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold shadow-md';
        document.getElementById('nav-title').textContent = 'Admin AE';
        showToast('Connecté en tant qu\'Admin', 'success');
        navigateToView('view-admin');
    } else {
        document.getElementById('nav-admin-btn').classList.add('hidden');
        document.getElementById('nav-admin-btn').classList.remove('flex');

        document.getElementById('nav-logo').className = 'w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md';
        document.getElementById('nav-title').textContent = `${clubNom}`;
        showToast(`Connecté : ${clubNom}`, 'success');
        navigateToView('view-frais');
    }
}

function handleLogout() {
    state.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('club_id');
    localStorage.removeItem('club_nom');

    document.getElementById('navbar').classList.add('hidden');
    document.getElementById('login-id').value = '';
    document.getElementById('login-pass').value = '';
    showToast('Déconnexion réussie', 'info');
    navigateToView('view-login');
}

async function restoreSession() {
    const token = localStorage.getItem('token');
    const clubId = localStorage.getItem('club_id');
    const clubNom = localStorage.getItem('club_nom');

    if (token && clubId) {
        state.currentUser = clubId;
        try {
            // Validate token using settings fetch
            await fetchSettings();
            setupSessionUI(clubId, clubNom);
        } catch (e) {
            console.warn("Session expirée, déconnexion...");
            handleLogout();
        }
    } else {
        navigateToView('view-login');
    }
}

// =============================================================================
// SETTINGS
// =============================================================================
function loadSettingsForm() {
    document.getElementById('set-nom').value = state.settings.nom || '';
    document.getElementById('set-prenom').value = state.settings.prenom || '';
    document.getElementById('set-email').value = state.settings.email || '';
    document.getElementById('set-mandat').value = state.settings.mandat || '';
    document.getElementById('set-location').value = state.settings.location || '';
}

async function handleSaveSettings() {
    const data = {
        nom: document.getElementById('set-nom').value,
        prenom: document.getElementById('set-prenom').value,
        email: document.getElementById('set-email').value,
        mandat: document.getElementById('set-mandat').value,
        location: document.getElementById('set-location').value
    };
    try {
        await saveSettings(data);
        state.settings = data;
    } catch (error) {
        console.error(error);
        showToast("Erreur lors de la sauvegarde des paramètres", "error");
    }
}

function triggerNdfPreviewUpdate() {
    const mandat = document.getElementById('set-mandat').value;
    const num = document.getElementById('ndf-numero').value;
    updateNdfPreview(mandat, num);
}

// =============================================================================
// EXPENSES (EXCEL SPREADSHEET COPY/PASTE COUPLING)
// =============================================================================
function addNewExpenseRow(qty = 1, label = '', price = 0) {
    const tbody = document.getElementById('expenses-body');
    const tr = document.createElement('tr');
    tr.className = "hover:bg-gray-50/30 transition expense-row group";

    if (typeof price === 'string') {
        price = price.replace(/[€\s]/g, '').replace(',', '.');
    }
    price = parseFloat(price) || 0;
    qty = parseInt(qty) || 1;

    tr.innerHTML = `
        <td class="p-2 border-r border-gray-100">
            <input type="number" min="1" step="1" value="${qty}" class="w-full p-2 bg-transparent outline-none text-center rounded focus:bg-white focus:ring-2 focus:ring-blue-100 expense-qty">
        </td>
        <td class="p-2 border-r border-gray-100">
            <input type="text" value="${label}" placeholder="Ex: Achat fournitures..." class="w-full p-2 bg-transparent outline-none rounded focus:bg-white focus:ring-2 focus:ring-blue-100 expense-label">
        </td>
        <td class="p-2 border-r border-gray-100">
            <input type="number" min="0" step="0.01" value="${price.toFixed(2)}" class="w-full p-2 bg-transparent outline-none text-right rounded focus:bg-white focus:ring-2 focus:ring-blue-100 no-spinners expense-price">
        </td>
        <td class="p-2 bg-gray-50/50 text-right font-medium text-gray-700 expense-row-total border-r border-gray-100">
            ${(qty * price).toFixed(2)} €
        </td>
        <td class="p-2 text-center">
            <button class="delete-row-btn text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                <i class="ph ph-x-circle text-xl"></i>
            </button>
        </td>
    `;

    tr.querySelector('.expense-qty').addEventListener('input', recalculateTotals);
    tr.querySelector('.expense-price').addEventListener('input', recalculateTotals);
    tr.querySelector('.delete-row-btn').addEventListener('click', () => {
        tr.remove();
        recalculateTotals();
    });

    tbody.appendChild(tr);
    recalculateTotals();
}

function recalculateTotals() {
    let globalTotal = 0;
    document.querySelectorAll('.expense-row').forEach(row => {
        const qty = parseInt(row.querySelector('.expense-qty').value) || 0;
        const price = parseFloat(row.querySelector('.expense-price').value) || 0;
        const rowTotal = qty * price;
        row.querySelector('.expense-row-total').textContent = rowTotal.toFixed(2) + ' €';
        globalTotal += rowTotal;
    });
    document.getElementById('grand-total').textContent = globalTotal.toFixed(2) + ' €';
}

// =============================================================================
// NDF GENERATION
// =============================================================================
async function handleGenerateNDF(format) {
    const num = document.getElementById('ndf-numero').value;
    const mandat = document.getElementById('set-mandat').value;
    const benefId = document.getElementById('select-beneficiaire').value;
    const formValid = document.getElementById('settings-form').checkValidity();
    const signatureFile = document.getElementById('set-signature').files[0];

    if (!formValid) {
        showToast("Veuillez remplir toutes les informations de l'association.", 'error');
        return;
    }
    if (!signatureFile) {
        showToast("La signature est requise pour générer la note de frais.", 'error');
        return;
    }
    if (!benefId) {
        showToast("Veuillez sélectionner un bénéficiaire.", 'error');
        return;
    }
    if (!num || !mandat.match(/^\d{4}-\d{4}$/)) {
        showToast("Format de mandat ou numéro NDF invalide.", 'error');
        return;
    }

    const totalAmountStr = document.getElementById('grand-total').textContent;
    const totalAmount = parseFloat(totalAmountStr) || 0;
    if (totalAmount === 0) {
        showToast("Veuillez ajouter au moins une dépense valide.", 'error');
        return;
    }

    const year = mandat.split('-')[1];
    const paddedNum = String(num).padStart(3, '0');
    const finalFileName = `NDF-${year}-${paddedNum}`;

    showToast(`Génération du ${format.toUpperCase()} en cours...`, 'info');

    const benefObj = state.beneficiaires.find(x => x.id == benefId);

    const items = [];
    document.querySelectorAll('.expense-row').forEach(row => {
        const qty = parseInt(row.querySelector('.expense-qty').value) || 0;
        const ref = row.querySelector('.expense-label').value || "Sans libellé";
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

    const ndfData = {
        association_name: localStorage.getItem('club_nom'),
        association_email: document.getElementById('set-email').value,
        mandate: mandat,
        treasurer_name: document.getElementById('set-prenom').value,
        treasurer_surname: document.getElementById('set-nom').value,
        signature_location: document.getElementById('set-location').value,
        beneficiary_name: benefObj.prenom,
        beneficiary_surname: benefObj.nom,
        beneficiary_adress: benefObj.adresse,
        beneficiary_postal: benefObj.postal,
        beneficiary_city: benefObj.ville,
        beneficiary_phone: benefObj.tel || "",
        beneficiary_email: benefObj.email,
        beneficiary_iban: benefObj.iban,
        ER_number: paddedNum,
        refund_mod: "Virement bancaire",
        attachment_list: "Voir justificatifs joints",
        items: items,
        final_price: totalAmount
    };

    const formData = new FormData();
    formData.append('data_json', JSON.stringify(ndfData));
    formData.append('format', format);
    formData.append('signature', signatureFile);

    const receiptsFiles = document.getElementById('file-upload').files;
    state.selectedReceipts.forEach( file => {
        formData.append('receipts', file);
    });

    try {
        const blob = await generateNDF(formData);
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = `${finalFileName}.${format === 'latex' ? 'tex' : format}`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(downloadUrl);
        a.remove();

        showToast(`Document généré avec succès !`, 'success');
    } catch (error) {
        console.error(error);
        showToast(`Échec de la génération : ${error.message}`, 'error');
    }
}

// =============================================================================
// BENEFICIARIES
// =============================================================================
async function handleDeleteBeneficiaire(id, name) {
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
            await deleteBeneficiaire(id);
            showToast('Bénéficiaire supprimé', 'info');
            closeModal();
            state.beneficiaires = await fetchBeneficiaires();
            renderBeneficiaires(state.beneficiaires, handleDeleteBeneficiaire);

            // Met à jour la liste déroulante si on est sur la vue de création de note de frais
            const select = document.getElementById('select-beneficiaire');
            if (select) {
                updateBeneficiaireSelect(state.beneficiaires);
                updateSelectedBeneficiary(state.beneficiaires, select.value);
            }
        } catch (error) {
            showToast(`Échec de la suppression : ${error.message}`, 'error');
        }
    });
}

// =============================================================================
// ADMIN OPERATIONS
// =============================================================================
async function handleResetPassword(clubId, clubName) {
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
            const newPass = resData.new_password;
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
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });
}

async function handleDeleteClub(clubId, clubName) {
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
            state.clubs = await fetchClubs();
            renderClubs(state.clubs, handleResetPassword, handleDeleteClub);
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });
}

// =============================================================================
// DOM EVENT BINDINGS
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('upload-zone')

    // Modal background click to close
    document.getElementById('modal-bg').addEventListener('click', closeModal);

    // Close modal on Escape key press
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modal = document.getElementById('custom-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closeModal();
            }
        }
    });

    // Menu navigation buttons
    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const target = button.dataset.target;
            navigateToView(target);
        });
    });

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginID = document.getElementById('login-id').value.trim();
        const loginPass = document.getElementById('login-pass').value;
        try {
            const data = await login(loginID, loginPass);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('club_id', data.club_id);
            localStorage.setItem('club_nom', data.nom);

            state.currentUser = data.club_id;
            setupSessionUI(data.club_id, data.nom);
        } catch (error) {
            console.error(error);
            showToast(`Connexion échouée : ${error.message}`, 'error');
        }
    });

    // Logout Button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Change Password Button Modal
    document.getElementById('change-pass-btn').addEventListener('click', () => {
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
                showToast("Mot de passe changé avec succès", 'success');
                closeModal();
            } catch (error) {
                showToast(`Échec : ${error.message}`, 'error');
            }
        });
    });

    // Auto-save Settings on focusout/change
    document.getElementById('settings-form').addEventListener('change', handleSaveSettings);

    // Settings input change triggers preview update
    document.getElementById('set-mandat').addEventListener('input', triggerNdfPreviewUpdate);
    document.getElementById('ndf-numero').addEventListener('input', triggerNdfPreviewUpdate);

    // Selected Beneficiary Change
    document.getElementById('select-beneficiaire').addEventListener('change', (e) => {
        updateSelectedBeneficiary(state.beneficiaires, e.target.value);
    });

    // Add Beneficiary Submit
    document.getElementById('form-add-benef').addEventListener('submit', async (e) => {
        e.preventDefault();
        const benefData = {
            prenom: document.getElementById('b-prenom').value.trim(),
            nom: document.getElementById('b-nom').value.trim(),
            adresse: document.getElementById('b-adresse').value.trim(),
            postal: document.getElementById('b-postal').value.trim(),
            ville: document.getElementById('b-ville').value.trim(),
            email: document.getElementById('b-email').value.trim(),
            tel: document.getElementById('b-tel').value.trim(),
            iban: document.getElementById('b-iban').value.trim()
        };
        try {
            await addBeneficiaire(benefData);
            showToast('Bénéficiaire ajouté avec succès', 'success');
            e.target.reset();
            state.beneficiaires = await fetchBeneficiaires();
            renderBeneficiaires(state.beneficiaires, handleDeleteBeneficiaire);
        } catch (error) {
            showToast(`Échec : ${error.message}`, 'error');
        }
    });

    // Auto-format postal code input
    document.getElementById('b-postal').addEventListener('input', function () {
        let val = this.value.replace(/[^0-9]/g, '');
        this.value = val.substring(0, 5);
    });


    // Auto-format phone input
    document.getElementById('b-tel').addEventListener('input', function () {
        let val = this.value.replace(/[^0-9]/g, '');
        val = val.substring(0, 10);
        this.value = val.replace(/(.{2})/g, '$1 ').trim();
    });

    // Auto-format IBAN input
    document.getElementById('b-iban').addEventListener('input', function () {
        let val = this.value.replace(/[^\w]/g, '').toUpperCase();
        this.value = val.replace(/(.{4})/g, '$1 ').trim();
    });

    // Expense Row Add Button
    document.getElementById('add-expense-row-btn').addEventListener('click', () => {
        addNewExpenseRow();
    });

    // Drag and paste on expense table (copy paste Excel)
    document.getElementById('expenses-table').addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text');
        const rows = text.split(/\r?\n/);
        let pastedCount = 0;
        rows.forEach(row => {
            if (!row.trim()) return;
            const cols = row.split('\t');
            if (cols.length >= 3) {
                addNewExpenseRow(cols[0], cols[1], cols[2]);
                pastedCount++;
            } else if (cols.length === 2) {
                addNewExpenseRow(1, cols[0], cols[1]);
                pastedCount++;
            }
        });
        if (pastedCount > 0) {
            showToast(`${pastedCount} ligne(s) importée(s) !`, 'success');
        }
    });

    // Upload zone trigger click on input file
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
        e.preventDefault()
        uploadZone.classList.remove('border-blue-500', 'bg-blue-50/30');
        uploadZone.classList.add('border-gray-300');
        handleNewFiles(e.dataTransfer.files);
    });

    function handleNewFiles(files) {
        Array.from(files).forEach(file => {
            if (!state.selectedReceipts.some(old_file => old_file.size === file.size && old_file.name === file.name)) {
                state.selectedReceipts.push(file);
            }
        });
        renderUploadedFiles(state.selectedReceipts, handleDeleteFiles);

        document.getElementById('file-upload').value = '';
    }

    function handleDeleteFiles(index) {
        state.selectedReceipts.splice(index, 1);
        renderUploadedFiles(state.selectedReceipts, handleDeleteFiles);
    }

    // Justificatifs multiple files upload preview
    document.getElementById('file-upload').addEventListener('change', (e) => {
        handleNewFiles(e.target.files)
    });

    // Generate NDF Buttons
    document.getElementById('download-pdf-btn').addEventListener('click', () => handleGenerateNDF('pdf'));
    document.getElementById('download-latex-btn').addEventListener('click', () => handleGenerateNDF('latex'));

    // Admin Panel create club modal popup
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
                    <div>
                        <label class="block text-xs font-medium text-gray-500 ml-1 mb-1">Mot de passe temporaire</label>
                        <input type="password" id="new-club-pass" class="apple-input bg-gray-50/50" placeholder="••••••••" required>
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
        document.getElementById('form-create-club').addEventListener('submit', async (e) => {
            e.preventDefault();
            const club_id = document.getElementById('new-club-id').value.toLowerCase().trim();
            const nom = document.getElementById('new-club-nom').value.trim();
            const password = document.getElementById('new-club-pass').value;
            try {
                await createClub({ club_id, nom, password });
                showToast(`Club '${nom}' créé avec succès`, 'success');
                closeModal();
                state.clubs = await fetchClubs();
                renderClubs(state.clubs, handleResetPassword, handleDeleteClub);
            } catch (error) {
                showToast(`Échec : ${error.message}`, 'error');
            }
        });
    });

    // Start by adding one default expense row
    addNewExpenseRow();

    // Check existing session
    restoreSession();
});