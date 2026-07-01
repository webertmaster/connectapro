// ==========================================
// EVO UPI - CONDO UP
// equipe.js - Gestão de Equipe na Nuvem (MULTI-TENANT ATIVO)
// ==========================================

let equipeGlobais = [];
let idFuncionarioEditando = null;

// ==========================================
// MOTOR DE ASSINATURA DIGITAL
// ==========================================
let canvas, ctx, desenhando = false;

window.addEventListener('DOMContentLoaded', () => {
    // 1. Prepara o Quadro de Assinatura
    canvas = document.getElementById('quadroAssinatura');
    if(canvas) {
        // 🚀 CORREÇÃO: Força a resolução interna para não bugar com a aba oculta
        canvas.width = 600; 
        canvas.height = 150;
        
        ctx = canvas.getContext('2d');
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#0f172a';

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            // Calcula a proporção real entre o tamanho visível e a resolução interna
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { 
                x: (clientX - rect.left) * scaleX, 
                y: (clientY - rect.top) * scaleY 
            };
        };

        const start = (e) => { e.preventDefault(); desenhando = true; const {x,y} = getPos(e); ctx.beginPath(); ctx.moveTo(x, y); };
        const draw = (e) => { e.preventDefault(); if(!desenhando) return; const {x,y} = getPos(e); ctx.lineTo(x, y); ctx.stroke(); };
        const stop = (e) => { e.preventDefault(); desenhando = false; };

        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stop);
        canvas.addEventListener('mouseout', stop);

        canvas.addEventListener('touchstart', start, {passive: false});
        canvas.addEventListener('touchmove', draw, {passive: false});
        canvas.addEventListener('touchend', stop);
    }

    // 2. Carrega a lista de Funcionários
    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio) return;

    if (typeof db !== 'undefined') {
        db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            equipeGlobais = [];
            snapshot.forEach((doc) => {
                let func = doc.data();
                func.id = doc.id;
                equipeGlobais.push(func);
            });
            
            equipeGlobais.sort((a, b) => a.nome.localeCompare(b.nome));
            localStorage.setItem('equipe', JSON.stringify(equipeGlobais));
            atualizarListaEquipe();
            if(typeof atualizarSelectsEquipe === 'function') atualizarSelectsEquipe();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

function limparAssinatura() {
    if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Verifica se o quadro de assinatura está em branco
function isCanvasBlank(canvas) {
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    return canvas.toDataURL() === blank.toDataURL();
}

// ==========================================
// SALVAR E EDITAR NA NUVEM
// ==========================================
function addFuncionario() {
    const nome = document.getElementById('funcNome').value.trim();
    const cargo = document.getElementById('funcCargo').value.trim();
    const cpfEl = document.getElementById('funcCpf');
    const cpf = cpfEl ? cpfEl.value.trim() : "";

    if (!nome || !cargo || !cpf) {
        alert('⚠️ Nome, Cargo e CPF são obrigatórios!');
        return;
    }

    // CAPTURA A IMAGEM DO QUADRO DE ASSINATURA
    let assinaturaBase64 = null;
    if (canvas && !isCanvasBlank(canvas)) {
        assinaturaBase64 = canvas.toDataURL("image/png");
    } else if (!idFuncionarioEditando) {
        alert('⚠️ Por favor, peça para o funcionário assinar no quadro antes de salvar o cadastro.');
        return;
    }

    const meuCondominio = localStorage.getItem("condominioId");

    if (idFuncionarioEditando) {
        // MODO EDIÇÃO
        let dadosUpdate = { nome: nome, cargo: cargo, cpf: cpf };
        
        // Se ele desenhou uma assinatura nova, atualiza. Se não, mantém a velha.
        if (assinaturaBase64) {
            dadosUpdate.assinatura = assinaturaBase64;
        }

        db.collection("equipe").doc(idFuncionarioEditando).update(dadosUpdate).then(() => {
            resetarFormulario();
            alert('✅ Dados atualizados com sucesso!');
        }).catch(err => alert("Erro ao editar: " + err));

    } else {
        // MODO NOVO FUNCIONÁRIO
        db.collection("equipe").add({
            nome: nome,
            cargo: cargo,
            cpf: cpf,
            assinatura: assinaturaBase64, // <-- CARIMBO SALVO NA NUVEM!
            dataCadastro: new Date().toISOString(),
            condominioId: meuCondominio,
            excluido: false
        })
        .then(() => {
            resetarFormulario();
            alert('👥 Funcionário e Assinatura cadastrados na nuvem!');
        })
        .catch(err => alert("Erro ao salvar: " + err));
    }
}

function resetarFormulario() {
    idFuncionarioEditando = null;
    document.getElementById('funcNome').value = '';
    document.getElementById('funcCargo').value = '';
    const cpfEl = document.getElementById('funcCpf');
    if(cpfEl) cpfEl.value = '';
    
    limparAssinatura(); // Limpa o quadro branco

    const btnSalvar = document.getElementById('btnSalvarEquipe') || document.querySelector("button[onclick='addFuncionario()']");
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-plus'></i> Cadastrar Funcionário";
        btnSalvar.style.background = "#3b82f6";
    }
}

function carregarFuncionarioParaEdicao(index) {
    let func = equipeGlobais[index];
    idFuncionarioEditando = func.id;

    document.getElementById('funcNome').value = func.nome;
    document.getElementById('funcCargo').value = func.cargo;
    
    const cpfEl = document.getElementById('funcCpf');
    if(cpfEl) cpfEl.value = func.cpf || '';

    limparAssinatura(); // Zera para não sobrescrever sem querer

    const btnSalvar = document.getElementById('btnSalvarEquipe') || document.querySelector("button[onclick='addFuncionario()']");
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; 
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// RENDERIZAÇÃO DE LISTA DE EQUIPE
// ==========================================
function atualizarListaEquipe() {
    const lista = document.getElementById('listaEquipe');
    if (!lista) return;
    lista.innerHTML = '';

    if (equipeGlobais.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-users-slash" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum funcionário cadastrado.</p></div>';
        return;
    }

    const cargoUsuario = localStorage.getItem("usuario_cargo");
    const categorias = {
        "Administração": ['Síndico', 'Gerente', 'Admin', 'Sub-síndico', 'Administrador(a)'],
        "Portaria e Segurança": ['Porteiro', 'Segurança', 'Vigilante', 'Porteiro Diurno', 'Porteiro Noturno'],
        "Manutenção e Limpeza": ['Zelador', 'Limpeza', 'Faxina', 'Manutenção', 'Auxiliar de Limpeza']
    };

    const grupos = {};
    equipeGlobais.forEach((func, index) => {
        let catEncontrada = "Outros";
        for (let cat in categorias) {
            if (categorias[cat].some(palavraChave => func.cargo.includes(palavraChave))) {
                catEncontrada = cat;
                break;
            }
        }
        if (!grupos[catEncontrada]) grupos[catEncontrada] = [];
        grupos[catEncontrada].push({ func, index });
    });

    const ordemExibicao = ["Administração", "Portaria e Segurança", "Manutenção e Limpeza", "Outros"];

    ordemExibicao.forEach(nomeGrupo => {
        if (grupos[nomeGrupo] && grupos[nomeGrupo].length > 0) {
            const tituloSessao = document.createElement('h2');
            tituloSessao.style.cssText = "grid-column: 1 / -1; margin-top: 25px; margin-bottom: 10px; font-size: 18px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;";
            
            let iconTitulo = 'fa-users';
            if(nomeGrupo === "Administração") iconTitulo = 'fa-building-user';
            if(nomeGrupo === "Portaria e Segurança") iconTitulo = 'fa-shield-halved';
            if(nomeGrupo === "Manutenção e Limpeza") iconTitulo = 'fa-toolbox';
            
            tituloSessao.innerHTML = `<i class="fa-solid ${iconTitulo}" style="color: #94a3b8;"></i> ${nomeGrupo}`;
            lista.appendChild(tituloSessao);

            const gridSessao = document.createElement('div');
            gridSessao.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; grid-column: 1 / -1;";

            grupos[nomeGrupo].forEach(item => {
                const func = item.func;
                const index = item.index;

                let corBadge = '#3b82f6', icone = 'fa-user';
                if (nomeGrupo === "Portaria e Segurança") { corBadge = '#10b981'; icone = 'fa-user-shield'; }
                else if (nomeGrupo === "Manutenção e Limpeza") { corBadge = '#f59e0b'; icone = 'fa-broom'; }
                else if (nomeGrupo === "Administração") { corBadge = '#8b5cf6'; icone = 'fa-user-tie'; }

                // ADICIONA O SELO DE ASSINATURA NO CARD
                let assinaturaBadge = func.assinatura 
                    ? `<span style="background: #ecfdf5; color: #059669; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; border: 1px solid #34d399;"><i class="fa-solid fa-check"></i> Assinatura Salva</span>` 
                    : `<span style="background: #fef2f2; color: #dc2626; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; border: 1px solid #f87171;"><i class="fa-solid fa-xmark"></i> Sem Assinatura</span>`;

                let botoesGestaoHtml = '';
                if (cargoUsuario === 'operacional') {
                    botoesGestaoHtml = `
                        <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                            <button onclick="carregarFuncionarioParaEdicao(${index})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Funcionário">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                        </div>
                    `;
                } else {
                    botoesGestaoHtml = `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            <button onclick="carregarFuncionarioParaEdicao(${index})" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Funcionário">
                                <i class="fa-solid fa-pen"></i> Editar
                            </button>
                            <button onclick="excluirFuncionario('${func.id}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Remover Funcionário">
                                <i class="fa-solid fa-trash-can"></i> Remover
                            </button>
                        </div>
                    `;
                }

                const card = document.createElement('div');
                card.className = 'card';
                card.style.borderLeft = `5px solid ${corBadge}`;
                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                        <h3 style="margin: 0; color: #1e293b; font-size: 18px; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid ${icone}" style="color: ${corBadge};"></i>${func.nome}
                        </h3>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #f1f5f9;">
                        <p style="font-size: 15px; color: #0f172a; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-id-card-clip" style="color: #64748b; width: 15px;"></i> 
                                <strong>Cargo:</strong> <span style="background: ${corBadge}20; color: ${corBadge}; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 13px;">${func.cargo}</span>
                            </span>
                        </p>
                        <p style="font-size: 14px; color: #475569; display: flex; align-items: center; justify-content: space-between; margin: 0;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fa-solid fa-address-card" style="color: #64748b; width: 15px;"></i>
                                <strong>CPF:</strong> ${func.cpf || 'Não informado'}
                            </span>
                            ${assinaturaBadge}
                        </p>
                    </div>
                    
                    ${botoesGestaoHtml}
                `;
                gridSessao.appendChild(card);
            });
            lista.appendChild(gridSessao);
        }
    });
}

function excluirFuncionario(id) {
    if(confirm('🚨 Remover funcionário permanentemente da nuvem?')) {
        db.collection("equipe").doc(id).delete().catch(err => alert("Erro: " + err));
    }
}
