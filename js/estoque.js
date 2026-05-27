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

// Variáveis de controle globais de filtro para Bairros/Cidades
window.filtrosBairrosSelecionados = window.filtrosBairrosSelecionados || new Set();
window.dadosPrecosCache = null;

// Configurar ouvintes globais para o dropdown customizado e a tela de Ajustes
document.addEventListener('DOMContentLoaded', () => {
    const btnDropdown = document.getElementById('btn-dropdown-localidades');
    const menuDropdown = document.getElementById('menu-dropdown-localidades');
    const buscaInput = document.getElementById('busca-dropdown-localidades');
    const iconChevron = document.getElementById('icon-dropdown-chevron');
    
    if (btnDropdown && menuDropdown) {
        // Toggle dropdown open/close
        btnDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = menuDropdown.classList.contains('hidden');
            if (isHidden) {
                menuDropdown.classList.remove('hidden');
                if (iconChevron) iconChevron.style.transform = 'rotate(180deg)';
                if (buscaInput) {
                    buscaInput.value = '';
                    buscaInput.focus();
                    filtrarOpcoesDropdown('');
                }
            } else {
                menuDropdown.classList.add('hidden');
                if (iconChevron) iconChevron.style.transform = 'rotate(0deg)';
            }
        });
        
        // Impedir fechamento ao clicar dentro do menu do dropdown
        menuDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', () => {
            menuDropdown.classList.add('hidden');
            if (iconChevron) iconChevron.style.transform = 'rotate(0deg)';
        });
        
        // Campo de busca com filtro em tempo real
        if (buscaInput) {
            buscaInput.addEventListener('input', (e) => {
                filtrarOpcoesDropdown(e.target.value);
            });
        }
    }

    // Configurar o input de Filtro Padrão de Localidades na tela de Ajustes
    const inputFiltroPadrao = document.getElementById('config-filtro-localidades-padrao');
    const btnSalvarFiltroPadrao = document.getElementById('btn-salvar-filtro-padrao');
    
    if (inputFiltroPadrao) {
        const salvo = localStorage.getItem('maxfinance-filtro-padrao') || '';
        inputFiltroPadrao.value = salvo;
    }
    
    if (btnSalvarFiltroPadrao && inputFiltroPadrao) {
        btnSalvarFiltroPadrao.addEventListener('click', () => {
            const val = inputFiltroPadrao.value.trim();
            localStorage.setItem('maxfinance-filtro-padrao', val);
            if (typeof mostrarToast === 'function') {
                mostrarToast("Filtro padrão de localidade salvo!", "success");
            }
        });
    }
});

function filtrarOpcoesDropdown(termo) {
    const optionsContainer = document.getElementById('opcoes-dropdown-localidades');
    if (!optionsContainer) return;
    
    const termoMin = termo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const items = optionsContainer.querySelectorAll('.dropdown-opcao-item');
    
    items.forEach(item => {
        const text = item.getAttribute('data-value').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (text.includes(termoMin)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

async function carregarPrecosEHistorico(produtoId) {
    const tbody = document.getElementById('lista-precos-atuais-corpo');
    const filterContainer = document.getElementById('filtro-localidades-container');
    
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Carregando dados...</td></tr>';
    if (filterContainer) filterContainer.classList.add('hidden');
    
    try {
        // 1. Carregar links do produto
        const { data: links, error: lErr } = await clienteSupabase
            .from('produto_links')
            .select('id, plataforma, url')
            .eq('produto_id', produtoId);
        if (lErr) throw lErr;
        
        if (!links || links.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum link cadastrado para este produto. Cadastre na aba "Links Externos".</td></tr>';
            return;
        }
        
        const linkIds = links.map(l => l.id);
        
        // 2. Carregar histórico de preços coletados (que agora armazena apenas o último preço)
        const { data: historico, error: hErr } = await clienteSupabase
            .from('produto_precos_historico')
            .select('*')
            .in('link_id', linkIds)
            .order('data_coleta', { ascending: true });
        if (hErr) throw hErr;
        
        if (!historico || historico.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum preço coletado pelo robô de monitoramento ainda.</td></tr>';
            return;
        }
        
        // Guardar dados no cache local para filtragem instantânea sem novas requisições
        window.dadosPrecosCache = {
            links: links,
            historico: historico
        };
        
        // Limpar filtros anteriores e carregar os filtros padrões da tela de Ajustes
        window.filtrosBairrosSelecionados.clear();
        
        const filtroPadraoSalvo = localStorage.getItem('maxfinance-filtro-padrao');
        if (filtroPadraoSalvo) {
            const filtrosPadrao = filtroPadraoSalvo.split(',')
                .map(f => f.trim())
                .filter(f => f.length > 0);
            
            // Compilar as localidades disponíveis para evitar a ativação de filtros fantasmas
            const localidadesSet = new Set();
            const regexLocalidade = /^(.*?)\s*\((.*?)\s*-\s*(.*?)\)$/;
            
            historico.forEach(h => {
                const match = h.loja_nome.match(regexLocalidade);
                if (match) {
                    const bairro = match[2].trim();
                    const cidade = match[3].trim();
                    localidadesSet.add(`${cidade}/${bairro}`);
                } else {
                    localidadesSet.add("Geral");
                }
            });
            
            filtrosPadrao.forEach(f => {
                if (localidadesSet.has(f)) {
                    window.filtrosBairrosSelecionados.add(f);
                }
            });
        }
        
        // Renderizar a visualização completa
        renderizarPrecosFiltrados();
        
    } catch (err) {
        console.error("Erro ao carregar preços:", err);
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-red-500 font-medium">Erro ao compilar preços.</td></tr>';
    }
}

function renderizarPrecosFiltrados() {
    if (!window.dadosPrecosCache) return;
    
    const { links, historico } = window.dadosPrecosCache;
    const tbody = document.getElementById('lista-precos-atuais-corpo');
    const filterContainer = document.getElementById('filtro-localidades-container');
    const optionsContainer = document.getElementById('opcoes-dropdown-localidades');
    const labelDropdown = document.getElementById('label-dropdown-selecionado');
    
    if (!tbody) return;
    
    // 1. Mapear e extrair todas as Localidades (Cidade/Bairro) únicas a partir de loja_nome
    const localidadesSet = new Set();
    const regexLocalidade = /^(.*?)\s*\((.*?)\s*-\s*(.*?)\)$/;
    
    historico.forEach(h => {
        const match = h.loja_nome.match(regexLocalidade);
        if (match) {
            const bairro = match[2].trim();
            const cidade = match[3].trim();
            localidadesSet.add(`${cidade}/${bairro}`);
        } else {
            localidadesSet.add("Geral");
        }
    });
    
    const listaLocalidades = Array.from(localidadesSet).sort();
    
    // Exibir/ocultar contêiner de filtros e preencher opções
    if (listaLocalidades.length > 1 && filterContainer && optionsContainer) {
        filterContainer.classList.remove('hidden');
        optionsContainer.innerHTML = '';
        
        // Botão para limpar filtros
        if (window.filtrosBairrosSelecionados.size > 0) {
            const clearBtn = document.createElement('div');
            clearBtn.className = "p-2.5 text-blue-600 hover:bg-blue-50 font-bold cursor-pointer text-left text-[11px] transition flex justify-between items-center";
            clearBtn.innerHTML = `<span>Limpar Filtros</span><i class="fas fa-trash-alt text-xs"></i>`;
            clearBtn.onclick = (e) => {
                e.stopPropagation();
                window.filtrosBairrosSelecionados.clear();
                renderizarPrecosFiltrados();
            };
            optionsContainer.appendChild(clearBtn);
        }
        
        listaLocalidades.forEach(loc => {
            const ativo = window.filtrosBairrosSelecionados.has(loc);
            const item = document.createElement('div');
            item.className = `dropdown-opcao-item p-2.5 hover:bg-slate-50 cursor-pointer transition flex items-center justify-between text-left ${ativo ? 'bg-blue-50/50 font-bold text-blue-600' : 'text-slate-700'}`;
            item.setAttribute('data-value', loc);
            item.innerHTML = `
                <span>${loc}</span>
                ${ativo ? '<i class="fas fa-check text-blue-600 text-[10px]"></i>' : ''}
            `;
            item.onclick = (e) => {
                e.stopPropagation();
                toggleFiltroLocalidade(loc);
            };
            optionsContainer.appendChild(item);
        });
        
        // Atualizar texto do botão do dropdown
        if (window.filtrosBairrosSelecionados.size === 0) {
            if (labelDropdown) {
                labelDropdown.textContent = "Selecione cidade e bairro";
                labelDropdown.className = "text-slate-400 font-medium text-xs";
            }
        } else {
            const arrayFiltros = Array.from(window.filtrosBairrosSelecionados);
            if (labelDropdown) {
                labelDropdown.textContent = window.filtrosBairrosSelecionados.size === 1 
                    ? arrayFiltros[0] 
                    : `${window.filtrosBairrosSelecionados.size} selecionados`;
                labelDropdown.className = "text-blue-600 font-bold text-xs";
            }
        }
    } else {
        if (filterContainer) filterContainer.classList.add('hidden');
    }
    
    // 2. Filtrar histórico com base nos filtros selecionados
    const temFiltroAtivo = window.filtrosBairrosSelecionados.size > 0;
    
    const historicoFiltrado = historico.filter(h => {
        if (!temFiltroAtivo) return true;
        
        const match = h.loja_nome.match(regexLocalidade);
        if (match) {
            const loc = `${match[3].trim()}/${match[2].trim()}`;
            return window.filtrosBairrosSelecionados.has(loc);
        } else {
            return window.filtrosBairrosSelecionados.has("Geral");
        }
    });
    
    // 3. Compilar Preços Atuais Filtrados
    const precosAtuais = [];
    links.forEach(lnk => {
        const histLnk = historicoFiltrado.filter(h => h.link_id === lnk.id);
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
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-slate-400 font-medium">Nenhum preço corresponde aos filtros selecionados.</td></tr>';
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
                    <td class="p-3 font-bold text-slate-700 text-left">${pa.loja}</td>
                    <td class="p-3 text-right font-black ${isMelhorPreco ? 'text-green-600 text-sm' : 'text-slate-800'}">R$ ${formattedPreco}${badge}</td>
                    <td class="p-3 text-center text-slate-500 font-medium">${dateStr}</td>
                </tr>
            `;
        });
    }
}

function toggleFiltroLocalidade(localidade) {
    if (window.filtrosBairrosSelecionados.has(localidade)) {
        window.filtrosBairrosSelecionados.delete(localidade);
    } else {
        window.filtrosBairrosSelecionados.add(localidade);
    }
    // Re-renderiza com os filtros aplicados
    renderizarPrecosFiltrados();
}
