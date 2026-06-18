// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// app.js - Núcleo do Sistema (Menu, Relógio e Dashboard)
// ==========================================

// --- CONTROLE DE MENUS E TELAS ---
function trocarTela(telaId) {
    // Esconde todas as telas
    document.querySelectorAll('.tela').forEach(tela => tela.classList.remove('ativa'));
    
    // Tira o estilo de "selecionado" de todos os botões do menu
    document.querySelectorAll('.menu button').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.borderLeftColor = 'transparent';
        btn.style.color = '#94a3b8';
    });

    // Mostra a tela solicitada
    const telaSelecionada = document.getElementById(telaId);
    if(telaSelecionada) telaSelecionada.classList.add('ativa');
    
    // Pinta o botão do menu correspondente
    const btnAtivo = document.getElementById('menu-' + telaId);
    if(btnAtivo) {
        btnAtivo.style.background = 'rgba(59, 130, 246, 0.1)';
        btnAtivo.style.borderLeftColor = '#3b82f6';
        btnAtivo.style.color = '#fff';
    }

    // Gatilhos específicos ao trocar de tela
    if(telaId === 'dashboard') atualizarDashboard();
    
    // Aquela blindagem que fizemos para a garagem carregar corretamente:
    if(telaId === 'veiculos' && typeof mostrarVeiculos === 'function') mostrarVeiculos();
}

// --- RELÓGIO EM TEMPO REAL ---
function atualizarRelogio() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutos = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    document.getElementById('relogio').textContent = `${horas}:${minutos}:${segundos}`;
}
setInterval(atualizarRelogio, 1000);

// --- MODO ESCURO (DARK MODE) ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
}

// --- DASHBOARD (NUVEM + LOCAL) ---
function atualizarDashboard() {
    // Pega a credencial do prédio
    const meuCondominio = localStorage.getItem("condominioId");

    // Trava de segurança da Nuvem
    if (!meuCondominio || typeof db === 'undefined') {
        console.log("⏳ Aguardando Firebase para atualizar a Dashboard...");
        return;
    }

    // ==========================================
    // ☁️ 1. MÓDULOS BLINDADOS (DIRETO DA NUVEM EM TEMPO REAL)
    // ==========================================
    
    // Encomendas Pendentes
    db.collection("encomendas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pendentes = 0;
        snap.forEach(doc => { 
            let enc = doc.data();
            if (!enc.excluido && enc.status !== 'Entregue') pendentes++; 
        });
        if(document.getElementById('dash-encomendas')) document.getElementById('dash-encomendas').textContent = pendentes;
    });

    // Veículos
    db.collection("veiculos").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-veiculos')) document.getElementById('dash-veiculos').textContent = total;
    });

    // Moradores
    db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-moradores')) document.getElementById('dash-moradores').textContent = total;
    });

    // Plantão / Passagens
    db.collection("passagem").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-plantao')) document.getElementById('dash-plantao').textContent = total;
    });

    // Ocorrências Abertas
    db.collection("ocorrencias").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let abertas = 0;
        snap.forEach(doc => { 
            let oco = doc.data();
            if (!oco.excluido && oco.status !== '🟢 Resolvido' && oco.status !== 'Resolvido') abertas++; 
        });
        if(document.getElementById('dash-ocorrencias')) document.getElementById('dash-ocorrencias').textContent = abertas;
    });

    // Reservas Agendadas para Hoje (Nuvem)
    db.collection("reservas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let reservasHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0]; // Pega a data exata de hoje
        
        snap.forEach(doc => { 
            let r = doc.data();
            // Verifica se a reserva é para hoje e não foi excluída/arquivada
            if (!r.excluido && r.data === hojeStr) reservasHj++; 
        });
        
        if(document.getElementById('dash-reservas')) document.getElementById('dash-reservas').textContent = reservasHj;
    });

    // Comunicados Ativos (Nuvem)
    db.collection("comunicados").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let ativos = 0;
        snap.forEach(doc => { 
            let com = doc.data();
            // Conta apenas se não estiver excluído e se o status NÃO for Resolvido
            if (!com.excluido && !com.status.includes('Resolvido')) ativos++; 
        });
        if(document.getElementById('dash-comunicados')) document.getElementById('dash-comunicados').textContent = ativos;
    });

    // Gestão de Equipe (Nuvem)
    db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let totalEquipe = 0;
        // Como a exclusão é definitiva, basta contar quantos documentos voltaram
        snap.forEach(() => { totalEquipe++; });
        if(document.getElementById('dash-equipe')) document.getElementById('dash-equipe').textContent = totalEquipe;
    });

    // Controle de Ponto Hoje (Nuvem)
    db.collection("ponto").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pontosHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0];
        
        snap.forEach(doc => { 
            // Conta quantas batidas de ponto aconteceram apenas na data de hoje
            if (doc.data().data === hojeStr) pontosHj++; 
        });
        
        if(document.getElementById('dash-ponto')) document.getElementById('dash-ponto').textContent = pontosHj;
    });

}

// --- INICIALIZAÇÃO ---
window.onload = () => {
    atualizarRelogio();
    
    // Pequeno atraso (1.5s) para dar tempo do Firebase conectar antes de puxar a Dashboard
    setTimeout(atualizarDashboard, 1500);
    
    // Recupera o tema escuro se o usuário tiver salvo no turno anterior
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // ==========================================
    // MÁGICA DO NOME NA TELA INICIAL
    // ==========================================
    const nomeSalvo = localStorage.getItem("usuario_nome");
    if (nomeSalvo) {
        const primeiroNome = nomeSalvo.split(" ")[0]; 
        
        const elementoNome = document.getElementById("nomeFuncionarioLogado");
        if (elementoNome) {
            elementoNome.innerText = primeiroNome;
        }
    }
};
