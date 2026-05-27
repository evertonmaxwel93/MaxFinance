/**
 * MaxFinance - Robô de Monitoramento Diário de Preços de Concorrentes (Focado 100% no BoaDica)
 * Tecnologias: Node.js + Playwright + Gemini 2.5 Flash + Supabase (Service Role)
 */

const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Validar e carregar variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    console.error('⚠️ ERRO DE CONFIGURAÇÃO: As variáveis de ambiente SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e GEMINI_API_KEY são obrigatórias.');
    process.exit(1);
}

// 2. Inicializar os clientes
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
// Usando o Gemini 2.5 Flash, que é extremamente rápido e robusto
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json" } // Força o Gemini a responder estritamente em JSON
});

// Limite de concorrência recomendado (para evitar estourar limites de memória do Actions e de quota do Gemini)
const LIMITE_CONCORRENCIA = 3;

/**
 * Função utilitária para rodar promessas em paralelo com concorrência limitada.
 * Evita picos de memória e estouro de limites de requisição por minuto (RPM) do Gemini.
 */
async function executarEmLote(itens, limite, fn) {
    const resultados = [];
    const promessasAtivas = new Set();
    
    for (const item of itens) {
        if (promessasAtivas.size >= limite) {
            await Promise.race(promessasAtivas);
        }
        
        const p = fn(item).then(res => {
            resultados.push(res);
            promessasAtivas.delete(p);
        });
        
        promessasAtivas.add(p);
    }
    
    await Promise.all(promessasAtivas);
    return resultados;
}

async function rodarMonitoramento() {
    console.log('🚀 Iniciando processamento de links do MaxFinance (Otimizado para o BoaDica)...');
    
    // 3. Buscar todos os links cadastrados no banco
    const { data: links, error: errLinks } = await supabase
        .from('produto_links')
        .select('*');

    if (errLinks) {
        console.error('❌ Erro ao ler produto_links do Supabase:', errLinks.message);
        process.exit(1);
    }

    if (!links || links.length === 0) {
        console.log('ℹ️ Nenhum link cadastrado no banco de dados. Encerrando processo.');
        return;
    }

    console.log(`📦 Encontrados ${links.length} link(s) para monitoramento.`);

    // 4. Iniciar Playwright
    const browser = await chromium.launch({ headless: true });

    // Função de processamento individual para cada link
    const processarLink = async (link) => {
        console.log(`\n🔍 Processando link do BoaDica: ${link.url}`);
        
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 },
            locale: 'pt-BR'
        });
        
        const page = await context.newPage();
        
        // Simular cabeçalhos reais para evitar bloqueios de Cloudflare
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/'
        });

        try {
            // Ir para a página do produto (timeout de 45 segundos)
            await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
            
            // Aguardar 4 segundos para garantir renderização completa dos scripts client-side
            await page.waitForTimeout(4000);
            
            // 💡 EXTRAÇÃO SUPER OTIMIZADA: Captura apenas o texto renderizado visível, eliminando todas as tags HTML!
            // Reduz o uso de tokens na API do Gemini em até 95% e acelera muito o processamento.
            const textoPagina = await page.evaluate(() => document.body.innerText);
            
            console.log(`📄 Texto limpo da página capturado. Tamanho: ${textoPagina.length} caracteres.`);
            
            if (!textoPagina || textoPagina.length < 200) {
                throw new Error("Página carregada está vazia ou bloqueada pelo site.");
            }

            // Prompt estratégico para extração de preços estruturados do BoaDica com o Gemini 2.5 Flash
            const prompt = `
            Você é um analisador sintático de e-commerce e inteligência de mercado altamente preciso especializado no agregador de preços BoaDica.
            Sua missão é extrair todos os preços do produto e os dados das respectivas lojas físicas a partir do texto renderizado da página fornecido abaixo.
            
            URL do produto: ${link.url}
            
            REGRAS DE EXTRAÇÃO DO BOADICA:
            1. O BoaDica lista o produto de diversas lojas físicas diferentes com seus respectivos bairros e cidades.
            2. Extraia TODOS os preços de venda válidos listados no texto.
            3. Para cada preço, identifique:
               - O Nome da Loja física.
               - O Bairro onde a loja está localizada.
               - A Cidade onde a loja está localizada.
            4. No campo 'loja_nome', formate as informações obrigatoriamente no seguinte padrão: "Nome da Loja (Bairro - Cidade)".
               Exemplo: se a loja for "InfoBox", o bairro for "Centro" e a cidade for "Rio de Janeiro", formate como "InfoBox (Centro - Rio de Janeiro)".
            5. Ignore preços de outros produtos, fretes ou anúncios.
            6. Retorne estritamente um objeto JSON válido, sem cercas de markdown (\`\`\`json) ou textos explicativos, no seguinte formato:
            {
              "precos": [
                { "loja_nome": "Nome da Loja (Bairro - Cidade)", "preco": 1499.90 }
              ]
            }
            
            TEXTO RENDERIZADO DA PÁGINA:
            ${textoPagina}
            `;
            
            console.log('🤖 Enviando texto para a API do Gemini...');
            const responseGemini = await model.generateContent(prompt);
            let responseText = responseGemini.response.text().trim();
            
            // Tratar possíveis cercas de marcação markdown que o Gemini possa retornar mesmo com as instruções
            if (responseText.startsWith('```json')) {
                responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
            } else if (responseText.startsWith('```')) {
                responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
            }
            
            console.log('📥 Resposta do Gemini recebida.');
            const resultado = JSON.parse(responseText);
            
            if (resultado && resultado.precos && resultado.precos.length > 0) {
                console.log(`✅ Sucesso! Extraídos ${resultado.precos.length} preço(s) do BoaDica. Salvando no banco...`);
                
                for (const item of resultado.precos) {
                    // Converter preço para float puro e tratar formatações brasileiras (ex: "R$ 1.500,00" -> 1500.00)
                    let precoNumerico = 0;
                    if (typeof item.preco === 'string') {
                        precoNumerico = parseFloat(item.preco.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
                    } else {
                        precoNumerico = parseFloat(item.preco);
                    }
                    
                    if (isNaN(precoNumerico) || precoNumerico <= 0) {
                        console.warn(`⚠️ Preço inválido ignorado: ${item.preco} para a loja ${item.loja_nome}`);
                        continue;
                    }
                    
                    // Salvar no Supabase
                    const { error: dbErr } = await supabase
                        .from('produto_precos_historico')
                        .insert({
                            link_id: link.id,
                            loja_nome: item.loja_nome || "BoaDica",
                            preco: precoNumerico
                        });
                        
                    if (dbErr) {
                        console.error(`   ❌ Erro ao salvar preço (${item.loja_nome}):`, dbErr.message);
                    } else {
                        console.log(`   - Loja: ${item.loja_nome} | Preço: R$ ${precoNumerico.toFixed(2)}`);
                    }
                }
            } else {
                console.warn('⚠️ O Gemini não encontrou preços válidos no texto da página.');
            }
            
        } catch (err) {
            console.error(`❌ Falha no processamento deste link:`, err.message);
        } finally {
            await context.close();
        }
    };

    // 5. Executar em lote com limite de concorrência
    await executarEmLote(links, LIMITE_CONCORRENCIA, processarLink);
    
    await browser.close();
    console.log('\n🏁 Processamento completo finalizado com sucesso.');
}

rodarMonitoramento();
