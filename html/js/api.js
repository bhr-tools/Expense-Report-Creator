const BASE_URL = 'http://localhost:8000';

function getHeaders(extraHeaders = {}) {
    const token = localStorage.getItem('token');
    const headers = { ...extraHeaders };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function handleResponse(response) {
    if (!response.ok) {
        let errorMessage = `HTTP error: ${response.status}`;
        try {
            const errData = await response.json();
            errorMessage = errData.detail || errorMessage;
        } catch (_) {}
        throw new Error(errorMessage);
    }
    return response;
}

export async function login(clubId, password) {
    const response = await fetch(`${BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, password: password })
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function fetchSettings() {
    const response = await fetch(`${BASE_URL}/api/settings`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function saveSettings(settingsData) {
    const response = await fetch(`${BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(settingsData)
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function fetchBeneficiaires() {
    const response = await fetch(`${BASE_URL}/api/beneficiaires`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function addBeneficiaire(benefData) {
    const response = await fetch(`${BASE_URL}/api/beneficiaires`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(benefData)
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function deleteBeneficiaire(id) {
    const response = await fetch(`${BASE_URL}/api/beneficiaires/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function fetchClubs() {
    const response = await fetch(`${BASE_URL}/api/admin/clubs`, {
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function createClub(clubData) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(clubData)
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function resetPassword(clubId) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs/reset-password`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ club_id: clubId })
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function deleteClub(clubId) {
    const response = await fetch(`${BASE_URL}/api/admin/clubs/${clubId}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function changePassword(oldPassword, newPassword) {
    const response = await fetch(`${BASE_URL}/api/change-password`, {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    });
    const validResponse = await handleResponse(response);
    return await validResponse.json();
}

export async function generateNDF(formData) {
    const response = await fetch(`${BASE_URL}/generate-ndf`, {
        method: 'POST',
        headers: getHeaders(),
        body: formData
    });
    const validResponse = await handleResponse(response);
    return await validResponse.blob();
}