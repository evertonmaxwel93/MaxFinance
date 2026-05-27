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
    
    // Configura e abre a aba Geral, ocultando abas extras para novos produtos
    alternarAbaEstoque('geral');
    document.getElementById('tab-estoque-movimentacao').classList.add('hidden');
    document.getElementById('tab-estoque-links').classList.add('hidden');
    document.getElementById('tab-estoque-precos').classList.add('hidden');

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
    
    // Habilita todas as abas para produto existente
    document.getElementById('tab-estoque-movimentacao').classList.remove('hidden');
    document.getElementById('tab-estoque-links').classList.remove('hidden');
    document.getElementById('tab-estoque-precos').classList.remove('hidden');
    
    alternarAbaEstoque('geral');
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

// =========================================================================
// MONITORAMENTO DE PREÇOS DE CONCORRENTES & NAVEGAÇÃO DE ABAS DO ESTOQUE
// =========================================================================

function alternarAbaEstoque(aba) {
    const abas = ['geral', 'movimentacao', 'links', 'precos'];
    
    // Atualizar classes dos botões das abas
    abas.forEach(a => {
        const btn = document.getElementById(`tab-estoque-${a}`);
        const content = document.getElementById(`content-estoque-${a}`);
        if (!btn || !content) return;
        
        if (a === aba) {
            btn.className = "px-4 py-3 font-bold text-xs text-blue-600 border-b-2 border-blue-600 transition outline-none";
            content.classList.remove('hidden');
        } else {
            btn.className = "px-4 py-3 font-bold text-xs text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition outline-none";
            content.classList.add('hidden');
        }
    });
    
    const idProduto = document.getElementById('estoque_id').value;
    if (aba === 'links' && idProduto) {
        carregarLinksProduto(idProduto);
    } else if (aba === 'precos' && idProduto) {
        carregarPrecosEHistorico(idProduto);
    }
}

async function carregarLinksProduto(produtoId) {
    const tbody = document.getElementById('lista-links-corpo');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Carregando links...</td></tr>';
    
    try {
        const { data: links, error } = await clienteSupabase
            .from('produto_links')
            .select('*')
            .eq('produto_id', produtoId)
            .order('criado_em', { ascending: false });
        if (error) throw error;
        
        tbody.innerHTML = '';
        if (!links || links.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400 font-medium">Nenhum link do BoaDica cadastrado para este produto.</td></tr>';
            return;
        }
        
        links.forEach(l => {
            const urlLimpa = l.url.length > 70 ? l.url.substring(0, 67) + '...' : l.url;
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="py-3 px-4">
                        <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                            ${urlLimpa} <i class="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <button type="button" onclick="deletarLinkProduto('${l.id}', '${produtoId}')" class="text-red-500 hover:text-red-700 p-1.5 transition">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Erro ao carregar links:", err);
        tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-red-500 font-medium">Erro ao carregar links.</td></tr>';
    }
}

async function salvarLinkProduto(e) {
    e.preventDefault();
    const produtoId = document.getElementById('estoque_id').value;
    const plataforma = document.getElementById('link_plataforma').value;
    const url = document.getElementById('link_url').value;
    
    if (!produtoId || !plataforma || !url) {
        mostrarToast("Preencha todos os campos do link!", "warning");
        return;
    }
    
    try {
        const { error } = await clienteSupabase.from('produto_links').insert({
            produto_id: produtoId,
            plataforma: plataforma,
            url: url
        });
        if (error) throw error;
        
        mostrarToast("Link adicionado com sucesso!", "success");
        document.getElementById('form-link-estoque').reset();
        carregarLinksProduto(produtoId);
    } catch (err) {
        mostrarToast("Erro ao adicionar link: " + err.message, "error");
    }
}

async function deletarLinkProduto(linkId, produtoId) {
    if (!confirm("Deseja realmente remover este link?")) return;
    try {
        const { error } = await clienteSupabase.from('produto_links').delete().eq('id', linkId);
        if (error) throw error;
        
        mostrarToast("Link removido com sucesso!", "success");
        carregarLinksProduto(produtoId);
    } catch (err) {
        mostrarToast("Erro ao remover link: " + err.message, "error");
    }
}

async function carregarPrecosEHistorico(produtoId) {
    const tbody = document.getElementById('lista-precos-atuais-corpo');
    const canvas = document.getElementById('graficoPrecosHistorico');
    if (!tbody || !canvas) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Carregando dados...</td></tr>';
    
    try {
        // 1. Carregar links do produto
        const { data: links, error: lErr } = await clienteSupabase
            .from('produto_links')
            .select('id, plataforma, url')
            .eq('produto_id', produtoId);
        if (lErr) throw lErr;
        
        if (!links || links.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum link cadastrado para este produto. Cadastre na aba "Links Externos".</td></tr>';
            if (window.graficoPrecosInstance) {
                window.graficoPrecosInstance.destroy();
                window.graficoPrecosInstance = null;
            }
            return;
        }
        
        const linkIds = links.map(l => l.id);
        
        // 2. Carregar histórico de preços coletados
        const { data: historico, error: hErr } = await clienteSupabase
            .from('produto_precos_historico')
            .select('*')
            .in('link_id', linkIds)
            .order('data_coleta', { ascending: true });
        if (hErr) throw hErr;
        
        if (!historico || historico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum preço coletado pelo robô de monitoramento ainda.</td></tr>';
            if (window.graficoPrecosInstance) {
                window.graficoPrecosInstance.destroy();
                window.graficoPrecosInstance = null;
            }
            return;
        }
        
        // 3. Compilar Preços Atuais (Mais recentes por loja para cada link)
        const precosAtuais = [];
        links.forEach(lnk => {
            const histLnk = historico.filter(h => h.link_id === lnk.id);
            const lojasMap = {};
            histLnk.forEach(h => {
                const dataAtual = new Date(h.data_coleta);
                if (!lojasMap[h.loja_nome] || new Date(lojasMap[h.loja_nome].data_coleta) < dataAtual) {
                    lojasMap[h.loja_nome] = h;
                }
            });
            
            Object.values(lojasMap).forEach(item => {
                precosAtuais.push({
                    plataforma: lnk.plataforma,
                    loja: item.loja_nome,
                    preco: parseFloat(item.preco),
                    data: item.data_coleta
                });
            });
        });
        
        // Ordenar do menor para o maior preço
        precosAtuais.sort((a, b) => a.preco - b.preco);
        
        tbody.innerHTML = '';
        if (precosAtuais.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum preço coletado pelo robô de monitoramento ainda.</td></tr>';
        } else {
            precosAtuais.forEach((pa, idx) => {
                const isMelhorPreco = idx === 0;
                const formattedPreco = pa.preco.toFixed(2).replace('.', ',');
                const dateStr = pa.data ? new Date(pa.data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
                
                const badge = isMelhorPreco 
                    ? `<span class="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Melhor Preço</span>`
                    : '';
                
                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-3 font-bold text-slate-700">${pa.loja}</td>
                        <td class="p-3 text-right font-black ${isMelhorPreco ? 'text-green-600 text-sm' : 'text-slate-800'}">R$ ${formattedPreco}${badge}</td>
                        <td class="p-3 text-center text-slate-500 font-medium">${dateStr}</td>
                    </tr>
                `;
            });
        }
        
        // 4. Compilar Histórico por Dia (Menor preço de cada dia)
        const historicoPorDia = {};
        historico.forEach(h => {
            const dia = h.data_coleta.split('T')[0];
            const precoNum = parseFloat(h.preco);
            if (!historicoPorDia[dia] || historicoPorDia[dia] > precoNum) {
                historicoPorDia[dia] = precoNum;
            }
        });
        
        const diasOrdenados = Object.keys(historicoPorDia).sort();
        const valoresOrdenados = diasOrdenados.map(d => historicoPorDia[d]);
        const labelsDatas = diasOrdenados.map(d => d.split('-').reverse().slice(0, 2).join('/')); // DD/MM
        
        // Desenhar o gráfico
        desenharGraficoHistorico(labelsDatas, valoresOrdenados);
    } catch (err) {
        console.error("Erro ao carregar preços:", err);
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-red-500 font-medium">Erro ao compilar preços.</td></tr>';
    }
}

function desenharGraficoHistorico(labels, valores) {
    const canvas = document.getElementById('graficoPrecosHistorico');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (window.graficoPrecosInstance) {
        window.graficoPrecosInstance.destroy();
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.25)'); // Blue-600
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');
    
    window.graficoPrecosInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Menor Preço Encontrado (R$)',
                data: valores,
                borderColor: '#2563eb', // Blue-600
                borderWidth: 2.5,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#2563eb',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: gradient,
                tension: 0.25
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            return ` Menor Preço: R$ ${context.parsed.y.toFixed(2).replace('.', ',')}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2).replace('.', ',');
                        },
                        font: { size: 9, weight: 'bold' }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 9, weight: 'bold' } }
                }
            }
        }
    });
}
