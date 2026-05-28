// ==========================================
// CONTROLE DE MÚLTIPLAS LOJAS
// ==========================================
let lojasUsuario = [];
let lojaAtiva = null;
let lojaCargo = 'Total'; // 'Total', 'Gerente', 'Caixa'
let fallbackLojasAtivo = false;

// Inicializa a gestão de lojas
async function initLojas() {
    if (!userAtual) return;
    await carregarLojas();
}

// Carrega as lojas que o usuário possui ou é colaborador
async function carregarLojas() {
    try {
        let { data: lojasDono, error: errDono } = await clienteSupabase
            .from('lojas')
            .select('*')
            .eq('user_id', userAtual.id);

        if (errDono) throw errDono;

        let { data: colabs, error: errColab } = await clienteSupabase
            .from('colaboradores')
            .select('*, lojas(*)')
            .eq('email_convidado', userAtual.email);

        // Se der certo, desativa o fallback
        fallbackLojasAtivo = false;
        
        let lojasTemp = (lojasDono || []).map(l => ({ ...l, cargo: 'Total' }));
        if (colabs) {
            colabs.forEach(c => {
                if (c.lojas) {
                    lojasTemp.push({ ...c.lojas, cargo: c.funcao });
                }
            });
        }
        
        // Garante que existe pelo menos uma loja
        if (lojasTemp.length === 0) {
            const { data: novaLoja, error: createErr } = await clienteSupabase
                .from('lojas')
                .insert({ user_id: userAtual.id, nome: 'Minha Loja' })
                .select()
                .single();
            if (!createErr && novaLoja) {
                lojasTemp.push({ ...novaLoja, cargo: 'Total' });
            }
        }

        lojasUsuario = lojasTemp;
    } catch (err) {
        console.warn("Usando fallback de LocalStorage para Lojas devido a:", err.message);
        fallbackLojasAtivo = true;
        carregarLojasFallback();
    }

    // Define a loja ativa
    const savedActiveId = localStorage.getItem('maxfinance_loja_ativa_id');
    const encontrada = lojasUsuario.find(l => l.id === savedActiveId);
    if (encontrada) {
        lojaAtiva = encontrada;
        lojaCargo = encontrada.cargo || 'Total';
    } else if (lojasUsuario.length > 0) {
        lojaAtiva = lojasUsuario[0];
        lojaCargo = lojasUsuario[0].cargo || 'Total';
        localStorage.setItem('maxfinance_loja_ativa_id', lojaAtiva.id);
    }

    renderizarSeletorLojas();
    aplicarPermissoesDeCargo();
}

// Fallback das Lojas em LocalStorage
function carregarLojasFallback() {
    const raw = localStorage.getItem('maxfinance_lojas_local');
    let locais = raw ? JSON.parse(raw) : [];
    
    if (locais.length === 0) {
        locais = [
            { id: 'default', nome: 'Minha Loja', user_id: userAtual.id, cargo: 'Total' }
        ];
        localStorage.setItem('maxfinance_lojas_local', JSON.stringify(locais));
    }
    
    // Carrega também possíveis convites locais para simulação de compartilhamento
    const rawColabs = localStorage.getItem('maxfinance_colaboradores_local');
    const colabsLocais = rawColabs ? JSON.parse(rawColabs) : [];
    
    colabsLocais.forEach(c => {
        if (c.email_convidado === userAtual.email) {
            locais.push({
                id: c.loja_id,
                nome: c.loja_nome || 'Loja Compartilhada',
                user_id: 'outro',
                cargo: c.funcao
            });
        }
    });

    lojasUsuario = locais;
}

// Cria uma nova loja
async function criarNovaLoja(nome) {
    if (!nome) return;
    mostrarLoading();
    try {
        if (!fallbackLojasAtivo) {
            const { data, error } = await clienteSupabase
                .from('lojas')
                .insert({ user_id: userAtual.id, nome: nome })
                .select()
                .single();
            if (error) throw error;
            mostrarToast(`Loja "${nome}" criada com sucesso!`, "success");
        } else {
            const raw = localStorage.getItem('maxfinance_lojas_local');
            let locais = raw ? JSON.parse(raw) : [];
            const nova = {
                id: crypto.randomUUID(),
                nome: nome,
                user_id: userAtual.id,
                cargo: 'Total'
            };
            locais.push(nova);
            localStorage.setItem('maxfinance_lojas_local', JSON.stringify(locais));
            mostrarToast(`Loja "${nome}" criada localmente!`, "success");
        }
        await carregarLojas();
        // Alterna para a nova loja
        if (lojasUsuario.length > 0) {
            const recemCriada = lojasUsuario.find(l => l.nome === nome);
            if (recemCriada) {
                await alternarLoja(recemCriada.id);
            }
        }
    } catch (err) {
        mostrarToast("Erro ao criar loja: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

// Renomeia a loja atual
async function renomearLojaAtiva(novoNome) {
    if (!novoNome || !lojaAtiva) return;
    if (lojaCargo !== 'Total') {
        mostrarToast("Apenas administradores podem renomear a loja.", "warning");
        return;
    }
    mostrarLoading();
    try {
        if (!fallbackLojasAtivo) {
            const { error } = await clienteSupabase
                .from('lojas')
                .update({ nome: novoNome })
                .eq('id', lojaAtiva.id);
            if (error) throw error;
        } else {
            const raw = localStorage.getItem('maxfinance_lojas_local');
            let locais = raw ? JSON.parse(raw) : [];
            locais = locais.map(l => l.id === lojaAtiva.id ? { ...l, nome: novoNome } : l);
            localStorage.setItem('maxfinance_lojas_local', JSON.stringify(locais));
        }
        mostrarToast("Loja renomeada com sucesso!", "success");
        await carregarLojas();
    } catch (err) {
        mostrarToast("Erro ao renomear: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

// Alterna a loja ativa
async function alternarLoja(id) {
    const encontrada = lojasUsuario.find(l => l.id === id);
    if (!encontrada) return;
    
    lojaAtiva = encontrada;
    lojaCargo = encontrada.cargo || 'Total';
    localStorage.setItem('maxfinance_loja_ativa_id', id);
    
    mostrarToast(`Alternando para loja: ${lojaAtiva.nome}`, "info");
    
    renderizarSeletorLojas();
    aplicarPermissoesDeCargo();
    
    // Recarrega todos os dados
    if (typeof atualizarTudo === 'function') atualizarTudo();
    if (typeof carregarProdutos === 'function') carregarProdutos();
    if (typeof carregarCompras === 'function') carregarCompras();
    if (typeof carregarVendas === 'function') carregarVendas();
    if (typeof carregarClientes === 'function') carregarClientes();
    if (typeof carregarFornecedores === 'function') carregarFornecedores();
    if (typeof carregarSubcategoriasBanco === 'function') carregarSubcategoriasBanco();
}

// Renderiza o seletor visual no cabeçalho
function renderizarSeletorLojas() {
    const container = document.getElementById('seletor-lojas-container');
    if (!container) return;
    
    if (!lojaAtiva) {
        container.innerHTML = '';
        return;
    }
    
    let optionsHtml = '';
    lojasUsuario.forEach(l => {
        const selected = l.id === lojaAtiva.id ? 'bg-blue-50 text-blue-700 font-black' : 'text-slate-600';
        const icon = l.cargo === 'Total' ? 'fa-store' : (l.cargo === 'Gerente' ? 'fa-user-tie' : 'fa-cash-register');
        optionsHtml += `
            <button onclick="alternarLoja('${l.id}')" class="w-full text-left px-4 py-2 text-xs rounded-lg hover:bg-slate-100 transition flex items-center gap-2 ${selected}">
                <i class="fas ${icon}"></i>
                <div class="flex-1 truncate">
                    <p class="font-bold">${l.nome}</p>
                    <p class="text-[9px] opacity-75">${l.cargo}</p>
                </div>
            </button>
        `;
    });
    
    const activeIcon = lojaCargo === 'Total' ? 'fa-store text-blue-600' : (lojaCargo === 'Gerente' ? 'fa-user-tie text-emerald-600' : 'fa-cash-register text-amber-500');

    container.innerHTML = `
        <div class="relative inline-block text-left" id="dropdown-lojas">
            <button onclick="toggleDropdownLojas()" class="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition px-3 py-2 rounded-xl border border-slate-200 outline-none max-w-[200px]">
                <i class="fas ${activeIcon}"></i>
                <div class="text-left truncate flex-1 min-w-[70px]">
                    <p class="text-xs font-black text-slate-700 truncate leading-tight">${lojaAtiva.nome}</p>
                    <p class="text-[9px] font-bold text-slate-400 leading-none">${lojaCargo}</p>
                </div>
                <i class="fas fa-chevron-down text-slate-400 text-[10px]"></i>
            </button>
            <div id="dropdown-lojas-menu" class="hidden absolute left-0 mt-2 w-56 rounded-xl shadow-xl bg-white border border-slate-200 p-2 z-[999] space-y-1 animate-fade-in">
                <div class="px-3 py-1 border-b mb-1">
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Minhas Lojas</span>
                </div>
                <div class="max-h-48 overflow-y-auto space-y-1 hide-scrollbar">
                    ${optionsHtml}
                </div>
                <div class="border-t pt-1 mt-1">
                    <button onclick="abrirModalNovaLoja()" class="w-full text-left px-4 py-2 text-xs text-blue-600 font-bold hover:bg-blue-50 transition rounded-lg flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i> Criar Nova Loja
                    </button>
                    ${lojaCargo === 'Total' ? `
                    <button onclick="abrirModalRenomearLoja()" class="w-full text-left px-4 py-2 text-xs text-slate-500 font-bold hover:bg-slate-50 transition rounded-lg flex items-center gap-2">
                        <i class="fas fa-edit"></i> Configurar Nome
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Abre/Fecha Dropdown de Lojas
function toggleDropdownLojas() {
    const el = document.getElementById('dropdown-lojas-menu');
    if (el) el.classList.toggle('hidden');
}

// Fecha o dropdown ao clicar fora
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('dropdown-lojas');
    const menu = document.getElementById('dropdown-lojas-menu');
    if (dropdown && !dropdown.contains(e.target) && menu) {
        menu.classList.add('hidden');
    }
});

// Modais Auxiliares
function abrirModalNovaLoja() {
    const nome = prompt("Digite o nome da nova loja:");
    if (nome) criarNovaLoja(nome.trim());
}

function abrirModalRenomearLoja() {
    if (!lojaAtiva) return;
    const nome = prompt("Digite o novo nome para a loja:", lojaAtiva.nome);
    if (nome) renomearLojaAtiva(nome.trim());
}

// Filtra um array de registros pela loja ativa de forma resiliente
function filtrarPorLojaAtiva(array) {
    if (!lojaAtiva || !array) return array || [];
    return array.filter(item => {
        // Se o item não tem loja_id, associamos à loja 'default' ou assumimos verdadeira se for a única loja
        if (!item.loja_id) {
            return lojaAtiva.id === 'default' || fallbackLojasAtivo || lojasUsuario.length <= 1;
        }
        return item.loja_id === lojaAtiva.id;
    });
}

// Retorna o payload com o loja_id injetado para inserção
function injetarLojaAtiva(payload) {
    if (!lojaAtiva) return payload;
    if (Array.isArray(payload)) {
        return payload.map(item => ({ ...item, loja_id: lojaAtiva.id }));
    }
    return { ...payload, loja_id: lojaAtiva.id };
}
