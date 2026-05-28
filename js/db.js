const SUPABASE_URL = 'https://rkwoerrsicftcjgaakte.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ug1NkS3w4DACmOIpiafAAA_yQtSud7-';
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// UTILITÁRIOS DE CACHE E ESTADO OFFLINE
// ==========================================
const cacheFinanceiro = {
    salvar(chave, dados) {
        try {
            localStorage.setItem(`maxfinance_cache_${chave}`, JSON.stringify(dados));
        } catch (e) {
            console.warn("Erro ao salvar no cache:", e);
        }
    },
    obter(chave) {
        try {
            const raw = localStorage.getItem(`maxfinance_cache_${chave}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn("Erro ao ler do cache:", e);
            return null;
        }
    },
    limpar(chave) {
        localStorage.removeItem(`maxfinance_cache_${chave}`);
    }
};

function isOnline() {
    return navigator.onLine;
}

