export function showView(viewID) {
    const sections = document.querySelectorAll('.view-section');
    for (const section of sections) {
        if (section.id === viewID) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    }

    const buttons = document.querySelectorAll('.menu-btn');
    for (const button of buttons) {
        if (button.dataset.target === viewID) {
            button.classList.remove('text-gray-500');
            button.classList.add('text-blue-600', 'font-semibold');
        } else {
            button.classList.remove('text-blue-600', 'font-semibold');
            button.classList.add('text-gray-500');
        }
    }
}

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

    setTimeout(() => { toast.classList.remove('translate-y-10', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-10');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function openModal(contentHtml) {
    const modal = document.getElementById('custom-modal');
    const wrapper = document.getElementById('modal-content-wrapper');
    const content = document.getElementById('modal-content');
    const bg = document.getElementById('modal-bg')

    content.innerHTML = contentHtml;
    modal.classList.remove('hidden');

    setTimeout(() => {
        bg.classList.remove('opacity-0')
        wrapper.classList.remove('scale-95', 'opacity-0');
        content.classList.remove('scale-95', 'opacity-0');
    }, 10);
}

export function closeModal() {
    const modal = document.getElementById('custom-modal');
    const wrapper = document.getElementById('modal-content-wrapper');
    const content = document.getElementById('modal-content');
    const bg = document.getElementById('modal-bg')

    bg.classList.add('opacity-0')
    wrapper.classList.add('scale-95', 'opacity-0');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

export function renderClubs(clubs, onResetPassword, onDeleteClub) {
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

    clubs.forEach(club => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition";
        tr.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                        ${club.nom.charAt(0)}
                    </div>
                    <span class="font-medium">${club.nom}</span>
                </div>
            </td>
            <td class="p-4 text-sm text-gray-500 font-mono">${club.id}</td>
            <td class="p-4 text-sm text-gray-500">${club.lastLogin || 'Inactif'}</td>
            <td class="p-4 text-right space-x-2">
                <button class="reset-pass-btn text-orange-500 hover:bg-orange-50 p-2 rounded-lg transition" title="Régénérer MDP">
                    <i class="ph ph-key text-lg"></i>
                </button>
                <button class="delete-club-btn text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Supprimer">
                    <i class="ph ph-trash text-lg"></i>
                </button>
            </td>
        `;

        tr.querySelector('.reset-pass-btn').addEventListener('click', () => onResetPassword(club.id, club.nom));
        tr.querySelector('.delete-club-btn').addEventListener('click', () => onDeleteClub(club.id, club.nom));
        tbody.appendChild(tr);
    });
}

export function renderBeneficiaires(beneficiaires, onDeleteBenef) {
    const tbody = document.getElementById('beneficiaires-list');
    tbody.innerHTML = '';

    if (beneficiaires.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="p-8 text-center text-gray-400 italic">Aucun bénéficiaire enregistré</td>
            </tr>
        `;
        return;
    }

    beneficiaires.forEach(b => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 transition";
        tr.innerHTML = `
            <td class="py-4">
                <div class="font-medium">${b.prenom} ${b.nom}</div>
            </td>
            <td class="py-4">
                <div class="text-sm">${b.email}</div>
                <div class="text-xs text-gray-500">${b.tel || '-'}</div>
            </td>
            <td class="py-4">
                <div class="text-sm">${b.adresse}</div>
                <div class="text-xs text-gray-500">
                    ${b.postal} ${b.ville}
                </div>
            </td>
            <td class="py-4 font-mono text-xs text-gray-600">${b.iban}</td>
            <td class="py-4 text-right">
                <button class="delete-benef-btn text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <i class="ph ph-trash"></i>
                </button>
            </td>
        `;

        tr.querySelector('.delete-benef-btn').addEventListener('click', () => onDeleteBenef(b.id, `${b.prenom} ${b.nom}`));
        tbody.appendChild(tr);
    });
}

export function updateBeneficiaireSelect(beneficiaires) {
    const select = document.getElementById('select-beneficiaire');
    select.innerHTML = '<option value="">-- Sélectionner un bénéficiaire --</option>';
    beneficiaires.forEach(b => {
        select.innerHTML += `<option value="${b.id}">${b.prenom} ${b.nom}</option>`;
    });
}

export function updateSelectedBeneficiary(beneficiaires, selectedId) {
    const preview = document.getElementById('benef-preview');

    if (!selectedId) {
        preview.innerHTML = `<span class="italic text-gray-500">Sélectionnez un bénéficiaire pour voir ses coordonnées bancaires.</span>`;
        return;
    }

    const b = beneficiaires.find(x => x.id == selectedId);
    if (!b) return;

    preview.innerHTML = `
        <div class="font-semibold text-gray-800">${b.prenom} ${b.nom}</div>
        <div class="text-xs text-gray-600 mt-1">${b.email} - ${b.tel}</div>
        <div class="text-xs text-gray-600 mt-1">${b.adresse}, ${b.postal} ${b.ville}</div>
        <br>
        <div class="font-mono text-sm bg-white p-2 rounded border border-gray-200 mt-1 text-gray-800">${b.iban}</div>
    `;
}

export function renderUploadedFiles(files, onDeleteFile) {
    const container = document.getElementById('file-list-preview');
    container.innerHTML = ''
    console.log(files)
    if (files.length === 0) {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
    }

    files.forEach((file, index) => {
        const row = document.createElement('div');
        row.className = "flex justify-between items-center gap-2 mb-1 last:mb-0 truncate";

        row.innerHTML = `
            <span class="truncate max-w-[420px] md:max-w-[420ghpx] block">${file.name}</span>
            <i class="ph ph-x-circle text-xl  text-gray-400 hover:text-red-500 transition cursor-pointer delete-file-btn"></i>
        `;

        row.querySelector('.delete-file-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            onDeleteFile(index);
        })

        container.appendChild(row)
    });
}