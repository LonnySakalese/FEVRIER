// ============================================================
// SYSTÈME DE MODAL DE CONFIRMATION
// ============================================================

export const ConfirmModal = {
    show(options) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const title = document.getElementById('confirmModalTitle');
            const message = document.getElementById('confirmModalMessage');
            const subtext = document.getElementById('confirmModalSubtext');
            const cancelBtn = document.getElementById('confirmModalCancel');
            const confirmBtn = document.getElementById('confirmModalConfirm');

            // Configuration du modal
            title.textContent = options.title || 'Confirmation';
            message.innerHTML = options.message || 'Es-tu sûr ?';

            if (options.subtext) {
                subtext.textContent = options.subtext;
                subtext.style.display = 'block';
            } else {
                subtext.style.display = 'none';
            }

            cancelBtn.textContent = options.cancelText || 'Annuler';
            confirmBtn.textContent = options.confirmText || 'Confirmer';

            // Style du bouton confirmer (danger ou normal)
            if (options.danger) {
                confirmBtn.style.background = '#8B0000';
                confirmBtn.style.color = '#FFE5E5';
            } else {
                confirmBtn.style.background = '';
                confirmBtn.style.color = '';
            }

            // Handlers
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                modal.classList.remove('active');
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);

            modal.classList.add('active');
        });
    }
};
