let transacoesMes = [];
let filtroStatusAtual = 'Pendente';
let saldoInicialProjetado = 0; 
let editandoId = null;
let grupoIdAtual = null;
let baixaIdAtual = null;
let isSubmittingTransacao = false;

function mudarFiltroStatus(status) {
    filtroStatusAtual = status;
    ['Pendente', 'Realizado', 'Todos'].forEach(id => {
        const el = document.getElementById(`btn-filtro-${id}`);
        if (el) el.className = "px-3 py-2 text-xs font-bold bg-slate-50 text-slate-600 hover:bg-slate-100 border-r last:border-0";
    });
    const activeEl = document.getElementById(`btn-filtro-${status}`);
    if (activeEl) activeEl.className = "px-3 py-2 text-xs font-bold bg-blue-600 text-white border-r last:border-0";
    renderizarFluxo();
}

function atualizarTudo() {
    mostrarLoading();
    Promise.all([
        carregarAnosFiltro(),
        calcularSaldoRealTotal(),
        carregarDadosFluxo()
    ]).then(() => {
        if (typeof verificarVencimentos === 'function') verificarVencimentos();
    }).finally(() => ocultarLoading());
}

async function calcularSaldoRealTotal() {
    try {
        const { data, error } = await clienteSupabase.from('transacoes').select('tipo, valor_realizado').eq('status', 'Realizado');
        if (error) throw error;
        let saldo = 0;
        if(data) data.forEach(t => { saldo += t.tipo === 'Entrada' ? parseFloat(t.valor_realizado) : -parseFloat(t.valor_realizado); });
        
        const el = document.getElementById('card-saldo-real');
        if (el) {
            el.textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
            el.className = saldo < 0 ? "text-base font-bold text-red-600 whitespace-nowrap" : "text-base font-bold text-green-600 whitespace-nowrap";
        }
    } catch (err) {
        mostrarToast("Erro ao calcular saldo real: " + err.message, "error");
    }
}

async function carregarAnosFiltro() {
    try {
        const { data, error } = await clienteSupabase.from('transacoes').select('data_vencimento');
        if (error) throw error;
        const selectAno = document.getElementById('filtro-ano');
        if (!selectAno) return;
        const anoAtualVal = selectAno.value;
        const anos = new Set();
        if (data) {
            data.forEach(t => {
                if (t.data_vencimento) anos.add(t.data_vencimento.split('-')[0]);
            });
        }
        const anosArray = Array.from(anos).sort((a, b) => b - a);
        selectAno.innerHTML = '<option value="Todos">Todos Anos</option>';
        anosArray.forEach(ano => {
            selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
        });
        if (anosArray.includes(anoAtualVal)) selectAno.value = anoAtualVal;
    } catch (err) { console.error("Erro carregar anos:", err); }
}

async function carregarDadosFluxo() {
    try {
        const selectAno = document.getElementById('filtro-ano');
        const selectMes = document.getElementById('filtro-mes');
        if (!selectAno || !selectMes) return;

        const ano = selectAno.value;
        const mes = selectMes.value;
        let query = clienteSupabase.from('transacoes').select('*');
        
        saldoInicialProjetado = 0;

        if (ano !== "Todos" && mes !== "Todos") {
            const anoFiltro = parseInt(ano);
            const mesFiltro = parseInt(mes);
            const dataInicioMes = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-01`;
            const ultimoDia = new Date(anoFiltro, mesFiltro, 0).getDate();
            const dataFimMes = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
            
            query = query.gte('data_vencimento', dataInicioMes).lte('data_vencimento', dataFimMes);

            const { data: dataAnt, error: errorAnt } = await clienteSupabase.from('transacoes').select('tipo, status, valor_parcela, valor_realizado').lt('data_vencimento', dataInicioMes);
            if (errorAnt) throw errorAnt;
            if(dataAnt) {
                dataAnt.forEach(t => {
                    const v = parseFloat(t.status === 'Realizado' ? t.valor_realizado : t.valor_parcela);
                    saldoInicialProjetado += t.tipo === 'Entrada' ? v : -v;
                });
            }
        } else if (ano !== "Todos") {
            const dataInicioAno = `${ano}-01-01`;
            const dataFimAno = `${ano}-12-31`;
            query = query.gte('data_vencimento', dataInicioAno).lte('data_vencimento', dataFimAno);
            
            const { data: dataAnt, error: errorAnt } = await clienteSupabase.from('transacoes').select('tipo, status, valor_parcela, valor_realizado').lt('data_vencimento', dataInicioAno);
            if (errorAnt) throw errorAnt;
            if(dataAnt) {
                dataAnt.forEach(t => {
                    const v = parseFloat(t.status === 'Realizado' ? t.valor_realizado : t.valor_parcela);
                    saldoInicialProjetado += t.tipo === 'Entrada' ? v : -v;
                });
            }
        }

        const { data, error } = await query.order('data_vencimento', { ascending: true });
        if (error) throw error;
        
        if (data) {
            transacoesMes = data;
            let pIn = 0; let pOut = 0;
            transacoesMes.forEach(t => {
                const v = parseFloat(t.valor_parcela);
                if(t.tipo === 'Entrada') pIn += v; else pOut += v;
            });
            document.getElementById('card-entradas-prev').textContent = `R$ ${pIn.toFixed(2).replace('.', ',')}`;
            document.getElementById('card-saidas-prev').textContent = `R$ ${pOut.toFixed(2).replace('.', ',')}`;
            document.getElementById('card-balanco-prev').textContent = `R$ ${(pIn - pOut).toFixed(2).replace('.', ',')}`;

            renderizarFluxo();
        }
    } catch (err) {
        mostrarToast("Erro ao carregar fluxo de caixa: " + err.message, "error");
    }
}

function renderizarFluxo() {
    const tbody = document.getElementById('tabela-corpo');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 1. Filtro de Status
    let tFiltradas = transacoesMes;
    if (filtroStatusAtual !== 'Todos') {
        tFiltradas = tFiltradas.filter(t => t.status === filtroStatusAtual);
    }

    // 2. Filtro de Pesquisa (Texto)
    const termoBusca = (document.getElementById('input-pesquisa')?.value || '').toLowerCase().trim();
    if (termoBusca) {
        tFiltradas = tFiltradas.filter(t => 
            t.descricao.toLowerCase().includes(termoBusca) || 
            t.subcategoria.toLowerCase().includes(termoBusca)
        );
    }

    // 3. Lógica de Agrupamento Dinâmico
    const tipoAgrupamento = document.getElementById('agrupamento')?.value || 'dia';
    const grupos = {};

    tFiltradas.forEach(t => {
        let chaveGrupo = t.data_vencimento;

        if (tipoAgrupamento === 'mes') {
            chaveGrupo = t.data_vencimento.substring(0, 7); // YYYY-MM
        } else if (tipoAgrupamento === 'semana') {
            const d = new Date(t.data_vencimento + 'T12:00:00');
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Força Segunda-feira
            const monday = new Date(d.setDate(diff));
            chaveGrupo = monday.toISOString().split('T')[0];
        }

        if(!grupos[chaveGrupo]) grupos[chaveGrupo] = { itens: [], in: 0, out: 0 };
        grupos[chaveGrupo].itens.push(t);
        
        const val = parseFloat(t.status === 'Realizado' ? t.valor_realizado : t.valor_parcela);
        if(t.tipo === 'Entrada') grupos[chaveGrupo].in += val; else grupos[chaveGrupo].out += val;
    });

    if (Object.keys(grupos).length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium text-sm">Nenhum lançamento encontrado para os filtros atuais.</td></tr>';
        return;
    }

    let saldoEmCaixa = saldoInicialProjetado;
    const labelPeriodo = tipoAgrupamento === 'dia' ? 'Dia' : (tipoAgrupamento === 'semana' ? 'Semana' : 'Mês');

    Object.keys(grupos).sort().forEach(chave => {
        const grp = grupos[chave];
        const balancoDia = grp.in - grp.out;
        saldoEmCaixa += balancoDia;
        
        let tituloGrupo = '';
        if (tipoAgrupamento === 'dia') {
            tituloGrupo = `<i class="far fa-calendar-alt mr-2 text-blue-500"></i> ${chave.split('-').reverse().join('/')}`;
        } else if (tipoAgrupamento === 'mes') {
            const [a, m] = chave.split('-');
            tituloGrupo = `<i class="far fa-calendar-alt mr-2 text-blue-500"></i> Mês: ${m}/${a}`;
        } else if (tipoAgrupamento === 'semana') {
            tituloGrupo = `<i class="far fa-calendar-alt mr-2 text-blue-500"></i> Semana de ${chave.split('-').reverse().join('/')}`;
        }

        const corBalanco = balancoDia >= 0 ? 'text-green-600' : 'text-red-600';
        const corCaixa = saldoEmCaixa >= 0 ? 'text-blue-600' : 'text-red-600';

        tbody.innerHTML += `
            <tr class="bg-slate-100 border-y">
                <td colspan="4" class="py-2 px-3">
                    <div class="flex flex-col md:flex-row justify-between md:items-center gap-2">
                        <span class="font-bold text-slate-700 text-[11px] uppercase tracking-wider">${tituloGrupo}</span>
                        <div class="flex items-center text-[10px] font-bold text-slate-500 overflow-x-auto hide-scrollbar">
                            <span class="mr-3 whitespace-nowrap"><i class="fas fa-arrow-up text-green-500"></i> R$ ${grp.in.toFixed(2).replace('.',',')}</span>
                            <span class="mr-3 whitespace-nowrap"><i class="fas fa-arrow-down text-red-500"></i> R$ ${grp.out.toFixed(2).replace('.',',')}</span>
                            <span class="${corBalanco} border-l border-slate-300 pl-3 mr-3 whitespace-nowrap">${labelPeriodo}: R$ ${balancoDia.toFixed(2).replace('.',',')}</span>
                            <span class="${corCaixa} border-l border-slate-300 pl-3 whitespace-nowrap">Caixa: R$ ${saldoEmCaixa.toFixed(2).replace('.',',')}</span>
                        </div>
                    </div>
                </td>
            </tr>
        `;

        grp.itens.forEach(t => {
            const isRealizado = t.status === 'Realizado';
            const valorExibido = parseFloat(isRealizado ? t.valor_realizado : t.valor_parcela);
            const corValor = t.tipo === 'Entrada' ? 'text-green-600' : 'text-slate-800';
            const textoParcela = t.total_parcelas === 0 ? 'Recorrente' : `${t.parcela_atual}/${t.total_parcelas}`;
            const opacidade = isRealizado ? 'opacity-60 bg-slate-50' : '';

            tbody.innerHTML += `
                <tr onclick="abrirModalGestao('${t.id}')" class="hover:bg-blue-50/50 transition cursor-pointer group ${opacidade} clickable-row">
                    <td class="py-1.5 px-3 flex items-center gap-3">
                        <div onclick="event.stopPropagation(); alternarBaixaRapida('${t.id}', ${isRealizado}, ${t.valor_parcela})" class="text-lg cursor-pointer">
                            ${isRealizado ? 
                                `<i class="fas fa-check-circle text-green-500"></i>` : 
                                `<i class="far fa-circle text-slate-300 hover:text-green-500 transition"></i>`
                            }
                        </div>
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-700 text-sm">${t.descricao}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${t.subcategoria}</span>
                        </div>
                    </td>
                    <td class="py-1.5 px-3 text-slate-400 text-[11px] font-bold text-center md:text-left">${textoParcela}</td>
                    <td class="py-1.5 px-3 text-right font-black ${corValor} text-sm">R$ ${valorExibido.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
    });
}

async function alternarBaixaRapida(id, isRealizado, valorPadrao) {
    try {
        if (isRealizado) {
            if(confirm("Desfazer a baixa e marcar como pendente?")) {
                const { error } = await clienteSupabase.from('transacoes').update({ status: 'Pendente', data_realizacao: null, valor_realizado: null }).eq('id', id);
                if (error) throw error;
                mostrarToast("Lançamento alterado para Pendente!", "info");
                atualizarTudo();
            }
        } else {
            baixaIdAtual = id;
            document.getElementById('baixa_valor').value = valorPadrao;
            document.getElementById('baixa_data').value = new Date().toISOString().split('T')[0];
            document.getElementById('modalOverlayBaixa').classList.remove('hidden');
        }
    } catch (err) {
        mostrarToast("Erro ao alterar status: " + err.message, "error");
    }
}

async function confirmarBaixa() {
    try {
        const v = parseFloat(document.getElementById('baixa_valor').value);
        const d = document.getElementById('baixa_data').value;
        if (isNaN(v) || v <= 0) {
            mostrarToast("Por favor, insira um valor válido maior que zero.", "warning");
            return;
        }
        if (!d) {
            mostrarToast("Por favor, selecione a data do pagamento.", "warning");
            return;
        }
        const { error } = await clienteSupabase.from('transacoes').update({ status: 'Realizado', data_realizacao: d, valor_realizado: v }).eq('id', baixaIdAtual);
        if (error) throw error;
        mostrarToast("Pagamento confirmado com sucesso!", "success");
        fecharModal('modalOverlayBaixa');
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao confirmar pagamento: " + err.message, "error");
    }
}

function abrirModalNovo() {
    editandoId = null;
    grupoIdAtual = null;
    document.getElementById('transacao-form').reset();
    
    document.getElementById('div-parcelas').classList.remove('hidden');
    document.getElementById('label-data').textContent = "Data da 1ª Parcela";
    document.getElementById('modal-titulo').innerHTML = '<i class="fas fa-plus-circle text-blue-500 mr-2"></i>Novo Lançamento';
    document.getElementById('campos-realizado').classList.add('hidden');
    document.getElementById('area-historico').classList.add('hidden');
    document.getElementById('modal-footer').classList.add('hidden');
    
    document.getElementById('modalOverlayGestao').classList.remove('hidden');
    verificarParcelamento();
}

async function abrirModalGestao(id) {
    try {
        const { data, error } = await clienteSupabase.from('transacoes').select('*').eq('id', id).single();
        if (error) throw error;
        if(data) {
            editandoId = id;
            grupoIdAtual = data.grupo_id;
            
            document.getElementById('modal-titulo').innerHTML = '<i class="fas fa-edit text-blue-500 mr-2"></i>Gerenciar Lançamento';
            document.getElementById('tipo').value = data.tipo;
            carregarSelectSubcategorias();
            document.getElementById('subcategoria').value = data.subcategoria;
            document.getElementById('descricao').value = data.descricao;
            document.getElementById('valor').value = data.valor_parcela;
            document.getElementById('data_vencimento').value = data.data_vencimento;
            
            if (data.status === 'Realizado') {
                document.getElementById('campos-realizado').classList.remove('hidden');
                document.getElementById('data_realizacao').value = data.data_realizacao;
                document.getElementById('valor_realizado').value = data.valor_realizado;
            } else {
                document.getElementById('campos-realizado').classList.add('hidden');
            }
            
            document.getElementById('div-parcelas').classList.add('hidden');
            document.getElementById('div-frequencia').classList.add('hidden');
            document.getElementById('label-data').textContent = "Data de Vencimento";
            
            document.getElementById('modal-footer').classList.remove('hidden');
            document.getElementById('modalOverlayGestao').classList.remove('hidden');
            
            await carregarHistoricoGrupo(grupoIdAtual);
        }
    } catch (err) {
        mostrarToast("Erro ao carregar detalhes do lançamento: " + err.message, "error");
    }
}

async function carregarHistoricoGrupo(grupoId) {
    try {
        const { data, error } = await clienteSupabase.from('transacoes').select('*').eq('grupo_id', grupoId).order('parcela_atual', { ascending: true });
        if (error) throw error;
        if (data && data.length > 1) {
            document.getElementById('area-historico').classList.remove('hidden');
            const tbody = document.getElementById('tabela-historico');
            tbody.innerHTML = '';
            
            data.forEach(t => {
                const isRealizado = t.status === 'Realizado';
                const v = parseFloat(isRealizado ? t.valor_realizado : t.valor_parcela);
                const dt = t.data_vencimento.split('-').reverse().join('/');
                const isAtual = t.id === editandoId;
                
                tbody.innerHTML += `
                    <tr onclick="abrirModalGestao('${t.id}')" class="cursor-pointer hover:bg-slate-50 transition ${isAtual ? 'bg-blue-50' : ''}">
                        <td class="py-2 px-3 font-bold text-slate-500">${t.total_parcelas === 0 ? 'Rec.' : t.parcela_atual}</td>
                        <td class="py-2 px-3 font-medium ${isRealizado ? 'text-green-600' : 'text-slate-600'}">${dt}</td>
                        <td class="py-2 px-3 font-bold">R$ ${v.toFixed(2).replace('.',',')}</td>
                        <td class="py-2 px-3 text-right">
                            ${isRealizado ? `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase"><i class="fas fa-check mr-1"></i>Realizado</span>` : `<span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold uppercase">Pendente</span>`}
                        </td>
                    </tr>
                `;
            });
        } else {
            document.getElementById('area-historico').classList.add('hidden');
        }
    } catch (err) {
        mostrarToast("Erro ao carregar histórico de parcelas: " + err.message, "error");
    }
}

function verificarParcelamento() {
    if(editandoId) return;
    const p = parseInt(document.getElementById('parcelas').value);
    const divFreq = document.getElementById('div-frequencia');
    if (divFreq) divFreq.classList.toggle('hidden', p === 1);
    document.getElementById('label-data').textContent = p === 1 ? "Data de Vencimento" : "Data da 1ª Parcela";
}

async function carregarSubcategoriasBanco() {
    try {
        const { data, error } = await clienteSupabase.from('subcategorias').select('*').order('nome', { ascending: true });
        if (error) throw error;
        if (data) {
            subcategoriasGlobais = data;
            const outL = document.getElementById('lista-sub-saidas'); 
            const inL = document.getElementById('lista-sub-entradas');
            if (outL && inL) {
                outL.innerHTML = ''; inL.innerHTML = '';
                subcategoriasGlobais.forEach(s => {
                    const li = `<li class="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm font-bold shadow-sm"><span class="text-slate-600">${s.nome}</span> <button onclick="deletarSubcategoria('${s.id}')" class="text-slate-400 hover:text-red-500"><i class="fas fa-trash-alt"></i></button></li>`;
                    s.tipo === 'Saída' ? outL.innerHTML += li : inL.innerHTML += li;
                });
            }
            carregarSelectSubcategorias();
        }
    } catch (err) {
        mostrarToast("Erro ao carregar subcategorias: " + err.message, "error");
    }
}

function carregarSelectSubcategorias() {
    const t = document.getElementById('tipo').value; 
    const sel = document.getElementById('subcategoria');
    if (!sel) return;
    sel.innerHTML = '';
    const f = subcategoriasGlobais.filter(s => s.tipo === t);
    if (!f.length) sel.innerHTML = '<option value="">Nenhuma cadastrada</option>';
    else f.forEach(s => sel.innerHTML += `<option value="${s.nome}">${s.nome}</option>`);
}

async function adicionarSubcategoria(e) {
    e.preventDefault();
    try {
        const nomeInput = document.getElementById('novo-sub-nome').value.trim();
        if (!nomeInput) {
            mostrarToast("Por favor, informe o nome da subcategoria.", "warning");
            return;
        }
        const tipoInput = document.getElementById('novo-sub-tipo').value;
        const { error } = await clienteSupabase.from('subcategorias').insert([{ user_id: userAtual.id, tipo: tipoInput, nome: nomeInput }]);
        if (error) throw error;
        mostrarToast("Subcategoria adicionada com sucesso!", "success");
        document.getElementById('novo-sub-nome').value = ''; 
        await carregarSubcategoriasBanco();
    } catch (err) {
        mostrarToast("Erro ao adicionar subcategoria: " + err.message, "error");
    }
}

async function deletarSubcategoria(id) { 
    try {
        if (confirm("Tem certeza que deseja deletar esta subcategoria?")) {
            const { error } = await clienteSupabase.from('subcategorias').delete().eq('id', id); 
            if (error) throw error;
            mostrarToast("Subcategoria excluída com sucesso!", "success");
            await carregarSubcategoriasBanco(); 
        }
    } catch (err) {
        mostrarToast("Erro ao excluir subcategoria: " + err.message, "error");
    }
}

async function resetarTodosOsDados() {
    if (!confirm("⚠️ ATENÇÃO: Esta é uma ação destrutiva irreversível! Isso irá apagar de forma definitiva todas as suas transações, subcategorias personalizadas, estoque, histórico de compras, vendas, fornecedores e clientes.\n\nTem certeza absoluta de que deseja continuar?")) {
        return;
    }
    if (!confirm("⚠️ ÚLTIMO AVISO: Todos os seus registros serão excluídos permanentemente de nossos servidores. Para confirmar a exclusão e redefinir sua conta, clique em OK.")) {
        return;
    }

    mostrarLoading();
    try {
        // 1. Obter os IDs de todas as vendas e compras do usuário logado
        const { data: userVendas, error: vSelErr } = await clienteSupabase.from('vendas').select('id').eq('user_id', userAtual.id);
        if (vSelErr) throw vSelErr;

        const { data: userCompras, error: cSelErr } = await clienteSupabase.from('compras').select('id').eq('user_id', userAtual.id);
        if (cSelErr) throw cSelErr;

        const vendaIds = userVendas?.map(v => v.id) || [];
        const compraIds = userCompras?.map(c => c.id) || [];

        // 2. Deletar os itens das vendas e compras primeiro (tabelas de relacionamento sem user_id direto)
        if (vendaIds.length > 0) {
            const { error: viDelErr } = await clienteSupabase.from('vendas_itens').delete().in('venda_id', vendaIds);
            if (viDelErr) throw viDelErr;
        }

        if (compraIds.length > 0) {
            const { error: ciDelErr } = await clienteSupabase.from('compras_itens').delete().in('compra_id', compraIds);
            if (ciDelErr) throw ciDelErr;
        }

        // 3. Deletar as tabelas principais do usuário em ordem de dependência para contornar chaves estrangeiras (FK)
        const { error: vDelErr } = await clienteSupabase.from('vendas').delete().eq('user_id', userAtual.id);
        if (vDelErr) throw vDelErr;

        const { error: cDelErr } = await clienteSupabase.from('compras').delete().eq('user_id', userAtual.id);
        if (cDelErr) throw cDelErr;

        const { error: pDelErr } = await clienteSupabase.from('produtos').delete().eq('user_id', userAtual.id);
        if (pDelErr) throw pDelErr;

        const { error: tDelErr } = await clienteSupabase.from('transacoes').delete().eq('user_id', userAtual.id);
        if (tDelErr) throw tDelErr;

        const { error: sDelErr } = await clienteSupabase.from('subcategorias').delete().eq('user_id', userAtual.id);
        if (sDelErr) throw sDelErr;
        
        try {
            await clienteSupabase.from('clientes').delete().eq('user_id', userAtual.id);
        } catch(e) {}
        try {
            await clienteSupabase.from('fornecedores').delete().eq('user_id', userAtual.id);
        } catch(e) {}

        mostrarToast("Todos os seus dados foram apagados e resetados!", "success");
        
        // Recarregar a página para limpar o estado na memória local
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    } catch (err) {
        mostrarToast("Erro ao resetar dados: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

async function excluirParcelaAtual() {
    try {
        if (confirm("Deseja excluir permanentemente apenas esta parcela?")) {
            const { error } = await clienteSupabase.from('transacoes').delete().eq('id', editandoId);
            if (error) throw error;
            mostrarToast("Parcela excluída com sucesso!", "success");
            fecharModal('modalOverlayGestao');
            atualizarTudo();
        }
    } catch (err) {
        mostrarToast("Erro ao excluir parcela: " + err.message, "error");
    }
}

async function excluirGrupoAtual() {
    try {
        if (confirm("Atenção: Isto apagará o histórico completo e todas as parcelas futuras vinculadas a este lançamento. Deseja continuar?")) {
            const { error } = await clienteSupabase.from('transacoes').delete().eq('grupo_id', grupoIdAtual);
            if (error) throw error;
            mostrarToast("Grupo de parcelas excluído com sucesso!", "success");
            fecharModal('modalOverlayGestao');
            atualizarTudo();
        }
    } catch (err) {
        mostrarToast("Erro ao excluir grupo de parcelas: " + err.message, "error");
    }
}

async function salvarTransacao(e) {
    e.preventDefault();
    if (isSubmittingTransacao) return;
    isSubmittingTransacao = true;
    try {
        const tipo = document.getElementById('tipo').value; 
        const subcategoria = document.getElementById('subcategoria').value;
        if (!subcategoria || subcategoria === "Nenhuma cadastrada") {
            mostrarToast("Por favor, selecione ou cadastre uma subcategoria na aba Ajustes.", "warning");
            isSubmittingTransacao = false;
            return;
        }
        const descricao = document.getElementById('descricao').value.trim();
        if (!descricao) {
            mostrarToast("Por favor, informe a descrição.", "warning");
            isSubmittingTransacao = false;
            return;
        }
        const valor = parseFloat(document.getElementById('valor').value);
        if (isNaN(valor) || valor <= 0) {
            mostrarToast("Por favor, insira um valor válido maior que zero.", "warning");
            isSubmittingTransacao = false;
            return;
        }
        const dtInput = document.getElementById('data_vencimento').value;
        if (!dtInput) {
            mostrarToast("Por favor, selecione uma data de vencimento válida.", "warning");
            isSubmittingTransacao = false;
            return;
        }
        
        if (editandoId) {
            let updateData = { tipo, subcategoria, descricao, valor_parcela: valor, data_vencimento: dtInput };

            if (!document.getElementById('campos-realizado').classList.contains('hidden')) {
                const vRealizado = parseFloat(document.getElementById('valor_realizado').value);
                if (isNaN(vRealizado) || vRealizado <= 0) {
                    mostrarToast("Por favor, informe um valor pago válido maior que zero.", "warning");
                    isSubmittingTransacao = false;
                    return;
                }
                updateData.data_realizacao = document.getElementById('data_realizacao').value;
                updateData.valor_realizado = vRealizado;
            }

            const { error } = await clienteSupabase.from('transacoes').update(updateData).eq('id', editandoId);
            if (error) throw error;
            mostrarToast("Lançamento atualizado com sucesso!", "success");
            fecharModal('modalOverlayGestao');
        } else {
            const dataBase = new Date(dtInput + 'T12:00:00'); 
            const pTotal = parseInt(document.getElementById('parcelas').value);
            if (isNaN(pTotal) || pTotal < 0) {
                mostrarToast("O número de parcelas deve ser 0 ou maior.", "warning");
                isSubmittingTransacao = false;
                return;
            }
            const freq = pTotal === 1 ? 'Única' : document.getElementById('frequencia').value;
            const grupo_id = crypto.randomUUID(); 
            const iter = pTotal === 0 ? 12 : pTotal; 
            let ins = [];
            
            for (let i = 0; i < iter; i++) {
                let dP = new Date(dataBase);
                if (freq === 'Mensal') { let d = dP.getDate(); dP.setMonth(dP.getMonth() + i); if(dP.getDate() !== d) dP.setDate(0); }
                else if (freq === 'Semanal') dP.setDate(dP.getDate() + (i * 7));
                else if (freq === 'Anual') dP.setFullYear(dP.getFullYear() + i);

                ins.push({ 
                    user_id: userAtual.id, grupo_id, tipo, subcategoria, descricao, valor_parcela: valor, 
                    data_vencimento: dP.toISOString().split('T')[0], parcela_atual: i + 1, total_parcelas: pTotal, 
                    frequencia, status: 'Pendente' 
                });
            }
            const { error } = await clienteSupabase.from('transacoes').insert(ins);
            if (error) throw error;
            mostrarToast(pTotal === 1 ? "Lançamento adicionado com sucesso!" : "Grupo de parcelas criado com sucesso!", "success");
            fecharModal('modalOverlayGestao');
        }
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao salvar lançamento: " + err.message, "error");
    } finally {
        isSubmittingTransacao = false;
    }
}

async function exportarBackupJSON(event) {
    try {
        const btn = event.currentTarget;
        const txt = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Gerando...';
        btn.disabled = true;

        const { data: categorias } = await clienteSupabase.from('subcategorias').select('*');
        const { data: transacoes } = await clienteSupabase.from('transacoes').select('*');

        const backupData = {
            data_exportacao: new Date().toISOString(),
            app: "MaxFinance",
            usuario: userAtual.email,
            subcategorias: categorias || [],
            transacoes: transacoes || []
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `MaxFinance_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        btn.innerHTML = txt;
        btn.disabled = false;
        mostrarToast("Backup JSON gerado com sucesso!", "success");
    } catch (err) {
        mostrarToast("Erro ao exportar backup: " + err.message, "error");
    }
}

async function importarBackupJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm("⚠️ ATENÇÃO: A restauração apagará TODOS os dados atuais e os substituirá pelo backup. Esta ação não pode ser desfeita. Tem a certeza que deseja continuar?")) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backup = JSON.parse(e.target.result);
            if (!backup.app || backup.app !== "MaxFinance") throw new Error("Ficheiro inválido.");

            // Limpar Banco Atual do Utilizador
            await clienteSupabase.from('transacoes').delete().eq('user_id', userAtual.id);
            await clienteSupabase.from('subcategorias').delete().eq('user_id', userAtual.id);

            // Restaurar Categorias
            if (backup.subcategorias && backup.subcategorias.length > 0) {
                const subsClean = backup.subcategorias.map(s => { delete s.id; return s; });
                await clienteSupabase.from('subcategorias').insert(subsClean);
            }

            // Restaurar Transações
            if (backup.transacoes && backup.transacoes.length > 0) {
                const transClean = backup.transacoes.map(t => { delete t.id; return t; });
                await clienteSupabase.from('transacoes').insert(transClean);
            }

            mostrarToast("Backup restaurado com sucesso!", "success");
            atualizarTudo();
        } catch (err) {
            mostrarToast("Erro ao restaurar: " + err.message, "error");
        } finally {
            event.target.value = ''; 
        }
    };
    reader.readAsText(file);
}

function exportarExcel(event) {
    if (transacoesMes.length === 0) {
        mostrarToast("Não há dados carregados para exportar. Tente alterar os filtros.", "warning");
        return;
    }

    try {
        const btn = event.currentTarget;
        const txt = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Exportando...';
        btn.disabled = true;

        const dadosExcel = transacoesMes.map(t => ({
            "Data de Vencimento": t.data_vencimento.split('-').reverse().join('/'),
            "Data do Pagamento": t.data_realizacao ? t.data_realizacao.split('-').reverse().join('/') : "-",
            "Status": t.status,
            "Tipo": t.tipo,
            "Categoria": t.subcategoria,
            "Descrição": t.descricao,
            "Parcela": t.total_parcelas === 0 ? "Recorrente" : `${t.parcela_atual}/${t.total_parcelas}`,
            "Valor Previsto": parseFloat(t.valor_parcela),
            "Valor Realizado": t.valor_realizado ? parseFloat(t.valor_realizado) : ""
        }));

        const ws = XLSX.utils.json_to_sheet(dadosExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
        
        const dataStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `MaxFinance_Exportacao_${dataStr}.xlsx`);

        btn.innerHTML = txt;
        btn.disabled = false;
        mostrarToast("Planilha Excel exportada com sucesso!", "success");
    } catch(e) {
        mostrarToast("Erro ao exportar Excel: " + e.message, "error");
    }
}
