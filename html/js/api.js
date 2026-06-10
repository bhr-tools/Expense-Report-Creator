const URL = 'http://localhost:8000'
const API = `${URL}/api/login`

export async function login(clubId, password) {
    const user = { club_id: clubId, password: password };
    const response = await fetch(API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    });

    if (!response.ok) {
        throw new Error(`Code erreur HTTP : ${response.status}`);
    }

    return await response.json();
}