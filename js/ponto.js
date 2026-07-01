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
// 3. RENDERIZAR E FILTRAR NA TELA
// ==========================================

// 🚀 GATILHO DO BOTÃO "FILTRAR NA TELA"
function filtrarPorSeletores() {
    mostrarPontos();
}

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
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-clock" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum registro de ponto encontrado para este filtro.</p></div>';
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
// MÁQUINA DE GERAR PDF DE PONTO (1 PÁGINA COM ASSINATURA E CPF)
// ==========================================
async function gerarFolhaPontoIndividual(param1 = null, param2 = null) {
    
    let funcionarioNome = document.getElementById("filtroFuncionarioPonto")?.value;
    let mesAno = document.getElementById("filtroMesPonto")?.value; 

    // 🚀 LÓGICA DE BLINDAGEM: Se o parâmetro for texto, veio da aba de relatórios!
    if (typeof param1 === 'string' && param1.trim() !== '') {
        funcionarioNome = param1;
        mesAno = param2;
    }

    if (!funcionarioNome || !mesAno) {
        alert("⚠️ Selecione o Mês e o Funcionário para gerar o PDF.");
        return;
    }

    const [ano, mes] = mesAno.split('-');
    const meuCondominio = localStorage.getItem("condominioId");
    const diasNoMes = new Date(ano, mes, 0).getDate();

    // Controle visual do botão "Gerando..."
    let btnGerar = null;
    let textoOriginal = "";
    
    if (param1 && param1.currentTarget) {
        btnGerar = param1.currentTarget;
    } else if (typeof event !== 'undefined' && event && event.currentTarget) {
        btnGerar = event.currentTarget;
    }

    if (btnGerar) {
        textoOriginal = btnGerar.innerHTML;
        btnGerar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Gerando...';
        btnGerar.style.pointerEvents = 'none';
    }

    try {
        let cargo = "Não informado";
        let cpf = "Não informado";
        let assinatura = null;
        
        // Busca Cargo, CPF e Assinatura na Equipe
        const equipeSnap = await db.collection("equipe")
            .where("condominioId", "==", meuCondominio)
            .where("nome", "==", funcionarioNome)
            .get();

        if (!equipeSnap.empty) {
            let dadosEquipe = equipeSnap.docs[0].data();
            cargo = dadosEquipe.cargo || "Não informado";
            cpf = dadosEquipe.cpf || "______________________"; 
            assinatura = dadosEquipe.assinatura || null; 
        }

        // Busca pontos
        const pontoSnap = await db.collection("ponto")
            .where("condominioId", "==", meuCondominio)
            .where("nome", "==", funcionarioNome)
            .get();

        let registrosMes = {};
        pontoSnap.forEach(doc => {
            let p = doc.data();
            if (p.data && p.data.startsWith(mesAno)) {
                let dia = p.data.split('-')[2];
                if(!registrosMes[dia]) registrosMes[dia] = {};
                registrosMes[dia][p.tipo] = p.hora; 
            }
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cabeçalho Enxuto
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("CONDO UP - REGISTRO DE PONTO", 105, 15, null, null, "center");
        doc.setLineWidth(0.5);
        doc.line(14, 18, 196, 18);

        // Dados do Funcionário
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold"); doc.text(`Mês/Ano:`, 14, 25); 
        doc.setFont("helvetica", "normal"); doc.text(`${mes}/${ano}`, 33, 25);
        
        doc.setFont("helvetica", "bold"); doc.text(`Nome:`, 14, 31); 
        doc.setFont("helvetica", "normal"); doc.text(`${funcionarioNome}`, 27, 31);
        
        doc.setFont("helvetica", "bold"); doc.text(`CPF:`, 110, 25); 
        doc.setFont("helvetica", "normal"); doc.text(`${cpf}`, 120, 25);
        
        doc.setFont("helvetica", "bold"); doc.text(`Cargo:`, 110, 31); 
        doc.setFont("helvetica", "normal"); doc.text(`${cargo}`, 123, 31);

        // Monta Tabela
        let linhasTabela = [];
        for (let i = 1; i <= diasNoMes; i++) {
            let diaStr = String(i).padStart(2, '0');
            let reg = registrosMes[diaStr] || {};
            linhasTabela.push([
                diaStr,
                reg["Entrada"] || "",
                reg["Pausa Almoço"] || "",
                reg["Retorno Almoço"] || "",
                reg["Saída"] || "",
                "" 
            ]);
        }

        // Tabela Comprimida (cellPadding reduzido)
        doc.autoTable({
            startY: 35,
            head: [['Dia', 'Entrada', 'Saída p/ Almoço', 'Retorno', 'Saída', 'Hora extra']],
            body: linhasTabela,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1 },
            columnStyles: {
                0: { halign: 'center', fontStyle: 'bold' },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' }
            },
            styles: { cellPadding: 1.5, fontSize: 9, font: 'helvetica' } 
        });

        let finalY = doc.lastAutoTable.finalY + 15;
        
        // Injeta a Assinatura (se existir)
        if (assinatura && assinatura.length > 50) {
            doc.addImage(assinatura, 'PNG', 75, finalY, 60, 20);
        }
        
        doc.setLineWidth(0.3);
        doc.line(55, finalY + 22, 155, finalY + 22);
        doc.setFont("helvetica", "bold");
        doc.text("Assinatura do Funcionário", 105, finalY + 27, null, null, "center");

        // Salva
        doc.save(`Folha_Ponto_${funcionarioNome.replace(/\s+/g, '_')}_${mes}_${ano}.pdf`);

    } catch (erro) {
        console.error("Erro ao gerar folha de ponto:", erro);
        alert("⚠️ Ocorreu um erro ao gerar a folha. Verifique a conexão.");
    } finally {
        if (btnGerar) {
            btnGerar.innerHTML = textoOriginal;
            btnGerar.style.pointerEvents = 'auto';
        }
    }
}

function mascararCpf(input) {
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não é número
    value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    input.value = value;
}
