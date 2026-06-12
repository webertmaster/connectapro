// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// ponto.js - Relógio de Ponto Integrado ao Firebase (MULTI-TENANT ATIVO)
// ==========================================

let pontosGlobais = []; // Guarda a lista da nuvem

function atualizarSelectsEquipe() {
    // Agora ele tenta puxar da variável global equipeGlobais se ela existir (carregada no equipe.js)
    let equipe = [];
    if (typeof equipeGlobais !== 'undefined' && equipeGlobais.length > 0) {
        equipe = equipeGlobais;
    } else {
        equipe = JSON.parse(localStorage.getItem('equipe')) || [];
    }
    
    const selectPonto = document.getElementById('pontoNome');
    const filtroPonto = document.getElementById('filtroFuncionarioPonto');
    
    if(selectPonto) {
        selectPonto.innerHTML = '<option value="" disabled selected>Selecione o seu Nome</option>';
        equipe.forEach(f => {
            selectPonto.innerHTML += `<option value="${f.nome}">${f.nome} (${f.cargo})</option>`;
        });
    }
    
    if(filtroPonto) {
        filtroPonto.innerHTML = '<option value="" disabled selected>Selecione o Funcionário</option>';
        equipe.forEach(f => {
            filtroPonto.innerHTML += `<option value="${f.nome}">${f.nome}</option>`;
        });
    }
}

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (FIREBASE COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    atualizarSelectsEquipe();

    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }
    
    if(typeof db !== 'undefined') {
        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("ponto").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            pontosGlobais = [];
            snapshot.forEach((doc) => {
                let p = doc.data();
                p.id = doc.id;
                pontosGlobais.push(p);
            });
            
            // 3. Ordena localmente (evita erro de índice duplo no Firebase)
            pontosGlobais.sort((a, b) => b.timestamp - a.timestamp);

            mostrarPontos();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

// ==========================================
// 2. REGISTRAR PONTO NA NUVEM
// ==========================================
function registrarPonto(tipo) {
    const nomeSelect = document.getElementById('pontoNome');
    const nome = nomeSelect.value;

    if (!nome) {
        alert('⚠️ Acesso Negado: Selecione o seu nome na lista antes de bater o ponto!');
        return;
    }

    // Trava os botões para evitar clique duplo enquanto salva
    const botoes = document.querySelectorAll("#ponto .btn");
    botoes.forEach(b => b.style.pointerEvents = "none");

    const dataHora = new Date();

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");
    
    const registro = {
        nome: nome,
        tipo: tipo, 
        data: dataHora.toISOString().split('T')[0], 
        hora: dataHora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit', second:'2-digit'}), 
        timestamp: dataHora.getTime(),
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    db.collection("ponto").add(registro).then(() => {
        const primeiroNome = nome.split(' ')[0];
        alert(`✅ Registro Efetuado na Nuvem!\n\n${tipo} gravada com sucesso para ${primeiroNome}.\n⏰ Horário cravado: ${registro.hora}`);
        nomeSelect.value = '';
    }).catch((err) => {
        alert("Erro ao registrar ponto: " + err);
    }).finally(() => {
        botoes.forEach(b => b.style.pointerEvents = "auto");
    });
}

// ==========================================
// 3. RENDERIZAR NA TELA
// ==========================================
function mostrarPontos() {
    const lista = document.getElementById('listaPontos');
    const telaPonto = document.getElementById('ponto');
    
    if (!lista || (telaPonto && telaPonto.style.display === 'none')) return;

    const filtroMes = document.getElementById('filtroMesPonto')?.value;
    const filtroFunc = document.getElementById('filtroFuncionarioPonto')?.value;

    lista.innerHTML = '';
    let filtrados = pontosGlobais; // Puxa direto da nuvem

    if (filtroMes) filtrados = filtrados.filter(p => p.data.startsWith(filtroMes));
    if (filtroFunc) filtrados = filtrados.filter(p => p.nome === filtroFunc);

    if (filtrados.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-clock" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum registro de ponto encontrado.</p></div>';
        return;
    }

    filtrados.forEach(p => {
        const dataFormatada = p.data.split('-').reverse().join('/'); 
        
        let corBadge = '#64748b';
        let iconeBadge = 'fa-fingerprint';
        
        const tipoRegistro = p.tipo || p.acao || 'Registro S/N';

        if(tipoRegistro === 'Entrada') { corBadge = '#10b981'; iconeBadge = 'fa-play'; }
        else if(tipoRegistro === 'Pausa Almoço') { corBadge = '#f59e0b'; iconeBadge = 'fa-pause'; }
        else if(tipoRegistro === 'Retorno Almoço') { corBadge = '#3b82f6'; iconeBadge = 'fa-rotate-right'; }
        else if(tipoRegistro === 'Saída') { corBadge = '#ef4444'; iconeBadge = 'fa-stop'; }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `5px solid ${corBadge}`;
        card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
        card.style.transition = '0.2s';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <span style="background: ${corBadge}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
                    <i class="fa-solid ${iconeBadge}"></i> ${tipoRegistro}
                </span>
                <strong style="font-size: 18px; color: #0f172a; letter-spacing: 1px; font-family: monospace;">${p.hora || '00:00:00'}</strong>
            </div>
            
            <h3 style="font-size: 15px; margin-bottom: 8px; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-id-badge" style="color: #64748b;"></i> ${p.nome || 'Usuário Desconhecido'}
            </h3>
            <p style="color: #64748b; font-size: 12px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-regular fa-calendar" style="color: #94a3b8;"></i> Data do Registro: ${dataFormatada}
            </p>
        `;
        
        card.onmouseover = () => card.style.transform = 'translateY(-2px)';
        card.onmouseout = () => card.style.transform = 'translateY(0)';
        
        lista.appendChild(card);
    });
}

// ==========================================
// 4. GERAR PDF INDIVIDUAL
// ==========================================
function gerarFolhaPontoIndividual() {
    const filtroMes = document.getElementById('filtroMesPonto').value;
    const filtroFunc = document.getElementById('filtroFuncionarioPonto').value;

    if (!filtroMes || !filtroFunc) {
        alert('⚠️ ATENÇÃO: Selecione o MÊS e o FUNCIONÁRIO para gerar a folha oficial.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const mesFormatado = filtroMes.split('-').reverse().join('/');
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`Folha de Ponto Digital (Auditoria de Nuvem)`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Funcionário: ${filtroFunc}`, 14, 28);
    doc.text(`Mês de Referência: ${mesFormatado}`, 14, 34);

    const filtrados = pontosGlobais.filter(p => p.data.startsWith(filtroMes) && p.nome === filtroFunc);

    if (filtrados.length === 0) {
        alert("Nenhum ponto registrado na NUVEM para este funcionário no mês selecionado.");
        return;
    }

    // Ordena do mais antigo para o mais novo no PDF
    filtrados.sort((a, b) => a.timestamp - b.timestamp);

    const dados = filtrados.map(p => {
        const dataF = p.data.split('-').reverse().join('/');
        return [dataF, p.hora || '--:--', p.tipo || p.acao || 'Registro S/N'];
    });

    doc.autoTable({
        startY: 42,
        head: [['Data', 'Horário Gravado', 'Tipo de Registro']],
        body: dados,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save(`Auditoria_Ponto_${filtroFunc.replace(/\s+/g, '_')}_${filtroMes}.pdf`);
}