/**
 * @file expenses.js
 * @description Logique de saisie dynamique des lignes de frais (calculs de totaux et import Excel).
 */

import { showToast } from './ui.js';

/**
 * Recalcule la somme totale des dépenses et met à jour l'affichage.
 */
export function recalculateTotals() {
    let globalTotal = 0;
    const rows = document.querySelectorAll('.expense-row');

    rows.forEach((row) => {
        const qtyInput = row.querySelector('.expense-qty');
        const priceInput = row.querySelector('.expense-price');
        const totalCell = row.querySelector('.expense-row-total');

        const qty = parseInt(qtyInput.value, 10) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const rowTotal = qty * price;

        totalCell.textContent = `${rowTotal.toFixed(2)} €`;
        globalTotal += rowTotal;
    });

    document.getElementById('grand-total').textContent = `${globalTotal.toFixed(2)} €`;
}

/**
 * Ajoute une nouvelle ligne de dépense au tableau de saisie.
 *
 * @param {number} [qty=1] Quantité d'articles.
 * @param {string} [label=''] Intitulé ou référence de la dépense.
 * @param {number|string} [price=0] Prix unitaire de la dépense.
 */
export function addNewExpenseRow(qty = 1, label = '', price = 0) {
    const tbody = document.getElementById('expenses-body');
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/30 transition expense-row group';

    let cleanPrice = price;
    if (typeof price === 'string') {
        cleanPrice = price.replace(/[€\s]/g, '').replace(',', '.');
    }
    const parsedPrice = parseFloat(cleanPrice) || 0;
    const parsedQty = parseInt(qty, 10) || 1;

    tr.innerHTML = `
        <td class="p-2 border-r border-gray-100">
            <input type="number" min="1" step="1" value="${parsedQty}" class="w-full p-2 bg-transparent outline-none text-center rounded focus:bg-white focus:ring-2 focus:ring-blue-100 expense-qty">
        </td>
        <td class="p-2 border-r border-gray-100">
            <input type="text" value="${label}" placeholder="Ex: Achat fournitures..." class="w-full p-2 bg-transparent outline-none rounded focus:bg-white focus:ring-2 focus:ring-blue-100 expense-label">
        </td>
        <td class="p-2 border-r border-gray-100">
            <input type="number" min="0" step="0.01" value="${parsedPrice.toFixed(2)}" class="w-full p-2 bg-transparent outline-none text-right rounded focus:bg-white focus:ring-2 focus:ring-blue-100 no-spinners expense-price">
        </td>
        <td class="p-2 bg-gray-50/50 text-right font-medium text-gray-700 expense-row-total border-r border-gray-100">
            ${(parsedQty * parsedPrice).toFixed(2)} €
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


export function resetExpensesTable() {
    const tbody = document.getElementById('expenses-body');
    tbody.innerHTML = '';
}

/**
 * Intercepte et traite le collage de lignes de tableau (type Excel) directement dans la vue.
 *
 * @param {ClipboardEvent} event L'événement système de collage de presse-papier.
 */
export function handleExcelPaste(event) {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text');
    const rows = text.split(/\r?\n/);
    let pastedCount = 0;

    rows.forEach((row) => {
        if (!row.trim()) return;
        const cols = row.split('\t');
        if (cols.length >= 3) {
            addNewExpenseRow(cols[0], cols[1], cols[2]);
            pastedCount += 1;
        } else if (cols.length === 2) {
            addNewExpenseRow(1, cols[0], cols[1]);
            pastedCount += 1;
        }
    });

    if (pastedCount > 0) {
        showToast(`${pastedCount} ligne(s) importée(s) !`, 'success');
    }
}
