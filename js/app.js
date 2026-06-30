// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// app.js - Núcleo do Sistema (Menu, Relógio e Dashboard)
// ==========================================

// --- MOTOR UNIVERSAL DO DOMINÓ (COMPARTILHADO PARA TODO O PRÉDIO) ---
let memoriaDominóMoradores = []; 

async function carregarApartamentosNoSelect(idSelectDestino) {
    const meuCondominio = localStorage.getItem("condominioId");
    const select = document.getElementById(idSelectDestino);
    if (!meuCondominio || !select || typeof db === 'undefined') return;

    try {
        const snap = await db.collection("moradores")
            .where("condominioId", "==", meuCondominio)
            .where("excluido", "==", false)
            .get();

        memoriaDominóMoradores = [];
        select.innerHTML = '<option value="">Selecione o Apto...</option>';

        snap.forEach(doc => memoriaDominóMoradores.push(doc.data()));

        // Organiza em ordem alfabética bonita na tela (101 A, 101 B, 102 A...)
        memoriaDominóMoradores.sort((a, b) => (a.apto || "").localeCompare(b.apto || ""));

        memoriaDominóMoradores.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m.apto;
            opt.textContent = `Apto ${m.apto} - ${m.nome}`; // Exibe: "Apto 101 - Carlos"
            select.appendChild(opt);
        });

        console.log(`✅ Select [${idSelectDestino}] recheado com ${memoriaDominóMoradores.length} apartamentos!`);

    } catch (e) {
        console.error("Erro ao carregar lista de apartamentos no motor universal:", e);
    }
}

// --- CONTROLE UNIVERSAL DE MENUS E TELAS (BLINDADO) ---
function trocarTela(telaId) {
    // Esconde todas as telas do sistema de forma limpa
    document.querySelectorAll('.content .tela').forEach(tela => {
        tela.classList.remove('ativa');
    });
    
    // Tira o estilo de "selecionado" de todos os botões do menu
    document.querySelectorAll('.menu button').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.borderLeftColor = 'transparent';
        btn.style.color = '#94a3b8';
    });

    // Mostra a tela solicitada se ela existir no HTML
    const telaSelecionada = document.getElementById(telaId);
    if(telaSelecionada) {
        telaSelecionada.classList.add('ativa');
    } else {
        console.error(`🚨 Erro de Navegação: A tela com o ID '${telaId}' não existe no HTML!`);
    }
    
    // Pinta o botão do menu correspondente
    const btnAtivo = document.getElementById('menu-' + telaId);
    if(btnAtivo) {
        btnAtivo.style.background = 'rgba(59, 130, 246, 0.1)';
        btnAtivo.style.borderLeftColor = '#3b82f6';
        btnAtivo.style.color = '#fff';
    }

    // Gatilhos específicos ao trocar de tela
    if(telaId === 'dashboard') atualizarDashboard();
    
    // Blindagem para a garagem carregar corretamente
    if(telaId === 'veiculos' && typeof mostrarVeiculos === 'function') mostrarVeiculos();

    // 🚀 INJEÇÃO DE GATILHOS DOMINÓ: Força os selects a atualizarem os moradores na hora que abre a aba!
    if(telaId === 'delivery' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('delApto');
    if(telaId === 'encomendas' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('encApto');
    if(telaId === 'ocorrencias' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('ocoApto');
    if(telaId === 'reservas' && typeof carregarApartamentosNoSelect === 'function') carregarApartamentosNoSelect('aptoReserva');
}

// --- RELÓGIO EM TEMPO REAL ---
function atualizarRelogio() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, '0');
    const minutes = String(agora.getMinutes()).padStart(2, '0');
    const segundos = String(agora.getSeconds()).padStart(2, '0');
    const elRelogio = document.getElementById('relogio');
    if(elRelogio) elRelogio.textContent = `${horas}:${minutes}:${segundos}`;
}
setInterval(atualizarRelogio, 1000);

// --- MOTO ESCURO (DARK MODE) ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
}

// --- DASHBOARD (NUVEM EM TEMPO REAL) ---
function atualizarDashboard() {
    // Pega a credencial do prédio
    const meuCondominio = localStorage.getItem("condominioId");

    // Trava de segurança da Nuvem
    if (!meuCondominio || typeof db === 'undefined') {
        console.log("⏳ Aguardando Firebase para atualizar a Dashboard...");
        return;
    }

    // ==========================================
    // ☁️ MÓDULOS BLINDADOS (DIRETO DA NUVEM EM TEMPO REAL)
    // ==========================================
    
    // 1. Encomendas Pendentes
    db.collection("encomendas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pendentes = 0;
        snap.forEach(doc => { 
            let enc = doc.data();
            if (!enc.excluido && enc.status !== 'Entregue') pendentes++; 
        });
        if(document.getElementById('dash-encomendas')) document.getElementById('dash-encomendas').textContent = pendentes;
    });

    // 2. CONTADOR DE DELIVERIES PENDENTES HOJE
    db.collection("delivery").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let delPendentes = 0;
        snap.forEach(doc => {
            let d = doc.data();
            if (!d.excluido && (d.status === "Aguardando Morador" || d.status === "Aguardando")) {
                delPendentes++;
            }
        });
        if(document.getElementById('dash-delivery')) document.getElementById('dash-delivery').textContent = delPendentes;
    });

    // 3. Veículos
    db.collection("veiculos").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-veiculos')) document.getElementById('dash-veiculos').textContent = total;
    });

    // 4. Moradores
    db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-moradores')) document.getElementById('dash-moradores').textContent = total;
    });

    // 5. Plantão / Passagens
    db.collection("passagem").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let total = 0;
        snap.forEach(doc => { if (!doc.data().excluido) total++; });
        if(document.getElementById('dash-plantao')) document.getElementById('dash-plantao').textContent = total;
    });

    // 6. Ocorrências Abertas
    db.collection("ocorrencias").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let abertas = 0;
        snap.forEach(doc => { 
            let oco = doc.data();
            if (!oco.excluido && oco.status !== '🟢 Resolvido' && oco.status !== 'Resolvido') abertas++; 
        });
        if(document.getElementById('dash-ocorrencias')) document.getElementById('dash-ocorrencias').textContent = abertas;
    });

    // 7. Reservas Agendadas para Hoje
    db.collection("reservas").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let reservasHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0];
        snap.forEach(doc => { 
            let r = doc.data();
            if (!r.excluido && r.data === hojeStr) reservasHj++; 
        });
        if(document.getElementById('dash-reservas')) document.getElementById('dash-reservas').textContent = reservasHj;
    });

    // 8. Comunicados Ativos
    db.collection("comunicados").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let ativos = 0;
        snap.forEach(doc => { 
            let com = doc.data();
            if (!com.excluido && !com.status.includes('Resolvido')) ativos++; 
        });
        if(document.getElementById('dash-comunicados')) document.getElementById('dash-comunicados').textContent = ativos;
    });

    // 9. Gestão de Equipe
    db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let totalEquipe = 0;
        snap.forEach(() => { totalEquipe++; });
        if(document.getElementById('dash-equipe')) document.getElementById('dash-equipe').textContent = totalEquipe;
    });

    // 10. Controle de Ponto Hoje
    db.collection("ponto").where("condominioId", "==", meuCondominio).onSnapshot(snap => {
        let pontosHj = 0;
        const hojeStr = new Date().toISOString().split('T')[0];
        snap.forEach(doc => { 
            if (doc.data().data === hojeStr) pontosHj++; 
        });
        if(document.getElementById('dash-ponto')) document.getElementById('dash-ponto').textContent = pontosHj;
    });
}

// --- INICIALIZAÇÃO ---
window.onload = () => {
    atualizarRelogio();
    
    // Pequeno atraso (1.5s) para garantir a conexão estável com o Firestore
    setTimeout(atualizarDashboard, 1500);
    
    // Recupera o tema escuro se o usuário tiver salvo no turno anterior
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }

    // MÁGICA DO NOME NA TELA INICIAL
    const nomeSalvo = localStorage.getItem("usuario_nome");
    const elementoNome = document.getElementById("nomeFuncionarioLogado");

    if (elementoNome) {
        if (nomeSalvo && nomeSalvo !== "undefined" && nomeSalvo !== "null") {
            elementoNome.innerText = nomeSalvo.split(" ")[0];
        } else {
            elementoNome.innerText = "Guerreiro"; 
        }
    }
};
