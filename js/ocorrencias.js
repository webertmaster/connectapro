// ==========================================
// ZERO LABS - CONNECTA PRO (NUVEM FIREBASE)
// ocorrencias.js - Livro de Ocorrências Premium Integrado (MULTI-TENANT ATIVO)
// ==========================================

let ocorrenciasGlobais = [];
let idOcorrenciaEditandoFirebase = null;
// NOTA: Não declaramos 'equipeGlobais' aqui porque o equipe.js já faz isso!

function toggleFormOcorrencia() { 
    let form = document.getElementById("form-ocorrencia"); 
    if (form.style.display === "none" || form.style.display === "") {
        form.style.display = "block";
        carregarPorteirosOcorrencia(); 
    } else {
        form.style.display = "none";
    }
}

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

    if (typeof db !== 'undefined') {
        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("ocorrencias").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            ocorrenciasGlobais = [];
            snapshot.forEach((doc) => {
                let o = doc.data();
                o.idFirebase = doc.id; 
                ocorrenciasGlobais.push(o);
            });

            // 3. Ordena localmente pela data e hora (evita erro de índice duplo no Firebase)
            ocorrenciasGlobais.sort((a, b) => new Date(b.dataCadastro) - new Date(a.dataCadastro));

            mostrarOcorrencias(); 
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

// 🚀 PUXA OS FUNCIONÁRIOS DA VARIÁVEL DO EQUIPE.JS
function carregarPorteirosOcorrencia() {
    let select = document.getElementById("ocoPorteiro");
    if (!select) return;
    
    select.innerHTML = '<option value="" disabled selected>👮 Selecione o Responsável</option>';
    
    // Verifica se a variável equipeGlobais existe (criada no equipe.js) e tem dados
    if (typeof equipeGlobais === 'undefined' || equipeGlobais.length === 0) {
        select.innerHTML += '<option value="Sistema">Sistema (Nenhum funcionário cadastrado)</option>';
    } else {
        equipeGlobais.forEach(f => {
            select.innerHTML += `<option value="${f.nome}">${f.nome} (${f.cargo})</option>`;
        });
    }
}

// ==========================================
// 2. SALVAR E ATUALIZAR NA NUVEM
// ==========================================
function salvarOcorrencia() {
    let tipo = document.getElementById("ocoTipo").value; 
    let desc = document.getElementById("ocoDescricao").value; 
    let port = document.getElementById("ocoPorteiro").value;
    let statusSelecionado = document.getElementById("ocoStatus").value;
    let prioridade = document.getElementById("ocoPrioridade").value;
    let apto = document.getElementById("ocoApto").value; 
    let morador = document.getElementById("ocoMorador").value;

    if(!tipo || !desc || !port) return alert("⚠️ Preencha Tipo, Porteiro Responsável e Detalhes!");
    
    let btnSalvar = document.getElementById("btnSalvarOcorrencia");
    let textoOriginal = idOcorrenciaEditandoFirebase ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Ocorrência' : (btnSalvar ? btnSalvar.innerHTML : 'Salvar');
    
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    let fotoInput = document.getElementById("ocoFoto"); 
    let arquivo = fotoInput ? fotoInput.files[0] : null;
    
    if(arquivo) { 
        let leitor = new FileReader(); 
        leitor.onload = function(e){ 
            finalizarSalvamentoOcorrenciaNuvem(e.target.result, tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal); 
        }; 
        leitor.readAsDataURL(arquivo); 
    } else { 
        finalizarSalvamentoOcorrenciaNuvem("", tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal); 
    }
}

function finalizarSalvamentoOcorrenciaNuvem(foto, tipo, desc, port, statusSelecionado, prioridade, apto, morador, btnSalvar, textoOriginal) {
    let agora = new Date();
    
    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    let dadosEnviados = {
        tipo, 
        apto: apto || "", 
        morador: morador || "", 
        prioridade, 
        descricao: desc, 
        status: statusSelecionado, 
        data: agora.toISOString().split('T')[0], 
        hora: agora.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), 
        registradoPor: port,
        dataCadastro: agora.toISOString(),
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    // Só adiciona a imagem se a pessoa enviou uma nova (para não apagar a antiga na edição se ela não mexer na foto)
    if (foto) dadosEnviados.foto = foto;

    if (idOcorrenciaEditandoFirebase) {
        // MODO EDIÇÃO
        db.collection("ocorrencias").doc(idOcorrenciaEditandoFirebase).update(dadosEnviados)
            .then(() => {
                alert("✅ Ocorrência atualizada com sucesso na nuvem!");
                finalizarFormularioOcorrencia(btnSalvar, '<i class="fa-solid fa-floppy-disk"></i> Salvar Ocorrência');
                idOcorrenciaEditandoFirebase = null;
            }).catch(err => {
                alert("Erro ao atualizar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    } else {
        // MODO NOVO REGISTRO
        dadosEnviados.excluido = false; // Soft Delete
        db.collection("ocorrencias").add(dadosEnviados)
            .then(() => {
                alert("🚨 Ocorrência registrada na nuvem!");
                finalizarFormularioOcorrencia(btnSalvar, textoOriginal);
            }).catch(err => {
                alert("Erro ao registrar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    }
}

function finalizarFormularioOcorrencia(btnSalvar, textoFinal) {
    if(btnSalvar) { 
        btnSalvar.innerHTML = textoFinal; 
        btnSalvar.style.background = "#3b82f6"; // Volta o botão pro azul
        btnSalvar.style.pointerEvents = 'auto'; 
    }
    document.getElementById("ocoTipo").value = ''; document.getElementById("ocoDescricao").value = ''; 
    document.getElementById("ocoApto").value = ''; document.getElementById("ocoMorador").value = '';
    document.getElementById("ocoPorteiro").value = ''; 
    let fotoInput = document.getElementById("ocoFoto"); if(fotoInput) fotoInput.value = '';
    
    // Esconde o formulário após salvar para limpar a tela
    let form = document.getElementById("form-ocorrencia"); 
    if (form) form.style.display = "none";
}

// ==========================================
// 3. AÇÕES RÁPIDAS (RESOLVER E EDITAR)
// ==========================================
function resolverOcorrencia(idFirebase) {
    if(confirm("Deseja marcar esta ocorrência como Resolvida?")) {
        db.collection("ocorrencias").doc(idFirebase).update({ status: "🟢 Resolvido" }).catch(err => alert("Erro: " + err));
    }
}

function prepararEdicaoOcorrencia(idFirebase) {
    let o = ocorrenciasGlobais.find(oco => oco.idFirebase === idFirebase);
    if(!o) return;

    let form = document.getElementById("form-ocorrencia");
    if(form && (form.style.display === "none" || form.style.display === "")) toggleFormOcorrencia();

    setTimeout(() => {
        document.getElementById("ocoTipo").value = o.tipo; 
        document.getElementById("ocoDescricao").value = o.descricao;
        document.getElementById("ocoApto").value = o.apto || "";
        document.getElementById("ocoMorador").value = o.morador || ""; 
        document.getElementById("ocoPrioridade").value = o.prioridade;
        
        let selectPorteiro = document.getElementById("ocoPorteiro");
        if(selectPorteiro) selectPorteiro.value = o.registradoPor;
        
        let comboStatus = document.getElementById("ocoStatus");
        if(comboStatus) {
            for(let i=0; i<comboStatus.options.length; i++) { 
                if(comboStatus.options[i].value === o.status) { comboStatus.selectedIndex = i; break; } 
            }
        }
        
        let btnSalvar = document.getElementById("btnSalvarOcorrencia");
        if(btnSalvar) {
            btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
            btnSalvar.style.background = "#10b981"; // Verde de Edição
        }
        
        idOcorrenciaEditandoFirebase = idFirebase; 
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
}

// ==========================================
// 4. EXCLUIR (SOFT DELETE) E ESTATÍSTICAS
// ==========================================
function excluirOco(idFirebase) { 
    if(confirm("🚨 Arquivar Registro: Tem certeza que deseja arquivar esta ocorrência? Ela sairá do painel, mas será mantida nos relatórios da auditoria.")) { 
        db.collection("ocorrencias").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).catch(err => alert("Erro ao arquivar: " + err));
    } 
}

// ==========================================
// 5. RENDERIZAR NA TELA (DESIGN PADRÃO PREMIUM)
// ==========================================
function mostrarOcorrencias(filtro="") {
    let lista = document.getElementById("listaOcorrencias"); 
    if(!lista) return; 
    lista.innerHTML = "";
    
    lista.style.display = "grid";
    lista.style.gridTemplateColumns = "repeat(auto-fit, minmax(300px, 1fr))";
    lista.style.gap = "15px";
    lista.style.alignItems = "start";

    let urg = 0, abertos = 0, res = 0, hoje = 0; 
    let dHoje = new Date().toISOString().split('T')[0];
    
    // LÊ O CRACHÁ DO USUÁRIO LOGADO PARA SEGURANÇA NOS BOTÕES
    const cargo = localStorage.getItem("usuario_cargo");
    
    // Trabalhamos sempre com a base de dados sincronizada da Nuvem
    const ocorrencias = ocorrenciasGlobais;

    ocorrencias.forEach((o) => {
        if (o.excluido === true) return; // Soft Delete: Oculta da tela da portaria
        
        let conteudoBuscavel = `${o.tipo} ${o.apto} ${o.morador} ${o.descricao} ${o.registradoPor}`.toLowerCase(); 
        if(filtro && !conteudoBuscavel.includes(filtro.toLowerCase())) return;
        
        if(o.prioridade === "Alta" && !o.status.includes("Resolvido")) urg++; 
        if(o.status.includes("Pendente") || o.status === "Em aberto") abertos++; 
        if(o.status.includes("Resolvido")) res++; 
        if(o.data === dHoje) hoje++;
        
        let corBorda = "#cbd5e1"; let classeBadge = ""; let iconeStatus = "";
        if (o.status.includes("Não Resolvido") || o.status.includes("🔴")) { corBorda = "#ef4444"; classeBadge = "status-urgente"; iconeStatus = '<i class="fa-solid fa-circle-exclamation"></i> '; } 
        else if (o.status.includes("Pendente") || o.status === "Em aberto" || o.status.includes("🟡")) { corBorda = "#f59e0b"; classeBadge = "status-pendente"; iconeStatus = '<i class="fa-solid fa-clock-rotate-left"></i> '; } 
        else if (o.status.includes("Resolvido") || o.status.includes("🟢")) { corBorda = "#10b981"; classeBadge = "status-entregue"; iconeStatus = '<i class="fa-solid fa-circle-check"></i> '; }
        
        let dataFormatada = o.data ? o.data.split('-').reverse().join('/') : "Data Indefinida";

        // BLINDAGEM DOS BOTÕES INFERIORES BASEADO NO CARGO
        let botoesAcaoHtml = '';
        if (cargo === 'operacional') {
            botoesAcaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="prepararEdicaoOcorrencia('${o.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
                </div>
            `;
        } else {
            botoesAcaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="prepararEdicaoOcorrencia('${o.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button onclick="excluirOco('${o.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar"><i class="fa-solid fa-trash-can"></i> Arquivar</button>
                </div>
            `;
        }

        lista.innerHTML += `
        <div class="card" style="border-left: 5px solid ${corBorda}; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; color: #0f172a; display: flex; flex-direction: column; gap: 5px;">
                    <div><i class="fa-solid fa-triangle-exclamation" style="color: ${corBorda}; margin-right: 8px; font-size: 18px;"></i>${o.tipo}</div>
                    <span style="font-size: 11px; color: #64748b; font-weight: normal; background: #f1f5f9; padding: 2px 8px; border-radius: 12px; border: 1px solid #e2e8f0; width: fit-content;">Prioridade: ${o.prioridade}</span>
                </h3>
                <span class="badge ${classeBadge}" style="margin: 0; padding: 5px 10px; font-size: 11px; border-radius: 20px;">${iconeStatus}${o.status.replace('🔴', '').replace('🟡', '').replace('🟢', '')}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 14px; color: #475569; margin-bottom: 15px; background: rgba(241, 245, 249, 0.5); padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-building" style="color: #3b82f6; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Local:</b>&nbsp; <span style="color: #0f172a;">${o.apto || 'Área Comum'}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-clock" style="color: #8b5cf6; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Data:</b>&nbsp; <span style="color: #0f172a;">${dataFormatada} ${o.hora ? `às ${o.hora}` : ''}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-user" style="color: #f59e0b; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Morador:</b>&nbsp; <span style="color: #0f172a;">${o.morador || 'N/A'}</span></p>
                <p style="margin: 0; display: flex; align-items: center;"><i class="fa-solid fa-user-shield" style="color: #10b981; width: 20px; text-align: center; margin-right: 5px;"></i> <b>Porteiro:</b>&nbsp; <span style="color: #0f172a;">${o.registradoPor || 'Sistema'}</span></p>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; font-style: italic; font-size: 14px; color: #334155; border-left: 3px solid #cbd5e1; line-height: 1.5;">
                <i class="fa-solid fa-quote-left" style="color: #cbd5e1; margin-right: 8px; font-size: 16px;"></i> ${o.descricao}
            </div>
            
            ${o.foto ? `<img src="${o.foto}" class="foto" style="max-height: 180px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #e2e8f0; width: 100%; object-fit: cover; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">` : ''}
            
            <div style="display: grid; grid-template-columns: ${!o.status.includes("Resolvido") ? '1fr' : '1fr'}; gap: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                ${!o.status.includes("Resolvido") ? `<button onclick="resolverOcorrencia('${o.idFirebase}')" style="background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fa-solid fa-check"></i> Marcar como Resolvida</button>` : ''}
            </div>
            
            ${botoesAcaoHtml}
        </div>`;
    });
    
    let sUrg = document.getElementById("stat-urgente"); if(sUrg) sUrg.innerText = urg; 
    let sAb = document.getElementById("stat-aberto"); if(sAb) sAb.innerText = abertos;
    let sRes = document.getElementById("stat-resolvida"); if(sRes) sRes.innerText = res; 
    let sHj = document.getElementById("stat-hoje"); if(sHj) sHj.innerText = hoje;
}

function pesquisarOcorrencias() { mostrarOcorrencias(document.getElementById("pesquisaOcorrencia").value); }

function gerarRelatorioOcorrencias() { 
    alert("Para gerar o relatório completo com todos os dados da Nuvem, utilize a aba de Relatórios do sistema!");
}