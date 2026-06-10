import { showView } from './ui.js';
import { login } from './api.js';

const buttons = document.querySelectorAll('.menu-btn');
for (const button of buttons) {
    button.addEventListener('click', (e) => {
        const target = button.dataset.target;
        showView(target);

    })
}

document.querySelector('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginID = document.querySelector('#login-id').value;
    const loginPass = document.querySelector('#login-pass').value;

    try {
        const token = await login(loginID, loginPass);
        localStorage.setItem('token', token.access_token);
        document.querySelector('#navbar').classList.remove('hidden');
        document.querySelector('#menu-club').classList.remove('hidden');
        showView('view-frais');
    } catch (error) {
        console.error(error);
    }

})