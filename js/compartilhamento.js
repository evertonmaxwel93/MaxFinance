// ==========================================
// COMPARTILHAMENTO DE ACESSOS E CARGOS
// ==========================================
let colaboradoresLoja = [];

// Inicializa ouvintes e carrega colaboradores da loja ativa
async function initCompartilhamento() {
    const form = document.getElementById('form-compartilhamento');
    if (form) {
        form.removeEventListener('submit', convidarColaboradorSubmit);
        form.addEventListener('submit', convidarColaboradorSubmit);
    }
    await carregarColaboradores();
}

// Carrega colaboradores da loja ativa
async function carregarColaboradores() {
    if (!lojaAtiva) return;
    
    try {
        if (!fallbackLojasAtivo) {
            const { data, error } = await clienteSupabase
                .from('colaboradores')
                .select('*')
                .eq('loja_id', lojaAtiva.id);
            if (error) throw error;
            colaboradoresLoja = data || [];
        } else {
            const rawColabs = localStorage.getItem('maxfinance_colaboradores_local');
            const colabsLocais = rawColabs ? JSON.parse(rawColabs) : [];
            colaboradoresLoja = colabsLocais.filter(c => c.loja_id === lojaAtiva.id);
        }
    } catch (err) {
        console.warn("Erro ao carregar colaboradores, usando LocalStorage:", err.message);
        const rawColabs = localStorage.getItem('maxfinance_colaboradores_local');
        const colabsLocais = rawColabs ? JSON.parse(rawColabs) : [];
        colaboradoresLoja = colabsLocais.filter(c => c.loja_id === lojaAtiva.id);
    }

    renderizarTabelaColaboradores();
}

// Renderiza a lista de colaboradores na tabela
function renderizarTabelaColaboradores() {
    const tbody = document.getElementById('tabela-colaboradores');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (colaboradoresLoja.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="py-4 px-4 text-center text-slate-400 font-medium">Nenhum convidado ou colaborador nesta loja ainda.</td>
            </tr>
        `;
        return;
    }

    colaboradoresLoja.forEach(c => {
        const canDelete = lojaCargo === 'Total';
        const deleteButton = canDelete ? `
            <button onclick="removerColaborador('${c.id}')" class="text-red-500 hover:text-red-700 transition p-1 text-sm">
                <i class="fas fa-trash-alt"></i> Excluir
            </button>
        ` : `<span class="text-slate-300 font-medium">Bloqueado</span>`;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-4 font-bold text-slate-700">${c.email_convidado}</td>
                <td class="py-3 px-4">
                    <span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                        c.funcao === 'Total' 
                        ? 'bg-blue-100 text-blue-700' 
                        : (c.funcao === 'Gerente' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                    }">
                        ${c.funcao === 'Total' ? 'Total (Admin)' : (c.funcao === 'Gerente' ? 'Gerente de Loja' : 'Caixa')}
                    </span>
                </td>
                <td class="py-3 px-4 text-center">${deleteButton}</td>
            </tr>
        `;
    });
}

// Submissão do convite
async function convidarColaboradorSubmit(e) {
    e.preventDefault();
    if (!lojaAtiva) return;

    if (lojaCargo !== 'Total') {
        mostrarToast("Apenas administradores com permissão Total podem convidar colaboradores.", "warning");
        return;
    }

    const emailInput = document.getElementById('convite-email');
    const funcaoSelect = document.getElementById('convite-funcao');
    if (!emailInput || !funcaoSelect) return;

    const email = emailInput.value.trim().toLowerCase();
    const funcao = funcaoSelect.value;

    if (email === userAtual.email) {
        mostrarToast("Você não pode convidar a si mesmo!", "warning");
        return;
    }

    mostrarLoading();
    try {
        if (!fallbackLojasAtivo) {
            const { error } = await clienteSupabase
                .from('colaboradores')
                .insert({
                    loja_id: lojaAtiva.id,
                    email_convidado: email,
                    funcao: funcao
                });
            if (error) throw error;
        } else {
            const rawColabs = localStorage.getItem('maxfinance_colaboradores_local');
            let colabsLocais = rawColabs ? JSON.parse(rawColabs) : [];
            
            // Verifica duplicados
            if (colabsLocais.some(c => c.loja_id === lojaAtiva.id && c.email_convidado === email)) {
                throw new Error("Este e-mail já foi convidado para esta loja.");
            }

            colabsLocais.push({
                id: crypto.randomUUID(),
                loja_id: lojaAtiva.id,
                loja_name: lojaAtiva.nome,
                email_convidado: email,
                funcao: funcao,
                created_at: new Date().toISOString()
            });
            localStorage.setItem('maxfinance_colaboradores_local', JSON.stringify(colabsLocais));
        }

        mostrarToast(`Convite enviado para ${email}!`, "success");
        emailInput.value = '';
        await carregarColaboradores();
    } catch (err) {
        mostrarToast("Erro ao convidar: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

// Remove um colaborador
async function removerColaborador(id) {
    if (!confirm("Deseja realmente revogar o acesso deste colaborador?")) return;

    if (lojaCargo !== 'Total') {
        mostrarToast("Permissão negada.", "warning");
        return;
    }

    mostrarLoading();
    try {
        if (!fallbackLojasAtivo) {
            const { error } = await clienteSupabase
                .from('colaboradores')
                .delete()
                .eq('id', id);
            if (error) throw error;
        } else {
            const rawColabs = localStorage.getItem('maxfinance_colaboradores_local');
            let colabsLocais = rawColabs ? JSON.parse(rawColabs) : [];
            colabsLocais = colabsLocais.filter(c => c.id !== id);
            localStorage.setItem('maxfinance_colaboradores_local', JSON.stringify(colabsLocais));
        }
        mostrarToast("Acesso removido com sucesso!", "success");
        await carregarColaboradores();
    } catch (err) {
        mostrarToast("Erro ao remover: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

// Lógica de restrição de tela baseada no cargo do usuário logado
function aplicarPermissoesDeCargo() {
    console.log("Aplicando permissões de cargo: ", lojaCargo);
    
    // Lista de todas as abas
    const todasAbas = [
        'btn-aba-fluxo', 'mobile-btn-aba-fluxo',
        'btn-aba-compras', 'mobile-btn-aba-compras',
        'btn-aba-estoque', 'mobile-btn-aba-estoque',
        'btn-aba-vendas', 'mobile-btn-aba-vendas',
        'btn-aba-relatorios', 'mobile-btn-aba-relatorios',
        'btn-aba-configuracoes', 'mobile-btn-aba-configuracoes'
    ];

    // Oculta todas por padrão
    todasAbas.forEach(aba => {
        const btn = document.getElementById(aba);
        if (btn) btn.classList.add('hidden');
    });

    // Abas permitidas por cargo
    const abasPermitidas = {
        'Caixa': ['btn-aba-vendas', 'mobile-btn-aba-vendas', 'btn-aba-configuracoes', 'mobile-btn-aba-configuracoes'],
        'Gerente': ['btn-aba-compras', 'mobile-btn-aba-compras', 'btn-aba-estoque', 'mobile-btn-aba-estoque', 'btn-aba-vendas', 'mobile-btn-aba-vendas', 'btn-aba-configuracoes', 'mobile-btn-aba-configuracoes'],
        'Total': todasAbas
    };

    const permitidas = abasPermitidas[lojaCargo] || todasAbas;
    permitidas.forEach(aba => {
        const btn = document.getElementById(aba);
        if (btn) btn.classList.remove('hidden');
    });

    // Gerencia a visibilidade de elementos administrativos na tela de Ajustes
    const secaoCompartilhamento = document.getElementById('secao-compartilhamento');
    const secaoSubcategorias = document.getElementById('form-subcategoria')?.parentElement; // Contêiner de adicionar subcategorias
    const secaoBackup = document.getElementById('btn-exportar-json')?.parentElement?.parentElement; // Contêiner de backup
    const secaoPerigo = document.getElementById('btn-resetar-contra')?.parentElement?.parentElement; // Zona de perigo
    
    if (lojaCargo === 'Total') {
        if (secaoCompartilhamento) secaoCompartilhamento.classList.remove('hidden');
        if (secaoSubcategorias) secaoSubcategorias.classList.remove('hidden');
        if (secaoBackup) secaoBackup.classList.remove('hidden');
        if (secaoPerigo) secaoPerigo.classList.remove('hidden');
        // Inicializa compartilhamento
        initCompartilhamento();
    } else if (lojaCargo === 'Gerente') {
        if (secaoCompartilhamento) secaoCompartilhamento.classList.add('hidden');
        if (secaoSubcategorias) secaoSubcategorias.classList.remove('hidden');
        if (secaoBackup) secaoBackup.classList.add('hidden');
        if (secaoPerigo) secaoPerigo.classList.add('hidden');
    } else { // Caixa
        if (secaoCompartilhamento) secaoCompartilhamento.classList.add('hidden');
        if (secaoSubcategorias) secaoSubcategorias.classList.add('hidden');
        if (secaoBackup) secaoBackup.classList.add('hidden');
        if (secaoPerigo) secaoPerigo.classList.add('hidden');
    }

    // Redireciona o usuário se ele estiver em uma aba inválida para o seu cargo
    const elFluxo = document.getElementById('aba-fluxo');
    const elCompras = document.getElementById('aba-compras');
    const elEstoque = document.getElementById('aba-estoque');
    const elVendas = document.getElementById('aba-vendas');
    const elRelat = document.getElementById('aba-relatorios');
    const elConfig = document.getElementById('aba-configuracoes');

    const abasDivs = {
        'Caixa': [elVendas, elConfig],
        'Gerente': [elCompras, elEstoque, elVendas, elConfig],
        'Total': [elFluxo, elCompras, elEstoque, elVendas, elRelat, elConfig]
    };

    const permitidasDivs = abasDivs[lojaCargo] || abasDivs['Total'];
    
    // Verifica se a aba ativa é permitida
    let abaAtivaValida = false;
    permitidasDivs.forEach(div => {
        if (div && !div.classList.contains('hidden')) {
            abaAtivaValida = true;
        }
    });

    if (!abaAtivaValida) {
        // Redireciona para a primeira aba permitida
        if (lojaCargo === 'Caixa') {
            mudarAba('aba-vendas');
        } else if (lojaCargo === 'Gerente') {
            mudarAba('aba-estoque');
        } else {
            mudarAba('aba-fluxo');
        }
    }
}
