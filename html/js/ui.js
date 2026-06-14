/**
 * @file ui.js
 * @description Fonctions d'interaction et de rendu de l'interface utilisateur (DOM).
 */

/**
 * Bascule l'affichage vers la section d'application (vue) spécifiée.
 * Met également à jour la classe active sur les boutons de navigation.
 *
 * @param {string} viewID L'identifiant HTML de la section cible (ex: 'view-expenses').
 */
export function showView(viewID) {
    const sections = document.querySelectorAll('.view-section');
    sections.forEach((section) => {
        if (section.id === viewID) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    const buttons = document.querySelectorAll('.menu-btn');
    buttons.forEach((button) => {
        if (button.dataset.target === viewID) {
            button.classList.remove('text-gray-500');
            button.classList.add('text-blue-600', 'font-semibold');
        } else {
            button.classList.remove('text-blue-600', 'font-semibold');
            button.classList.add('text-gray-500');
        }
    });
}

/**
 * Affiche un message de notification temporaire (toast) à l'écran.
 *
 * @param {string} message Le texte du message à afficher.
 * @param {string} [type='success'] Le type d'alerte ('success', 'error', 'info').
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const colors = {
        success: 'bg-white border-l-4 border-green-500 text-gray-800',
        error: 'bg-red-50 text-red-800 border border-red-200',
        info: 'bg-white border-l-4 border-blue-500 text-gray-800'
    };

    const icons = {
        success: '<i class="ph ph-check-circle text-green-500 text-xl"></i>',
        error: '<i class="ph ph-warning-circle text-red-500 text-xl"></i>',
        info: '<i class="ph ph-info text-blue-500 text-xl"></i>'
    };

    toast.className = `apple-shadow rounded-xl p-4 flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0 ${colors[type]}`;
    toast.innerHTML = `${icons[type]} <span class="font-medium text-sm">${message}</span>`;

    container.appendChild(toast);

    // Déclenche l'animation d'apparition avec un court délai
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Animation de disparition puis suppression du DOM après 3 secondes
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Ouvre la boîte modale principale en y injectant le contenu HTML fourni.
 *
 * @param {string} contentHtml Le contenu HTML à afficher dans la modale.
 */
export function openModal(contentHtml) {
    const modal = document.getElementById('custom-modal');
    const wrapper = document.getElementById('modal-content-wrapper');
    const content = document.getElementById('modal-content');
    const bg = document.getElementById('modal-bg');

    content.innerHTML = contentHtml;
    modal.classList.remove('hidden');

    setTimeout(() => {
        bg.classList.remove('opacity-0');
        wrapper.classList.remove('scale-95', 'opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

/**
 * Ferme la boîte modale principale avec une animation de transition.
 */
export function closeModal() {
    const modal = document.getElementById('custom-modal');
    const wrapper = document.getElementById('modal-content-wrapper');
    const content = document.getElementById('modal-content');
    const bg = document.getElementById('modal-bg');

    bg.classList.add('opacity-0');
    wrapper.classList.add('scale-95', 'opacity-0');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

/**
 * Rend la liste des clubs enregistrés sous forme de lignes de tableau (réservé admin).
 *
 * @param {Array<Object>} clubs La liste des clubs à afficher.
 * @param {Function} onResetPassword Callback au clic sur le bouton de réinitialisation.
 * @param {Function} onDeleteClub Callback au clic sur le bouton de suppression.
 */
export function renderClubs(clubs, onUploadLogo, onResetPassword, onDeleteClub) {
    const tbody = document.getElementById('admin-clubs-list');
    tbody.innerHTML = '';

    if (clubs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="p-8 text-center text-gray-400 italic">Aucun club enregistré</td>
            </tr>
        `;
        return;
    }

    clubs.forEach((club) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition';
        tr.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        ${club.name.charAt(0)}
                    </div>
                    <span class="font-medium">${club.name}</span>
                </div>
            </td>
            <td class="p-4 text-sm text-gray-500 font-mono">${club.id}</td>
            <td class="p-4 text-right space-x-2">
                <input class="hidden modify-logo" type="file" accept="image/png">
                <button class="modify-logo-btn text-green-500 hover:bg-green-50 p-2 rounded-lg transition" title="Modifier le logo">
                    <i class="ph ph-image text-lg"></i>
                </button>
                <button class="reset-pass-btn text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition" title="Régénérer MDP">
                    <i class="ph ph-key text-lg"></i>
                </button>
                <button class="delete-club-btn text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Supprimer">
                    <i class="ph ph-trash text-lg"></i>
                </button>
            </td>
        `;

        tr.querySelector('.reset-pass-btn').addEventListener('click', () => onResetPassword(club.id, club.name));
        tr.querySelector('.delete-club-btn').addEventListener('click', () => onDeleteClub(club.id, club.name));
        tr.querySelector('.modify-logo-btn').addEventListener('click', () => tr.querySelector('.modify-logo').click());
        tr.querySelector('.modify-logo').addEventListener('change', (e) => {
            onUploadLogo(club.id, club.name, e.target.files[0]);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Rend la liste des bénéficiaires enregistrés dans le tableau de gestion.
 *
 * @param {Array<Object>} beneficiaries Liste des bénéficiaires.
 * @param {Function} onDeleteBeneficiary Callback de suppression d'un bénéficiaire.
 */
export function renderBeneficiaries(beneficiaries, onDeleteBeneficiary) {
    const tbody = document.getElementById('beneficiaries-list');
    tbody.innerHTML = '';

    if (beneficiaries.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-gray-400 italic">Aucun bénéficiaire enregistré</td>
            </tr>
        `;
        return;
    }

    beneficiaries.forEach((b) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition';
        tr.innerHTML = `
            <td class="py-4">
                <div class="font-medium">${b.first_name} ${b.last_name}</div>
            </td>
            <td class="py-4">
                <div class="text-sm">${b.email}</div>
                <div class="text-xs text-gray-500">${b.phone || '-'}</div>
            </td>
            <td class="py-4">
                <div class="text-sm">${b.address}</div>
                <div class="text-xs text-gray-500">${b.postal_code} ${b.city}</div>
            </td>
            <td class="py-4 font-mono text-xs text-gray-600">${b.iban}</td>
            <td class="py-4 text-right">
                <button class="delete-benef-btn text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;

        tr.querySelector('.delete-benef-btn').addEventListener('click', () => {
            onDeleteBeneficiary(b.id, `${b.first_name} ${b.last_name}`);
        });
        tbody.appendChild(tr);
    });
}

/**
 * Met à jour la liste déroulante des bénéficiaires sur la vue de note de frais.
 *
 * @param {Array<Object>} beneficiaries Liste des bénéficiaires actifs.
 */
export function updateBeneficiarySelect(beneficiaries) {
    const select = document.getElementById('select-beneficiary');
    select.innerHTML = '<option value="">-- Sélectionner un bénéficiaire --</option>';
    beneficiaries.forEach((b) => {
        const option = document.createElement('option');
        option.value = b.id;
        option.textContent = `${b.first_name} ${b.last_name}`;
        select.appendChild(option);
    });
}

/**
 * Met à jour l'encadré d'affichage des coordonnées bancaires d'un bénéficiaire sélectionné.
 *
 * @param {Array<Object>} beneficiaries Liste de tous les bénéficiaires.
 * @param {string|number} selectedId Identifiant unique du bénéficiaire sélectionné.
 */
export function updateSelectedBeneficiary(beneficiaries, selectedId) {
    const preview = document.getElementById('beneficiary-preview');

    if (!selectedId) {
        preview.innerHTML = '<span class="italic text-gray-500">Sélectionnez un bénéficiaire pour voir ses coordonnées bancaires.</span>';
        return;
    }

    const b = beneficiaries.find(x => x.id == selectedId);
    if (!b) return;

    preview.innerHTML = `
        <div class="font-semibold text-gray-800">${b.first_name} ${b.last_name}</div>
        <div class="text-xs text-gray-600 mt-1">${b.email} - ${b.phone || ''}</div>
        <div class="text-xs text-gray-600 mt-1">${b.address}, ${b.postal_code} ${b.city}</div>
        <br>
        <div class="font-mono text-sm bg-white p-2 rounded border border-gray-200 mt-1 text-gray-800">${b.iban}</div>
    `;
}

/**
 * Met à jour la liste des justificatifs affichée dans la zone d'upload.
 *
 * @param {Array<File>} files Liste des fichiers locaux importés.
 * @param {Function} onDeleteFile Callback de suppression d'un fichier.
 */
export function renderUploadedFiles(files, onDeleteFile) {
    const container = document.getElementById('file-list-preview');
    container.innerHTML = '';

    if (files.length === 0) {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
    }

    files.forEach((file, index) => {
        const row = document.createElement('div');
        row.className = 'flex justify-between items-center gap-2 mb-1 last:mb-0 truncate';

        row.innerHTML = `
            <span class="truncate max-w-[420px] block">${file.name}</span>
            <i class="ph ph-x-circle text-xl text-gray-400 hover:text-red-500 transition cursor-pointer delete-file-btn"></i>
        `;

        row.querySelector('.delete-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            onDeleteFile(index);
        });

        container.appendChild(row);
    });
}