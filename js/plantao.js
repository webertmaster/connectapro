// ==========================================
// ZERO LABS - CONDO UP (NUVEM FIREBASE)
// plantao.js - Passagem de Turno Premium (MULTI-TENANT ATIVO)
// ==========================================

let passagensGlobais = [];
let idPlantaoEditando = null;

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if(typeof db !== 'undefined') {
        // [BLINDAGEM] ESCUTADOR DE EQUIPE EM TEMPO REAL PARA ALIMENTAR OS SELECTS
        db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            let equipeData = [];
            snapshot.forEach((doc) => {
                let f = doc.data();
                if (!f.excluido) { // Só traz os funcionários ativos
                    equipeData.push(f);
                }
            });
            // Alimenta os menus de escolha do plantão com a lista atualizada vinda da nuvem
            executarAlimentacaoSelects(equipeData);
        });

        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("passagem").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            passagensGlobais = [];
            snapshot.forEach((doc) => {
                let p = doc.data();
                p.idFirebase = doc.id;
                passagensGlobais.push(p);
            });
            
            // 3. Ordena localmente pelo timestamp mais recente
            passagensGlobais.sort((a, b) => b.timestamp - a.timestamp);

            mostrarPassagens();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

// Função interna que reconstrói os menus dropdown com os dados reais da nuvem
function executarAlimentacaoSelects(listaFuncionarios) {
    const filtroPlantao = document.getElementById('filtroPorteiroPassagem');
    const selectNome = document.getElementById('passagemNome');
    
    if(filtroPlantao) {
        filtroPlantao.innerHTML = '<option value="">Todos os Porteiros</option>';
        listaFuncionarios.forEach(f => {
            filtroPlantao.innerHTML += `<option value="${f.nome}">${f.nome}</option>`;
        });
    }

    if(selectNome) {
        selectNome.innerHTML = '<option value="" disabled selected>👤 Selecione o seu Nome (Porteiro que está saindo)</option>';
        listaFuncionarios.forEach(f => {
            selectNome.innerHTML += `<option value="${f.nome}">${f.nome} (${f.cargo})</option>`;
        });
    }
}

// Mantido por compatibilidade com outros arquivos do sistema que possam chamá-la
function atualizarSelectPorteiroPassagem() {
    console.log("Condo Up: Selects de porteiros sincronizados via escutador ativo da nuvem.");
}

// ==========================================
// 2. SALVAR E EDITAR NA NUVEM
// ==========================================
function salvarPassagem() {
    const nome = document.getElementById('passagemNome').value;
    const obs = document.getElementById('passagemObs').value.trim();

    if (!nome) {
        alert('⚠️ Acesso Negado: Selecione o seu nome para passar o serviço!');
        return;
    }

    const checkList = {
        portoes: document.getElementById('chkPortoes').checked,
        elevadores: document.getElementById('chkElevadores').checked,
        luzes: document.getElementById('chkLuzes').checked,
        cameras: document.getElementById('chkCameras').checked,
        bombas: document.getElementById('chkBombas').checked,
        Energia: document.getElementById('chkEnergia').checked
    };

    const agora = new Date();
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosPlantao = {
        porteiro: nome,
        observacoes: obs || 'Plantão tranquilo. Nenhuma alteração registrada na infraestrutura.',
        checkList: checkList,
        data: agora.toISOString().split('T')[0],
        hora: agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        condominioId: meuCondominio
    };

    const btnNode = document.querySelector("#passagem .btn[onclick='salvarPassagem()']");

    if (idPlantaoEditando) {
        // MODO EDIÇÃO
        db.collection("passagem").doc(idPlantaoEditando).update(dadosPlantao).then(() => {
            alert('🔄 Turno atualizado com sucesso!');
            idPlantaoEditando = null;
            if(btnNode) {
                btnNode.innerHTML = "<i class='fa-solid fa-arrow-right-arrow-left'></i> Finalizar e Passar Serviço";
                btnNode.style.background = "#10b981";
            }
            limparFormularioPassagem();
        }).catch(err => alert("Erro ao editar: " + err));

    } else {
        // MODO NOVO TURNO
        dadosPlantao.timestamp = agora.getTime();
        dadosPlantao.excluido = false; // Soft Delete
        
        db.collection("passagem").add(dadosPlantao).then(() => {
            alert('🔄 Serviço passado com sucesso! Bom descanso guerreiro.');
            limparFormularioPassagem();
        }).catch(err => alert("Erro ao salvar: " + err));
    }
}

function limparFormularioPassagem() {
    document.getElementById('passagemNome').value = '';
    document.getElementById('passagemObs').value = '';
    ['chkPortoes', 'chkElevadores', 'chkLuzes', 'chkCameras', 'chkBombas', 'chkEnergia'].forEach(id => {
        document.getElementById(id).checked = false;
    });
}

function prepararEdicaoPlantao(index) {
    let p = passagensGlobais[index];
    idPlantaoEditando = p.idFirebase;

    document.getElementById('passagemNome').value = p.porteiro;
    document.getElementById('passagemObs').value = p.observacoes;
    
    const chk = p.checkList || {};
    document.getElementById('chkPortoes').checked = chk.portoes !== false;
    document.getElementById('chkElevadores').checked = chk.elevadores !== false;
    document.getElementById('chkLuzes').checked = chk.luzes !== false;
    document.getElementById('chkCameras').checked = chk.cameras !== false;
    document.getElementById('chkBombas').checked = chk.bombas !== false;
    document.getElementById('chkEnergia').checked = chk.Energia !== false;

    const btnNode = document.querySelector("#passagem .btn[onclick='salvarPassagem()']");
    if(btnNode) {
        btnNode.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnNode.style.background = "#3b82f6"; // Azul de destaque para alteração
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirPlantao(idFirebase) {
    if(confirm("🚨 Arquivar Registro: Tem certeza que deseja arquivar este plantão? Ele sairá da tela principal, mas continuará no Livro de Auditoria.")) {
        db.collection("passagem").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).then(() => {
            console.log("Plantão arquivado com sucesso!");
        }).catch(err => alert("Erro ao arquivar: " + err));
    }
}

// ==========================================
// 3. RENDERIZAR NA TELA (COM GRID DE BOTÕES E FILTRO BLINDADO)
// ==========================================
function mostrarPassagens() {
    const lista = document.getElementById('listaPassagens');
    if (!lista) return;

    // 🚀 LÓGICA DE FILTRAGEM BLINDADA
    let filtroPorteiroEl = document.getElementById('filtroPorteiroPassagem');
    let filtroPorteiro = filtroPorteiroEl ? filtroPorteiroEl.value.trim().toLowerCase() : "";
    
    let filtroDataInicioEl = document.getElementById('filtroDataInicio');
    let filtroDataInicio = filtroDataInicioEl ? filtroDataInicioEl.value : "";
    
    let filtroDataFimEl = document.getElementById('filtroDataFim');
    let filtroDataFim = filtroDataFimEl ? filtroDataFimEl.value : "";

    lista.innerHTML = '';
    
    // Começa apenas com os ativos (Soft Delete)
    let filtrados = passagensGlobais.filter(p => !p.excluido);

    // 1. Aplica o filtro de Nome (se existir)
    if (filtroPorteiro !== "") {
        filtrados = filtrados.filter(p => {
            const nomeDoPorteiroCard = (p.porteiro || "").toLowerCase().trim();
            return nomeDoPorteiroCard === filtroPorteiro;
        });
    }

    // 2. Aplica o filtro de Data Inicial
    if (filtroDataInicio !== "") {
        filtrados = filtrados.filter(p => p.data >= filtroDataInicio);
    }

    // 3. Aplica o filtro de Data Final
    if (filtroDataFim !== "") {
        filtrados = filtrados.filter(p => p.data <= filtroDataFim);
    }

    if (filtrados.length === 0) {
        lista.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;"><i class="fa-solid fa-clipboard-check" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum registro de plantão encontrado com este filtro.</p></div>';
        return;
    }

    const cargo = localStorage.getItem("usuario_cargo");
    const defaultsCheck = { portoes: true, elevadores: true, luzes: true, cameras: true, bombas: true, Energia: true };

    filtrados.forEach((p, index) => {
        // Encontra o índice real no array global caso o porteiro clique em editar
        const indiceRealNoGlobal = passagensGlobais.findIndex(g => g.idFirebase === p.idFirebase);

        const dataF = p.data ? p.data.split('-').reverse().join('/') : "Data Indefinida";
        const horaF = p.hora || "--:--";
        const dataFormatada = `${dataF} às ${horaF}`;
        
        const chk = Object.assign({}, defaultsCheck, p.checkList);
        
        const badgeBase = "display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-right: 8px; margin-bottom: 8px; letter-spacing: 0.5px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
        const checkOk = `style="${badgeBase} background: #ecfdf5; color: #059669; border: 1px solid #34d399;"`;
        const checkFail = `style="${badgeBase} background: #fef2f2; color: #dc2626; border: 1px solid #f87171;"`;

        const renderBadge = (status, label) => `<span ${status ? checkOk : checkFail}><i class="fa-solid ${status ? 'fa-check-circle' : 'fa-circle-xmark'}" style="margin-right: 6px;"></i>${label}</span>`;

        const checksHtml = `
            ${renderBadge(chk.portoes, 'Portões')}
            ${renderBadge(chk.elevadores, 'Elevadores')}
            ${renderBadge(chk.luzes, 'Luzes')}
            ${renderBadge(chk.cameras, 'Câmeras')}
            ${renderBadge(chk.bombas, 'Bombas')}
            ${renderBadge(chk.Energia, 'Energia')}
        `;

        let botoesGestaoHtml = '';
        if (cargo === 'operacional') {
            botoesGestaoHtml = `
                <div style="display: flex; gap: 8px; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px; justify-content: flex-end;">
                    <button onclick="prepararEdicaoPlantao(${indiceRealNoGlobal})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Relatório">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                </div>
            `;
        } else {
            botoesGestaoHtml = `
                <div style="display: flex; gap: 8px; margin-top: 15px; border-top: 1px solid #f1f5f9; padding-top: 15px; justify-content: flex-end;">
                    <button onclick="prepararEdicaoPlantao(${indiceRealNoGlobal})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Relatório">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button onclick="excluirPlantao('${p.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar Relatório">
                        <i class="fa-solid fa-trash-can"></i> Arquivar
                    </button>
                </div>
            `;
        }

        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-dot" style="background: #1e293b; border: 4px solid #f4f7fb; width: 20px; height: 20px; left: -35px; top: 0; box-shadow: 0 0 0 2px #cbd5e1;"></div>
            <div class="card" style="margin-top: 0; padding: 20px; border-left: 0; border-top: 5px solid #1e293b; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border-radius: 12px; position: relative;">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; font-size: 18px; color: #0f172a; font-weight: 800;">
                            <i class="fa-solid fa-id-badge" style="color: #64748b; margin-right: 8px;"></i>${p.porteiro || 'Não informado'}
                        </h3>
                        <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Passagem de Turno</span>
                    </div>
                    <span style="font-size: 13px; color: #0f172a; font-weight: bold; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1;">
                        <i class="fa-regular fa-clock" style="margin-right: 6px; color: #3b82f6;"></i>${dataFormatada}
                    </span>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <p style="font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1px;"><i class="fa-solid fa-microchip" style="margin-right: 5px;"></i> Status da Infraestrutura</p>
                    <div style="display: flex; flex-wrap: wrap;">
                        ${checksHtml}
                    </div>
                </div>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; font-size: 14px; color: #334155; border: 1px solid #e2e8f0; line-height: 1.6; position: relative;">
                    <i class="fa-solid fa-quote-left" style="position: absolute; top: 10px; left: 15px; color: #cbd5e1; font-size: 20px; opacity: 0.5;"></i> 
                    <p style="margin: 0; padding-left: 30px;">${p.observacoes}</p>
                </div>
                
                ${botoesGestaoHtml}
            </div>
        `;
        lista.appendChild(item);
    });
}

function limparFiltrosPlantao() {
    if(document.getElementById('filtroPorteiroPassagem')) document.getElementById('filtroPorteiroPassagem').value = '';
    if(document.getElementById('filtroDataInicio')) document.getElementById('filtroDataInicio').value = '';
    if(document.getElementById('filtroDataFim')) document.getElementById('filtroDataFim').value = '';
    mostrarPassagens();
}

function gerarRelatorioPassagem() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    if (passagensGlobais.length === 0) {
        alert("⚠️ Não há registros de plantão na nuvem para gerar o PDF.");
        return;
    }

    // 🚀 INJEÇÃO DOS FILTROS NO PDF
    let filtroPorteiroEl = document.getElementById('filtroPorteiroPassagem');
    let filtroPorteiro = filtroPorteiroEl ? filtroPorteiroEl.value.trim().toLowerCase() : "";
    
    let filtroDataInicioEl = document.getElementById('filtroDataInicio');
    let filtroDataInicio = filtroDataInicioEl ? filtroDataInicioEl.value : "";
    
    let filtroDataFimEl = document.getElementById('filtroDataFim');
    let filtroDataFim = filtroDataFimEl ? filtroDataFimEl.value : "";

    // Começa filtrando apenas os ativos
    let filtrados = passagensGlobais.filter(p => !p.excluido);

    // Aplica as mesmas regras de filtro da tela
    if (filtroPorteiro !== "") {
        filtrados = filtrados.filter(p => (p.porteiro || "").toLowerCase().trim() === filtroPorteiro);
    }
    if (filtroDataInicio !== "") {
        filtrados = filtrados.filter(p => p.data >= filtroDataInicio);
    }
    if (filtroDataFim !== "") {
        filtrados = filtrados.filter(p => p.data <= filtroDataFim);
    }

    // Se o filtro não retornar nada
    if (filtrados.length === 0) {
        alert("⚠️ Nenhum registro encontrado com os filtros selecionados para gerar o PDF.");
        return;
    }
    
    doc.setFontSize(16);
    doc.text("Livro de Plantão e Auditoria", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Condo Up`, 14, 26);
    
    const defaultsCheck = { portoes: true, elevadores: true, luzes: true, cameras: true, bombas: true, Energia: true };

    // 🚀 AGORA ELE MAPEIA O ARRAY 'filtrados' EM VEZ DO BANCO INTEIRO
    const dados = filtrados.map(p => {
        const dataF = p.data ? p.data.split('-').reverse().join('/') : "N/D";
        const horaF = p.hora || "--:--";
        const chk = Object.assign({}, defaultsCheck, p.checkList);
        
        let falhas = [];
        if(!chk.portoes) falhas.push('Portões');
        if(!chk.elevadores) falhas.push('Elevadores');
        if(!chk.luzes) falhas.push('Luzes');
        if(!chk.cameras) falhas.push('Câmeras');
        if(!chk.bombas) falhas.push('Bombas');
        if(!chk.Energia) falhas.push('Energia');
        
        const statusCheck = falhas.length > 0 ? `⚠️ Falha(s): ${falhas.join(', ')}` : '✅ Tudo OK';
        let statusGeral = p.excluido ? "[ARQUIVADO] " : "";
        
        return [`${dataF} ${horaF}`, p.porteiro || 'Não informado', statusCheck, statusGeral + (p.observacoes || 'Sem observações')];
    });

    doc.autoTable({
        startY: 32,
        head: [['Data / Hora', 'Porteiro de Saída', 'Status da Infra', 'Observações do Turno']],
        body: dados,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9, cellPadding: 5 }
    });

    doc.save("Auditoria_Plantao_Filtrado.pdf");
}
