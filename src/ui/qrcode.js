// ============================================================
// QRCODE.JS - Générateur de QR Code minimal (sans dépendance)
// ============================================================

export function generateQRCode(text, canvasId, size = 200) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    
    const modules = encodeToGrid(text);
    const moduleCount = modules.length;
    const cellSize = size / moduleCount;
    
    // Dark background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, size, size);
    
    // Draw modules
    ctx.fillStyle = '#F5F5F0';
    for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
            if (modules[r][c]) {
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }
}

function encodeToGrid(text) {
    const size = 21;
    const grid = Array.from({length: size}, () => Array(size).fill(false));
    
    // Add finder patterns (3 corners)
    addFinderPattern(grid, 0, 0);
    addFinderPattern(grid, 0, size - 7);
    addFinderPattern(grid, size - 7, 0);
    
    // Add timing patterns
    for (let i = 8; i < size - 8; i++) {
        grid[6][i] = i % 2 === 0;
        grid[i][6] = i % 2 === 0;
    }
    
    // Encode data in remaining cells
    const binary = textToBinary(text);
    let bitIdx = 0;
    for (let col = size - 1; col >= 0; col -= 2) {
        if (col === 6) col--;
        for (let row = 0; row < size; row++) {
            for (let c = 0; c < 2; c++) {
                const actualCol = col - c;
                if (!isReserved(grid, row, actualCol, size)) {
                    if (bitIdx < binary.length) {
                        grid[row][actualCol] = binary[bitIdx] === '1';
                        bitIdx++;
                    }
                }
            }
        }
    }
    
    return grid;
}

function addFinderPattern(grid, startRow, startCol) {
    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                grid[startRow + r][startCol + c] = true;
            }
        }
    }
}

function isReserved(grid, row, col, size) {
    if (row < 9 && col < 9) return true;
    if (row < 9 && col >= size - 8) return true;
    if (row >= size - 8 && col < 9) return true;
    if (row === 6 || col === 6) return true;
    return false;
}

function textToBinary(text) {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
        binary += text.charCodeAt(i).toString(2).padStart(8, '0');
    }
    while (binary.length < 200) {
        binary += binary.length % 2 === 0 ? '11101100' : '00010001';
    }
    return binary;
}

export function showQRModal(code) {
    const modal = document.getElementById('qrCodeModal');
    if (!modal) return;
    
    document.getElementById('qrCodeTitle').textContent = code;
    modal.classList.add('active');
    
    setTimeout(() => generateQRCode(code, 'qrCanvas', 200), 50);
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
