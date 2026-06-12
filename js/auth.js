// ==========================================
// CONNECTA PRO - O SEGURANÇA DA PORTA
// auth.js - Controle de Acesso e Hierarquia
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICA O CRACHÁ DE ACESSO
    const isLogado = localStorage.getItem("connectapro_logado");
    const paginaAtual = window.location.pathname;

    // Se NÃO tem crachá e NÃO está na tela de login, chuta para fora!
    if (!isLogado && !paginaAtual.includes('login.html')) {
        window.location.href = 'login.html';
        return; // Trava a execução do resto da página na hora
    }

    // Se JÁ TEM crachá e tenta abrir a tela de login, joga direto pro painel
    if (isLogado && paginaAtual.includes('login.html')) {
        window.location.href = 'index.html';
        return;
    }

    // 2. SE ESTIVER DENTRO DO SISTEMA, APLICA AS REGRAS DE HIERARQUIA
    if (isLogado && !paginaAtual.includes('login.html')) {
        aplicarRegrasDeCargo();
        
        // (Opcional) Mostra o nome de quem logou no topo da tela, se você tiver um <span id="nomeLogado">
        const nome = localStorage.getItem("usuario_nome");
        const elementoNome = document.getElementById('nomeLogado');
        if (elementoNome && nome) elementoNome.innerText = `Olá, ${nome}`;
    }
});

// ==========================================
// MÁGICA DA HIERARQUIA (SÍNDICO VS PORTEIRO)
// ==========================================
function aplicarRegrasDeCargo() {
    const cargo = localStorage.getItem("usuario_cargo");
    
    // Se for o Nível 2 (Operacional / Porteiro), escondemos as abas do chefe
    if (cargo === 'operacional') {
        
        // Ajuste aqui os IDs ou Classes que você usa no seu menu lateral para essas abas
        const menuEquipe = document.querySelector('[onclick*="equipe"]'); 
        const menuRelatorios = document.querySelector('[onclick*="relatorios"]'); 

        // Se encontrar os botões no HTML, faz eles sumirem
        if (menuEquipe) menuEquipe.style.display = 'none';
        if (menuRelatorios) menuRelatorios.style.display = 'none';
        
        console.log("🔒 Modo Operacional ativado: Menus sensíveis ocultados.");
    } else {
        console.log("🔓 Modo Master ativado: Acesso total liberado.");
    }
}

// ==========================================
// BOTÃO DE SAIR (LOGOUT)
// ==========================================
function deslogarSistema() {
    if(confirm("Deseja realmente sair do sistema?")) {
        // Rasga o crachá e limpa a memória
        localStorage.removeItem("connectapro_logado");
        localStorage.removeItem("usuario_id");
        localStorage.removeItem("usuario_nome");
        localStorage.removeItem("usuario_cargo");
        localStorage.removeItem("condominioId");

        // Chuta de volta pro Login
        window.location.href = 'login.html';
    }
}