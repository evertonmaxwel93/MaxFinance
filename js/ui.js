let loadingCount = 0;

function mostrarToast(mensagem, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast flex items-center gap-3 bg-white border p-4 rounded-xl text-slate-800 font-semibold text-sm transition pointer-events-auto`;
    
    let icone = '<i class="fas fa-info-circle text-blue-500 text-lg"></i>';
    if (tipo === 'success') {
        icone = '<i class="fas fa-check-circle text-green-500 text-lg"></i>';
        toast.classList.add('border-green-100');
    } else if (tipo === 'error') {
        icone = '<i class="fas fa-exclamation-circle text-red-500 text-lg"></i>';
        toast.classList.add('border-red-100');
    } else if (tipo === 'warning') {
        icone = '<i class="fas fa-exclamation-triangle text-amber-500 text-lg"></i>';
        toast.classList.add('border-amber-100');
    } else {
        toast.classList.add('border-blue-100');
    }

    toast.innerHTML = `
        <div class="flex-shrink-0">${icone}</div>
        <div class="flex-1 text-xs md:text-sm">${mensagem}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function mostrarLoading() {
    loadingCount++;
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.remove('hidden', 'fade-out');
}

function ocultarLoading() {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
        const el = document.getElementById('loading-overlay');
        if (el) {
            el.classList.add('fade-out');
            setTimeout(() => el.classList.add('hidden'), 300);
        }
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('maxfinance-dark', isDark ? '1' : '0');
}

function aplicarDarkModeSalvo() {
    const salvo = localStorage.getItem('maxfinance-dark');
    if (salvo === '1') {
        document.documentElement.classList.add('dark');
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = true;
    }
}

function abrirModal(id) {
    const el = document.getElementById(id);
    if (el) {
        el.classList.remove('hidden');
        if (id === 'modalCliente' || id === 'modalFornecedor') {
            el.classList.add('flex');
            setTimeout(() => {
                el.classList.remove('opacity-0');
                el.classList.add('opacity-100');
                const child = el.querySelector('.transform');
                if (child) {
                    child.classList.remove('scale-95');
                    child.classList.add('scale-100');
                }
            }, 10);
        }
    }
}

function fecharModal(id) { 
    const el = document.getElementById(id);
    if (el) {
        if (id === 'modalCliente' || id === 'modalFornecedor') {
            el.classList.remove('opacity-100');
            el.classList.add('opacity-0');
            const child = el.querySelector('.transform');
            if (child) {
                child.classList.remove('scale-100');
                child.classList.add('scale-95');
            }
            setTimeout(() => {
                el.classList.add('hidden');
                el.classList.remove('flex');
            }, 150);
        } else {
            el.classList.add('hidden');
        }
    }
}

// Inicializar Dark Mode Salvo
aplicarDarkModeSalvo();


