// ============================================================
// LAZY LOADING UTILITY
// ============================================================

const loadedModules = new Map();

/**
 * lazyLoadModule - Dynamic import wrapper with caching
 * @param {string} modulePath - Path to the module to import
 * @returns {Promise<Module>} The imported module
 */
export async function lazyLoadModule(modulePath) {
    if (loadedModules.has(modulePath)) {
        return loadedModules.get(modulePath);
    }

    try {
        const mod = await import(modulePath);
        loadedModules.set(modulePath, mod);
        return mod;
    } catch (err) {
        console.error(`Erreur chargement module: ${modulePath}`, err);
        throw err;
    }
}
