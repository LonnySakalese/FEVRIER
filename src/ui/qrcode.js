// ============================================================
// QRCODE.JS - QR Code generator using qrcode-generator lib
// ============================================================

export function generateQRCode(text, canvasId, size = 200) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof qrcode === 'undefined') return;

    const qr = qrcode(0, 'M'); // Auto type, Medium error correction
    qr.addData(text);
    qr.make();

    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;

    const moduleCount = qr.getModuleCount();
    const cellSize = size / moduleCount;

    // Background
    ctx.fillStyle = '#F5F5F0';
    ctx.fillRect(0, 0, size, size);

    // Modules
    ctx.fillStyle = '#0A0A0A';
    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (qr.isDark(r, c)) {
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }
}

export function showQRModal(code) {
    const modal = document.getElementById('qrCodeModal');
    if (!modal) return;

    document.getElementById('qrCodeTitle').textContent = code;
    modal.classList.add('active');

    // Generate with full invite URL
    const url = `https://lonnysakalese.github.io/FEVRIER/#join/${code}`;
    setTimeout(() => generateQRCode(url, 'qrCanvas', 200), 50);
}

export function closeQRModal() {
    const modal = document.getElementById('qrCodeModal');
    if (modal) modal.classList.remove('active');
}

export function downloadQR() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'fevrier-group-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}
