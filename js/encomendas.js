// ==========================================
// ZERO LABS - CONNECTA PRO (NUVEM FIREBASE)
// encomendas.js - Gestão Premium (MULTI-TENANT ATIVO)
// ==========================================

const logosTransportadoras = {
    "shopee": "https://upload.wikimedia.org/wikipedia/commons/f/fe/Shopee.svg",
    "mercadolivre": "https://upload.wikimedia.org/wikipedia/commons/d/d4/MercadoLibre_logo.PNG",
    "amazon": "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    "correios": "https://logodownload.org/wp-content/uploads/2014/05/correios-logo-1.png",
    "shein":  "img/shein.jpg.jpg",
    "dafiti":  "img/dafiti.png.png",
    "aliexpress": "img/aliexpress.png.png", 
    "temu": "img/temu.png.png"
};

let editandoIdFirebase = null;
let encomendas = []; 

function configurarCanvas(canvasId){
    let canvas = document.getElementById(canvasId);
    if(!canvas) return null; 
    let ctx = canvas.getContext("2d");
    let desenhando = false;
    canvas.addEventListener("mousedown",(e)=>{ desenhando = true; ctx.beginPath(); ctx.moveTo(e.offsetX,e.offsetY); });
    canvas.addEventListener("mouseup",()=>{ desenhando = false; });
    canvas.addEventListener("mousemove",(e)=>{ if(!desenhando) return; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = document.body.classList.contains('dark-mode') ? "#fff" : "#000"; ctx.lineTo(e.offsetX,e.offsetY); ctx.stroke(); });
    canvas.addEventListener("touchstart",(e)=>{ e.preventDefault(); desenhando = true; let rect = canvas.getBoundingClientRect(); ctx.beginPath(); ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); });
    canvas.addEventListener("touchmove",(e)=>{ if(!desenhando) return; e.preventDefault(); let rect = canvas.getBoundingClientRect(); ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = document.body.classList.contains('dark-mode') ? "#fff" : "#000"; ctx.lineTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top); ctx.stroke(); });
    canvas.addEventListener("touchend",()=>{ desenhando = false; });
    return { canvas, ctx };
}

let encomendaCanvas = null;

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', (event) => {
    encomendaCanvas = configurarCanvas("canvasEncomenda");
    
    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if(typeof db !== 'undefined') {
        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("encomendas").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            encomendas = []; 
            snapshot.forEach((doc) => {
                let encomenda = doc.data();
                encomenda.id = doc.id; 
                encomendas.push(encomenda);
            });
            
            // Ordena localmente pela data (evita erro de índice duplo no Firebase)
            encomendas.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

            localStorage.setItem("encomendas", JSON.stringify(encomendas));
            mostrarEncomendas(); 
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    } else {
        console.error("Firebase DB não encontrado. Verifique o index.html");
    }
});

function limparAssinaturaEncomenda(){ 
    if(encomendaCanvas && encomendaCanvas.canvas) {
        encomendaCanvas.ctx.clearRect(0,0,encomendaCanvas.canvas.width,encomendaCanvas.canvas.height); 
    }
}

function salvarEncomenda(){
    let morador = document.getElementById('encMorador').value.trim(); 
    let apto = document.getElementById('encApto').value.trim();
    if(!morador || !apto) return alert("⚠️ Os campos Morador e Apartamento são obrigatórios!");
    
    let fotoInput = document.getElementById("encFoto"); 
    let arquivo = fotoInput ? fotoInput.files[0] : null;
    
    const btnNode = document.querySelector("#encomendas .btn[onclick='salvarEncomenda()']");
    let textoOriginal = editandoIdFirebase ? "Cadastrar Encomenda" : btnNode.innerText;
    btnNode.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
    btnNode.style.pointerEvents = 'none';
    
    if(arquivo){ 
        let leitor = new FileReader(); 
        leitor.onload=function(e){ criarEncomenda(e.target.result, btnNode, textoOriginal); }; 
        leitor.readAsDataURL(arquivo); 
    } else { 
        criarEncomenda("", btnNode, textoOriginal); 
    }
}

// ==========================================
// 2. SALVAR E ATUALIZAR NA NUVEM
// ==========================================
function criarEncomenda(foto, btnNode, textoOriginal){
    let agora = new Date(); 
    
    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    let dadosEnviados = {
        morador: document.getElementById('encMorador').value,
        apto: document.getElementById('encApto').value,
        transportadora: document.getElementById('encTransportadora').value,
        codigo: document.getElementById('encCodigo').value,
        volumes: document.getElementById('encVolumes').value,
        porteiro: document.getElementById('encPorteiro').value,
        status: "Pendente",
        dataChegada: agora.toISOString().split('T')[0],
        horaChegada: agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}),
        dataCadastro: agora.toISOString(), 
        quemRetirou: "", dataEntrega: "", horaEntrega: "",
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    if (foto) dadosEnviados.foto = foto;
    if (encomendaCanvas && encomendaCanvas.canvas) {
        const url = encomendaCanvas.canvas.toDataURL();
        if (url.length > 2000) dadosEnviados.assinatura = url;
    }

    if (editandoIdFirebase) {
        // MODO EDIÇÃO
        db.collection("encomendas").doc(editandoIdFirebase).update(dadosEnviados)
        .then(() => {
            alert("✅ Encomenda atualizada com sucesso!");
            finalizarAcao(btnNode, "Cadastrar Encomenda");
            editandoIdFirebase = null;
        }).catch(err => { alert("Erro ao atualizar!"); finalizarAcao(btnNode, textoOriginal); });
    } else {
        // MODO NOVA ENCOMENDA
        dadosEnviados.excluido = false; // Nasce ativa
        db.collection("encomendas").add(dadosEnviados)
        .then(() => {
            alert("📦 Encomenda salva na NUVEM com sucesso!");
            finalizarAcao(btnNode, textoOriginal);
        }).catch(err => { alert("Erro ao salvar!"); finalizarAcao(btnNode, textoOriginal); });
    }
}

function finalizarAcao(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = `<i class="fa-solid fa-plus"></i> ${textoFinal}`;
        btnNode.style.background = "#3b82f6"; // Volta o botão pro azul
        btnNode.style.pointerEvents = 'auto';
    }
    document.getElementById('encMorador').value=''; document.getElementById('encApto').value=''; document.getElementById('encTransportadora').value=''; 
    document.getElementById('encCodigo').value=''; document.getElementById('encVolumes').value=''; document.getElementById('encPorteiro').value='';
    if(document.getElementById('encFoto')) document.getElementById('encFoto').value = '';
    limparAssinaturaEncomenda(); 
}

function prepararEdicaoEncomenda(index) {
    let e = encomendas[index];
    document.getElementById('encMorador').value = e.morador;
    document.getElementById('encApto').value = e.apto;
    document.getElementById('encTransportadora').value = e.transportadora || "";
    document.getElementById('encCodigo').value = e.codigo || "";
    document.getElementById('encVolumes').value = e.volumes || "";
    document.getElementById('encPorteiro').value = e.porteiro || "";
    
    const btnNode = document.querySelector("#encomendas .btn[onclick='salvarEncomenda()']");
    if(btnNode) {
        btnNode.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnNode.style.background = "#10b981"; // Fica verde para alertar edição
    }
    editandoIdFirebase = e.id; 
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==========================================
// RENDERIZAR NA TELA (COM BUSCA DUPLA E GRID)
// ==========================================
function mostrarEncomendas(){
    let lista = document.getElementById('listaEncomendas'); 
    const telaEncomendas = document.getElementById('encomendas');
    
    if (!lista || (telaEncomendas && telaEncomendas.style.display === 'none')) return;
    
    lista.innerHTML=""; 
    
    let hojeCalculo = new Date(); hojeCalculo.setHours(0,0,0,0);
    let filtroData = document.getElementById("filtroDataEncomenda") ? document.getElementById("filtroDataEncomenda").value : "";
    let filtroTexto = document.getElementById("pesquisaEncomenda") ? document.getElementById("pesquisaEncomenda").value.toLowerCase() : "";

    // LÊ O CRACHÁ DO USUÁRIO LOGADO PARA SEGURANÇA
    const cargo = localStorage.getItem("usuario_cargo");

    // CONTROLE DE ABAS (Pendente é o padrão ao abrir a tela)
    if (!window.abaEncomendaAtual) window.abaEncomendaAtual = 'Pendente';

    // Conta quantas encomendas ativas existem de cada tipo para exibir nos botões
    const qtdPendentes = encomendas.filter(enc => !enc.excluido && enc.status === 'Pendente').length;

    // INJETA OS BOTÕES DE ABAS PREMIUM NO TOPO DA LISTA
    let abasHtml = `
        <div style="display: flex; gap: 10px; margin-bottom: 25px; grid-column: 1 / -1; width: 100%;">
            <button onclick="window.abaEncomendaAtual='Pendente'; mostrarEncomendas();" style="flex: 1; padding: 14px; border-radius: 10px; font-weight: bold; font-size: 14px; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${window.abaEncomendaAtual === 'Pendente' ? '#3b82f6' : '#f1f5f9'}; color: ${window.abaEncomendaAtual === 'Pendente' ? '#fff' : '#475569'}; box-shadow: ${window.abaEncomendaAtual === 'Pendente' ? '0 4px 12px rgba(59,130,246,0.25)' : 'none'};">
                <i class="fa-solid fa-boxes-stacked"></i> No Estoque / Pendentes (${qtdPendentes})
            </button>
            <button onclick="window.abaEncomendaAtual='Entregue'; mostrarEncomendas();" style="flex: 1; padding: 14px; border-radius: 10px; font-weight: bold; font-size: 14px; cursor: pointer; border: none; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; background: ${window.abaEncomendaAtual === 'Entregue' ? '#10b981' : '#f1f5f9'}; color: ${window.abaEncomendaAtual === 'Entregue' ? '#fff' : '#475569'}; box-shadow: ${window.abaEncomendaAtual === 'Entregue' ? '0 4px 12px rgba(16,185,129,0.25)' : 'none'};">
                <i class="fa-solid fa-circle-check"></i> Histórico de Entregues
            </button>
        </div>
    `;
    lista.innerHTML = abasHtml;

    // RENDERIZA OS CARTÕES
    encomendas.forEach((e,index)=>{
        if (e.excluido === true) return; // SOFT DELETE: Mantém pra Relatório
        
        // FILTRO DA ABA SELECIONADA (Só mostra o status da aba ativa)
        if (e.status !== window.abaEncomendaAtual) return;

        // ==========================================
        // TRAVA DOS 60 DIAS (AUTOMÁTICA NO HISTÓRICO)
        // ==========================================
        if (e.status === 'Entregue' && e.dataEntrega) {
            let partes = e.dataEntrega.split('/'); 
            let dEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
            
            let diffDias = Math.floor((hojeCalculo - dEntrega) / (1000 * 60 * 60 * 24));
            
            if (diffDias > 60) {
                return; 
            }
        }
        
        if(filtroData && e.dataChegada !== filtroData) return;
        
        if (filtroTexto) {
            let textoBusca = `${e.morador} ${e.apto} ${e.codigo}`.toLowerCase();
            if (!textoBusca.includes(filtroTexto)) return;
        }
        
        let dotHtml = "", dataExibicao = "Sem data";
        if(e.dataChegada) {
            let p = e.dataChegada.split('-'); dataExibicao = `${p[2]}/${p[1]}/${p[0]}`;
            if(e.status === "Pendente") {
                let dCheg = new Date(p[0], p[1]-1, p[2]); 
                let diff = Math.floor((hojeCalculo - dCheg) / (1000 * 60 * 60 * 24));
                if(diff <= 2) dotHtml = `<div class="dot-status dot-green"></div>`; 
                else if(diff >= 3 && diff <= 5) dotHtml = `<div class="dot-status dot-yellow"></div>`; 
                else dotHtml = `<div class="dot-status dot-red"></div>`;
            }
        }
        
        let nomeTransp = (e.transportadora || "").toLowerCase().replace(/\s+/g, '');
        let logoHtml = "";
        for (let chave in logosTransportadoras) {
            let chaveLimpa = chave.replace(/\s+/g, '');
            if (nomeTransp.includes(chaveLimpa)) {
                logoHtml = `<img src="${logosTransportadoras[chave]}" style="width: 60px; height: 28px; object-fit: contain; margin-right: 10px; border-radius: 4px;">`;
                break;
            }
        }
        
        let corBorda = e.status === 'Pendente' ? '#f59e0b' : '#10b981';
        let classeBadge = e.status === 'Pendente' ? 'status-pendente' : 'status-entregue';
        let iconeStatus = e.status === 'Pendente' ? '<i class="fa-solid fa-clock-rotate-left"></i> ' : '<i class="fa-solid fa-circle-check"></i> ';
        
        let htmlRetirada = "";
        if (e.status === 'Entregue' && e.quemRetirou) {
            htmlRetirada = `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; grid-column: 1 / -1;">
                    <p style="margin: 0; color: #059669; font-size: 14px;">
                        <i class="fa-solid fa-handshake" style="width: 18px; text-align: center; margin-right: 5px;"></i> 
                        <b>Entregue para:</b> ${e.quemRetirou} 
                        <br>
                        <i class="fa-regular fa-calendar-check" style="width: 18px; text-align: center; margin-right: 5px; margin-top: 8px;"></i> 
                        <b>Em:</b> ${e.dataEntrega} às ${e.horaEntrega}
                    </p>
                </div>
            `;
        }

        // BLINDAGEM DOS BOTÕES INFERIORES BASEADO NO CARGO
        let botoesGestaoHtml = '';
        if (cargo === 'operacional') {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="imprimirEtiqueta(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-print"></i> Padrão</button>
                    <button onclick="imprimirSoQRCode(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-qrcode"></i> Só QR</button>
                    <button onclick="prepararEdicaoEncomenda(${index})" style="grid-column: span 2; background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar Encomenda</button>
                </div>
            `;
        } else {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="imprimirEtiqueta(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-print"></i> Padrão</button>
                    <button onclick="imprimirSoQRCode(${index})" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'"><i class="fa-solid fa-qrcode"></i> Só QR</button>
                    <button onclick="prepararEdicaoEncomenda(${index})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button onclick="excluirEncomenda(${index})" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar"><i class="fa-solid fa-trash-can"></i> Arquivar</button>
                </div>
            `;
        }

        lista.innerHTML += `
        <div class="card" style="border-left: 5px solid ${corBorda}; padding: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <h3 style="margin: 0; font-size: 17px; color: #0f172a; display: flex; align-items: center;">
                    ${logoHtml} ${e.transportadora || 'Não informada'}
                </h3>
                ${dotHtml}
            </div>
            <div class="badge ${classeBadge}" style="margin-bottom: 15px; padding: 6px 10px; font-size: 11px;">${iconeStatus}${e.status}</div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 14px; color: #475569; margin-bottom: 15px;">
                <p style="margin: 0;"><i class="fa-regular fa-user" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Morador:</b> ${e.morador}</p>
                <p style="margin: 0;"><i class="fa-regular fa-building" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Apto:</b> ${e.apto}</p>
                <p style="margin: 0;"><i class="fa-solid fa-user-shield" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Porteiro:</b> ${e.porteiro || "N/A"}</p>
                <p style="margin: 0;"><i class="fa-regular fa-clock" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Chegada:</b> <b>${dataExibicao} ${e.horaChegada ? `às ${e.horaChegada}` : ''}</b></p>
                <p style="margin: 0;"><i class="fa-solid fa-barcode" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Código:</b> ${e.codigo || "N/A"}</p>
                <p style="margin: 0;"><i class="fa-solid fa-boxes-stacked" style="width: 18px; text-align: center; color: #94a3b8; margin-right: 5px;"></i> <b>Volumes:</b> ${e.volumes || "N/A"}</p>
                ${htmlRetirada}
            </div>
            
            ${e.foto ? `<img src="${e.foto}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; border: 1px solid #e2e8f0; margin-top: 10px;">` : ''} 
            ${e.assinatura && e.assinatura !== "data:," ? `<img src="${e.assinatura}" style="width: 100%; height: 80px; object-fit: contain; border-radius: 8px; margin-top: 10px; border: 1px dashed #ccc; background: #f8fafc;">` : ""}
            
            <div style="display: grid; grid-template-columns: ${e.status === 'Pendente' ? '1fr 1fr' : '1fr'}; gap: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                ${e.status === "Pendente" ? `<button onclick="abrirModalEntrega(${index})" style="background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fa-solid fa-box-open"></i> Entregar</button>` : ''}
                <button onclick="avisarWhatsappEncomenda(${index})" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'"><i class="fa-brands fa-whatsapp"></i> Avisar</button>
            </div>
            
            ${botoesGestaoHtml}
        </div>`;
    });
}

function abrirModalEntrega(index) {
    let modal = document.getElementById('modalEntregaPremium');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalEntregaPremium';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.75); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter: blur(4px);";
        modal.innerHTML = `
            <div style="background:#fff; padding:25px; border-radius:12px; width:90%; max-width:350px; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.2);">
                <i class="fa-solid fa-box-open" style="font-size:40px; color:#3b82f6; margin-bottom:15px;"></i>
                <h3 style="margin:0 0 10px 0; color:#0f172a; font-size: 20px;">Registrar Retirada</h3>
                <p style="color:#64748b; font-size:14px; margin-bottom:20px;">Quem está recebendo esta encomenda agora?</p>
                
                <input type="text" id="inputQuemRetirou" placeholder="Ex: João, Morador, Maria..." style="width:100%; padding:12px; border:2px solid #e2e8f0; border-radius:8px; margin-bottom:20px; font-size:16px; box-sizing:border-box; outline:none;" onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#e2e8f0'">
                
                <div style="display:flex; gap:10px;">
                    <button id="btnCancelarEntrega" style="flex:1; padding:12px; background:#f1f5f9; color:#475569; border:none; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Cancelar</button>
                    <button id="btnConfirmarEntrega" style="flex:1; padding:12px; background:#10b981; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    let input = document.getElementById('inputQuemRetirou');
    input.value = '';
    
    setTimeout(() => input.focus(), 100);

    document.getElementById('btnCancelarEntrega').onclick = () => {
        modal.style.display = 'none';
    };

    document.getElementById('btnConfirmarEntrega').onclick = () => {
        let quem = input.value;
        if (!quem.trim()) quem = "Não informado";
        
        modal.style.display = 'none';
        finalizarEntregaNoBanco(index, quem);
    };
}

function finalizarEntregaNoBanco(i, quemBuscou) { 
    let momentoExato = new Date();
    let e = encomendas[i];

    db.collection("encomendas").doc(e.id).update({
        status: "Entregue",
        quemRetirou: quemBuscou,
        dataEntrega: momentoExato.toLocaleDateString('pt-BR'),
        horaEntrega: momentoExato.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
    })
    .then(() => console.log("Baixa confirmada na nuvem!"))
    .catch((err) => alert("Erro ao dar baixa: " + err));
}

function excluirEncomenda(i){ 
    if(confirm("🚨 Arquivar Registro: Tem certeza que deseja arquivar esta encomenda? Ela sairá do painel principal, mas continuará salva para os Relatórios.")) { 
        let e = encomendas[i];
        // Soft delete no lugar do delete()
        db.collection("encomendas").doc(e.id).update({
            excluido: true,
            dataExclusao: Date.now()
        })
        .then(() => console.log("Arquivado com sucesso"))
        .catch((err) => alert("Erro ao arquivar: " + err));
    } 
}

function filtrarEncomendas(){ mostrarEncomendas(); }
function limparFiltroEncomendas(){ document.getElementById("filtroDataEncomenda").value=""; mostrarEncomendas(); }

function avisarWhatsappEncomenda(index){ 
    let msg = `Olá ${encomendas[index].morador}, sua encomenda chegou na portaria do condomínio.`; 
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`); 
}

function imprimirEtiqueta(index){
    let e = encomendas[index]; 
    let janela = window.open("", "", "width=350,height=500"); 
    let dataFormatada = ""; 
    if(e.dataChegada) { 
        let p = e.dataChegada.split('-'); 
        dataFormatada = p[2] + '/' + p[1] + '/' + p[0]; 
    }
    let horaFormatada = e.horaChegada ? e.horaChegada : ""; 
    let vol = e.volumes || "1"; 
    let ident = e.id || "Antigo";
    
    janela.document.write(`<html><head><title>Etiqueta Padrão</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:10px;margin:0;} h1{margin:5px 0;font-size:32px;border-bottom:2px solid #000;padding-bottom:5px;} h2{margin:10px 0 5px 0;font-size:20px;} p{margin:5px 0;font-size:16px;} .rodape{font-size:10px;margin-top:20px;color:#555;} .btn-imprimir{margin-top:30px;padding:12px 20px;background:#000;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;font-weight:bold;width:80%;} @media print{.btn-imprimir{display:none !important;}}</style></head><body><h1>AP ${e.apto}</h1><h2>${e.morador}</h2><p><b>Transp:</b> ${e.transportadora}</p><p><b>Vols:</b> ${vol}</p><p style="font-size: 14px; margin-top: 15px;">📅 ${dataFormatada} às ${horaFormatada}</p><p class="rodape">ID: ${ident}</p><button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir Etiqueta</button><p style="font-size: 11px; color: #888; margin-top: 5px;" class="btn-imprimir">Feche a janela após imprimir.</p><script> window.onload = function() { window.print(); }; window.onafterprint = function() { window.close(); }; <\/script></body></html>`);
    janela.document.close();
}

function imprimirSoQRCode(index){
    let e = encomendas[index]; 
    let janela = window.open("", "", "width=300,height=380"); 
    let ident = e.id || "Antigo"; 
    let qrImgTag = "";
    
    if(e.id && e.id !== "undefined") { 
        let linkSistema = window.location.href.split("?")[0] + "?baixar=" + e.id; 
        let tempCanvas = document.createElement("canvas"); 
        new QRious({ element: tempCanvas, value: linkSistema, size: 200, level: "H" }); 
        qrImgTag = `<img src="${tempCanvas.toDataURL()}" style="margin-bottom: 5px;">`; 
    }
    
    janela.document.write(`<html><head><title>Etiqueta QR Code</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:0;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;} .rodape{font-size:18px;font-weight:bold;margin:0;} .sub-rodape{font-size:12px;color:#555;margin-top:3px;} .btn-imprimir{margin-top:20px;padding:10px 20px;background:#000;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:bold;} @media print{.btn-imprimir{display:none !important;}}</style></head><body>${qrImgTag}<p class="rodape">AP ${e.apto}</p><p class="sub-rodape">ID: ${ident}</p><button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir</button><script> window.onload = function() { window.print(); }; window.onafterprint = function() { window.close(); }; <\/script></body></html>`);
    janela.document.close();
}

// ==========================================
// LEITOR DE QR CODE (HTML5-QRCode)
// ==========================================
let html5QrCode;

function iniciarLeitorQR() {
    const boxCamera = document.getElementById('box-camera-qr');
    if (boxCamera) boxCamera.style.display = 'block';

    html5QrCode = new Html5Qrcode("leitor-qr");

    html5QrCode.start(
        { facingMode: "environment" }, 
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (codigoLido, decodedResult) => {
            // Toca um som de bipe rápido
            tocarBipe();
            
            // Joga o código lido na barra de pesquisa e filtra
            const barraPesquisa = document.getElementById('pesquisaEncomenda');
            if (barraPesquisa) {
                barraPesquisa.value = codigoLido;
                if (typeof filtrarEncomendas === 'function') {
                    filtrarEncomendas(); 
                }
            }
            
            fecharLeitorQR();
            alert(`📦 Pacote Encontrado! Código: ${codigoLido}`);
        },
        (mensagemErro) => {
            // Fica procurando em silêncio...
        }
    ).catch((err) => {
        console.error("Erro na Câmera: ", err);
        alert("⚠️ Erro ao abrir a câmera. Verifique se você deu permissão no navegador.");
    });
}

function fecharLeitorQR() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('box-camera-qr').style.display = 'none';
        }).catch(err => console.error("Erro ao desligar câmera", err));
    } else {
        document.getElementById('box-camera-qr').style.display = 'none';
    }
}

function tocarBipe() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
}
