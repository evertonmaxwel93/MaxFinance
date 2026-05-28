# MaxFinance

MaxFinance é um sistema completo de gestão financeira e de negócios, desenvolvido para ser simples, moderno e eficiente. Focado em fluxo de caixa pessoal e empresarial, o sistema integra ferramentas robustas para controle ponta a ponta das operações com um design limpo e focado na usabilidade de alta performance.

---

## 🚀 Funcionalidades Principais

- **📊 Dashboard Financeiro:** Acompanhe o fluxo de caixa, saldo atual e balanço com totalizadores automáticos. Filtros flexíveis por período (Ano, Mês, Dia e Semana) ajudam a analisar as finanças de forma macro e micro. Permite registrar entradas/saídas e o controle de parcelamentos.
- **📦 Gestão de Estoque:** Cadastre produtos, defina custos e preços de venda, configure alertas de estoque baixo (indicadores visuais dinâmicos) e acompanhe o lucro potencial do seu inventário com pesquisa rápida.
- **🛒 Controle de Compras:** Registre aquisições com fornecedores selecionando-os diretamente de uma lista suspensa de parceiros cadastrados. As compras alimentam automaticamente as quantidades no estoque e geram os lançamentos de saída correspondentes no Financeiro.
- **💰 Gestão de Vendas:** Registre vendas de produtos, deduzindo-os automaticamente do estoque e registrando a entrada no fluxo de caixa. O formulário conta com seleção dinâmica de clientes cadastrados e trava de segurança para impedir estoque negativo.
- **👥 Clientes e Fornecedores Integrados:** Gerencie seus contatos corporativos e parceiros diretamente na aba de **Ajustes** através de modais inteligentes. Totalmente integrado com as abas de Compras e Vendas para permitir um cadastro super rápido (`+`) no momento do lançamento, atualizando e selecionando automaticamente a nova entidade sem fechar o formulário.
- **📱 Experiência Mobile Nativa:** Interface reconstruída para dispositivos móveis com um **Dock de Navegação Inferior Premium** (estilo iOS/Android) com efeito de *glassmorphism* (`backdrop-blur`). Correção do incômodo zoom automático de foco de formulários no iOS (enforçando `16px` para inputs) e melhorias na área de toque.
- **📈 Relatórios e Analytics:** Aba dedicada para visualização mensal e anualizada de subcategorias de movimentações e ranking dos top 10 produtos mais vendidos (filtrável por quantidade, faturamento bruto ou margem de lucro líquido).
- **🔔 Notificações Push PWA:** Sistema inteligente de notificações nativas no navegador que alertam o usuário logo após o login sobre contas pendentes vencendo hoje, amanhã ou que já estão atrasadas.
- **💾 Backup e Restauração:** Exporte ou importe seus dados financeiros no formato JSON.
- **📄 Exportação para Excel:** Exporte tabelas facilmente em `.xlsx` com a biblioteca SheetJS.
- **🔒 Autenticação Segura:** Autenticação e proteção das informações de nível de linha (RLS) via Supabase, garantindo que cada usuário acesse somente seus próprios dados.

---

## 🛠️ Como Funciona

A arquitetura do sistema baseia-se num formato *Single Page Application* (SPA) contido inteiramente no `index.html`.
O armazenamento de dados, autenticação de usuários e Regras de Segurança (RLS) são garantidos pela integração direta via API do **Supabase**.

1. **Clientes e Fornecedores:** Cadastre seus clientes e parceiros fornecedores para alimentar as listas de compras e vendas.
2. **Produtos e Estoque:** Cadastre as informações base dos itens que você comercializa.
3. **Compras:** Sempre que receber novas mercadorias, faça o registro na aba de Compras para abastecer o estoque e contabilizar custos.
4. **Vendas:** Conforme as vendas acontecem, registre-as para dar baixa do estoque e atualizar suas entradas monetárias.

---

## 🗄️ Estruturação do Banco de Dados (Supabase SQL)

Para que os módulos de **Clientes** e **Fornecedores** funcionem perfeitamente, é necessário aplicar as seguintes migrações de banco de dados através do editor SQL do seu console Supabase:

### 1. Tabela de Clientes
```sql
create table public.clientes (
  id uuid default gen_random_uuid() not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default auth.uid() not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  documento text,
  endereco text
);

-- Habilitar RLS
alter table public.clientes enable row level security;

-- Criar Políticas de Acesso
create policy "Usuários podem gerenciar seus próprios clientes" 
on public.clientes 
for all 
using (auth.uid() = user_id);
```

### 2. Tabela de Fornecedores
```sql
create table public.fornecedores (
  id uuid default gen_random_uuid() not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default auth.uid() not null references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  email text,
  documento text,
  endereco text
);

-- Habilitar RLS
alter table public.fornecedores enable row level security;

-- Criar Políticas de Acesso
create policy "Usuários podem gerenciar seus próprios fornecedores" 
on public.fornecedores 
for all 
using (auth.uid() = user_id);
```

### 3. Tabela de Mapeamento XML de Produtos
```sql
create table public.xml_produto_mapeamento (
  id uuid default gen_random_uuid() not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default auth.uid() not null references auth.users(id) on delete cascade,
  fornecedor_cnpj text not null,
  nome_produto_xml text not null,
  produto_id uuid not null references public.produtos(id) on delete cascade
);

-- Habilitar RLS
alter table public.xml_produto_mapeamento enable row level security;

-- Criar Políticas de Acesso
create policy "Usuários podem gerenciar seus próprios mapeamentos XML" 
on public.xml_produto_mapeamento 
for all 
using (auth.uid() = user_id);
```

---

## 💻 Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | HTML5, TailwindCSS, FontAwesome |
| Backend / Database | Supabase (PostgreSQL, Auth, RLS) |
| Exportação | SheetJS (`.xlsx`) |
| PWA | Service Worker, Manifest, Push Notifications |

---

## 📂 Estrutura do Projeto

```
MaxFinance/
├── index.html        # Aplicação principal (SPA)
├── landing.html      # Landing page institucional
├── style.css         # Estilos customizados
├── manifest.json     # Configuração PWA
├── sw.js             # Service Worker
├── js/               # Módulos JavaScript
├── icons/            # Ícones da aplicação
└── cron/             # Scripts de rotina
```

---

*MaxFinance — Simplificando a sua gestão.*
