// ==========================================
// ESTADO GLOBAL DO APLICATIVO
// ==========================================
let userAtual = null;
let subcategoriasGlobais = [];
let transacoesGlobais = [];
let clientesGlobais = [];
let fornecedoresGlobais = [];
let produtos = [];
let comprasGlobais = [];
let vendasGlobais = [];

// ==========================================
// ROTEAMENTO DE ABAS (SPA Router)
// ==========================================
function mudarAba(abaId) {
    // Força fechamento de modais residuais para evitar bugs de foco/z-index
    fecharModal('modalOverlayGestao');
    fecharModal('modalOverlayBaixa');

    const abas = ['aba-fluxo', 'aba-compras', 'aba-estoque', 'aba-vendas', 'aba-configuracoes', 'aba-relatorios'];
    abas.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
        
        const btn = document.getElementById(`btn-${id}`);
        if (btn) btn.className = "px-3 py-2 text-sm font-bold rounded-lg text-slate-500 hover:bg-slate-100 transition flex items-center";

        const mobileBtn = document.getElementById(`mobile-btn-${id}`);
        if (mobileBtn) {
            mobileBtn.classList.remove('active');
            mobileBtn.classList.remove('text-blue-600');
            mobileBtn.classList.remove('dark:text-blue-400');
            mobileBtn.classList.add('text-slate-400');
            mobileBtn.classList.add('dark:text-slate-500');
        }
    });

    const elAtiva = document.getElementById(abaId);
    if (elAtiva) elAtiva.classList.remove('hidden');
    
    const btnAtivo = document.getElementById(`btn-${abaId}`);
    if (btnAtivo) btnAtivo.className = "px-3 py-2 text-sm font-bold rounded-lg bg-blue-50 text-blue-700 transition flex items-center";

    const mobileBtnAtivo = document.getElementById(`mobile-btn-${abaId}`);
    if (mobileBtnAtivo) {
        mobileBtnAtivo.classList.add('active');
        mobileBtnAtivo.classList.remove('text-slate-400');
        mobileBtnAtivo.classList.remove('dark:text-slate-500');
    }
    
    if (abaId === 'aba-fluxo') atualizarTudo();
    if (abaId === 'aba-estoque') carregarProdutos();
    if (abaId === 'aba-compras') { carregarProdutos(); carregarCompras(); }
    if (abaId === 'aba-vendas') { carregarProdutos(); carregarVendas(); }
    if (abaId === 'aba-relatorios') {
        mostrarLoading();
        Promise.all([carregarProdutos(), carregarVendas(), carregarTransacoesGlobais()]).then(() => {
            initRelatorios();
            ocultarLoading();
        });
    }
}

// ==========================================
// NOTIFICAÇÕES E PWA PUSH
// ==========================================
function atualizarStatusNotificacao() {
    const btn = document.getElementById('btn-notif');
    const txt = document.getElementById('notif-status-text');
    if (!btn || !txt) return;
    if (!('Notification' in window)) {
        txt.textContent = 'Não suportado neste navegador';
        btn.disabled = true;
        btn.className = 'bg-slate-300 text-slate-500 font-bold py-2 px-4 rounded-lg text-sm cursor-not-allowed';
        return;
    }
    if (Notification.permission === 'granted') {
        txt.textContent = 'Notificações ativadas';
        btn.textContent = 'Ativado ✓';
        btn.className = 'bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm cursor-default';
        btn.disabled = true;
    } else if (Notification.permission === 'denied') {
        txt.textContent = 'Bloqueado pelo navegador';
        btn.textContent = 'Bloqueado';
        btn.className = 'bg-red-100 text-red-500 font-bold py-2 px-4 rounded-lg text-sm cursor-not-allowed';
        btn.disabled = true;
    }
}

async function solicitarPermissaoNotificacao() {
    if (!('Notification' in window)) { mostrarToast('Seu navegador não suporta notificações.', 'warning'); return; }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') { mostrarToast('Notificações ativadas!', 'success'); }
    else { mostrarToast('Permissão de notificação negada.', 'warning'); }
    atualizarStatusNotificacao();
}

async function verificarVencimentos() {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !userAtual) return;
    try {
        const hoje = new Date();
        const hojeStr = hoje.toISOString().split('T')[0];
        const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
        const amanhaStr = amanha.toISOString().split('T')[0];
        const ontem = new Date(hoje); ontem.setDate(ontem.getDate() - 1);
        const ontemStr = ontem.toISOString().split('T')[0];

        const { data, error } = await clienteSupabase.from('transacoes').select('descricao, data_vencimento, valor_parcela, tipo')
            .eq('status', 'Pendente')
            .in('data_vencimento', [ontemStr, hojeStr, amanhaStr]);
        if (error || !data || data.length === 0) return;

        data.forEach(t => {
            let titulo = '';
            if (t.data_vencimento === ontemStr) titulo = '⚠️ Conta atrasada!';
            else if (t.data_vencimento === hojeStr) titulo = '📅 Vence HOJE!';
            else if (t.data_vencimento === amanhaStr) titulo = '🔔 Vence amanhã';
            
            const corpo = `${t.tipo}: ${t.descricao} — R$ ${parseFloat(t.valor_parcela).toFixed(2).replace('.', ',')}`;
            new Notification(titulo, { body: corpo, icon: 'icons/icon-192.png' });
        });
    } catch (err) { /* silencioso */ }
}

function verificarNotificacoesPush() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const hoje = new Date();
    const strHoje = hoje.toISOString().split('T')[0];
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const strAmanha = amanha.toISOString().split('T')[0];
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    const strOntem = ontem.toISOString().split('T')[0];

    let countHoje = 0, countAmanha = 0, countAtrasada = 0;

    transacoesGlobais.forEach(t => {
        if (t.status === 'Pendente') {
            if (t.data_vencimento === strHoje) countHoje++;
            else if (t.data_vencimento === strAmanha) countAmanha++;
            else if (t.data_vencimento === strOntem) countAtrasada++;
        }
    });

    if (countHoje > 0) new Notification("MaxFinance", { body: `Você tem ${countHoje} conta(s) vencendo HOJE.` });
    if (countAmanha > 0) new Notification("MaxFinance", { body: `Você tem ${countAmanha} conta(s) vencendo AMANHÃ.` });
    if (countAtrasada > 0) new Notification("MaxFinance", { body: `Atenção: Você tem ${countAtrasada} conta(s) que venceu(ram) ONTEM e continua(m) pendente(s).` });
}

// Inicializar Service Worker do PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW erro:', err));
}

// ==========================================
// LIGAÇÃO DE EVENTOS (Approach A - Event Listeners)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializar Sessão
    clienteSupabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            window.location.reload();
        } else {
            verificarSessao();
        }
    });

    // 2. Navegação de Abas (Mobile & Desktop)
    const abasIds = ['fluxo', 'compras', 'estoque', 'vendas', 'relatorios', 'configuracoes'];
    abasIds.forEach(id => {
        const btnDesktop = document.getElementById(`btn-aba-${id}`);
        if (btnDesktop) {
            btnDesktop.addEventListener('click', () => mudarAba(`aba-${id}`));
        }
        const btnMobile = document.getElementById(`mobile-btn-aba-${id}`);
        if (btnMobile) {
            btnMobile.addEventListener('click', () => mudarAba(`aba-${id}`));
        }
    });

    // 3. Autenticação
    const btnLoginGoogle = document.getElementById('btn-login-google');
    if (btnLoginGoogle) {
        btnLoginGoogle.addEventListener('click', loginComGoogle);
    }
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', sair);
    }

    // 4. Filtros da Aba Financeiro (Fluxo)
    const inputPesquisa = document.getElementById('input-pesquisa');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('keyup', renderizarFluxo);
    }
    const filtroAno = document.getElementById('filtro-ano');
    if (filtroAno) {
        filtroAno.addEventListener('change', carregarDadosFluxo);
    }
    const filtroMes = document.getElementById('filtro-mes');
    if (filtroMes) {
        filtroMes.addEventListener('change', carregarDadosFluxo);
    }
    const agrupamento = document.getElementById('agrupamento');
    if (agrupamento) {
        agrupamento.addEventListener('change', renderizarFluxo);
    }
    const btnFiltroPendente = document.getElementById('btn-filtro-Pendente');
    if (btnFiltroPendente) {
        btnFiltroPendente.addEventListener('click', () => mudarFiltroStatus('Pendente'));
    }
    const btnFiltroRealizado = document.getElementById('btn-filtro-Realizado');
    if (btnFiltroRealizado) {
        btnFiltroRealizado.addEventListener('click', () => mudarFiltroStatus('Realizado'));
    }
    const btnFiltroTodos = document.getElementById('btn-filtro-Todos');
    if (btnFiltroTodos) {
        btnFiltroTodos.addEventListener('click', () => mudarFiltroStatus('Todos'));
    }

    // 5. Botões de Lançamentos de Modais e Submissões
    const btnNovoLancamento = document.getElementById('btn-novo-lancamento');
    if (btnNovoLancamento) {
        btnNovoLancamento.addEventListener('click', abrirModalNovo);
    }

    // 6. Aba Compras
    const filtroDataInicioCompras = document.getElementById('filtro-data-inicio-compras');
    if (filtroDataInicioCompras) {
        filtroDataInicioCompras.addEventListener('change', renderizarCompras);
    }
    const filtroDataFimCompras = document.getElementById('filtro-data-fim-compras');
    if (filtroDataFimCompras) {
        filtroDataFimCompras.addEventListener('change', renderizarCompras);
    }
    const btnNovaCompra = document.getElementById('btn-nova-compra');
    if (btnNovaCompra) {
        btnNovaCompra.addEventListener('click', abrirModalCompra);
    }

    // 7. Aba Estoque
    const inputPesquisaEstoque = document.getElementById('input-pesquisa-estoque');
    if (inputPesquisaEstoque) {
        inputPesquisaEstoque.addEventListener('keyup', renderizarEstoque);
    }
    const btnNovoProduto = document.getElementById('btn-novo-produto');
    if (btnNovoProduto) {
        btnNovoProduto.addEventListener('click', abrirModalEstoque);
    }

    // 8. Aba Vendas
    const filtroDataInicioVendas = document.getElementById('filtro-data-inicio-vendas');
    if (filtroDataInicioVendas) {
        filtroDataInicioVendas.addEventListener('change', renderizarVendas);
    }
    const filtroDataFimVendas = document.getElementById('filtro-data-fim-vendas');
    if (filtroDataFimVendas) {
        filtroDataFimVendas.addEventListener('change', renderizarVendas);
    }
    const btnNovaVenda = document.getElementById('btn-nova-venda');
    if (btnNovaVenda) {
        btnNovaVenda.addEventListener('click', abrirModalVenda);
    }

    // 9. Aba Relatórios
    const relatorioMes = document.getElementById('relatorio-mes');
    if (relatorioMes) {
        relatorioMes.addEventListener('change', renderizarRelatorios);
    }
    const relatorioAno = document.getElementById('relatorio-ano');
    if (relatorioAno) {
        relatorioAno.addEventListener('change', renderizarRelatorios);
    }
    const relatorioRankingTipo = document.getElementById('relatorio-ranking-tipo');
    if (relatorioRankingTipo) {
        relatorioRankingTipo.addEventListener('change', renderizarRelatorios);
    }

    // 10. Aba Ajustes / Configurações
    const btnGerenciarClientes = document.getElementById('btn-gerenciar-clientes');
    if (btnGerenciarClientes) {
        btnGerenciarClientes.addEventListener('click', abrirModalListaClientes);
    }
    const btnGerenciarFornecedores = document.getElementById('btn-gerenciar-fornecedores');
    if (btnGerenciarFornecedores) {
        btnGerenciarFornecedores.addEventListener('click', abrirModalListaFornecedores);
    }
    const pesquisaClientes = document.getElementById('pesquisa-clientes');
    if (pesquisaClientes) {
        pesquisaClientes.addEventListener('input', (e) => {
            if (typeof filtrarClientes === 'function') filtrarClientes(e.target.value.toLowerCase());
        });
    }
    const pesquisaFornecedores = document.getElementById('pesquisa-fornecedores');
    if (pesquisaFornecedores) {
        pesquisaFornecedores.addEventListener('input', (e) => {
            if (typeof filtrarFornecedores === 'function') filtrarFornecedores(e.target.value.toLowerCase());
        });
    }
    const btnExportarJSON = document.getElementById('btn-exportar-json');
    if (btnExportarJSON) {
        btnExportarJSON.addEventListener('click', exportarBackupJSON);
    }
    const inputRestaurarJSON = document.getElementById('input-restaurar-json');
    if (inputRestaurarJSON) {
        inputRestaurarJSON.addEventListener('change', importarBackupJSON);
    }
    const btnExportarExcel = document.getElementById('btn-exportar-excel');
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarExcel);
    }
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
    const btnNotif = document.getElementById('btn-notif');
    if (btnNotif) {
        btnNotif.addEventListener('click', solicitarPermissaoNotificacao);
    }
    const btnResetarConta = document.getElementById('btn-resetar-conta');
    if (btnResetarConta) {
        btnResetarConta.addEventListener('click', resetarTodosOsDados);
    }

    // 11. Ouvintes de Fechamento de Modais
    const closeBtnMap = {
        'close-lista-clientes': 'modalListaClientes',
        'btn-lista-cliente-novo': null, // Tratado individualmente abaixo
        'close-lista-fornecedores': 'modalListaFornecedores',
        'btn-lista-fornecedor-novo': null, // Tratado individualmente abaixo
        'close-cliente': 'modalCliente',
        'close-fornecedor': 'modalFornecedor',
        'close-gestao': 'modalOverlayGestao',
        'close-estoque': 'modalEstoque',
        'close-compra': 'modalCompra',
        'close-venda': 'modalVenda',
        'close-baixa': 'modalOverlayBaixa'
    };
    
    Object.keys(closeBtnMap).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => fecharModal(closeBtnMap[btnId]));
        }
    });

    const btnListaClienteNovo = document.getElementById('btn-lista-cliente-novo');
    if (btnListaClienteNovo) {
        btnListaClienteNovo.addEventListener('click', () => abrirModalCliente());
    }
    const btnListaFornecedorNovo = document.getElementById('btn-lista-fornecedor-novo');
    if (btnListaFornecedorNovo) {
        btnListaFornecedorNovo.addEventListener('click', () => abrirModalFornecedor());
    }

    // 12. Botões de Exclusão de Modais
    const btnExcluirCliente = document.getElementById('btn_excluir_cliente');
    if (btnExcluirCliente) {
        btnExcluirCliente.addEventListener('click', excluirClienteModal);
    }
    const btnExcluirFornecedor = document.getElementById('btn_excluir_fornecedor');
    if (btnExcluirFornecedor) {
        btnExcluirFornecedor.addEventListener('click', excluirFornecedorModal);
    }
    const btnExcluirParcela = document.getElementById('btn-excluir-parcela');
    if (btnExcluirParcela) {
        btnExcluirParcela.addEventListener('click', excluirParcelaAtual);
    }
    const btnExcluirGrupo = document.getElementById('btn-excluir-grupo');
    if (btnExcluirGrupo) {
        btnExcluirGrupo.addEventListener('click', excluirGrupoAtual);
    }
    const btnConfirmarBaixa = document.getElementById('btn-confirmar-baixa');
    if (btnConfirmarBaixa) {
        btnConfirmarBaixa.addEventListener('click', confirmarBaixa);
    }

    // 13. Cadastro Rápido (+) e Ações Especiais dentro de Modais de Compra/Venda
    const btnFornecedorRapido = document.getElementById('btn-fornecedor-rapido');
    if (btnFornecedorRapido) {
        btnFornecedorRapido.addEventListener('click', abrirModalFornecedorRapido);
    }
    const btnAdicionarItemCompra = document.getElementById('btn-adicionar-item-compra');
    if (btnAdicionarItemCompra) {
        btnAdicionarItemCompra.addEventListener('click', () => {
            adicionarItemCompra();
            calcularTotalCompra();
        });
    }
    const btnExcluirCompra = document.getElementById('btn_excluir_compra');
    if (btnExcluirCompra) {
        btnExcluirCompra.addEventListener('click', excluirCompraModal);
    }
    const btnClienteRapido = document.getElementById('btn-cliente-rapido');
    if (btnClienteRapido) {
        btnClienteRapido.addEventListener('click', abrirModalClienteRapido);
    }
    const btnAdicionarItemVenda = document.getElementById('btn-adicionar-item-venda');
    if (btnAdicionarItemVenda) {
        btnAdicionarItemVenda.addEventListener('click', () => {
            adicionarItemVenda();
            calcularTotalVenda();
        });
    }
    const btnExcluirVenda = document.getElementById('btn_excluir_venda');
    if (btnExcluirVenda) {
        btnExcluirVenda.addEventListener('click', excluirVendaModal);
    }

    // 14. Event Delegation - Itens de Compra Dinâmicos
    const compraItensContainer = document.getElementById('compra_itens_container');
    if (compraItensContainer) {
        compraItensContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantidade-input') || e.target.classList.contains('custo-input')) {
                calcularTotalCompra();
            }
        });
        compraItensContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.parentElement.classList.contains('item-compra')) {
                btn.parentElement.remove();
                calcularTotalCompra();
            }
        });
    }

    // 15. Event Delegation - Itens de Venda Dinâmicos
    const vendaItensContainer = document.getElementById('venda_itens_container');
    if (vendaItensContainer) {
        vendaItensContainer.addEventListener('input', (e) => {
            if (e.target.classList.contains('quantidade-input') || e.target.classList.contains('venda-input')) {
                calcularTotalVenda();
            }
        });
        vendaItensContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('produto-select')) {
                atualizarPrecoVenda(e.target);
            }
        });
        vendaItensContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.parentElement.classList.contains('item-venda')) {
                btn.parentElement.remove();
                calcularTotalVenda();
            }
        });
    }

    // 16. Outros Eventos Auxiliares
    const selectTipo = document.getElementById('tipo');
    if (selectTipo) {
        selectTipo.addEventListener('change', carregarSelectSubcategorias);
    }
    const inputParcelas = document.getElementById('parcelas');
    if (inputParcelas) {
        inputParcelas.addEventListener('change', verificarParcelamento);
    }

    // 17. Registro de Formulários (Submit listeners)
    const formsMap = {
        'form-cliente': salvarCliente,
        'form-fornecedor': salvarFornecedor,
        'form-subcategoria': adicionarSubcategoria,
        'transacao-form': salvarTransacao,
        'form-estoque': salvarProduto,
        'form-compra': salvarCompra,
        'form-venda': salvarVenda
    };
    
    Object.keys(formsMap).forEach(formId => {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', formsMap[formId]);
        }
    });
});
