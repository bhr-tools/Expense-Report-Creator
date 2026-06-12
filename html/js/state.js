/**
 * @file state.js
 * @description État global mutable partagé de l'application cliente.
 */

export const state = {
    currentUser: null,
    beneficiaries: [],
    clubs: [],
    settings: {
        first_name: '',
        last_name: '',
        email: '',
        mandate: '',
        location: ''
    },
    selectedReceipts: []
};
export default state;
