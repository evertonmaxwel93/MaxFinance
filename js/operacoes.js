// ==========================================
// CLIENTES E FORNECEDORES
// ==========================================
let filtroClientesTermo = "";
let filtroFornecedoresTermo = "";

function filtrarClientes(termo) {
    filtroClientesTermo = termo;
    renderizarClientes();
}

function filtrarFornecedores(termo) {
    filtroFornecedoresTermo = termo;
    renderizarFornecedores();
}

async function carregarHistoricoCliente(nome) {
    const tbody = document.getElementById('historico-cliente-corpo');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Carregando histórico...</td></tr>';
    try {
        const { data, error } = await clienteSupabase
            .from('vendas')
            .select('*')
            .eq('cliente', nome)
            .order('data', { ascending: false });
        if (error) throw error;
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Nenhuma venda registrada.</td></tr>';
            return;
        }
        data.forEach(v => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-100 transition cursor-pointer";
            tr.onclick = () => {
                fecharModal('modalCliente');
                fecharModal('modalListaClientes');
                abrirModalVendaEdicao(v.id);
            };
            tr.innerHTML = `
                <td class="p-3 font-bold text-slate-700">${v.data.split('-').reverse().join('/')}</td>
                <td class="p-3 text-right font-black text-green-600">R$ ${parseFloat(v.total).toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro histórico cliente:", err);
        tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-red-500 font-medium">Erro ao carregar histórico.</td></tr>';
    }
}

async function carregarHistoricoFornecedor(nome) {
    const tbody = document.getElementById('historico-fornecedor-corpo');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Carregando histórico...</td></tr>';
    try {
        const { data, error } = await clienteSupabase
            .from('compras')
            .select('*')
            .eq('fornecedor', nome)
            .order('data', { ascending: false });
        if (error) throw error;
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Nenhuma compra registrada.</td></tr>';
            return;
        }
        data.forEach(c => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-100 transition cursor-pointer";
            tr.onclick = () => {
                fecharModal('modalFornecedor');
                fecharModal('modalListaFornecedores');
                abrirModalCompraEdicao(c.id);
            };
            tr.innerHTML = `
                <td class="p-3 font-bold text-slate-700">${c.data.split('-').reverse().join('/')}</td>
                <td class="p-3 text-right font-black text-red-600">R$ ${parseFloat(c.total).toFixed(2).replace('.', ',')}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error("Erro histórico fornecedor:", err);
        tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-red-500 font-medium">Erro ao carregar histórico.</td></tr>';
    }
}

async function carregarClientes() {
    try {
        const { data, error } = await clienteSupabase.from('clientes').select('*').order('nome');
        if (error) throw error;
        clientesGlobais = typeof filtrarPorLojaAtiva === 'function' ? filtrarPorLojaAtiva(data) : (data || []);
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
    
    let filtrados = clientesGlobais;
    if (filtroClientesTermo) {
        filtrados = filtrados.filter(c => c.nome.toLowerCase().includes(filtroClientesTermo));
    }
    
    const genericoNome = "Genérico/Não Cadastrado";
    if (!filtroClientesTermo || genericoNome.toLowerCase().includes(filtroClientesTermo)) {
        const trGen = document.createElement('tr');
        trGen.className = "hover:bg-slate-50 transition cursor-pointer font-bold text-slate-800";
        trGen.onclick = () => abrirModalCliente({ id: 'generico', nome: genericoNome });
        trGen.innerHTML = `
            <td class="p-3 flex items-center gap-2">
                <i class="fas fa-user-shield text-slate-400"></i> ${genericoNome}
            </td>
        `;
        tbody.appendChild(trGen);
    }
    
    if (filtrados.length === 0 && !(!filtroClientesTermo || genericoNome.toLowerCase().includes(filtroClientesTermo))) {
        tbody.innerHTML = '<tr><td class="p-4 text-center text-slate-400">Nenhum cliente correspondente.</td></tr>';
        return;
    }
    
    filtrados.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition cursor-pointer";
        tr.onclick = () => abrirModalCliente(c);
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800">${c.nome}</td>
        `;
        tbody.appendChild(tr);
    });
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
    
    const formContainer = document.getElementById('container-form-cliente');
    const infoGenerico = document.getElementById('info-cliente-generico');
    
    if (cliente && cliente.id === 'generico') {
        document.getElementById('modalClienteTitulo').textContent = 'Cliente: Genérico/Não Cadastrado';
        formContainer.classList.add('hidden');
        infoGenerico.classList.remove('hidden');
        carregarHistoricoCliente("Genérico/Não Cadastrado");
    } else {
        formContainer.classList.remove('hidden');
        infoGenerico.classList.add('hidden');
        
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
            
            carregarHistoricoCliente(cliente.nome);
        } else {
            const tbody = document.getElementById('historico-cliente-corpo');
            if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Nenhuma venda registrada.</td></tr>';
        }
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
            const oldNome = clientesGlobais.find(x => x.id === id)?.nome;
            const { error: errUpdate } = await clienteSupabase.from('clientes').update(dados).eq('id', id);
            if(errUpdate) throw errUpdate;
            
            if (oldNome && oldNome !== nome) {
                await clienteSupabase.from('vendas').update({ cliente: nome }).eq('cliente', oldNome);
                await clienteSupabase.from('transacoes').update({ descricao: nome }).eq('descricao', oldNome).eq('subcategoria', 'Vendas');
            }
            mostrarToast("Cliente atualizado!", "success");
        } else {
            const dadosInjetados = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(dados) : dados;
            const { error: errInsert } = await clienteSupabase.from('clientes').insert([dadosInjetados]);
            if(errInsert) throw errInsert;
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
    if(!id) return;
    const cli = clientesGlobais.find(x => x.id === id);
    if (!cli) return;
    
    if(!confirm(`Deseja realmente excluir o cliente "${cli.nome}"? As vendas vinculadas a ele serão mescladas com "Genérico/Não Cadastrado".`)) return;
    
    try {
        const { error } = await clienteSupabase.from('clientes').delete().eq('id', id);
        if(error) throw error;
        
        await clienteSupabase.from('vendas').update({ cliente: 'Genérico/Não Cadastrado' }).eq('cliente', cli.nome);
        await clienteSupabase.from('transacoes').update({ descricao: 'Genérico/Não Cadastrado' }).eq('descricao', cli.nome).eq('subcategoria', 'Vendas');
        
        mostrarToast("Excluído com sucesso", "success");
        fecharModal('modalCliente');
        await carregarClientes();
        atualizarTudo();
    } catch(err) { mostrarToast("Erro: "+err.message, "error"); }
}

async function carregarFornecedores() {
    try {
        const { data, error } = await clienteSupabase.from('fornecedores').select('*').order('nome');
        if (error) throw error;
        fornecedoresGlobais = typeof filtrarPorLojaAtiva === 'function' ? filtrarPorLojaAtiva(data) : (data || []);
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
    
    let filtrados = fornecedoresGlobais;
    if (filtroFornecedoresTermo) {
        filtrados = filtrados.filter(c => c.nome.toLowerCase().includes(filtroFornecedoresTermo));
    }
    
    const genericoNome = "Genérico/Não Cadastrado";
    if (!filtroFornecedoresTermo || genericoNome.toLowerCase().includes(filtroFornecedoresTermo)) {
        const trGen = document.createElement('tr');
        trGen.className = "hover:bg-slate-50 transition cursor-pointer font-bold text-slate-800";
        trGen.onclick = () => abrirModalFornecedor({ id: 'generico', nome: genericoNome });
        trGen.innerHTML = `
            <td class="p-3 flex items-center gap-2">
                <i class="fas fa-user-shield text-slate-400"></i> ${genericoNome}
            </td>
        `;
        tbody.appendChild(trGen);
    }
    
    if (filtrados.length === 0 && !(!filtroFornecedoresTermo || genericoNome.toLowerCase().includes(filtroFornecedoresTermo))) {
        tbody.innerHTML = '<tr><td class="p-4 text-center text-slate-400">Nenhum fornecedor correspondente.</td></tr>';
        return;
    }
    
    filtrados.forEach(c => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition cursor-pointer";
        tr.onclick = () => abrirModalFornecedor(c);
        tr.innerHTML = `
            <td class="p-3 font-bold text-slate-800">${c.nome}</td>
        `;
        tbody.appendChild(tr);
    });
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
    
    const formContainer = document.getElementById('container-form-fornecedor');
    const infoGenerico = document.getElementById('info-fornecedor-generico');
    
    if (fornecedor && fornecedor.id === 'generico') {
        document.getElementById('modalFornecedorTitulo').textContent = 'Fornecedor: Genérico/Não Cadastrado';
        formContainer.classList.add('hidden');
        infoGenerico.classList.remove('hidden');
        carregarHistoricoFornecedor("Genérico/Não Cadastrado");
    } else {
        formContainer.classList.remove('hidden');
        infoGenerico.classList.add('hidden');
        
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
            
            carregarHistoricoFornecedor(fornecedor.nome);
        } else {
            const tbody = document.getElementById('historico-fornecedor-corpo');
            if (tbody) tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Nenhuma compra registrada.</td></tr>';
        }
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
            const oldNome = fornecedoresGlobais.find(x => x.id === id)?.nome;
            const { error: errUpdate } = await clienteSupabase.from('fornecedores').update(dados).eq('id', id);
            if(errUpdate) throw errUpdate;
            
            if (oldNome && oldNome !== nome) {
                await clienteSupabase.from('compras').update({ fornecedor: nome }).eq('fornecedor', oldNome);
                await clienteSupabase.from('transacoes').update({ descricao: nome }).eq('descricao', oldNome).eq('subcategoria', 'Compras');
            }
            mostrarToast("Fornecedor atualizado!", "success");
        } else {
            const dadosInjetados = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(dados) : dados;
            const { error: errInsert } = await clienteSupabase.from('fornecedores').insert([dadosInjetados]);
            if(errInsert) throw errInsert;
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
    if(!id) return;
    const forn = fornecedoresGlobais.find(x => x.id === id);
    if (!forn) return;
    
    if(!confirm(`Deseja realmente excluir o fornecedor "${forn.nome}"? As compras vinculadas a ele serão mescladas com "Genérico/Não Cadastrado".`)) return;
    
    try {
        const { error } = await clienteSupabase.from('fornecedores').delete().eq('id', id);
        if(error) throw error;
        
        await clienteSupabase.from('compras').update({ fornecedor: 'Genérico/Não Cadastrado' }).eq('fornecedor', forn.nome);
        await clienteSupabase.from('transacoes').update({ descricao: 'Genérico/Não Cadastrado' }).eq('descricao', forn.nome).eq('subcategoria', 'Compras');
        
        mostrarToast("Excluído com sucesso", "success");
        fecharModal('modalFornecedor');
        await carregarFornecedores();
        atualizarTudo();
    } catch(err) { mostrarToast("Erro: "+err.message, "error"); }
}

function abrirModalListaClientes() { abrirModal('modalListaClientes'); }
// Wrapper para converter o clique e chamar com segurança
function abrirModalClienteEditar(cliente) {
    abrirModalCliente(cliente);
}
function abrirModalListaFornecedores() { abrirModal('modalListaFornecedores'); }
function abrirModalFornecedorEditar(fornecedor) {
    abrirModalFornecedor(fornecedor);
}

function abrirModalClienteRapido() {
    const form = document.getElementById('form-cliente');
    form.reset();
    document.getElementById('cliente_id').value = '';
    document.getElementById('modalClienteTitulo').textContent = 'Novo Cliente';
    document.getElementById('btn_excluir_cliente').classList.add('hidden');
    document.getElementById('modalCliente').dataset.rapido = 'true';
    
    const formContainer = document.getElementById('container-form-cliente');
    const infoGenerico = document.getElementById('info-cliente-generico');
    formContainer.classList.remove('hidden');
    infoGenerico.classList.add('hidden');
    
    abrirModal('modalCliente');
}

function abrirModalFornecedorRapido() {
    const form = document.getElementById('form-fornecedor');
    form.reset();
    document.getElementById('fornecedor_id').value = '';
    document.getElementById('modalFornecedorTitulo').textContent = 'Novo Fornecedor';
    document.getElementById('btn_excluir_fornecedor').classList.add('hidden');
    document.getElementById('modalFornecedor').dataset.rapido = 'true';
    
    const formContainer = document.getElementById('container-form-fornecedor');
    const infoGenerico = document.getElementById('info-fornecedor-generico');
    formContainer.classList.remove('hidden');
    infoGenerico.classList.add('hidden');
    
    abrirModal('modalFornecedor');
}

// ==========================================
// COMPRAS
// ==========================================
async function carregarCompras() {
    try {
        const { data, error } = await clienteSupabase.from('compras').select('*').order('data', { ascending: false });
        if (error) throw error;
        comprasGlobais = typeof filtrarPorLojaAtiva === 'function' ? filtrarPorLojaAtiva(data) : (data || []);
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
    document.getElementById('compra-rascunho-alert')?.remove();
    document.getElementById('form-compra').reset();
    document.getElementById('compra_id').value = '';
    document.getElementById('compra_transacao_id').value = '';
    document.getElementById('compra_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('compra_itens_container').innerHTML = '';
    document.getElementById('btn_excluir_compra').classList.add('hidden');
    
    const temRascunho = localStorage.getItem('maxfinance_rascunho_compra');
    if (temRascunho) {
        restaurarRascunhoCompra();
    } else {
        adicionarItemCompra();
        calcularTotalCompra();
    }
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

            const revertPromises = itensAntigos.map(async it => {
                const p = latestProds.find(x => x.id === it.produto_id);
                if (p) {
                    const novoEstoque = parseFloat(p.estoque_atual) - parseFloat(it.quantidade);
                    if (novoEstoque < 0) {
                        throw new Error(`ESTOQUE_NEGATIVO:${p.nome}`);
                    }
                    return clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                } else {
                    throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque para reversão.`);
                }
            });

            const revertResults = await Promise.all(revertPromises);
            for (const res of revertResults) {
                if (res.error) throw res.error;
            }

            await clienteSupabase.from('compras').delete().eq('id', compraId);
            if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
            // Atualiza a lista local de produtos
            await carregarProdutos();
        }

        // 1. Inserir Transação (Financeiro)
        const trPayload = {
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
        };
        const trPayloadInjetado = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(trPayload) : trPayload;
        const { data: trData, error: trErr } = await clienteSupabase.from('transacoes').insert(trPayloadInjetado).select().single();
        if (trErr) throw trErr;

        // 2. Inserir Compra
        const compPayload = {
            user_id: userAtual.id,
            data: document.getElementById('compra_data').value,
            fornecedor: document.getElementById('compra_fornecedor').value,
            total: total,
            transacao_id: trData.id
        };
        const compPayloadInjetado = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(compPayload) : compPayload;
        const { data: compData, error: cErr } = await clienteSupabase.from('compras').insert(compPayloadInjetado).select().single();
        if (cErr) throw cErr;

        // 3. Inserir Itens e Atualizar Estoque
        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        const itensInsert = [];
        const updatePromises = [];

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
                updatePromises.push(
                    clienteSupabase.from('produtos').update({
                        estoque_atual: novoEstoque,
                        custo_unitario: custo
                    }).eq('id', prodId)
                );
            } else {
                throw new Error(`Produto ID ${prodId} não encontrado.`);
            }
        }

        const updateResults = await Promise.all(updatePromises);
        for (const res of updateResults) {
            if (res.error) throw res.error;
        }

        const { error: itErr } = await clienteSupabase.from('compras_itens').insert(itensInsert);
        if (itErr) throw itErr;

        mostrarToast(compraId ? "Compra atualizada!" : "Compra registrada com sucesso!", "success");
        localStorage.removeItem('maxfinance_rascunho_compra');
        document.getElementById('compra-rascunho-alert')?.remove();
        fecharModal('modalCompra');
        carregarProdutos();
        carregarCompras();
        atualizarTudo();
    } catch (err) {
        let msg = err.message;
        if (msg.startsWith("ESTOQUE_NEGATIVO:")) {
            msg = `A reversão deixaria o estoque de "${msg.split(":")[1]}" negativo.`;
        }
        mostrarToast("Erro ao registrar compra: " + msg, "error");
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

        const revertPromises = itens.map(async it => {
            const p = latestProds.find(x => x.id === it.produto_id);
            if (p) {
                const novoEstoque = parseFloat(p.estoque_atual) - parseFloat(it.quantidade);
                if (novoEstoque < 0) {
                    throw new Error(`ESTOQUE_NEGATIVO:${p.nome}`);
                }
                return clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
            } else {
                throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque.`);
            }
        });

        const revertResults = await Promise.all(revertPromises);
        for (const res of revertResults) {
            if (res.error) throw res.error;
        }

        if (transacaoId) await clienteSupabase.from('transacoes').delete().eq('id', transacaoId);
        await clienteSupabase.from('compras').delete().eq('id', id);

        mostrarToast("Compra excluída e revertida!", "success");
        fecharModal('modalCompra');
        carregarProdutos();
        carregarCompras();
        atualizarTudo();
    } catch (err) {
        let msg = err.message;
        if (msg.startsWith("ESTOQUE_NEGATIVO:")) {
            msg = `A exclusão deixaria o estoque de "${msg.split(":")[1]}" negativo.`;
        }
        mostrarToast("Erro ao excluir compra: " + msg, "error");
    }
}

// ==========================================
// VENDAS
// ==========================================
async function carregarVendas() {
    try {
        const { data, error } = await clienteSupabase.from('vendas').select('*, vendas_itens(*)').order('data', { ascending: false });
        if (error) throw error;
        vendasGlobais = typeof filtrarPorLojaAtiva === 'function' ? filtrarPorLojaAtiva(data) : (data || []);
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
    document.getElementById('venda-rascunho-alert')?.remove();
    document.getElementById('form-venda').reset();
    document.getElementById('venda_id').value = '';
    document.getElementById('venda_transacao_id').value = '';
    document.getElementById('venda_data').value = new Date().toISOString().split('T')[0];
    document.getElementById('venda_itens_container').innerHTML = '';
    document.getElementById('btn_excluir_venda').classList.add('hidden');
    
    const temRascunho = localStorage.getItem('maxfinance_rascunho_venda');
    if (temRascunho) {
        restaurarRascunhoVenda();
    } else {
        adicionarItemVenda();
        calcularTotalVenda();
    }
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

            const revertPromises = itensAntigos.map(async it => {
                const p = latestProds.find(x => x.id === it.produto_id);
                if (p) {
                    const novoEstoque = parseFloat(p.estoque_atual) + parseFloat(it.quantidade);
                    return clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
                } else {
                    throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque para reversão.`);
                }
            });

            const revertResults = await Promise.all(revertPromises);
            for (const res of revertResults) {
                if (res.error) throw res.error;
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

        const trPayload = {
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
        };
        const trPayloadInjetado = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(trPayload) : trPayload;
        const { data: trData, error: trErr } = await clienteSupabase.from('transacoes').insert(trPayloadInjetado).select().single();
        if (trErr) throw trErr;

        const vPayload = {
            user_id: userAtual.id,
            data: document.getElementById('venda_data').value,
            cliente: document.getElementById('venda_cliente').value,
            endereco: document.getElementById('venda_endereco').value,
            total: total,
            custo_total: custoTotalVenda,
            transacao_id: trData.id
        };
        const vPayloadInjetado = typeof injetarLojaAtiva === 'function' ? injetarLojaAtiva(vPayload) : vPayload;
        const { data: vData, error: vErr } = await clienteSupabase.from('vendas').insert(vPayloadInjetado).select().single();
        if (vErr) throw vErr;

        const { data: latestProds, error: pErr } = await clienteSupabase.from('produtos').select('*');
        if (pErr) throw pErr;

        const itensInsert = [];
        const updatePromises = [];

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
                updatePromises.push(
                    clienteSupabase.from('produtos').update({
                        estoque_atual: novoEstoque
                    }).eq('id', prodId)
                );
            } else {
                throw new Error(`Produto ID ${prodId} não encontrado.`);
            }
        }

        const updateResults = await Promise.all(updatePromises);
        for (const res of updateResults) {
            if (res.error) throw res.error;
        }

        const { error: itErr } = await clienteSupabase.from('vendas_itens').insert(itensInsert);
        if (itErr) throw itErr;

        mostrarToast(vendaId ? "Venda atualizada!" : "Venda registrada com sucesso!", "success");
        localStorage.removeItem('maxfinance_rascunho_venda');
        document.getElementById('venda-rascunho-alert')?.remove();
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

        const revertPromises = itens.map(async it => {
            const p = latestProds.find(x => x.id === it.produto_id);
            if (p) {
                const novoEstoque = parseFloat(p.estoque_atual) + parseFloat(it.quantidade);
                return clienteSupabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', p.id);
            } else {
                throw new Error(`Produto ID ${it.produto_id} não encontrado no estoque.`);
            }
        });

        const revertResults = await Promise.all(revertPromises);
        for (const res of revertResults) {
            if (res.error) throw res.error;
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

// ==========================================
// IMPORTAÇÃO INTELIGENTE DE NOTA FISCAL (XML)
// ==========================================
let xmlMapeamentosGlobais = [];
let XMLDataAtual = null;

async function carregarMapeamentosXML() {
    try {
        const { data, error } = await clienteSupabase.from('xml_produto_mapeamento').select('*');
        if (error) throw error;
        xmlMapeamentosGlobais = data || [];
    } catch (err) {
        console.error("Erro ao carregar mapeamentos XML:", err);
    }
}

async function tratarUploadXML(event) {
    const file = event.target.files[0];
    if (!file) return;

    mostrarLoading();
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

            // 1. Identificar Fornecedor (<emit>)
            const emit = xmlDoc.querySelector("emit");
            if (!emit) throw new Error("Emissor (fornecedor) não encontrado no XML.");

            const cnpj = emit.querySelector("CNPJ")?.textContent || "";
            const nomeFornecedor = emit.querySelector("xNome")?.textContent || "Fornecedor Importado";
            const telefone = emit.querySelector("enderEmit > fone")?.textContent || "";
            const endereco = emit.querySelector("enderEmit > xLgr")?.textContent || "";

            if (!cnpj) throw new Error("CNPJ do fornecedor não encontrado no XML.");

            // Verificar se o fornecedor já existe
            let fornObj = fornecedoresGlobais.find(f => f.documento === cnpj || f.nome.toLowerCase() === nomeFornecedor.toLowerCase());
            
            if (!fornObj) {
                mostrarToast(`Cadastrando fornecedor novo: ${nomeFornecedor}`, "info");
                const { data, error } = await clienteSupabase.from('fornecedores').insert([{
                    user_id: userAtual.id,
                    nome: nomeFornecedor,
                    telefone: telefone,
                    documento: cnpj,
                    endereco: endereco
                }]).select().single();
                
                if (error) throw error;
                fornObj = data;
                await carregarFornecedores();
            }

            // Selecionar o fornecedor no formulário
            document.getElementById('compra_fornecedor').value = fornObj.nome;

            // Preencher data da compra com a data de emissão
            const dhEmi = xmlDoc.querySelector("ide > dhEmi")?.textContent || xmlDoc.querySelector("ide > dEmi")?.textContent || "";
            if (dhEmi) {
                document.getElementById('compra_data').value = dhEmi.substring(0, 10);
            }

            // Carregar mapeamentos do banco de dados antes de processar
            await carregarMapeamentosXML();

            // 2. Processar Itens (<det>)
            const itensXML = xmlDoc.querySelectorAll("det");
            const itensProcessados = [];
            const itensNaoMapeados = [];

            for (const item of itensXML) {
                const prod = item.querySelector("prod");
                const cProd = prod.querySelector("cProd")?.textContent || "";
                const xProd = prod.querySelector("xProd")?.textContent || "";
                const cEAN = prod.querySelector("cEAN")?.textContent || "";
                const qCom = parseFloat(prod.querySelector("qCom")?.textContent || "0");
                const vUnCom = parseFloat(prod.querySelector("vUnCom")?.textContent || "0");

                const itemObj = {
                    codigo: cProd,
                    descricao: xProd,
                    ean: cEAN,
                    quantidade: Math.max(1, Math.round(qCom)),
                    custo: vUnCom,
                    produto_id: null
                };

                // Tentar localizar produto no estoque por EAN ou pelo mapeamento salvo
                let mappedProd = null;
                if (cEAN && cEAN !== "SEM GTIN") {
                    mappedProd = produtos.find(p => p.nome.includes(cEAN));
                }
                
                if (!mappedProd) {
                    // Buscar na tabela de mapeamento
                    const mapReg = xmlMapeamentosGlobais.find(m => m.fornecedor_cnpj === cnpj && m.nome_produto_xml === xProd);
                    if (mapReg) {
                        mappedProd = produtos.find(p => p.id === mapReg.produto_id);
                    }
                }

                if (mappedProd) {
                    itemObj.produto_id = mappedProd.id;
                    itensProcessados.push(itemObj);
                } else {
                    itensNaoMapeados.push(itemObj);
                }
            }

            XMLDataAtual = {
                cnpj: cnpj,
                itensProcessados: itensProcessados,
                itensNaoMapeados: itensNaoMapeados
            };

            if (itensNaoMapeados.length > 0) {
                renderizarModalMapeamento(itensNaoMapeados);
            } else {
                aplicarItensXMLFinal();
            }

        } catch (err) {
            mostrarToast("Erro ao processar XML: " + err.message, "error");
        } finally {
            ocultarLoading();
            event.target.value = ''; // Limpar input
        }
    };
    reader.readAsText(file);
}

function renderizarModalMapeamento(itens) {
    const listContainer = document.getElementById('mapeamento-itens-lista');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    itens.forEach((it, idx) => {
        let options = '<option value="novo">Cadastrar como NOVO produto</option>';
        produtos.forEach(p => {
            options += `<option value="${p.id}">${p.nome} (Atual: ${p.estoque_atual})</option>`;
        });

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 text-xs";
        card.innerHTML = `
            <div class="flex justify-between items-start border-b pb-2">
                <span class="font-extrabold text-slate-700">Item XML #${idx + 1}</span>
                <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold text-[9px] uppercase">Qtd: ${it.quantidade} | Custo: R$ ${it.custo.toFixed(2).replace('.', ',')}</span>
            </div>
            <div>
                <p class="text-slate-400 font-bold text-[9px] uppercase">Descrição no XML</p>
                <p class="font-extrabold text-slate-800 mt-0.5">${it.descricao}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div>
                    <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Ação / Destino no Estoque</label>
                    <select id="map-action-${idx}" class="action-select w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-bold">
                        ${options}
                    </select>
                </div>
                <div id="map-cat-container-${idx}">
                    <label class="block text-[9px] font-bold text-slate-400 uppercase mb-1">Categoria (Novo Produto)</label>
                    <input type="text" id="map-cat-${idx}" placeholder="Ex: Bebidas" class="w-full bg-slate-50 border rounded-lg p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-medium">
                </div>
            </div>
        `;

        const select = card.querySelector('.action-select');
        const catContainer = card.querySelector(`#map-cat-container-${idx}`);
        select.addEventListener('change', (e) => {
            if (e.target.value === 'novo') {
                catContainer.classList.remove('hidden');
            } else {
                catContainer.classList.add('hidden');
            }
        });

        listContainer.appendChild(card);
    });

    abrirModal('modalMapeamentoXML');
}

async function confirmarMapeamentoXML() {
    if (!XMLDataAtual) return;
    mostrarLoading();

    try {
        const mappingToSave = [];

        for (let i = 0; i < XMLDataAtual.itensNaoMapeados.length; i++) {
            const it = XMLDataAtual.itensNaoMapeados[i];
            const selectAction = document.getElementById(`map-action-${i}`);
            const action = selectAction.value;

            if (action === 'novo') {
                const catInput = document.getElementById(`map-cat-${i}`);
                const categoria = catInput.value.trim() || "Importado";
                
                // 1. Criar novo produto no estoque
                const { data: newProd, error } = await clienteSupabase.from('produtos').insert([{
                    user_id: userAtual.id,
                    categoria: categoria,
                    nome: it.descricao + (it.ean && it.ean !== "SEM GTIN" ? ` (${it.ean})` : ''),
                    valor_venda: parseFloat((it.custo * 1.5).toFixed(2)),
                    estoque_atual: 0,
                    custo_unitario: it.custo
                }]).select().single();
                
                if (error) throw error;
                
                it.produto_id = newProd.id;
                
                mappingToSave.push({
                    user_id: userAtual.id,
                    fornecedor_cnpj: XMLDataAtual.cnpj,
                    nome_produto_xml: it.descricao,
                    produto_id: newProd.id
                });
            } else {
                it.produto_id = action;
                
                mappingToSave.push({
                    user_id: userAtual.id,
                    fornecedor_cnpj: XMLDataAtual.cnpj,
                    nome_produto_xml: it.descricao,
                    produto_id: action
                });
            }
            
            XMLDataAtual.itensProcessados.push(it);
        }

        // Gravar todos os novos mapeamentos no Supabase
        if (mappingToSave.length > 0) {
            const { error: mapErr } = await clienteSupabase.from('xml_produto_mapeamento').insert(mappingToSave);
            if (mapErr) throw mapErr;
        }

        // Recarregar os produtos localmente
        await carregarProdutos();

        // Fechar e aplicar
        fecharModal('modalMapeamentoXML');
        aplicarItensXMLFinal();

    } catch (err) {
        mostrarToast("Erro ao confirmar conciliação: " + err.message, "error");
    } finally {
        ocultarLoading();
    }
}

function aplicarItensXMLFinal() {
    if (!XMLDataAtual) return;

    const container = document.getElementById('compra_itens_container');
    if (!container) return;
    container.innerHTML = '';

    XMLDataAtual.itensProcessados.forEach(it => {
        adicionarItemCompra(it.produto_id, it.quantidade, it.custo);
    });

    calcularTotalCompra();
    mostrarToast("NF-e importada e conciliação efetuada com sucesso!", "success");
    XMLDataAtual = null;
}

// ==========================================
// AUTOSSALVAMENTO E RESTAURAÇÃO DE RASCUNHOS
// ==========================================
function salvarRascunhoCompra() {
    const compraId = document.getElementById('compra_id')?.value;
    if (compraId) return;

    const itens = [];
    document.querySelectorAll('.item-compra').forEach(el => {
        const prodSelect = el.querySelector('.produto-select');
        if (prodSelect) {
            itens.push({
                produto_id: prodSelect.value,
                quantidade: el.querySelector('.quantidade-input')?.value || '',
                custo_unitario: el.querySelector('.custo-input')?.value || ''
            });
        }
    });

    const rascunho = {
        data: document.getElementById('compra_data')?.value || '',
        fornecedor: document.getElementById('compra_fornecedor')?.value || '',
        itens: itens
    };

    localStorage.setItem('maxfinance_rascunho_compra', JSON.stringify(rascunho));
}

function restaurarRascunhoCompra() {
    const raw = localStorage.getItem('maxfinance_rascunho_compra');
    if (!raw) return;

    try {
        const rascunho = JSON.parse(raw);
        if (!rascunho.itens || rascunho.itens.length === 0) return;

        document.getElementById('compra-rascunho-alert')?.remove();

        const form = document.getElementById('form-compra');
        const alert = document.createElement('div');
        alert.id = 'compra-rascunho-alert';
        alert.className = 'p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between text-xs mb-4 animate-fade-in';
        alert.innerHTML = `
            <span class="font-bold flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Rascunho de compra recuperado.</span>
            <button type="button" onclick="limparRascunhoCompra()" class="underline font-black hover:text-amber-950">Limpar Compra</button>
        `;
        form.prepend(alert);

        if (rascunho.data) document.getElementById('compra_data').value = rascunho.data;
        if (rascunho.fornecedor) document.getElementById('compra_fornecedor').value = rascunho.fornecedor;

        const container = document.getElementById('compra_itens_container');
        container.innerHTML = '';
        rascunho.itens.forEach(it => {
            adicionarItemCompra(it.produto_id, it.quantidade, it.custo_unitario);
        });
        calcularTotalCompra();

    } catch (e) {
        console.error("Erro ao restaurar rascunho de compra:", e);
    }
}

function limparRascunhoCompra() {
    localStorage.removeItem('maxfinance_rascunho_compra');
    document.getElementById('compra-rascunho-alert')?.remove();
    
    document.getElementById('form-compra').reset();
    document.getElementById('compra_data').value = new Date().toISOString().split('T')[0];
    const container = document.getElementById('compra_itens_container');
    if (container) {
        container.innerHTML = '';
        adicionarItemCompra();
        calcularTotalCompra();
    }
    mostrarToast("Rascunho de compra limpo!", "info");
}

function salvarRascunhoVenda() {
    const vendaId = document.getElementById('venda_id')?.value;
    if (vendaId) return;

    const itens = [];
    document.querySelectorAll('.item-venda').forEach(el => {
        const prodSelect = el.querySelector('.produto-select');
        if (prodSelect) {
            itens.push({
                produto_id: prodSelect.value,
                quantidade: el.querySelector('.quantidade-input')?.value || '',
                venda_input: el.querySelector('.venda-input')?.value || ''
            });
        }
    });

    const rascunho = {
        data: document.getElementById('venda_data')?.value || '',
        cliente: document.getElementById('venda_cliente')?.value || '',
        endereco: document.getElementById('venda_endereco')?.value || '',
        itens: itens
    };

    localStorage.setItem('maxfinance_rascunho_venda', JSON.stringify(rascunho));
}

function restaurarRascunhoVenda() {
    const raw = localStorage.getItem('maxfinance_rascunho_venda');
    if (!raw) return;

    try {
        const rascunho = JSON.parse(raw);
        if (!rascunho.itens || rascunho.itens.length === 0) return;

        document.getElementById('venda-rascunho-alert')?.remove();

        const form = document.getElementById('form-venda');
        const alert = document.createElement('div');
        alert.id = 'venda-rascunho-alert';
        alert.className = 'p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between text-xs mb-4 animate-fade-in';
        alert.innerHTML = `
            <span class="font-bold flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> Rascunho de venda recuperado.</span>
            <button type="button" onclick="limparRascunhoVenda()" class="underline font-black hover:text-amber-950">Limpar Venda</button>
        `;
        form.prepend(alert);

        if (rascunho.data) document.getElementById('venda_data').value = rascunho.data;
        if (rascunho.cliente) document.getElementById('venda_cliente').value = rascunho.cliente;
        if (rascunho.endereco) document.getElementById('venda_endereco').value = rascunho.endereco;

        const container = document.getElementById('venda_itens_container');
        container.innerHTML = '';
        rascunho.itens.forEach(it => {
            adicionarItemVenda(it.produto_id, it.quantidade, it.venda_input);
        });
        calcularTotalVenda();

    } catch (e) {
        console.error("Erro ao restaurar rascunho de venda:", e);
    }
}

function limparRascunhoVenda() {
    localStorage.removeItem('maxfinance_rascunho_venda');
    document.getElementById('venda-rascunho-alert')?.remove();
    
    document.getElementById('form-venda').reset();
    document.getElementById('venda_data').value = new Date().toISOString().split('T')[0];
    const container = document.getElementById('venda_itens_container');
    if (container) {
        container.innerHTML = '';
        adicionarItemVenda();
        calcularTotalVenda();
    }
    mostrarToast("Rascunho de venda limpo!", "info");
}


