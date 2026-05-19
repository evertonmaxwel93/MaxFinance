# MaxFinance

MaxFinance é um aplicativo completo de gestão financeira e de negócios, desenvolvido para ser simples, moderno e eficiente. Originalmente focado em controle de fluxo de caixa pessoal e empresarial, o sistema agora integra ferramentas robustas para controle ponta a ponta das operações.

## Funcionalidades Principais

- **Dashboard Financeiro:** Acompanhe o fluxo de caixa, saldo atual e balanço (com filtros por ano, mês, dia e semana). Permite registro de entradas e saídas e o controle de parcelamentos.
- **Gestão de Estoque:** Cadastre produtos, defina custos e preços de venda, e acompanhe o lucro potencial do seu inventário.
- **Controle de Compras:** Registre aquisições com fornecedores. As compras alimentam automaticamente as quantidades no estoque e geram os lançamentos de saída correspondentes no Financeiro.
- **Gestão de Vendas:** Registre vendas de produtos, deduzindo-os automaticamente do estoque e registrando a entrada no seu fluxo de caixa Financeiro. Trava de segurança para impedir vendas que deixem o estoque negativo.
- **Backup e Restauração:** Exporte ou importe seus dados financeiros no formato JSON.
- **Exportação para Excel:** Exporte tabelas facilmente em `.xlsx`.
- **Autenticação Segura:** Autenticação via Google e persistência na nuvem utilizando Supabase.

## Como Funciona

A arquitetura do projeto baseia-se num sistema *Single Page Application* contido inteiramente no `index.html`. 
O armazenamento de dados, autenticação de usuários e Regras de Nível de Linha (RLS) são garantidos pela integração direta via API do **Supabase**.

1. **Produtos e Estoque:** Cadastre as informações base dos itens que você comercializa.
2. **Compras:** Sempre que receber novas mercadorias, faça o registro na aba de Compras para abastecer o sistema e contabilizar os custos.
3. **Vendas:** Conforme as vendas acontecem, registre-as para dar baixa do estoque e atualizar suas entradas monetárias.

O sistema faz o link automático (a "ponte") das movimentações de estoque com o fluxo de caixa sem exigir entradas manuais repetitivas.

## Tecnologias Utilizadas

- **Frontend:** HTML5, TailwindCSS, FontAwesome.
- **Backend/Database:** Supabase (PostgreSQL, Auth).
- **Scripts/Exportação:** SheetJS para `.xlsx`.

---
*MaxFinance - Simplificando a sua gestão.*
