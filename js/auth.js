async function loginComGoogle() { 
    await clienteSupabase.auth.signInWithOAuth({ provider: 'google' }); 
}

async function sair() { 
    try {
        await clienteSupabase.auth.signOut(); 
        mostrarToast("Sessão encerrada com sucesso!", "info");
    } catch (err) {
        mostrarToast("Erro ao sair da conta: " + err.message, "error");
    } finally {
        userAtual = null;
        // Limpa o local storage de chaves supabase apenas para garantir que não restaure
        for (let key in localStorage) {
            if (key.startsWith('sb-')) {
                localStorage.removeItem(key);
            }
        }
        window.location.reload(); 
    }
}

async function verificarSessao() {
    try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error) throw error;
        if (session) {
            userAtual = session.user;
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('app-section').classList.remove('hidden');
            document.getElementById('app-section').classList.add('flex');
            document.getElementById('user-info').textContent = session.user.email;
            const mobileUserInfo = document.getElementById('mobile-user-info');
            if (mobileUserInfo) mobileUserInfo.textContent = session.user.email;
            
            if (typeof atualizarStatusNotificacao === 'function') atualizarStatusNotificacao();
            
            if (typeof initLojas === 'function') {
                await initLojas();
            } else {
                await carregarSubcategoriasBanco();
                atualizarTudo();
                await carregarClientes();
                await carregarFornecedores();
                await carregarTransacoesGlobais();
                initRelatorios();
            }
            if (typeof verificarNotificacoesPush === 'function') {
                setTimeout(verificarNotificacoesPush, 3000);
            }
        } else {
            userAtual = null;
            document.getElementById('login-section').classList.remove('hidden');
            document.getElementById('app-section').classList.add('hidden');
            document.getElementById('app-section').classList.remove('flex');
        }
    } catch (err) {
        mostrarToast("Erro ao verificar sessão: " + err.message, "error");
    }
}

async function loginComEmail(email, senha) {
    if (typeof mostrarLoading === 'function') mostrarLoading();
    try {
        const { data, error } = await clienteSupabase.auth.signInWithPassword({
            email,
            password: senha
        });
        if (error) throw error;
        if (typeof mostrarToast === 'function') mostrarToast("Sessão iniciada com sucesso!", "success");
    } catch (err) {
        if (typeof mostrarToast === 'function') mostrarToast("Erro ao entrar: " + err.message, "error");
    } finally {
        if (typeof ocultarLoading === 'function') ocultarLoading();
    }
}

async function cadastrarComEmail(email, senha) {
    if (typeof mostrarLoading === 'function') mostrarLoading();
    try {
        const { data, error } = await clienteSupabase.auth.signUp({
            email,
            password: senha
        });
        if (error) throw error;
        if (typeof mostrarToast === 'function') mostrarToast("Conta criada! Se necessário, confirme o link no seu email.", "success");
    } catch (err) {
        if (typeof mostrarToast === 'function') mostrarToast("Erro ao cadastrar: " + err.message, "error");
    } finally {
        if (typeof ocultarLoading === 'function') ocultarLoading();
    }
}
