// ==========================================
// CLIENTES E FORNECEDORES
// ==========================================
async function carregarClientes() {
    try {
        const { data, error } = await clienteSupabase.from('clientes').select('*').order('nome');
        if (error) throw error;
        clientesGlobais = data || [];
        renderizarClientes();
        preencherSelectClientes();
    } catch(e) { 
        console.error("Erro clientes:", e); 
        mostrarToast("Erro ao carregar clientes: " + e.message, "error");
    }
}

function renderizarClientes() {
    const tbody = document.getElementById('lista-clientes');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (clientesGlobais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum cliente cadastrado.</td></tr>';
        return;
    }
    clientesGlobais.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";
        // Stringify seguro para evitar quebras por aspas no HTML
        const clientStr = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800">${c.nome}</td>
            <td class="p-3 text-slate-600">${c.telefone || '-'}</td>
            <td class="p-3 text-slate-600">${c.email || '-'}</td>
            <td class="p-3 text-slate-600">${c.documento || '-'}</td>
            <td class="p-3 text-center">
                <button onclick='abrirModalClienteEditar(${clientStr})' class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Wrapper para converter o clique e chamar com segurança
function abrirModalClienteEditar(cliente) {
    abrirModalCliente(cliente);
}

function preencherSelectClientes() {
    const select = document.getElementById('venda_cliente');
    if (!select) return;
    const val = select.value;
    select.innerHTML = '<option value="Genérico/Não Cadastrado">Genérico/Não Cadastrado</option>';
    clientesGlobais.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nome;
        opt.textContent = c.nome;
        select.appendChild(opt);
    });
    if (val) {
        const options = Array.from(select.options).map(o => o.value);
        if (!options.includes(val)) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        }
        select.value = val;
    }
}

function abrirModalCliente(cliente = null) {
    const form = document.getElementById('form-cliente');
    form.reset();
    document.getElementById('cliente_id').value = '';
    document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
    document.getElementById('btn_excluir_cliente').classList.add('hidden');
    document.getElementById('modalCliente').dataset.rapido = 'false';
    
    if (cliente) {
        document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
        document.getElementById('cliente_id').value = cliente.id;
        document.getElementById('cliente_nome').value = cliente.nome;
        document.getElementById('cliente_telefone').value = cliente.telefone || '';
        document.getElementById('cliente_email').value = cliente.email || '';
        document.getElementById('cliente_documento').value = cliente.documento || '';
        document.getElementById('cliente_endereco').value = cliente.endereco || '';
        
        const btnExcluir = document.getElementById('btn_excluir_cliente');
        btnExcluir.classList.remove('hidden');
        btnExcluir.classList.add('flex-1');
    }
    abrirModal('modalCliente');
}

async function salvarCliente(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const id = document.getElementById('cliente_id').value;
        const nome = document.getElementById('cliente_nome').value;
        const dados = {
            user_id: userAtual.id,
            nome: nome,
            telefone: document.getElementById('cliente_telefone').value,
            email: document.getElementById('cliente_email').value,
            documento: document.getElementById('cliente_documento').value,
            endereco: document.getElementById('cliente_endereco').value
        };
        if (id) {
            const { error } = await clienteSupabase.from('clientes').update(dados).eq('id', id);
            if(error) throw error;
            mostrarToast("Cliente atualizado!", "success");
        } else {
            const { error } = await clienteSupabase.from('clientes').insert([dados]);
            if(error) throw error;
            mostrarToast("Cliente cadastrado!", "success");
        }
        
        await carregarClientes();
        
        const isRapido = document.getElementById('modalCliente').dataset.rapido === 'true';
        if (isRapido) {
            document.getElementById('venda_cliente').value = nome;
            document.getElementById('modalCliente').dataset.rapido = 'false';
        }
        
        fecharModal('modalCliente');
    } catch(err) {
        mostrarToast("Erro: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

async function excluirClienteModal() {
    const id = document.getElementById('cliente_id').value;
    if(!id || !confirm("Deseja excluir este cliente?")) return;
    try {
        const { error } = await clienteSupabase.from('clientes').delete().eq('id', id);
        if(error) throw error;
        mostrarToast("Excluído com sucesso", "success");
        fecharModal('modalCliente');
        carregarClientes();
    } catch(err) { mostrarToast("Erro: "+err.message, "error"); }
}

async function carregarFornecedores() {
    try {
        const { data, error } = await clienteSupabase.from('fornecedores').select('*').order('nome');
        if (error) throw error;
        fornecedoresGlobais = data || [];
        renderizarFornecedores();
        preencherSelectFornecedores();
    } catch(e) { 
        console.error("Erro fornecedores:", e); 
        mostrarToast("Erro ao carregar fornecedores: " + e.message, "error");
    }
}

function renderizarFornecedores() {
    const tbody = document.getElementById('lista-fornecedores');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (fornecedoresGlobais.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>';
        return;
    }
    fornecedoresGlobais.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition";
        const supplierStr = JSON.stringify(c).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800">${c.nome}</td>
            <td class="p-3 text-slate-600">${c.telefone || '-'}</td>
            <td class="p-3 text-slate-600">${c.email || '-'}</td>
            <td class="p-3 text-slate-600">${c.documento || '-'}</td>
            <td class="p-3 text-center">
                <button onclick='abrirModalFornecedorEditar(${supplierStr})' class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition" title="Editar"><i class="fas fa-edit"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalFornecedorEditar(fornecedor) {
    abrirModalFornecedor(fornecedor);
}

function preencherSelectFornecedores() {
    const select = document.getElementById('compra_fornecedor');
    if (!select) return;
    const val = select.value;
    select.innerHTML = '<option value="Genérico/Não Cadastrado">Genérico/Não Cadastrado</option>';
    fornecedoresGlobais.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.nome;
        opt.textContent = c.nome;
        select.appendChild(opt);
    });
    if (val) {
        const options = Array.from(select.options).map(o => o.value);
        if (!options.includes(val)) {
            const opt = document.createElement('option');
            opt.value = val;
            opt.textContent = val;
            select.appendChild(opt);
        }
        select.value = val;
    }
}

function abrirModalFornecedor(fornecedor = null) {
    const form = document.getElementById('form-fornecedor');
    form.reset();
    document.getElementById('fornecedor_id').value = '';
    document.getElementById('modalFornecedorTitulo').textContent = 'Novo Fornecedor';
    document.getElementById('btn_excluir_fornecedor').classList.add('hidden');
    document.getElementById('modalFornecedor').dataset.rapido = 'false';
    
    if (fornecedor) {
        document.getElementById('modalFornecedorTitulo').textContent = 'Editar Fornecedor';
        document.getElementById('fornecedor_id').value = fornecedor.id;
        document.getElementById('fornecedor_nome').value = fornecedor.nome;
        document.getElementById('fornecedor_telefone').value = fornecedor.telefone || '';
        document.getElementById('fornecedor_email').value = fornecedor.email || '';
        document.getElementById('fornecedor_documento').value = fornecedor.documento || '';
        document.getElementById('fornecedor_endereco').value = fornecedor.endereco || '';
        
        const btnExcluir = document.getElementById('btn_excluir_fornecedor');
        btnExcluir.classList.remove('hidden');
        btnExcluir.classList.add('flex-1');
    }
    abrirModal('modalFornecedor');
}

async function salvarFornecedor(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
        const id = document.getElementById('fornecedor_id').value;
        const nome = document.getElementById('fornecedor_nome').value;
        const dados = {
            user_id: userAtual.id,
            nome: nome,
            telefone: document.getElementById('fornecedor_telefone').value,
            email: document.getElementById('fornecedor_email').value,
            documento: document.getElementById('fornecedor_documento').value,
            endereco: document.getElementById('fornecedor_endereco').value
        };
        if (id) {
            const { error } = await clienteSupabase.from('fornecedores').update(dados).eq('id', id);
            if(error) throw error;
            mostrarToast("Fornecedor atualizado!", "success");
        } else {
            const { error } = await clienteSupabase.from('fornecedores').insert([dados]);
            if(error) throw error;
            mostrarToast("Fornecedor cadastrado!", "success");
        }
        
        await carregarFornecedores();
        
        const isRapido = document.getElementById('modalFornecedor').dataset.rapido === 'true';
        if (isRapido) {
            document.getElementById('compra_fornecedor').value = nome;
            document.getElementById('modalFornecedor').dataset.rapido = 'false';
        }
        
        fecharModal('modalFornecedor');
    } catch(err) {
        mostrarToast("Erro: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
}

async function excluirFornecedorModal() {
    const id = document.getElementById('fornecedor_id').value;
    if(!id || !confirm("Deseja excluir este fornecedor?")) return;
    try {
        const { error } = await clienteSupabase.from('fornecedores').delete().eq('id', id);
        if(error) throw error;
        mostrarToast("Excluído com sucesso", "success");
        fecharModal('modalFornecedor');
        carregarFornecedores();
    } catch(err) { mostrarToast("Erro: "+err.message, "error"); }
}

function abrirModalListaClientes() { abrirModal('modalListaClientes'); }
function abrirModalListaFornecedores() { abrirModal('modalListaFornecedores'); }

function abrirModalClienteRapido() {
    const form = document.getElementById('form-cliente');
    form.reset();
    document.getElementById('cliente_id').value = '';
    document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
    document.getElementById('btn_excluir_cliente').classList.add('hidden');
    document.getElementById('modalCliente').dataset.rapido = 'true';
    abrirModal('modalCliente');
}

function abrirModalFornecedorRapido() {
    const form = document.getElementById('form-fornecedor');
    form.reset();
    document.getElementById('fornecedor_id').value = '';
    document.getElementById('modalFornecedorTitulo').textContent = 'Novo Fornecedor';
    document.getElementById('btn_excluir_fornecedor').classList.add('hidden');
    document.getElementById('modalFornecedor').dataset.rapido = 'true';
    abrirModal('modalFornecedor');
}

// ==========================================
// COMPRAS
// ==========================================
async function carregarCompras() {
    try {
        const { data, error } = await clienteSupabase.from('compras').select('*').order('data', { ascending: false });
        if (error) throw error;
        comprasGlobais = data || [];
        renderizarCompras();
    } catch (err) {
        mostrarToast("Erro ao carregar compras", "error");
    }
}

function renderizarCompras() {
    const tbody = document.getElementById('tabela-compras');
    if (!tbody) return;
    const dataIn = document.getElementById('filtro-data-inicio-compras')?.value;
    const dataFim = document.getElementById('filtro-data-fim-compras')?.value;
    tbody.innerHTML = '';
    
    let filtrados = comprasGlobais;
    if (dataIn) filtrados = filtrados.filter(c => c.data >= dataIn);
    if (dataFim) filtrados = filtrados.filter(c => c.data <= dataFim);

    const tfoot = document.getElementById('rodape-compras');
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-8 text-center text-slate-400 font-medium text-sm">Nenhuma compra registrada.</td></tr>';
        if(tfoot) tfoot.classList.add('hidden');
        return;
    }

    let totalPeriodo = 0;
    filtrados.forEach(c => {
        totalPeriodo += parseFloat(c.total);
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="abrirModalCompraEdicao('${c.id}')">
                <td class="py-3 px-4 font-bold text-slate-800 text-sm">${c.data.split('-').reverse().join('/')}</td>
                <td class="py-3 px-4 text-slate-600 font-medium">${c.fornecedor}</td>
                <td class="py-3 px-4 text-right font-black text-red-600">R$ ${parseFloat(c.total).toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    });
    
    if(tfoot) {
        tfoot.classList.remove('hidden');
        document.getElementById('total-compras-periodo').textContent = `R$ ${totalPeriodo.toFixed(2).replace('.', ',')}`;
    }
}

function abrirModalCompra() {
    if (produtos.length === 0) {
        mostrarToast("Cadastre produtos no estoque antes de realizar compras.", "warning");
        return;
    }
    document.getElementById('form-compra').reset();
    document.getElementById('compra_id').value = '';
    document.getElementById('compra_transacao_id').value = '';
    document.getElementById('compra_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('compra_itens_container').innerHTML = '';
    document.getElementById('btn_excluir_compra').classList.add('hidden');
    adicionarItemCompra();
    calcularTotalCompra();
    document.getElementById('modalCompra').classList.remove('hidden');
}

async function abrirModalCompraEdicao(id) {
    try {
        const { data: compra, error: cErr } = await clienteSupabase.from('compras').select('*').eq('id', id).single();
        if (cErr) throw cErr;
        const { data: itens, error: iErr } = await clienteSupabase.from('compras_itens').select('*').eq('compra_id', id);
        if (iErr) throw iErr;

        document.getElementById('form-compra').reset();
        document.getElementById('compra_id').value = compra.id;
        document.getElementById('compra_transacao_id').value = compra.transacao_id;
        document.getElementById('compra_data').value = compra.data;
        document.getElementById('compra_fornecedor').value = compra.fornecedor;
        
        document.getElementById('compra_itens_container').innerHTML = '';
        
        itens.forEach(it => {
            adicionarItemCompra(it.produto_id, it.quantidade, it.custo_unitario);
        });
        
        calcularTotalCompra();
        document.getElementById('btn_excluir_compra').classList.remove('hidden');
        document.getElementById('modalCompra').classList.remove('hidden');
    } catch (err) {
        mostrarToast("Erro ao carregar compra: " + err.message, "error");
    }
}

function adicionarItemCompra(produtoId = '', quantidade = '', custo = '') {
    const container = document.getElementById('compra_itens_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex flex-wrap md:flex-nowrap gap-2 items-center item-compra";
    
    let options = '<option value="">Selecione o produto</option>';
    produtos.forEach(p => {
        const selected = p.id === produtoId ? 'selected' : '';
        options += `<option value="${p.id}" ${selected}>${p.nome} (Atual: ${p.estoque_atual})</option>`;
    });

    div.innerHTML = `
        <select class="produto-select flex-1 min-w-[150px] bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
            ${options}
        </select>
        <input type="number" step="1" min="1" value="${quantidade}" placeholder="Qtd" class="quantidade-input w-24 bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
        <input type="number" step="0.01" min="0.01" value="${custo}" placeholder="Custo Un." class="custo-input w-28 bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
        <button type="button" class="text-red-500 p-2 ml-auto"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
}

function calcularTotalCompra() {
    let total = 0;
    document.querySelectorAll('.item-compra').forEach(el => {
        const q = parseInt(el.querySelector('.quantidade-input').value, 10) || 0;
        const c = parseFloat(el.querySelector('.custo-input').value) || 0;
        total += (q * c);
    });
    const elDisplay = document.getElementById('compra_total_exibicao');
    if (elDisplay) elDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    return total;
}

let isSubmittingCompra = false;
async function salvarCompra(e) {
    e.preventDefault();
    if (isSubmittingCompra) return;
    isSubmittingCompra = true;

    const total = calcularTotalCompra();
    if (total <= 0) {
        isSubmittingCompra = false;
        return mostrarToast("Adicione itens válidos à compra.", "warning");
    }
    
    const compraId = document.getElementById('compra_id').value;
    const transacaoId = document.getElementById('compra_transacao_id').value;

    const itemsDiv = document.querySelectorAll('.item-compra');
    for (const el of itemsDiv) {
        const qtdVal = el.querySelector('.quantidade-input').value;
        const qtd = parseInt(qtdVal, 10);
        if (isNaN(qtd) || !Number.isInteger(parseFloat(qtdVal)) || qtd <= 0) {
            isSubmittingCompra = false;
            return mostrarToast("A quantidade comprada deve ser um número inteiro maior que zero.", "warning");
        }
    }

    try {
        // Se for edição, exclui a antiga primeiro para reverter estoque de forma segura
        if (compraId) {
            const { data: itensAntigos, error: errAnt } = await clienteSupabase.from('compras_itens').select('*').eq('compra_id', compraId);
            if (errAnt) throw errAnt;

            const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
            if (pErr) throw pErr;

            for (const it of itensAntigos) {
                const p = latestProds.find(x => x.id === it.produto_id);
                if (p) {
                    const novoEstoque = parseFloat(p.estoque_atual) - parseFloat(it.quantidade);
                    if (novoEstoque < 0) {
                        isSubmittingCompra = false;
                        return mostrarToast(`A reversão deixaria o estoque de ${p.nome} negativo.`, "error");
                    }
                    const { error: upErr } = await clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                    if (upErr) throw upErr;
                } else {
                    throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque para reversão.`);
                }
            }
            await clienteSupabase.from('compras').delete().eq('id', compraId);
            if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
            // Atualiza a lista local de produtos
            await carregarProdutos();
        }

        // 1. Inserir Transação (Financeiro)
        const { data: trData, error: trErr } = await clienteSupabase.from('transacoes').insert({
            user_id: userAtual.id,
            tipo: 'Saída',
            subcategoria: 'Compras',
            descricao: document.getElementById('compra_fornecedor').value,
            valor_parcela: total,
            valor_realizado: total,
            data_vencimento: document.getElementById('compra_data').value,
            data_realizacao: document.getElementById('compra_data').value,
            status: 'Realizado',
            grupo_id: crypto.randomUUID(),
            total_parcelas: 1,
            parcela_atual: 1
        }).select().single();
        if (trErr) throw trErr;

        // 2. Inserir Compra
        const { data: compData, error: cErr } = await clienteSupabase.from('compras').insert({
            user_id: userAtual.id,
            data: document.getElementById('compra_data').value,
            fornecedor: document.getElementById('compra_fornecedor').value,
            total: total,
            transacao_id: trData.id
        }).select().single();
        if (cErr) throw cErr;

        // 3. Inserir Itens e Atualizar Estoque
        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        const itensInsert = [];
        for (const el of itemsDiv) {
            const prodId = el.querySelector('.produto-select').value;
            const qtd = parseInt(el.querySelector('.quantidade-input').value, 10);
            const custo = parseFloat(el.querySelector('.custo-input').value);
            
            itensInsert.push({
                compra_id: compData.id,
                produto_id: prodId,
                quantidade: qtd,
                custo_unitario: custo
            });

            const prod = latestProds.find(p => p.id === prodId);
            if (prod) {
                const novoEstoque = parseFloat(prod.estoque_atual) + qtd;
                const { error: upErr } = await clienteSupabase.from('produtos').update({
                    estoque_atual: novoEstoque,
                    custo_unitario: custo
                }).eq('id', prodId);
                if (upErr) throw upErr;
            } else {
                throw new Error(`Produto ID ${prodId} não encontrado.`);
            }
        }

        const { error: itErr } = await clienteSupabase.from('compras_itens').insert(itensInsert);
        if (itErr) throw itErr;

        mostrarToast(compraId ? "Compra atualizada!" : "Compra registrada com sucesso!", "success");
        fecharModal('modalCompra');
        carregarProdutos();
        carregarCompras();
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao registrar compra: " + err.message, "error");
    } finally {
        isSubmittingCompra = false;
    }
}

async function excluirCompraModal() {
    const id = document.getElementById('compra_id').value;
    const transacaoId = document.getElementById('compra_transacao_id').value;
    if(!id) return;
    
    if(!confirm("Deseja realmente excluir esta compra? O estoque será revertido e a transação apagada.")) return;
    
    try {
        const { data: itens, error: iErr } = await clienteSupabase.from('compras_itens').select('*').eq('compra_id', id);
        if (iErr) throw iErr;

        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        for (const it of itens) {
            const p = latestProds.find(x => x.id === it.produto_id);
            if (p) {
                const novoEstoque = parseFloat(p.estoque_atual) - parseFloat(it.quantidade);
                if (novoEstoque < 0) {
                    mostrarToast(`A exclusão deixaria o estoque de ${p.nome} negativo.`, "error");
                    return;
                }
                const { error: upErr } = await clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                if (upErr) throw upErr;
            } else {
                throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque.`);
            }
        }

        if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
        await clienteSupabase.from('compras').delete().eq('id', id);

        mostrarToast("Compra excluída e revertida!", "success");
        fecharModal('modalCompra');
        carregarProdutos();
        carregarCompras();
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao excluir compra: " + err.message, "error");
    }
}

// ==========================================
// VENDAS
// ==========================================
async function carregarVendas() {
    try {
        const { data, error } = await clienteSupabase.from('vendas').select('*, vendas_itens(*)').order('data', { ascending: false });
        if (error) throw error;
        vendasGlobais = data || [];
        renderizarVendas();
    } catch (err) {
        mostrarToast("Erro ao carregar vendas", "error");
    }
}

function renderizarVendas() {
    const tbody = document.getElementById('tabela-vendas');
    if (!tbody) return;
    const dataIn = document.getElementById('filtro-data-inicio-vendas')?.value;
    const dataFim = document.getElementById('filtro-data-fim-vendas')?.value;
    tbody.innerHTML = '';
    
    let filtrados = vendasGlobais;
    if (dataIn) filtrados = filtrados.filter(v => v.data >= dataIn);
    if (dataFim) filtrados = filtrados.filter(v => v.data <= dataFim);

    const tfoot = document.getElementById('rodape-vendas');
    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400 font-medium text-sm">Nenhuma venda registrada.</td></tr>';
        if(tfoot) tfoot.classList.add('hidden');
        return;
    }

    let totalCusto = 0;
    let totalVenda = 0;
    let totalLucro = 0;

    filtrados.forEach(v => {
        const custo = parseFloat(v.custo_total || 0);
        const venda = parseFloat(v.total || 0);
        const lucro = venda - custo;
        
        totalCusto += custo;
        totalVenda += venda;
        totalLucro += lucro;

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="abrirModalVendaEdicao('${v.id}')">
                <td class="py-3 px-4 font-bold text-slate-800 text-sm">${v.data.split('-').reverse().join('/')}</td>
                <td class="py-3 px-4 text-slate-600 font-medium">${v.cliente}</td>
                <td class="py-3 px-4 text-right font-bold text-red-500">R$ ${custo.toFixed(2).replace('.', ',')}</td>
                <td class="py-3 px-4 text-right font-black text-green-600">R$ ${venda.toFixed(2).replace('.', ',')}</td>
                <td class="py-3 px-4 text-right font-black text-blue-600">R$ ${lucro.toFixed(2).replace('.', ',')}</td>
            </tr>
        `;
    });
    
    if(tfoot) {
        tfoot.classList.remove('hidden');
        document.getElementById('total-custo-vendas').textContent = `R$ ${totalCusto.toFixed(2).replace('.', ',')}`;
        document.getElementById('total-venda-vendas').textContent = `R$ ${totalVenda.toFixed(2).replace('.', ',')}`;
        document.getElementById('total-lucro-vendas').textContent = `R$ ${totalLucro.toFixed(2).replace('.', ',')}`;
    }
}

function abrirModalVenda() {
    if (produtos.length === 0) {
        mostrarToast("Cadastre produtos no estoque antes de vender.", "warning");
        return;
    }
    document.getElementById('form-venda').reset();
    document.getElementById('venda_id').value = '';
    document.getElementById('venda_transacao_id').value = '';
    document.getElementById('venda_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('venda_itens_container').innerHTML = '';
    document.getElementById('btn_excluir_venda').classList.add('hidden');
    adicionarItemVenda();
    calcularTotalVenda();
    document.getElementById('modalVenda').classList.remove('hidden');
}

async function abrirModalVendaEdicao(id) {
    try {
        const { data: venda, error: vErr } = await clienteSupabase.from('vendas').select('*').eq('id', id).single();
        if (vErr) throw vErr;
        const { data: itens, error: iErr } = await clienteSupabase.from('vendas_itens').select('*').eq('venda_id', id);
        if (iErr) throw iErr;

        document.getElementById('form-venda').reset();
        document.getElementById('venda_id').value = venda.id;
        document.getElementById('venda_transacao_id').value = venda.transacao_id;
        document.getElementById('venda_data').value = venda.data;
        document.getElementById('venda_cliente').value = venda.cliente;
        document.getElementById('venda_endereco').value = venda.endereco || '';
        
        document.getElementById('venda_itens_container').innerHTML = '';
        
        itens.forEach(it => {
            adicionarItemVenda(it.produto_id, it.quantidade, it.valor_venda);
        });
        
        calcularTotalVenda();
        document.getElementById('btn_excluir_venda').classList.remove('hidden');
        document.getElementById('modalVenda').classList.remove('hidden');
    } catch (err) {
        mostrarToast("Erro ao carregar venda: " + err.message, "error");
    }
}

function adicionarItemVenda(produtoId = '', quantidade = '', valorVenda = '') {
    const container = document.getElementById('venda_itens_container');
    if (!container) return;
    const div = document.createElement('div');
    div.className = "flex flex-wrap md:flex-nowrap gap-2 items-center item-venda";
    
    let options = '<option value="">Selecione o produto</option>';
    produtos.forEach(p => {
        const selected = p.id === produtoId ? 'selected' : '';
        options += `<option value="${p.id}" data-preco="${p.valor_venda}" data-estoque="${p.estoque_atual}" data-custo="${p.custo_unitario}" ${selected}>${p.nome} (Disp: ${p.estoque_atual})</option>`;
    });

    div.innerHTML = `
        <select class="produto-select flex-1 min-w-[150px] bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
            ${options}
        </select>
        <input type="number" step="1" min="1" value="${quantidade}" placeholder="Qtd" class="quantidade-input w-24 bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
        <input type="number" step="0.01" min="0.01" value="${valorVenda}" placeholder="Venda Un." class="venda-input w-28 bg-white rounded-lg p-2 text-sm outline-none ring-1 ring-slate-200" required>
        <button type="button" class="text-red-500 p-2 ml-auto"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(div);
}

function atualizarPrecoVenda(selectElement) {
    const option = selectElement.options[selectElement.selectedIndex];
    const preco = option.getAttribute('data-preco');
    const inputPreco = selectElement.parentElement.querySelector('.venda-input');
    if(preco && !inputPreco.value) inputPreco.value = preco; 
    calcularTotalVenda();
}

function calcularTotalVenda() {
    let total = 0;
    document.querySelectorAll('.item-venda').forEach(el => {
        const q = parseInt(el.querySelector('.quantidade-input').value, 10) || 0;
        const v = parseFloat(el.querySelector('.venda-input').value) || 0;
        total += (q * v);
    });
    const elDisplay = document.getElementById('venda_total_exibicao');
    if (elDisplay) elDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    return total;
}

let isSubmittingVenda = false;
async function salvarVenda(e) {
    e.preventDefault();
    if (isSubmittingVenda) return;
    isSubmittingVenda = true;
    
    const total = calcularTotalVenda();
    if (total <= 0) {
        isSubmittingVenda = false;
        return mostrarToast("Adicione itens válidos à venda.", "warning");
    }

    const vendaId = document.getElementById('venda_id').value;
    const transacaoId = document.getElementById('venda_transacao_id').value;

    const itemsDiv = document.querySelectorAll('.item-venda');
    const comprasDict = {};
    let custoTotalVenda = 0;

    for (const el of itemsDiv) {
        const prodSelect = el.querySelector('.produto-select');
        const prodId = prodSelect.value;
        const qtdVal = el.querySelector('.quantidade-input').value;
        const qtd = parseInt(qtdVal, 10);
        const valorVendaInput = parseFloat(el.querySelector('.venda-input').value);
        const custoUn = parseFloat(prodSelect.options[prodSelect.selectedIndex].getAttribute('data-custo')) || 0;
        
        if (isNaN(qtd) || !Number.isInteger(parseFloat(qtdVal)) || qtd <= 0) {
            isSubmittingVenda = false;
            return mostrarToast("A quantidade vendida deve ser um número inteiro maior que zero.", "warning");
        }

        if (valorVendaInput < custoUn) {
            const msg = `Um dos itens está sendo vendido ABAIXO DO CUSTO.\nCusto: R$ ${custoUn.toFixed(2).replace('.', ',')} | Venda: R$ ${valorVendaInput.toFixed(2).replace('.', ',')}\n\nDeseja continuar mesmo assim?`;
            if (!confirm(msg)) {
                isSubmittingVenda = false;
                return;
            }
        }

        custoTotalVenda += (qtd * custoUn);

        if (!comprasDict[prodId]) comprasDict[prodId] = 0;
        comprasDict[prodId] += qtd;
    }
    
    try {
        if (vendaId) {
            const { data: itensAntigos, error: errAnt } = await clienteSupabase.from('vendas_itens').select('*').eq('venda_id', vendaId);
            if (errAnt) throw errAnt;

            const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
            if (pErr) throw pErr;

            for (const it of itensAntigos) {
                const p = latestProds.find(x => x.id === it.produto_id);
                if (p) {
                    const novoEstoque = parseFloat(p.estoque_atual) + parseFloat(it.quantidade);
                    const { error: upErr } = await clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                    if (upErr) throw upErr;
                } else {
                    throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque para reversão.`);
                }
            }
            await clienteSupabase.from('vendas').delete().eq('id', vendaId);
            if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
            await carregarProdutos(); 
        }

        for (const prodId of Object.keys(comprasDict)) {
            const p = produtos.find(x => x.id === prodId);
            if (p.estoque_atual < comprasDict[prodId]) {
                isSubmittingVenda = false;
                return mostrarToast(`Estoque insuficiente para o produto: ${p.nome}`, "error");
            }
        }

        const { data: trData, error: trErr } = await clienteSupabase.from('transacoes').insert({
            user_id: userAtual.id,
            tipo: 'Entrada',
            subcategoria: 'Vendas',
            descricao: document.getElementById('venda_cliente').value,
            valor_parcela: total,
            valor_realizado: total,
            data_vencimento: document.getElementById('venda_data').value,
            data_realizacao: document.getElementById('venda_data').value,
            status: 'Realizado',
            grupo_id: crypto.randomUUID(),
            total_parcelas: 1,
            parcela_atual: 1
        }).select().single();
        if (trErr) throw trErr;

        const { data: vData, error: vErr } = await clienteSupabase.from('vendas').insert({
            user_id: userAtual.id,
            data: document.getElementById('venda_data').value,
            cliente: document.getElementById('venda_cliente').value,
            endereco: document.getElementById('venda_endereco').value,
            total: total,
            custo_total: custoTotalVenda,
            transacao_id: trData.id
        }).select().single();
        if (vErr) throw vErr;

        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        const itensInsert = [];
        for (const el of itemsDiv) {
            const prodSelect = el.querySelector('.produto-select');
            const prodId = prodSelect.value;
            const qtd = parseInt(el.querySelector('.quantidade-input').value, 10);
            const vendaVal = parseFloat(el.querySelector('.venda-input').value);
            const custoUn = parseFloat(prodSelect.options[prodSelect.selectedIndex].getAttribute('data-custo')) || 0;
            
            itensInsert.push({
                venda_id: vData.id,
                produto_id: prodId,
                quantidade: qtd,
                valor_venda: vendaVal,
                custo_unitario: custoUn
            });

            const prod = latestProds.find(p => p.id === prodId);
            if (prod) {
                const novoEstoque = parseFloat(prod.estoque_atual) - qtd;
                const { error: upErr } = await clienteSupabase.from('produtos').update({
                    estoque_atual: novoEstoque
                }).eq('id', prodId);
                if (upErr) throw upErr;
            } else {
                throw new Error(`Produto ID ${prodId} não encontrado.`);
            }
        }

        const { error: itErr } = await clienteSupabase.from('vendas_itens').insert(itensInsert);
        if (itErr) throw itErr;

        mostrarToast(vendaId ? "Venda atualizada!" : "Venda registrada com sucesso!", "success");
        fecharModal('modalVenda');
        carregarProdutos();
        carregarVendas();
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao registrar venda: " + err.message, "error");
    } finally {
        isSubmittingVenda = false;
    }
}

async function excluirVendaModal() {
    const id = document.getElementById('venda_id').value;
    const transacaoId = document.getElementById('venda_transacao_id').value;
    if(!id) return;
    
    if(!confirm("Deseja realmente excluir esta venda? O estoque será revertido e a transação apagada.")) return;
    
    try {
        const { data: itens, error: iErr } = await clienteSupabase.from('vendas_itens').select('*').eq('venda_id', id);
        if (iErr) throw iErr;

        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        for (const it of itens) {
            const p = latestProds.find(x => x.id === it.produto_id);
            if (p) {
                const novoEstoque = parseFloat(p.estoque_atual) + parseFloat(it.quantidade);
                const { error: upErr } = await clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                if (upErr) throw upErr;
            } else {
                throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque.`);
            }
        }

        if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
        await clienteSupabase.from('vendas').delete().eq('id', id);

        mostrarToast("Venda excluída e revertida!", "success");
        fecharModal('modalVenda');
        carregarProdutos();
        carregarVendas();
        atualizarTudo();
    } catch (err) {
        mostrarToast("Erro ao excluir venda: " + err.message, "error");
    }
}
