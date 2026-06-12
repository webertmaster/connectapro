// ==========================================
// ZERO LABS - CONNECTA PRO
// reservas.js - Agendamento, Convidados e Termos (MULTI-TENANT ATIVO)
// ==========================================

let reservasGlobais = []; 
let reservaCanvas = null;
let idReservaEditando = null; 
let reservaIndexAtual = -1;

// Configuração do Canvas de Assinatura da Reserva
function configurarCanvasReserva(canvasId){
    let canvas = document.getElementById(canvasId);
    if(!canvas) return null; 
    let ctx = canvas.getContext("2d");
    let desenhando = false;
    
    canvas.addEventListener("mousedown",(e)=>{ desenhando = true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); });
    canvas.addEventListener("mouseup",()=>{ desenhando = false; });
    canvas.addEventListener("mousemove",(e)=>{ 
        if(!desenhando) return; 
        ctx.lineWidth = 3; 
        ctx.lineCap = "round"; 
        ctx.strokeStyle = "#000000"; 
        ctx.lineTo(e.offsetX,e.offsetY); 
        ctx.stroke(); 
    });
    
    canvas.addEventListener("touchstart",(e)=>{ e.preventDefault(); desenhando = true; let rect = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); });
    canvas.addEventListener("touchmove",(e)=>{ 
        if(!desenhando) return; 
        e.preventDefault(); 
        let rect = canvas.getBoundingClientRect(); 
        ctx.lineWidth = 3; 
        ctx.lineCap = "round"; 
        ctx.strokeStyle = "#000000"; 
        ctx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); 
        ctx.stroke(); 
    });
    canvas.addEventListener("touchend",()=>{ desenhando = false; });
    return { canvas, ctx };
}

function limparAssinaturaReserva() {
    if(reservaCanvas && reservaCanvas.canvas) {
        reservaCanvas.ctx.clearRect(0, 0, reservaCanvas.canvas.width, reservaCanvas.canvas.height);
    }
}

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (FIREBASE - COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    reservaCanvas = configurarCanvasReserva("canvasReserva");

    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if(typeof db !== 'undefined') {
        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("reservas").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            reservasGlobais = [];
            snapshot.forEach((doc) => {
                let r = doc.data();
                r.idFirebase = doc.id; 
                reservasGlobais.push(r);
            });
            
            // 3. Ordena localmente (evita erro de índice duplo no Firebase)
            reservasGlobais.sort((a, b) => new Date(a.data) - new Date(b.data));

            atualizarListaReservas();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

// ==========================================
// 2. SALVAR E EDITAR RESERVA NA NUVEM
// ==========================================
function salvarReserva() {
    const tipo = document.getElementById('tipoReserva').value;
    const data = document.getElementById('dataReserva').value;
    const hora = document.getElementById('horaReserva').value;
    const responsavel = document.getElementById('responsavel').value.trim();
    const apto = document.getElementById('aptoReserva').value.trim();

    if (!data || !hora || !responsavel) {
        alert('⚠️ Acesso Negado: Preencha a Data, Hora e o Nome do Responsável!');
        return;
    }

    let assinaturaImg = "";
    if (reservaCanvas && reservaCanvas.canvas) {
        const url = reservaCanvas.canvas.toDataURL();
        if (url.length > 2000) {
            assinaturaImg = url;
        } 
    }

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosReserva = {
        tipo,
        data,
        hora,
        responsavel,
        apto,
        timestamp: Date.now(),
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };
    
    if(assinaturaImg) {
        dadosReserva.assinatura = assinaturaImg;
    }

    if (idReservaEditando) {
        // MODO EDIÇÃO
        db.collection("reservas").doc(idReservaEditando).update(dadosReserva).then(() => {
            idReservaEditando = null;
            const btnAgendar = document.querySelector("button[onclick='salvarReserva()']");
            if (btnAgendar) {
                btnAgendar.innerHTML = "Agendar Reserva";
                btnAgendar.style.background = "#3b82f6";
            }
            
            document.getElementById('dataReserva').value = '';
            document.getElementById('horaReserva').value = '';
            document.getElementById('responsavel').value = '';
            document.getElementById('aptoReserva').value = '';
            limparAssinaturaReserva();

            alert('✅ Reserva alterada com sucesso na Nuvem!');
        }).catch((err) => {
            alert("Erro ao editar reserva: " + err);
        });

    } else {
        // MODO NOVA RESERVA
        dadosReserva.convidados = [];
        dadosReserva.excluido = false; // Define que nasce ativa

        const conflito = reservasGlobais.find(r => r.data === data && r.tipo === tipo && !r.excluido);
        if (conflito) {
            const confirmar = confirm(`🚨 ALERTA DE CONFLITO: Já existe uma reserva ativa para a(o) ${tipo} nesta mesma data. Deseja forçar o registro mesmo assim?`);
            if (!confirmar) return;
        }

        db.collection("reservas").add(dadosReserva).then(() => {
            document.getElementById('dataReserva').value = '';
            document.getElementById('horaReserva').value = '';
            document.getElementById('responsavel').value = '';
            document.getElementById('aptoReserva').value = '';
            limparAssinaturaReserva();

            alert('📅 Reserva confirmada e salva na Nuvem com sucesso!');
        }).catch((err) => {
            alert("Erro ao salvar reserva: " + err);
        });
    }
}

function carregarReservaParaEdicao(index) {
    let r = reservasGlobais[index];
    idReservaEditando = r.idFirebase; 

    document.getElementById('tipoReserva').value = r.tipo;
    document.getElementById('dataReserva').value = r.data;
    document.getElementById('horaReserva').value = r.hora;
    document.getElementById('responsavel').value = r.responsavel;
    document.getElementById('aptoReserva').value = r.apto;

    const btnAgendar = document.querySelector("button[onclick='salvarReserva()']");
    if (btnAgendar) {
        btnAgendar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnAgendar.style.background = "#10b981"; // Fica verde pra destacar a edição
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 3. RENDERIZAR RESERVAS NA TELA
// ==========================================
function atualizarListaReservas() {
    const lista = document.getElementById('listaReservas');
    const telaReservas = document.getElementById('reservas');
    if (!lista || (telaReservas && telaReservas.style.display === 'none')) return;

    lista.innerHTML = '';

    // Filtra as ativas para ver se a lista está vazia
    const ativas = reservasGlobais.filter(r => !r.excluido);

    if (ativas.length === 0) {
        lista.innerHTML = '<div style="text-align: center; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-regular fa-calendar-xmark" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhuma reserva agendada no momento.</p></div>';
        return;
    }

    const hojeObj = new Date();
    hojeObj.setHours(0,0,0,0);
    const hojeStr = hojeObj.toISOString().split('T')[0];

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
    grid.style.gap = '20px';

    // LÊ O CRACHÁ PARA RENDERIZAR OS BOTÕES CORRETAMENTE
    const cargo = localStorage.getItem("usuario_cargo");

    reservasGlobais.forEach((res, index) => {
        if (res.excluido === true) return; // SOFT DELETE: Oculta da tela da portaria

        const dataReservaObj = new Date(res.data + "T00:00:00");
        const isPassado = dataReservaObj < hojeObj;
        const isHoje = res.data === hojeStr;
        
        const dataFormatada = res.data.split('-').reverse().join('/');
        
        let corBorda = '#3b82f6'; 
        let iconeAmbiente = 'fa-solid fa-calendar-check';
        
        const tipoMin = res.tipo.toLowerCase();
        if (tipoMin.includes('churras')) { corBorda = '#ef4444'; iconeAmbiente = 'fa-solid fa-fire-burner'; }
        if (tipoMin.includes('salão') || tipoMin.includes('festa')) { corBorda = '#d946ef'; iconeAmbiente = 'fa-solid fa-champagne-glasses'; }
        if (tipoMin.includes('quadra') || tipoMin.includes('esporte')) { corBorda = '#10b981'; iconeAmbiente = 'fa-solid fa-futbol'; }
        if (tipoMin.includes('piscina')) { corBorda = '#0ea5e9'; iconeAmbiente = 'fa-solid fa-water-ladder'; }
        
        if (isPassado) corBorda = '#cbd5e1';

        const badgeInfo = isPassado 
            ? `<span style="background: #e2e8f0; color: #64748b; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">FINALIZADA</span>`
            : (isHoje ? `<span style="background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; animation: pulse 2s infinite;">HOJE!</span>` 
                      : `<span style="background: ${corBorda}20; color: ${corBorda}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">AGENDADA</span>`);

        const qtdConvidados = res.convidados ? res.convidados.length : 0;
        let infoApto = res.apto ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 12px; margin-left: 8px;">Apto: ${res.apto}</span>` : '';

        // BLINDAGEM DOS BOTÕES DE GESTÃO (EDITAR/ARQUIVAR)
        let botoesGestaoHtml = '';
        if (cargo === 'operacional') {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px;">
                    <button onclick="avisarReserva(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                        <i class="fa-brands fa-whatsapp" style="color: #25D366;"></i> Avisar
                    </button>
                    <button onclick="carregarReservaParaEdicao(${index})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Agendamento">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            `;
        } else {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr auto auto; gap: 8px;">
                    <button onclick="avisarReserva(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                        <i class="fa-brands fa-whatsapp" style="color: #25D366;"></i> Avisar
                    </button>
                    <button onclick="carregarReservaParaEdicao(${index})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Agendamento">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="excluirReserva('${res.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar Reserva">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        }


        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `5px solid ${corBorda}`;
        card.style.opacity = isPassado ? '0.7' : '1';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <h3 style="margin: 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                    <i class="${iconeAmbiente}" style="color: ${corBorda};"></i>${res.tipo}
                </h3>
                ${badgeInfo}
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #f1f5f9;">
                <p style="font-size: 15px; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-regular fa-calendar" style="color: #64748b; width: 15px;"></i> <strong>Data:</strong> ${dataFormatada}
                </p>
                <p style="font-size: 15px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-regular fa-clock" style="color: #64748b; width: 15px;"></i> <strong>Hora:</strong> ${res.hora}
                </p>
            </div>
            
            <p style="font-size: 15px; color: #475569; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-user-tie" style="color: #64748b; width: 15px;"></i> <strong>Responsável:</strong> ${res.responsavel} ${infoApto}
            </p>
            
            ${res.assinatura ? `<p style="font-size: 12px; color: #10b981; margin-bottom: 10px;"><i class="fa-solid fa-pen-nib"></i> Assinatura Digital Salva</p>` : ''}
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                <button onclick="abrirListaConvidados(${index})" style="background: #fef9c3; color: #ca8a04; border: 1px solid #fde047; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#fef08a'" onmouseout="this.style.background='#fef9c3'">
                    <i class="fa-solid fa-clipboard-list"></i> Convidados (${qtdConvidados})
                </button>
                <button onclick="gerarTermoPreenchido(${index})" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                    <i class="fa-solid fa-file-contract"></i> Emitir Termo
                </button>
            </div>
            
            ${botoesGestaoHtml}
        `;
        grid.appendChild(card);
    });

    lista.appendChild(grid);
}

function avisarReserva(index) {
    let r = reservasGlobais[index];
    let dataF = r.data.split('-').reverse().join('/');
    let msg = `Olá ${r.responsavel}! Passando para confirmar sua reserva da(o) *${r.tipo}* agendada para o dia ${dataF} às ${r.hora}. Qualquer dúvida, a portaria está à disposição.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function excluirReserva(idFirebase) {
    if(confirm('🚨 Arquivar Registro: Tem certeza que deseja arquivar esta reserva? Ela sairá do painel, mas continuará salva para consulta.')) {
        db.collection("reservas").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).then(() => {
            alert("Registro arquivado com sucesso!");
        }).catch((err) => {
            alert("Erro ao arquivar registro: " + err);
        });
    }
}

// ==========================================
// 4. GESTÃO DE CONVIDADOS NA NUVEM
// ==========================================
function abrirListaConvidados(index) {
    reservaIndexAtual = index;
    let r = reservasGlobais[index];
    let modal = document.getElementById('modalConvidadosReserva');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalConvidadosReserva';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.85); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter: blur(5px);";
        modal.innerHTML = `
            <div style="background:#f8fafc; padding:25px; border-radius:12px; width:95%; max-width:500px; max-height: 90vh; display: flex; flex-direction: column; box-shadow:0 10px 25px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px;">
                    <h3 style="margin:0; color:#0f172a; font-size: 20px;"><i class="fa-solid fa-clipboard-list" style="color: #ca8a04; margin-right: 10px;"></i>Lista de Convidados</h3>
                    <button onclick="document.getElementById('modalConvidadosReserva').style.display='none'" style="background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
                </div>
                
                <p id="subtituloModalConvidados" style="color:#64748b; font-size:14px; margin-bottom:15px; font-weight: bold;"></p>
                
                <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <input type="text" id="inputNomeConvidado" placeholder="Nome do Convidado..." style="flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; font-size: 15px;">
                    <button onclick="addConvidado()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s;"><i class="fa-solid fa-plus"></i></button>
                </div>
                
                <div id="listaNomesConvidados" style="flex: 1; overflow-y: auto; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('subtituloModalConvidados').innerText = `Evento: ${r.tipo} | Resp: ${r.responsavel}`;
    modal.style.display = 'flex';
    document.getElementById('inputNomeConvidado').value = '';
    renderizarConvidados();
}

function addConvidado() {
    let nome = document.getElementById('inputNomeConvidado').value.trim();
    if (!nome) return;
    
    let r = reservasGlobais[reservaIndexAtual];
    if (!r.convidados) r.convidados = [];
    
    r.convidados.push({ nome: nome, chegou: false });
    
    db.collection("reservas").doc(r.idFirebase).update({
        convidados: r.convidados
    }).then(() => {
        document.getElementById('inputNomeConvidado').value = '';
        renderizarConvidados();
    });
}

function renderizarConvidados() {
    let div = document.getElementById('listaNomesConvidados');
    let r = reservasGlobais[reservaIndexAtual];
    
    if (!r.convidados || r.convidados.length === 0) {
        div.innerHTML = '<p style="text-align: center; color: #94a3b8; margin-top: 20px; font-style: italic;">Nenhum convidado na lista ainda.</p>';
        return;
    }
    
    r.convidados.sort((a, b) => a.chegou === b.chegou ? 0 : a.chegou ? 1 : -1);
    
    div.innerHTML = '';
    r.convidados.forEach((c, i) => {
        let corFundo = c.chegou ? '#f0fdf4' : '#fff';
        let txtDecor = c.chegou ? 'line-through' : 'none';
        let colTxt = c.chegou ? '#94a3b8' : '#0f172a';
        let btnIcon = c.chegou ? '<i class="fa-solid fa-rotate-left"></i>' : '<i class="fa-solid fa-check"></i>';
        let btnCor = c.chegou ? '#cbd5e1' : '#10b981';
        
        div.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid #f1f5f9; background: ${corFundo}; transition: 0.2s;">
                <span style="font-size: 15px; color: ${colTxt}; text-decoration: ${txtDecor}; font-weight: 500;">${c.nome}</span>
                <div style="display: flex; gap: 8px;">
                    <button onclick="toggleChegadaConvidado(${i})" style="background: ${btnCor}; color: white; border: none; width: 32px; height: 32px; border-radius: 6px; cursor: pointer;" title="Marcar Chegada">${btnIcon}</button>
                    <button onclick="removerConvidado(${i})" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; width: 32px; height: 32px; border-radius: 6px; cursor: pointer;" title="Remover da Lista"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            </div>
        `;
    });
}

function toggleChegadaConvidado(indexConvidado) {
    let r = reservasGlobais[reservaIndexAtual];
    r.convidados[indexConvidado].chegou = !r.convidados[indexConvidado].chegou;
    
    db.collection("reservas").doc(r.idFirebase).update({
        convidados: r.convidados
    }).then(() => {
        renderizarConvidados();
    });
}

function removerConvidado(indexConvidado) {
    let r = reservasGlobais[reservaIndexAtual];
    r.convidados.splice(indexConvidado, 1);
    
    db.collection("reservas").doc(r.idFirebase).update({
        convidados: r.convidados
    }).then(() => {
        renderizarConvidados();
    });
}

// ==========================================
// 5. EMISSÃO DE PDF
// ==========================================
function gerarTermoBranco() {
    gerarPDFTermo("EM BRANCO", "___/___/20__", "___:___", "___________________________________", null, null);
}

function gerarTermoPreenchido(index) {
    let r = reservasGlobais[index];
    let dataF = r.data.split('-').reverse().join('/');
    gerarPDFTermo(r.tipo.toUpperCase(), dataF, r.hora, r.responsavel.toUpperCase(), r.apto, r.assinatura);
}

function gerarPDFTermo(local, data, hora, responsavel, apto, assinaturaImg) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setTextColor(15, 23, 42); 
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CONNECTA PRO - PORTARIA", 105, 20, null, null, "center");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Termo de Responsabilidade - Reserva de Área Comum", 105, 28, null, null, "center");
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO AGENDAMENTO", 20, 45);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Área Reservada: ${local}`, 20, 55);
    doc.text(`Data do Evento: ${data}`, 20, 63);
    doc.text(`Horário de Início: ${hora}`, 120, 63);
    doc.text(`Morador Responsável: ${responsavel}`, 20, 71);
    
    if (apto) {
        doc.text(`Apto / Bloco: ${apto}`, 20, 79);
    } else if (responsavel === "___________________________________") {
        doc.text(`Apto / Bloco: ______________________`, 120, 71); 
    } else {
        doc.text(`Apto / Bloco: ______________________`, 20, 79); 
    }

    doc.line(20, 85, 190, 85);

    doc.setFont("helvetica", "bold");
    doc.text("TERMO DE COMPROMISSO E REGRAS DE UTILIZAÇÃO", 20, 95);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const regras = [
        "1. O morador titular assume integral responsabilidade por quaisquer danos materiais,",
        "   físicos ou estéticos causados à área comum ou aos seus equipamentos durante o evento.",
        "2. O limite de decibéis estipulado pelas leis municipais e Regimento Interno deve ser",
        "   rigorosamente respeitado. O uso de som mecânico ou ao vivo se encerra às 22h00.",
        "3. É obrigação do morador entregar o local nas mesmas condições de limpeza e organização",
        "   em que o recebeu.",
        "4. A lista de convidados deve ser entregue (ou cadastrada via app) na portaria com",
        "   antecedência para viabilizar e acelerar a liberação dos visitantes.",
        "5. O descumprimento das regras descritas no Regimento Interno acarretará em notificação",
        "   e possível multa vinculada à taxa condominial da unidade."
    ];
    
    let y = 105;
    regras.forEach(linha => {
        doc.text(linha, 20, y);
        y += 6;
    });

    doc.setFontSize(12);
    doc.text("Declaro que li e estou de acordo com todas as regras de utilização acima descritas.", 20, y + 25);
    
    if (assinaturaImg) {
        doc.addImage(assinaturaImg, 'PNG', 75, y + 33, 60, 22);
        doc.setLineWidth(0.3);
        doc.line(50, y + 58, 160, y + 58); 
    } else {
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 2], 0); 
        doc.line(50, y + 55, 160, y + 55); 
        doc.setLineDashPattern([], 0); 
    }
    
    doc.setFont("helvetica", "bold");
    let posAssinaturaTexto = assinaturaImg ? y + 65 : y + 62;
    doc.text("ASSINATURA DO MORADOR RESPONSÁVEL", 105, posAssinaturaTexto, null, null, "center");
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    let dataEmissao = new Date().toLocaleString('pt-BR');
    doc.text(`Documento gerado oficialmente pelo sistema Connecta Pro em ${dataEmissao}`, 105, 285, null, null, "center");

    let nomeArquivo = responsavel === "___________________________________" ? "Termo_Reserva_Branco.pdf" : `Termo_${local.replace(/\s+/g, '_')}_${data.replace(/\//g, '-')}.pdf`;
    
    doc.save(nomeArquivo);
}