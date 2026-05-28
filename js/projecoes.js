// ==========================================
// INTELIGÊNCIA FINANCEIRA: PROJEÇÕES 12 MESES
// ==========================================

function initProjecoes() {
    console.log("Inicializando Projeções Financeiras...");
    const btnToggle = document.getElementById('btn-toggle-projecoes');
    if (btnToggle) {
        btnToggle.removeEventListener('click', toggleSecaoProjecoes);
        btnToggle.addEventListener('click', toggleSecaoProjecoes);
    }
}

function toggleSecaoProjecoes() {
    const conteudo = document.getElementById('conteudo-projecoes');
    const icone = document.getElementById('icone-toggle-projecoes');
    if (!conteudo || !icone) return;

    if (conteudo.classList.contains('hidden')) {
        conteudo.classList.remove('hidden');
        icone.classList.add('rotate-180');
        // Calcula e exibe quando abre
        calcularEExibirProjecoes();
    } else {
        conteudo.classList.add('hidden');
        icone.classList.remove('rotate-180');
    }
}

async function calcularEExibirProjecoes() {
    if (!userAtual) return;

    // Garante que as transações globais estão carregadas e atualizadas para a loja ativa
    if (typeof carregarTransacoesGlobais === 'function') {
        await carregarTransacoesGlobais();
    }

    // 1. CALCULAR SALDO REAL ATUAL (Soma de tudo o que foi Realizado)
    let saldoRealAtual = 0;
    transacoesGlobais.forEach(t => {
        if (t.status === 'Realizado') {
            const val = parseFloat(t.valor_realizado || 0);
            if (t.tipo === 'Entrada') {
                saldoRealAtual += val;
            } else {
                saldoRealAtual -= val;
            }
        }
    });

    // 2. IDENTIFICAR MENSALIDADES E MÉDIA HISTÓRICA DOS ÚLTIMOS 3 MESES
    const hoje = new Date();
    const mesesPassados = [];
    for (let i = 1; i <= 3; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        mesesPassados.push(`${ano}-${mes}`);
    }

    let totalEntradasHistorico = 0;
    let totalSaidasHistorico = 0;
    let mesesComDados = 0;

    mesesPassados.forEach(mesAno => {
        let entMes = 0;
        let saiMes = 0;
        let teveDado = false;
        transacoesGlobais.forEach(t => {
            if (t.status === 'Realizado' && t.data_realizacao && t.data_realizacao.startsWith(mesAno)) {
                teveDado = true;
                const val = parseFloat(t.valor_realizado || 0);
                if (t.tipo === 'Entrada') {
                    entMes += val;
                } else {
                    saiMes += val;
                }
            }
        });
        if (teveDado) {
            totalEntradasHistorico += entMes;
            totalSaidasHistorico += saiMes;
            mesesComDados++;
        }
    });

    // Média de tendência baseada nos meses passados
    let mediaEntradas = 0;
    let mediaSaidas = 0;
    if (mesesComDados > 0) {
        mediaEntradas = totalEntradasHistorico / mesesComDados;
        mediaSaidas = totalSaidasHistorico / mesesComDados;
    } else {
        // Fallback: média de todas as transações realizadas
        let totalEntradasTodas = 0;
        let totalSaidasTodas = 0;
        const mesesDiferentes = new Set();
        transacoesGlobais.forEach(t => {
            if (t.status === 'Realizado') {
                const val = parseFloat(t.valor_realizado || 0);
                const data = t.data_realizacao || t.data_vencimento;
                if (data) {
                    mesesDiferentes.add(data.substring(0, 7));
                    if (t.tipo === 'Entrada') totalEntradasTodas += val;
                    else totalSaidasTodas += val;
                }
            }
        });
        const q = mesesDiferentes.size || 1;
        mediaEntradas = totalEntradasTodas / q;
        mediaSaidas = totalSaidasTodas / q;
    }

    // 3. MONTAR VETOR COM OS PRÓXIMOS 12 MESES
    const mesesProjetados = [];
    for (let i = 1; i <= 12; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        const ano = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        // Nome abreviado do mês: Ex: "Jun/26"
        const mesNome = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        mesesProjetados.push({
            anoMes: `${ano}-${mes}`,
            label: mesNome.charAt(0).toUpperCase() + mesNome.slice(1),
            entradasPendentes: 0,
            saidasPendentes: 0,
            entradasEst: 0,
            saidasEst: 0,
            saldoProjetado: 0
        });
    }

    // 4. AGRUPAR LANÇAMENTOS PENDENTES FUTUROS
    // Transações pendentes vencidas ou do mês atual acumulam no primeiro mês projetado (Mês 1)
    const primeiroMesAnoMes = mesesProjetados[0].anoMes;
    transacoesGlobais.forEach(t => {
        if (t.status === 'Pendente') {
            const val = parseFloat(t.valor_parcela || 0);
            const tAnoMes = t.data_vencimento.substring(0, 7);

            if (tAnoMes <= primeiroMesAnoMes) {
                if (t.tipo === 'Entrada') {
                    mesesProjetados[0].entradasPendentes += val;
                } else {
                    mesesProjetados[0].saidasPendentes += val;
                }
            } else {
                const mProjetado = mesesProjetados.find(m => m.anoMes === tAnoMes);
                if (mProjetado) {
                    if (t.tipo === 'Entrada') {
                        mProjetado.entradasPendentes += val;
                    } else {
                        mProjetado.saidasPendentes += val;
                    }
                }
            }
        }
    });

    // 5. CALCULAR SALDOS FUTUROS MÊS A MÊS
    let saldoAcumulado = saldoRealAtual;
    let alertasMesesNegativos = [];

    mesesProjetados.forEach(m => {
        // A estimativa de cada mês é o máximo entre os agendamentos pendentes ou a média histórica
        m.entradasEst = Math.max(m.entradasPendentes, mediaEntradas);
        m.saidasEst = Math.max(m.saidasPendentes, mediaSaidas);

        const saldoMensal = m.entradasEst - m.saidasEst;
        saldoAcumulado += saldoMensal;
        m.saldoProjetado = saldoAcumulado;

        if (m.saldoProjetado < 0) {
            alertasMesesNegativos.push({ label: m.label, valor: m.saldoProjetado });
        }
    });

    // 6. ATUALIZAR INTERFACE - KPIS RÁPIDOS
    const elSaldoIni = document.getElementById('proj-kpi-saldo-inicial');
    if (elSaldoIni) {
        elSaldoIni.textContent = saldoRealAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        elSaldoIni.className = saldoRealAtual < 0 ? "text-base font-black text-rose-600 mt-1" : "text-base font-black text-slate-700 mt-1";
    }

    const elMediaEnt = document.getElementById('proj-kpi-media-entrada');
    if (elMediaEnt) {
        elMediaEnt.textContent = mediaEntradas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const elMediaSai = document.getElementById('proj-kpi-media-saida');
    if (elMediaSai) {
        elMediaSai.textContent = mediaSaidas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    const elAlertas = document.getElementById('proj-kpi-alertas');
    if (elAlertas) {
        if (alertasMesesNegativos.length > 0) {
            elAlertas.textContent = `${alertasMesesNegativos.length} Mês(es) de Risco`;
            elAlertas.className = "text-base font-black text-rose-500 mt-1";
        } else {
            elAlertas.textContent = "Saudável ✓";
            elAlertas.className = "text-base font-black text-emerald-600 mt-1";
        }
    }

    // 7. RENDERIZAR GRÁFICO DE BARRAS DE PROJEÇÃO (Custom CSS)
    const graphContainer = document.getElementById('projecao-grafico-barras');
    if (graphContainer) {
        // Encontra máximos e mínimos para escala
        const todosSaldos = mesesProjetados.map(m => m.saldoProjetado);
        let maxVal = Math.max(...todosSaldos, 1000); // garante escala mínima positiva
        let minVal = Math.min(...todosSaldos, 0); // garante escala mínima de zero ou negativa

        const range = maxVal - minVal;
        const zeroLinePercent = minVal < 0 ? (Math.abs(minVal) / range) * 100 : 0;

        let corpoHtml = '';
        let legendasHtml = '';
        const colWidthPercent = 100 / 12;

        // Injeta Linha do Zero
        corpoHtml += `
            <div class="absolute left-0 right-0 border-t border-dashed border-slate-300 z-10 flex items-center justify-end" style="bottom: ${zeroLinePercent}%; pointer-events: none;">
                <span class="text-[8px] font-black text-slate-400 bg-white/95 px-1.5 py-0.5 rounded shadow-sm border border-slate-100 mr-2 -mt-2">R$ 0,00</span>
            </div>
        `;

        mesesProjetados.forEach((m, idx) => {
            const bal = m.saldoProjetado;
            const isPositive = bal >= 0;
            const barHeight = (Math.abs(bal) / range) * 75; // usa no máximo 75% da altura para dar respiro no topo
            const formattedBal = bal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const leftPos = idx * colWidthPercent;

            const barColorClass = isPositive 
                ? 'bg-gradient-to-t from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 shadow-sm' 
                : 'bg-gradient-to-b from-rose-600 to-rose-400 hover:from-rose-700 hover:to-rose-500 shadow-sm';

            const barRoundedClass = isPositive ? 'rounded-t-md' : 'rounded-b-md';

            const barPositionStyle = isPositive 
                ? `bottom: ${zeroLinePercent}%; height: ${barHeight}%;` 
                : `top: ${100 - zeroLinePercent}%; height: ${barHeight}%;`;

            // Ajusta a posição do balão e de sua seta para as extremidades (meses 1 e 12) para evitar corte horizontal
            const tooltipPosClass = idx === 11 
                ? 'right-0' 
                : (idx === 0 ? 'left-0' : 'left-1/2 transform -translate-x-1/2');
            
            const tooltipArrowPosClass = idx === 11 
                ? 'right-4 transform -translate-x-0' 
                : (idx === 0 ? 'left-4 transform -translate-x-0' : 'left-1/2 transform -translate-x-1/2');

            corpoHtml += `
                <div class="absolute group" style="left: ${leftPos}%; width: ${colWidthPercent}%; height: 100%; top: 0;">
                    <!-- Barra -->
                    <div class="absolute left-1 md:left-2.5 right-1 md:right-2.5 transition-all duration-300 ${barColorClass} ${barRoundedClass}"
                         style="${barPositionStyle}">
                      </div>
                    <!-- Tooltip ao passar o mouse -->
                    <div class="hidden group-hover:block absolute z-20 ${tooltipPosClass} -top-12 bg-slate-800 text-white text-[10px] font-extrabold py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap text-center">
                        <span class="block text-slate-400 uppercase text-[8px] leading-tight">${m.label}</span>
                        <span>${formattedBal}</span>
                        <div class="absolute ${tooltipArrowPosClass} top-full w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>
                </div>
            `;

            legendasHtml += `
                <div class="text-center font-bold text-[9px] text-slate-400 uppercase tracking-wider flex-1" style="width: ${colWidthPercent}%">
                    ${m.label}
                </div>
            `;
        });

        graphContainer.innerHTML = `
            <div class="w-full h-full flex flex-col justify-between" style="overflow: visible;">
                <div class="flex-1 relative w-full" id="projecao-grafico-corpo" style="overflow: visible;">
                    ${corpoHtml}
                </div>
                <div class="h-6 flex justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-2" id="projecao-grafico-legendas">
                    ${legendasHtml}
                </div>
            </div>
        `;
    }

    // 8. RENDERIZAR TABELA DE VALORES PROJETADOS
    const tbodyValores = document.getElementById('projecoes-lista-valores');
    if (tbodyValores) {
        tbodyValores.innerHTML = '';
        mesesProjetados.forEach(m => {
            const formattedEnt = m.entradasEst.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const formattedSai = m.saidasEst.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const formattedSaldo = m.saldoProjetado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const saldoColor = m.saldoProjetado < 0 ? 'text-rose-600 font-extrabold' : 'text-blue-700 font-extrabold';

            tbodyValores.innerHTML += `
                <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-2 px-3 font-bold text-slate-700">${m.label}</td>
                    <td class="py-2 px-3 text-right text-emerald-600">${formattedEnt}</td>
                    <td class="py-2 px-3 text-right text-rose-500">${formattedSai}</td>
                    <td class="py-2 px-3 text-right ${saldoColor}">${formattedSaldo}</td>
                </tr>
            `;
        });
    }

    // 9. RENDERIZAR ALERTAS E INSIGHTS DE NEGÓCIOS
    const elTextoAlertas = document.getElementById('projecoes-alertas-texto');
    if (elTextoAlertas) {
        if (alertasMesesNegativos.length > 0) {
            const primeiroMesRisco = alertasMesesNegativos[0];
            elTextoAlertas.innerHTML = `
                <div class="p-3 bg-red-50 border border-red-150 rounded-xl text-red-800 mb-2">
                    <p class="font-extrabold flex items-center gap-1">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Atenção: Risco crítico projetado!</span>
                    </p>
                    <p class="text-[11px] mt-1 font-semibold leading-relaxed">
                        Seu saldo de caixa está projetado para ficar negativo em <strong class="underline">${primeiroMesRisco.label}</strong> (previsto: ${primeiroMesRisco.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).
                    </p>
                </div>
                <ul class="space-y-2 mt-3 list-none pl-0">
                    <li class="flex gap-2">
                        <i class="fas fa-check text-rose-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Adiar Compras de Estoque:</strong>
                            <span>Negocie prazos maiores com fornecedores em compras futuras programadas para aliviar a saída de caixa imediata.</span>
                        </div>
                    </li>
                    <li class="flex gap-2">
                        <i class="fas fa-check text-rose-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Promoções de Antecipação:</strong>
                            <span>Crie ofertas exclusivas para pagamentos via PIX ou dinheiro para acelerar a entrada de capital antes do período crítico.</span>
                        </div>
                    </li>
                    <li class="flex gap-2">
                        <i class="fas fa-check text-rose-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Negociar Despesas Fixas:</strong>
                            <span>Tente revisar aluguéis ou contratos de serviços fixos para flexibilizar as saídas.</span>
                        </div>
                    </li>
                </ul>
            `;
        } else {
            elTextoAlertas.innerHTML = `
                <div class="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 mb-2">
                    <p class="font-extrabold flex items-center gap-1">
                        <i class="fas fa-check-circle"></i>
                        <span>Excelente! Saúde financeira impecável!</span>
                    </p>
                    <p class="text-[11px] mt-1 font-semibold leading-relaxed">
                        Nenhuma previsão de caixa negativo nos próximos 12 meses. Sua projeção indica um fluxo saudável e constante de capital.
                    </p>
                </div>
                <ul class="space-y-2 mt-3 list-none pl-0">
                    <li class="flex gap-2">
                        <i class="fas fa-arrow-right text-emerald-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Oportunidade de Investimento:</strong>
                            <span>Com o caixa excedente projetado, planeje compras em lote com descontos agressivos junto aos fornecedores para turbinar seu CMV.</span>
                        </div>
                    </li>
                    <li class="flex gap-2">
                        <i class="fas fa-arrow-right text-emerald-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Criação de Reserva Financeira:</strong>
                            <span>Aloque parte dos excedentes em investimentos de liquidez diária conservadora para obter juros compostos a favor do negócio.</span>
                        </div>
                    </li>
                    <li class="flex gap-2">
                        <i class="fas fa-arrow-right text-emerald-500 mt-1 text-[10px]"></i>
                        <div>
                            <strong class="text-slate-700 block">Investir em Marketing:</strong>
                            <span>Excelente momento para injetar recursos em tráfego pago ou marketing local para aumentar as vendas sem comprometer a operação.</span>
                        </div>
                    </li>
                </ul>
            `;
        }
    }
}
