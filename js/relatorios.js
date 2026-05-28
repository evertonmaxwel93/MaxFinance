// ==========================================
// ÁREA CONTÁBIL & RELATÓRIOS (DRE E KPIS)
// ==========================================
let relatorioAbaAtiva = 'competencia';

function initRelatorios() {
    const selectAno = document.getElementById('relatorio-ano');
    const selectMes = document.getElementById('relatorio-mes');
    if (!selectAno || !selectMes) return;
    
    // Compila anos únicos das transações
    const anos = [...new Set(transacoesGlobais.map(t => t.data_vencimento.split('-')[0]))].sort((a,b)=>b-a);
    selectAno.innerHTML = '';
    anos.forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano; opt.textContent = ano;
        selectAno.appendChild(opt);
    });
    if(anos.length === 0) {
        const anoAtual = new Date().getFullYear().toString();
        selectAno.innerHTML = `<option value="${anoAtual}">${anoAtual}</option>`;
    }
    
    const hoje = new Date();
    selectAno.value = hoje.getFullYear().toString();
    selectMes.value = String(hoje.getMonth() + 1).padStart(2, '0');
    
    // Bind de eventos de mudança
    selectAno.removeEventListener('change', renderizarRelatorios);
    selectAno.addEventListener('change', renderizarRelatorios);
    selectMes.removeEventListener('change', renderizarRelatorios);
    selectMes.addEventListener('change', renderizarRelatorios);
    
    const rankTipo = document.getElementById('relatorio-ranking-tipo');
    if (rankTipo) {
        rankTipo.removeEventListener('change', renderizarRelatorios);
        rankTipo.addEventListener('change', renderizarRelatorios);
    }
    
    renderizarRelatorios();
}

function alternarTabRelatorio(tab) {
    relatorioAbaAtiva = tab;
    const tabs = ['competencia', 'caixa', 'produtos'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-rel-${t}`);
        const content = document.getElementById(`content-rel-${t}`);
        if (!btn || !content) return;
        
        if (t === tab) {
            btn.className = "px-4 py-3 font-extrabold text-xs text-blue-600 border-b-2 border-blue-600 transition outline-none whitespace-nowrap";
            content.classList.remove('hidden');
        } else {
            btn.className = "px-4 py-3 font-extrabold text-xs text-slate-500 border-b-2 border-transparent hover:text-slate-700 transition outline-none whitespace-nowrap";
            content.classList.add('hidden');
        }
    });
}

function renderizarRelatorios() {
    const elAno = document.getElementById('relatorio-ano');
    const elMes = document.getElementById('relatorio-mes');
    if (!elAno || !elMes) return;

    const ano = elAno.value;
    const mes = elMes.value;
    if(!ano) return;

    const periodo = `${ano}-${mes}`;

    // 1. CARREGAR DADOS FILTRADOS POR MÊS/ANO DA LOJA ATIVA
    const vendasPeriodo = vendasGlobais.filter(v => v.data.startsWith(periodo));
    const transacoesPeriodo = transacoesGlobais.filter(t => t.data_vencimento.startsWith(periodo));
    const transacoesCaixaPeriodo = transacoesGlobais.filter(t => t.status === 'Realizado' && t.data_realizacao && t.data_realizacao.startsWith(periodo));

    // 2. CÁLCULO DRE COMPETÊNCIA (Advanced)
    // Receitas
    let faturamentoBruto = 0;
    vendasPeriodo.forEach(v => faturamentoBruto += parseFloat(v.total || 0));

    // CMV (Custo de Mercadorias Vendidas)
    let cmv = 0;
    vendasPeriodo.forEach(v => cmv += parseFloat(v.custo_total || 0));

    // Despesas Operacionais Competência (Saídas do período exceto 'Compras' que já entram em CMV)
    let despesasOperacionais = {};
    let totalDespesasOperacionais = 0;
    
    transacoesPeriodo.forEach(t => {
        if (t.tipo === 'Saída' && t.subcategoria !== 'Compras') {
            const v = parseFloat(t.valor_parcela || 0);
            despesasOperacionais[t.subcategoria] = (despesasOperacionais[t.subcategoria] || 0) + v;
            totalDespesasOperacionais += v;
        }
    });

    let lucroBruto = faturamentoBruto - cmv;
    let ebitda = lucroBruto - totalDespesasOperacionais; // EBITDA simplificado
    let lucroLiquido = ebitda; // Considerado igual para simplificação

    // 3. RENDERIZAR TABELA DRE COMPETÊNCIA
    const tbodyCompetencia = document.getElementById('dre-competencia-corpo');
    if (tbodyCompetencia) {
        tbodyCompetencia.innerHTML = `
            <tr class="bg-blue-50/30 text-blue-900 font-extrabold text-[13px] border-y border-blue-100">
                <td class="py-2.5 px-4">(=) RECEITA BRUTA DE VENDAS</td>
                <td class="py-2.5 px-4 text-right">R$ ${faturamentoBruto.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right">100%</td>
            </tr>
            <tr class="text-red-600 font-bold text-xs">
                <td class="py-2 px-6 pl-8">(-) Custo de Mercadorias Vendidas (CMV)</td>
                <td class="py-2 px-4 text-right">R$ ${cmv.toFixed(2).replace('.', ',')}</td>
                <td class="py-2 px-4 text-right">${faturamentoBruto > 0 ? ((cmv / faturamentoBruto) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr class="bg-slate-50 font-black text-xs border-y">
                <td class="py-2 px-4">(=) LUCRO BRUTO</td>
                <td class="py-2 px-4 text-right text-slate-800">R$ ${lucroBruto.toFixed(2).replace('.', ',')}</td>
                <td class="py-2 px-4 text-right">${faturamentoBruto > 0 ? ((lucroBruto / faturamentoBruto) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr class="bg-slate-100/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <td class="py-1 px-4" colspan="3">(-) DESPESAS OPERACIONAIS</td>
            </tr>
        `;

        if (Object.keys(despesasOperacionais).length === 0) {
            tbodyCompetencia.innerHTML += `
                <tr class="text-xs text-slate-400 font-medium">
                    <td class="py-2 px-8" colspan="3">Nenhuma despesa operacional registrada no período.</td>
                </tr>
            `;
        } else {
            for (let sub in despesasOperacionais) {
                const val = despesasOperacionais[sub];
                tbodyCompetencia.innerHTML += `
                    <tr class="text-xs text-slate-600 font-semibold">
                        <td class="py-2 px-8 pl-10">${sub}</td>
                        <td class="py-2 px-4 text-right">R$ ${val.toFixed(2).replace('.', ',')}</td>
                        <td class="py-2 px-4 text-right">${faturamentoBruto > 0 ? ((val / faturamentoBruto) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `;
            }
        }

        tbodyCompetencia.innerHTML += `
            <tr class="bg-slate-100 font-black text-xs border-y">
                <td class="py-2.5 px-4">(=) RESULTADO OPERACIONAL (EBITDA)</td>
                <td class="py-2.5 px-4 text-right text-slate-800">R$ ${ebitda.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right">${faturamentoBruto > 0 ? ((ebitda / faturamentoBruto) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr class="bg-green-50 text-green-950 font-black text-[13px] border-y border-green-200">
                <td class="py-2.5 px-4">(=) RESULTADO LÍQUIDO DO EXERCÍCIO (LUCRO/PREJUÍZO)</td>
                <td class="py-2.5 px-4 text-right ${lucroLiquido < 0 ? 'text-red-600' : 'text-green-700'}">R$ ${lucroLiquido.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right ${lucroLiquido < 0 ? 'text-red-600' : 'text-green-700'}">${faturamentoBruto > 0 ? ((lucroLiquido / faturamentoBruto) * 100).toFixed(1) : 0}%</td>
            </tr>
        `;
    }

    // 4. CÁLCULO DRE CAIXA (Fluxo Realizado)
    let totalEntradasCaixa = 0;
    let totalSaidasCaixa = 0;
    let subEntradasCaixa = {};
    let subSaidasCaixa = {};

    transacoesCaixaPeriodo.forEach(t => {
        const val = parseFloat(t.valor_realizado || 0);
        if (t.tipo === 'Entrada') {
            subEntradasCaixa[t.subcategoria] = (subEntradasCaixa[t.subcategoria] || 0) + val;
            totalEntradasCaixa += val;
        } else {
            subSaidasCaixa[t.subcategoria] = (subSaidasCaixa[t.subcategoria] || 0) + val;
            totalSaidasCaixa += val;
        }
    });

    let resultadoCaixa = totalEntradasCaixa - totalSaidasCaixa;

    // 5. RENDERIZAR TABELA DRE CAIXA
    const tbodyCaixa = document.getElementById('dre-caixa-corpo');
    if (tbodyCaixa) {
        tbodyCaixa.innerHTML = `
            <tr class="bg-green-50/50 text-green-900 font-extrabold text-[12px] border-y">
                <td class="py-2 px-4" colspan="3">(+) ENTRADAS DE CAIXA REALIZADAS</td>
            </tr>
        `;

        if (Object.keys(subEntradasCaixa).length === 0) {
            tbodyCaixa.innerHTML += `
                <tr class="text-xs text-slate-400 font-medium">
                    <td class="py-2 px-8" colspan="3">Nenhuma entrada liquidada no período.</td>
                </tr>
            `;
        } else {
            for (let sub in subEntradasCaixa) {
                const val = subEntradasCaixa[sub];
                tbodyCaixa.innerHTML += `
                    <tr class="text-xs text-slate-600 font-semibold">
                        <td class="py-2 px-8 pl-10">${sub}</td>
                        <td class="py-2 px-4 text-right text-emerald-600">R$ ${val.toFixed(2).replace('.', ',')}</td>
                        <td class="py-2 px-4 text-right">${totalEntradasCaixa > 0 ? ((val / totalEntradasCaixa) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `;
            }
        }

        tbodyCaixa.innerHTML += `
            <tr class="bg-emerald-50 text-emerald-950 font-black text-xs border-y">
                <td class="py-2.5 px-4">(=) TOTAL DE ENTRADAS</td>
                <td class="py-2.5 px-4 text-right text-emerald-700">R$ ${totalEntradasCaixa.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right">100%</td>
            </tr>
            <tr class="bg-red-50/50 text-red-900 font-extrabold text-[12px] border-y">
                <td class="py-2 px-4" colspan="3">(-) SAÍDAS DE CAIXA REALIZADAS</td>
            </tr>
        `;

        if (Object.keys(subSaidasCaixa).length === 0) {
            tbodyCaixa.innerHTML += `
                <tr class="text-xs text-slate-400 font-medium">
                    <td class="py-2 px-8" colspan="3">Nenhuma saída liquidada no período.</td>
                </tr>
            `;
        } else {
            for (let sub in subSaidasCaixa) {
                const val = subSaidasCaixa[sub];
                tbodyCaixa.innerHTML += `
                    <tr class="text-xs text-slate-600 font-semibold">
                        <td class="py-2 px-8 pl-10">${sub}</td>
                        <td class="py-2 px-4 text-right text-red-500">R$ ${val.toFixed(2).replace('.', ',')}</td>
                        <td class="py-2 px-4 text-right">${totalEntradasCaixa > 0 ? ((val / totalEntradasCaixa) * 100).toFixed(1) : 0}%</td>
                    </tr>
                `;
            }
        }

        tbodyCaixa.innerHTML += `
            <tr class="bg-red-50 text-red-950 font-black text-xs border-y">
                <td class="py-2.5 px-4">(=) TOTAL DE SAÍDAS</td>
                <td class="py-2.5 px-4 text-right text-red-600">R$ ${totalSaidasCaixa.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right">${totalEntradasCaixa > 0 ? ((totalSaidasCaixa / totalEntradasCaixa) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr class="bg-blue-50 text-blue-950 font-black text-[13px] border-y border-blue-200">
                <td class="py-2.5 px-4">(=) SALDO LÍQUIDO DE CAIXA NO MÊS</td>
                <td class="py-2.5 px-4 text-right ${resultadoCaixa < 0 ? 'text-red-600' : 'text-blue-700'}">R$ ${resultadoCaixa.toFixed(2).replace('.', ',')}</td>
                <td class="py-2.5 px-4 text-right ${resultadoCaixa < 0 ? 'text-red-600' : 'text-blue-700'}">${totalEntradasCaixa > 0 ? ((resultadoCaixa / totalEntradasCaixa) * 100).toFixed(1) : 0}%</td>
            </tr>
        `;
    }

    // 6. ATUALIZAR CARDS DE KPIS CONTÁBEIS
    const cardEbitda = document.getElementById('kpi-ebitda');
    if (cardEbitda) {
        cardEbitda.textContent = `R$ ${ebitda.toFixed(2).replace('.', ',')}`;
        cardEbitda.className = ebitda < 0 ? "text-base font-black text-red-600 mt-1.5 leading-none" : "text-base font-black text-green-600 mt-1.5 leading-none";
    }

    const cardMargem = document.getElementById('kpi-margem-liquida');
    if (cardMargem) {
        const margem = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;
        cardMargem.textContent = `${margem.toFixed(1)}%`;
        cardMargem.className = margem < 0 ? "text-base font-black text-red-600 mt-1.5 leading-none" : "text-base font-black text-green-600 mt-1.5 leading-none";
    }

    const cardMarkup = document.getElementById('kpi-markup');
    if (cardMarkup) {
        const markup = cmv > 0 ? ((faturamentoBruto - cmv) / cmv) * 100 : 0;
        cardMarkup.textContent = `${markup.toFixed(1)}%`;
    }

    const cardPonto = document.getElementById('kpi-ponto-equilibrio');
    if (cardPonto) {
        // Custo Fixo = Despesas Operacionais exceto CMV
        const custoFixo = totalDespesasOperacionais;
        // Margem de Contribuição % = (Faturamento - CMV) / Faturamento
        const mcPorcentagem = faturamentoBruto > 0 ? (faturamentoBruto - cmv) / faturamentoBruto : 0.4; // 40% como fallback padrão se não houver faturamento
        const pontoEquilibrio = mcPorcentagem > 0 ? (custoFixo / mcPorcentagem) : 0;
        cardPonto.textContent = `R$ ${pontoEquilibrio.toFixed(2).replace('.', ',')}`;
    }

    // 7. RENDERIZAR PERFORMANCE DE PRODUTOS
    const tipoRanking = document.getElementById('relatorio-ranking-tipo')?.value || 'qtd';
    let rankingData = {};

    vendasPeriodo.forEach(v => {
        if(v.vendas_itens) {
            v.vendas_itens.forEach(it => {
                const pid = it.produto_id;
                if(!rankingData[pid]) {
                    const p = produtos.find(x => x.id === pid);
                    rankingData[pid] = {
                        nome: p ? p.nome : 'Produto Deletado',
                        qtd: 0,
                        faturamento: 0,
                        lucro: 0
                    };
                }
                rankingData[pid].qtd += it.quantidade;
                rankingData[pid].faturamento += (it.valor_venda * it.quantidade);
                rankingData[pid].lucro += ((it.valor_venda - it.custo_unitario) * it.quantidade);
            });
        }
    });

    let rankingArray = Object.values(rankingData);
    if(tipoRanking === 'qtd') rankingArray.sort((a,b) => b.qtd - a.qtd);
    else if(tipoRanking === 'faturamento') rankingArray.sort((a,b) => b.faturamento - a.faturamento);
    else rankingArray.sort((a,b) => b.lucro - a.lucro);

    const tbodyProd = document.getElementById('relatorio-ranking-lista');
    if (tbodyProd) {
        tbodyProd.innerHTML = '';
        if(rankingArray.length === 0) {
            tbodyProd.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400 font-medium text-xs">Nenhuma venda de produto no período.</td></tr>';
        } else {
            rankingArray.forEach(r => {
                tbodyProd.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-3 text-slate-800">${r.nome}</td>
                        <td class="p-3 text-right text-slate-600">${r.qtd} un</td>
                        <td class="p-3 text-right text-slate-600">R$ ${r.faturamento.toFixed(2).replace('.', ',')}</td>
                        <td class="p-3 text-right text-blue-600 font-black">R$ ${r.lucro.toFixed(2).replace('.', ',')}</td>
                    </tr>
                `;
            });
        }
    }
}

// Impressão da DRE Formatada Contábil
function imprimirDRE() {
    const elAno = document.getElementById('relatorio-ano').value;
    const elMes = document.getElementById('relatorio-mes').value;
    const lojaNome = lojaAtiva ? lojaAtiva.nome : 'MaxFinance';
    
    let tableHtml = '';
    let titleStr = '';
    
    if (relatorioAbaAtiva === 'competencia') {
        tableHtml = document.getElementById('dre-competencia-imprimir').outerHTML;
        titleStr = `DRE por Competência - ${elMes}/${elAno}`;
    } else if (relatorioAbaAtiva === 'caixa') {
        tableHtml = document.getElementById('dre-caixa-imprimir').outerHTML;
        titleStr = `DRE por Caixa - ${elMes}/${elAno}`;
    } else {
        tableHtml = document.getElementById('content-rel-produtos').innerHTML;
        titleStr = `Performance de Vendas - ${elMes}/${elAno}`;
    }

    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head>
            <title>${titleStr}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                @media print {
                    body { font-size: 12px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body class="bg-white p-8 text-slate-800 font-sans">
            <div class="max-w-3xl mx-auto border p-6 rounded-2xl shadow-sm">
                <div class="flex justify-between items-center border-b pb-4 mb-6">
                    <div>
                        <h1 class="text-xl font-black text-slate-900">${lojaNome}</h1>
                        <p class="text-xs text-slate-400 font-medium">Controle Contábil Profissional</p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-black bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg uppercase tracking-wider">${titleStr}</span>
                    </div>
                </div>
                
                <div class="mb-6">
                    ${tableHtml}
                </div>

                <div class="border-t pt-4 text-center text-[10px] text-slate-400 font-semibold">
                    Documento gerado automaticamente pela plataforma MaxFinance em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
                </div>
            </div>
            
            <div class="fixed bottom-6 right-6 no-print">
                <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition flex items-center gap-2">
                    <i class="fas fa-print"></i> Imprimir demonstrativo
                </button>
            </div>
        </body>
        </html>
    `);
    win.document.close();
}
