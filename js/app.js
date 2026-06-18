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
            // Conta apenas se não estiver excluída e o status não for Entregue
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


    // ==========================================
    // 💾 2. MÓDULOS LOCAIS (Aguardando migração futura)
    // ==========================================
    const ocorrencias = JSON.parse(localStorage.getItem('ocorrencias')) || [];
    const reservas = JSON.parse(localStorage.getItem('reservas')) || [];
    const equipe = JSON.parse(localStorage.getItem('equipe')) || [];
    const pontos = JSON.parse(localStorage.getItem('pontos')) || [];
    const comunicados = JSON.parse(localStorage.getItem('comunicados')) || [];

    const hoje = new Date().toISOString().split('T')[0];
    
    const ocorrenciasAbertas = ocorrencias.filter(o => o.status !== '🟢 Resolvido').length;
    const reservasHoje = reservas.filter(r => r.data === hoje).length;
    const pontosHoje = pontos.filter(p => p.data === hoje).length;
    const comunicadosAtivos = comunicados.filter(c => c.status !== '🟢 Resolvido').length;

    if(document.getElementById('dash-ocorrencias')) document.getElementById('dash-ocorrencias').textContent = ocorrenciasAbertas;
    if(document.getElementById('dash-reservas')) document.getElementById('dash-reservas').textContent = reservasHoje;
    if(document.getElementById('dash-equipe')) document.getElementById('dash-equipe').textContent = equipe.length;
    if(document.getElementById('dash-ponto')) document.getElementById('dash-ponto').textContent = pontosHoje;
    if(document.getElementById('dash-comunicados')) document.getElementById('dash-comunicados').textContent = comunicadosAtivos;
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
        // Pega só o primeiro nome (Ex: "Paulo Porteiro" vira "Paulo")
        const primeiroNome = nomeSalvo.split(" ")[0]; 
        
        const elementoNome = document.getElementById("nomeFuncionarioLogado");
        if (elementoNome) {
            elementoNome.innerText = primeiroNome;
        }
    }
};
