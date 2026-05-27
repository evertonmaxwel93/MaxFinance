function initRelatorios() {
    const selectAno = document.getElementById('relatorio-ano');
    const selectMes = document.getElementById('relatorio-mes');
    if (!selectAno || !selectMes) return;
    
    const anos = [...new Set(transacoesGlobais.map(t => t.data_vencimento.split('-')[0]))].sort((a,b)=>b-a);
    selectAno.innerHTML = '';
    anos.forEach(ano => {
        const opt = document.createElement('option');
        opt.value = ano; opt.textContent = ano;
        selectAno.appendChild(opt);
    });
    if(anos.length === 0) selectAno.innerHTML = '<option value="">Sem dados</option>';
    else {
        const hoje = new Date();
        selectAno.value = hoje.getFullYear().toString();
        selectMes.value = String(hoje.getMonth() + 1).padStart(2, '0');
    }
    renderizarRelatorios();
}

function renderizarRelatorios() {
    const elAno = document.getElementById('relatorio-ano');
    const elMes = document.getElementById('relatorio-mes');
    if (!elAno || !elMes) return;

    const ano = elAno.value;
    const mes = elMes.value;
    if(!ano) return;

    // 1. Resumo Mensal (Transacoes)
    const transMes = transacoesGlobais.filter(t => t.data_vencimento.startsWith(`${ano}-${mes}`));
    let resumo = {};
    transMes.forEach(t => {
        if(!resumo[t.subcategoria]) resumo[t.subcategoria] = { entrada: 0, saida: 0 };
        if(t.tipo === 'Entrada') resumo[t.subcategoria].entrada += t.valor_parcela;
        else resumo[t.subcategoria].saida += t.valor_parcela;
    });

    const resumoDiv = document.getElementById('relatorio-resumo-mensal');
    if (resumoDiv) {
        resumoDiv.innerHTML = '';
        if(Object.keys(resumo).length === 0) {
            resumoDiv.innerHTML = '<p class="text-sm text-slate-400">Nenhum dado no período.</p>';
        } else {
            for (let sub in resumo) {
                const r = resumo[sub];
                if (r.entrada === 0 && r.saida === 0) continue;
                const valHtml = r.entrada > 0 ? `<span class="text-emerald-600 font-bold">+ R$ ${r.entrada.toFixed(2).replace('.', ',')}</span>` : `<span class="text-red-600 font-bold">- R$ ${r.saida.toFixed(2).replace('.', ',')}</span>`;
                resumoDiv.innerHTML += `
                    <div class="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                        <span class="text-slate-600 font-medium">${sub}</span>
                        ${valHtml}
                    </div>
                `;
            }
        }
    }

    // 2. Ranking de Produtos
    const tipoRanking = document.getElementById('relatorio-ranking-tipo')?.value || 'qtd';
    
    let rankingData = {};
    // Pegar todas as vendas do periodo e seus itens
    vendasGlobais.forEach(v => {
        if(v.data.startsWith(`${ano}-${mes}`)) {
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

    const tbody = document.getElementById('relatorio-ranking-lista');
    if (tbody) {
        tbody.innerHTML = '';
        if(rankingArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" class="p-2 text-center text-slate-400 text-sm">Nenhuma venda no período.</td></tr>';
        } else {
            rankingArray.slice(0,10).forEach(r => {
                let valDisplay = '';
                if(tipoRanking === 'qtd') valDisplay = `${r.qtd} un`;
                else if(tipoRanking === 'faturamento') valDisplay = `R$ ${r.faturamento.toFixed(2).replace('.', ',')}`;
                else valDisplay = `R$ ${r.lucro.toFixed(2).replace('.', ',')}`;

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 transition">
                        <td class="p-2 font-medium text-slate-800">${r.nome}</td>
                        <td class="p-2 text-right text-slate-600 font-bold">${valDisplay}</td>
                    </tr>
                `;
            });
        }
    }
}
