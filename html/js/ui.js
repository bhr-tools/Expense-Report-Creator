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
            button.classList.add('text-gray-900', 'font-semibold');
        } else {
            button.classList.remove('text-gray-900', 'font-semibold');
            button.classList.add('text-gray-500');
        }
    }
}