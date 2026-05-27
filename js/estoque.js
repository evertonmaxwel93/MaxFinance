async function carregarProdutos() {
    try {
        const { data, error } = await clienteSupabase.from('produtos').select('*').order('categoria').order('nome');
        if (error) throw error;
        produtos = data || [];
        renderizarEstoque();
    } catch (err) {
        mostrarToast("Erro ao carregar estoque: " + err.message, "error");
    }
}

function renderizarEstoque() {
    const tbody = document.getElementById('tabela-estoque');
    if (!tbody) return;
    tbody.innerHTML = '';
    const termo = (document.getElementById('input-pesquisa-estoque')?.value || '').toLowerCase();
    const filtrados = produtos.filter(p => p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo));
    
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400 font-medium text-sm">Nenhum produto encontrado.</td></tr>';
        return;
    }

    filtrados.forEach(p => {
        const lucroUn = p.valor_venda - p.custo_unitario;
        const lucroTot = lucroUn * p.estoque_atual;
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="editarEstoque('${p.id}')">
                <td class="py-3 px-4 font-bold text-slate-600 text-xs">${p.categoria}</td>
                <td class="py-3 px-4 font-bold text-slate-800 text-sm">${p.nome}</td>
                <td class="py-3 px-4 text-center font-bold ${p.estoque_atual <= 0 ? 'text-red-500' : 'text-slate-800'}">${p.estoque_atual}</td>
                <td class="py-3 px-4 text-right font-medium text-slate-500">R$ ${parseFloat(p.custo_unitario).toFixed(2).replace('.', ',')}</td>
                <td class="py-3 px-4 text-right font-bold text-slate-800">R$ ${parseFloat(p.valor_venda).toFixed(2).replace('.', ',')}</td>
                <td class="py-3 px-4 text-right font-bold text-blue-600">R$ ${lucroUn.toFixed(2).replace('.', ',')}</td>
                <td class="py-3 px-4 text-right font-bold text-green-600">R$ ${lucroTot.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    });
}

async function carregarHistoricoEstoque(produtoId) {
    const tbody = document.getElementById('historico-estoque-corpo');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">Carregando histórico...</td></tr>';
    try {
        // Buscar compras (Entradas)
        const { data: comprasItens, error: cErr } = await clienteSupabase
            .from('compras_itens')
            .select('*, compras(data, fornecedor)')
            .eq('produto_id', produtoId);
        if (cErr) throw cErr;

        // Buscar vendas (Saídas)
        const { data: vendasItens, error: vErr } = await clienteSupabase
            .from('vendas_itens')
            .select('*, vendas(data, cliente)')
            .eq('produto_id', produtoId);
        if (vErr) throw vErr;

        // Compilar histórico unificado
        const movimentos = [];
        
        if (comprasItens) {
            comprasItens.forEach(it => {
                movimentos.push({
                    id: it.compra_id,
                    tipo: 'Entrada',
                    data: it.compras?.data || '',
                    contato: it.compras?.fornecedor || 'Genérico/Não Cadastrado',
                    quantidade: it.quantidade,
                    valor_unitario: it.custo_unitario
                });
            });
        }

        if (vendasItens) {
            vendasItens.forEach(it => {
                movimentos.push({
                    id: it.venda_id,
                    tipo: 'Saída',
                    data: it.vendas?.data || '',
                    contato: it.vendas?.cliente || 'Genérico/Não Cadastrado',
                    quantidade: it.quantidade,
                    valor_unitario: it.valor_venda
                });
            });
        }

        // Ordenar movimentos por data decrescente
        movimentos.sort((a, b) => b.data.localeCompare(a.data));

        tbody.innerHTML = '';
        if (movimentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">Nenhuma movimentação registrada.</td></tr>';
            return;
        }

        movimentos.forEach(m => {
            const dateStr = m.data ? m.data.split('-').reverse().join('/') : '-';
            const valStr = parseFloat(m.valor_unitario).toFixed(2).replace('.', ',');
            const isEntrada = m.tipo === 'Entrada';
            const pillClass = isEntrada 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-100 transition cursor-pointer";
            tr.onclick = () => {
                fecharModal('modalEstoque');
                if (isEntrada) {
                    abrirModalCompraEdicao(m.id);
                } else {
                    abrirModalVendaEdicao(m.id);
                }
            };
            
            tr.innerHTML = `
                <td class="p-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pillClass}">
                        ${m.tipo}
                    </span>
                </td>
                <td class="p-3 font-bold text-slate-700">${dateStr}</td>
                <td class="p-3 text-slate-600 font-medium">${m.contato}</td>
                <td class="p-3 text-center font-bold text-slate-800">${m.quantidade}</td>
                <td class="p-3 text-right font-black ${isEntrada ? 'text-green-600' : 'text-red-500'}">R$ ${valStr}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro histórico estoque:", err);
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-red-500 font-medium">Erro ao carregar movimentação.</td></tr>';
    }
}

function abrirModalEstoque() {
    document.getElementById('form-estoque').reset();
    document.getElementById('estoque_id').value = '';
    document.getElementById('modal-estoque-titulo').innerHTML = '<i class="fas fa-box text-blue-500 mr-2"></i>Novo Produto';
    document.getElementById('btn_excluir_produto').classList.add('hidden');
    
    const tbody = document.getElementById('historico-estoque-corpo');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">Nenhuma movimentação registrada.</td></tr>';
    
    document.getElementById('modalEstoque').classList.remove('hidden');
}

function editarEstoque(id) {
    const p = produtos.find(x => x.id === id);
    if (!p) return;
    document.getElementById('form-estoque').reset();
    document.getElementById('estoque_id').value = p.id;
    document.getElementById('estoque_categoria').value = p.categoria;
    document.getElementById('estoque_nome').value = p.nome;
    document.getElementById('estoque_valor_venda').value = p.valor_venda;
    document.getElementById('modal-estoque-titulo').innerHTML = '<i class="fas fa-edit text-blue-500 mr-2"></i>Editar Produto';
    document.getElementById('btn_excluir_produto').classList.remove('hidden');
    
    carregarHistoricoEstoque(p.id);
    
    document.getElementById('modalEstoque').classList.remove('hidden');
}

async function salvarProduto(e) {
    e.preventDefault();
    const id = document.getElementById('estoque_id').value;
    const payload = {
        user_id: userAtual.id,
        categoria: document.getElementById('estoque_categoria').value,
        nome: document.getElementById('estoque_nome').value,
        valor_venda: parseFloat(document.getElementById('estoque_valor_venda').value)
    };

    try {
        if (id) {
            const { error } = await clienteSupabase.from('produtos').update(payload).eq('id', id);
            if (error) throw error;
            mostrarToast("Produto atualizado com sucesso!", "success");
        } else {
            const { error } = await clienteSupabase.from('produtos').insert(payload);
            if (error) throw error;
            mostrarToast("Produto cadastrado com sucesso!", "success");
        }
        fecharModal('modalEstoque');
        carregarProdutos();
    } catch (err) {
        mostrarToast("Erro ao salvar produto: " + err.message, "error");
    }
}

async function excluirEstoque(id) {
    try {
        // Verificar se produto possui movimentações de compras ou vendas
        const { count: comprasIt, error: cErr } = await clienteSupabase.from('compras_itens').select('id', { count: 'exact', head: true }).eq('produto_id', id);
        if (cErr) throw cErr;
        const { count: vendasIt, error: vErr } = await clienteSupabase.from('vendas_itens').select('id', { count: 'exact', head: true }).eq('produto_id', id);
        if (vErr) throw vErr;

        if ((comprasIt && comprasIt > 0) || (vendasIt && vendasIt > 0)) {
            mostrarToast("Não é possível excluir o produto pois ele possui histórico de compras ou vendas.", "warning");
            return;
        }

        if (confirm("Tem certeza que deseja excluir este produto?")) {
            const { error } = await clienteSupabase.from('produtos').delete().eq('id', id);
            if (error) throw error;
            mostrarToast("Produto excluído!", "success");
            fecharModal('modalEstoque');
            carregarProdutos();
        }
    } catch (err) {
        mostrarToast("Erro ao excluir: " + err.message, "error");
    }
}
