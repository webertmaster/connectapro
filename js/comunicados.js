// ==========================================
// ZERO LABS - CONDO UP (NUVEM FIREBASE)
// comunicados.js - Mural de Avisos (MULTI-TENANT ATIVO)
// ==========================================

let comunicadosGlobais = [];
let idComunicadoEditandoFirebase = null;

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO)
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
        db.collection("comunicados").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            comunicadosGlobais = [];
            snapshot.forEach((doc) => {
                let c = doc.data();
                c.idFirebase = doc.id;
                comunicadosGlobais.push(c);
            });
            
            // 3. Ordena os comunicados do mais novo para o mais antigo localmente
            comunicadosGlobais.sort((a, b) => new Date(b.dataRegistro) - new Date(a.dataRegistro));
            
            atualizarListaComunicados();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    } else {
        console.error("Firebase DB não encontrado.");
    }
});

// ==========================================
// 2. SALVAR E EDITAR NA NUVEM
// ==========================================
function salvarComunicado() {
    const tipo = document.getElementById('tipoComunicado').value;
    const status = document.getElementById('statusComunicado').value;
    const titulo = document.getElementById('tituloComunicado').value.trim();
    const data = document.getElementById('dataComunicado').value;
    const hora = document.getElementById('horaComunicado').value;
    const local = document.getElementById('localComunicado').value.trim();
    const mensagem = document.getElementById('mensagemComunicado').value.trim();

    if (!titulo || !mensagem) {
        alert('⚠️ O Título e a Mensagem do comunicado são obrigatórios!');
        return;
    }

    const btnSalvar = document.querySelector("#comunicados .btn[onclick='salvarComunicado()']") || document.getElementById('btnSalvarComunicado');
    let textoOriginal = idComunicadoEditandoFirebase ? '<i class="fa-solid fa-floppy-disk"></i> Salvar Alterações' : (btnSalvar ? btnSalvar.innerHTML : 'Publicar Comunicado');

    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosComunicado = {
        tipo,
        status,
        titulo,
        dataEvento: data,
        horaEvento: hora,
        local: local || 'Geral',
        mensagem,
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    if (idComunicadoEditandoFirebase) {
        // MODO EDIÇÃO
        db.collection("comunicados").doc(idComunicadoEditandoFirebase).update(dadosComunicado)
            .then(() => {
                alert('✅ Comunicado atualizado com sucesso no mural!');
                finalizarAcaoComunicado(btnSalvar, '<i class="fa-solid fa-bullhorn"></i> Publicar Comunicado');
                idComunicadoEditandoFirebase = null;
            }).catch(err => {
                alert("Erro ao atualizar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    } else {
        // MODO NOVO COMUNICADO
        dadosComunicado.dataRegistro = new Date().toISOString();
        dadosComunicado.excluido = false; // Soft Delete

        db.collection("comunicados").add(dadosComunicado)
            .then(() => {
                alert('📢 Comunicado publicado com sucesso na nuvem!');
                finalizarAcaoComunicado(btnSalvar, textoOriginal);
            }).catch(err => {
                alert("Erro ao publicar: " + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    }
}

function finalizarAcaoComunicado(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = textoFinal;
        btnNode.style.background = "#3b82f6"; // Volta para o azul padrão
        btnNode.style.pointerEvents = 'auto';
    }
    document.getElementById('tipoComunicado').value = '📢 Geral';
    document.getElementById('statusComunicado').value = '🟡 Pendente';
    document.getElementById('tituloComunicado').value = '';
    document.getElementById('dataComunicado').value = '';
    document.getElementById('horaComunicado').value = '';
    document.getElementById('localComunicado').value = '';
    document.getElementById('mensagemComunicado').value = '';
}

// ==========================================
// 3. AÇÕES (RESOLVER, EDITAR, ARQUIVAR)
// ==========================================
function resolverComunicado(idFirebase) {
    if(confirm('Tem certeza que deseja marcar este assunto como Resolvido?')) {
        db.collection("comunicados").doc(idFirebase).update({ status: '🟢 Resolvido' })
            .catch(err => alert("Erro ao atualizar status: " + err));
    }
}

function prepararEdicaoComunicado(idFirebase) {
    let c = comunicadosGlobais.find(com => com.idFirebase === idFirebase);
    if (!c) return;

    document.getElementById('tipoComunicado').value = c.tipo;
    document.getElementById('statusComunicado').value = c.status;
    document.getElementById('tituloComunicado').value = c.titulo;
    document.getElementById('dataComunicado').value = c.dataEvento || '';
    document.getElementById('horaComunicado').value = c.horaEvento || '';
    document.getElementById('localComunicado').value = c.local === 'Geral' ? '' : c.local;
    document.getElementById('mensagemComunicado').value = c.mensagem;

    const btnSalvar = document.querySelector("#comunicados .btn[onclick='salvarComunicado()']") || document.getElementById('btnSalvarComunicado');
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; // Verde para indicar modo de edição
    }

    idComunicadoEditandoFirebase = idFirebase;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirComunicado(idFirebase) {
    if(confirm('🚨 Arquivar Comunicado: Ocultar esta mensagem do mural da portaria?')) {
        db.collection("comunicados").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        }).catch(err => alert("Erro ao arquivar: " + err));
    }
}

// ==========================================
// 4. RENDERIZAR MURAL
// ==========================================
function atualizarListaComunicados() {
    const lista = document.getElementById('listaComunicados');
    if (!lista) return;

    // LÊ O CRACHÁ PARA DEFINIR A PERMISSÃO DOS BOTÕES
    const cargo = localStorage.getItem("usuario_cargo");

    // Mostra apenas comunicados ativos
    const ativos = comunicadosGlobais.filter(c => !c.excluido);
    lista.innerHTML = '';

    if (ativos.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-envelope-open-text" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum comunicado ativo no mural.</p></div>';
        return;
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    // Trocamos auto-fit por auto-fill
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))'; 
    grid.style.gap = '20px';
    grid.style.marginTop = '20px';

    ativos.forEach(com => {
        let corBorda = '#3b82f6'; 
        let iconeTipo = 'fa-bullhorn';
        
        if (com.tipo.includes('Manutenção')) { corBorda = '#f59e0b'; iconeTipo = 'fa-wrench'; }
        if (com.tipo.includes('Ocorrência')) { corBorda = '#ef4444'; iconeTipo = 'fa-triangle-exclamation'; }
        if (com.tipo.includes('Assembleia')) { corBorda = '#8b5cf6'; iconeTipo = 'fa-users-rectangle'; }
        if (com.status.includes('Resolvido')) corBorda = '#10b981'; 

        const dataReg = new Date(com.dataRegistro).toLocaleDateString('pt-BR');
        const dataEvt = com.dataEvento ? com.dataEvento.split('-').reverse().join('/') : '';
        const badgeEvento = dataEvt ? `<span style="background: ${corBorda}15; color: ${corBorda}; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold;"><i class="fa-regular fa-calendar" style="margin-right: 5px;"></i>${dataEvt} às ${com.horaEvento || '--:--'}</span>` : '';

        // BLINDAGEM DOS BOTÕES DE GESTÃO (EDITAR/ARQUIVAR)
        let botoesGestaoHtml = '';
        if (cargo === 'operacional') {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="prepararEdicaoComunicado('${com.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
                </div>
            `;
        } else {
            botoesGestaoHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px;">
                    <button onclick="prepararEdicaoComunicado('${com.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button onclick="excluirComunicado('${com.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar"><i class="fa-solid fa-trash-can"></i> Arquivar</button>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = 'card';
        card.style.borderLeft = `5px solid ${corBorda}`;
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                <div>
                    <h3 style="margin: 0; font-size: 18px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid ${iconeTipo}" style="color: ${corBorda};"></i>${com.titulo}
                    </h3>
                    <span style="font-size: 11px; color: #94a3b8; display: block; margin-top: 5px;">Publicado em ${dataReg}</span>
                </div>
                <span class="badge" style="background: ${corBorda}; color: white; margin-bottom: 0; padding: 4px 10px; font-size: 11px; border-radius: 20px;">${com.tipo.replace('📢', '').replace('🔧', '').replace('🚨', '').replace('👥', '').trim()}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                ${badgeEvento}
                <span style="font-size: 13px; color: #475569; font-weight: bold; display: flex; align-items: center; gap: 5px;"><i class="fa-solid fa-location-dot" style="color: #ef4444;"></i> ${com.local}</span>
            </div>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; color: #334155; font-size: 14px; line-height: 1.6; border: 1px solid #e2e8f0; border-left: 3px solid ${corBorda}; margin-bottom: 15px; white-space: pre-wrap; font-style: italic;">
                <i class="fa-solid fa-quote-left" style="color: #cbd5e1; margin-right: 5px; font-size: 16px;"></i>${com.mensagem}
            </div>
            
            <div style="display: grid; grid-template-columns: ${!com.status.includes('Resolvido') ? '1fr' : '1fr'}; gap: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                ${!com.status.includes('Resolvido') ? `<button onclick="resolverComunicado('${com.idFirebase}')" style="background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'"><i class="fa-solid fa-check"></i> Marcar como Resolvido</button>` : `<div style="text-align: center; color: #10b981; font-weight: bold; font-size: 14px; padding: 5px 0; background: #ecfdf5; border-radius: 8px; border: 1px solid #d1fae5;"><i class="fa-solid fa-circle-check"></i> Assunto Resolvido</div>`}
            </div>
            
            ${botoesGestaoHtml}
        `;
        grid.appendChild(card);
    });

    lista.appendChild(grid);
}
