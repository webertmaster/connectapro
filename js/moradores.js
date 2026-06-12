// ==========================================
// ZERO LABS - CONNECTA PRO (NUVEM FIREBASE)
// moradores.js - Gestão Premium de Moradores (MULTI-TENANT ATIVO)
// ==========================================

let idMoradorEditandoFirebase = null; 
let moradoresGlobais = []; 

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (NUVEM COM FILTRO DE CONDOMÍNIO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return; // Trava tudo se o cara não tiver um condomínio
    }

    if (typeof db !== 'undefined') {
        // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
        db.collection("moradores").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            moradoresGlobais = [];
            snapshot.forEach((doc) => {
                let morador = doc.data();
                morador.id = doc.id; 
                moradoresGlobais.push(morador);
            });
            
            // 3. Ordena por apartamento direto no JavaScript (Evita erro de Índice no Firebase)
            moradoresGlobais.sort((a, b) => a.apto.localeCompare(b.apto, undefined, {numeric: true}));
            
            localStorage.setItem('moradores', JSON.stringify(moradoresGlobais));
            
            atualizarListaMoradores();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    } else {
        console.error("Firebase DB não encontrado. Verifique o index.html");
    }
});

// ==========================================
// 2. ADICIONAR / ATUALIZAR NA NUVEM
// ==========================================
function addMorador() {
    const nome = document.getElementById('nome').value.trim();
    const apto = document.getElementById('apto').value.trim();
    const secretaria = document.getElementById('secretaria').value.trim();
    const visitantes = document.getElementById('visitantes').value.trim();

    if (!nome || !apto) {
        alert('⚠️ Nome e Apartamento são obrigatórios!');
        return;
    }

    const btnSalvar = document.getElementById('btnSalvarMorador') || document.querySelector("button[onclick='addMorador()']");
    let textoOriginal = idMoradorEditandoFirebase ? "Cadastrar Morador" : (btnSalvar ? btnSalvar.innerText : "Salvar");
    
    if (btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosMorador = {
        nome: nome,
        apto: apto,
        secretaria: secretaria,
        visitantes: visitantes,
        dataCadastro: new Date().toISOString(),
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    if (idMoradorEditandoFirebase) {
        // MODO EDIÇÃO
        db.collection("moradores").doc(idMoradorEditandoFirebase).update(dadosMorador)
            .then(() => {
                alert('✅ Registro de morador atualizado com sucesso na nuvem!');
                finalizarAcaoMorador(btnSalvar, textoOriginal);
                idMoradorEditandoFirebase = null;
            })
            .catch(err => {
                alert('Erro ao atualizar: ' + err);
                if (btnSalvar) {
                    btnSalvar.innerHTML = textoOriginal;
                    btnSalvar.style.pointerEvents = 'auto';
                }
            });
    } else {
        // MODO CADASTRO (Nasce ativo)
        dadosMorador.excluido = false;
        
        db.collection("moradores").add(dadosMorador)
            .then(() => {
                alert('✅ Morador cadastrado com sucesso na nuvem!');
                finalizarAcaoMorador(btnSalvar, textoOriginal);
            })
            .catch(err => {
                alert('Erro ao salvar: ' + err);
                if (btnSalvar) {
                    btnSalvar.innerHTML = textoOriginal;
                    btnSalvar.style.pointerEvents = 'auto';
                }
            });
    }
}

function finalizarAcaoMorador(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = `<i class="fa-solid fa-plus"></i> ${textoFinal}`;
        btnNode.style.background = "#3b82f6"; 
        btnNode.style.pointerEvents = 'auto';
    }
    document.getElementById('nome').value = '';
    document.getElementById('apto').value = '';
    document.getElementById('secretaria').value = '';
    document.getElementById('visitantes').value = '';
}

// ==========================================
// 3. RENDERIZAR LISTA DIRETO DA NUVEM
// ==========================================
function atualizarListaMoradores(termoPesquisa = '') {
    const lista = document.getElementById('listaMoradores');
    if (!lista) return;

    const moradoresAtivos = moradoresGlobais.filter(m => !m.excluido);
    lista.innerHTML = '';

    if (moradoresAtivos.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-house-chimney-user" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum morador ativo cadastrado.</p></div>';
        return;
    }

    const aptos = {};
    moradoresAtivos.forEach(m => {
        if (!aptos[m.apto]) aptos[m.apto] = [];
        aptos[m.apto].push(m);
    });

    const grid = document.createElement('div');
    grid.className = 'apto-grid';

    Object.keys(aptos).sort().forEach(numeroApto => {
        const moradoresDoApto = aptos[numeroApto];
        
        const atendePesquisa = moradoresDoApto.some(m => 
            m.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) || 
            m.apto.toLowerCase().includes(termoPesquisa.toLowerCase())
        );

        if (termoPesquisa === '' || atendePesquisa) {
            const btn = document.createElement('button');
            btn.className = 'apto-btn';
            btn.textContent = numeroApto;
            btn.onclick = () => abrirModalMorador(numeroApto, moradoresDoApto);
            grid.appendChild(btn);
        }
    });

    lista.appendChild(grid);
}

function pesquisarMoradores() {
    const termo = document.getElementById('pesquisaMorador').value;
    atualizarListaMoradores(termo);
}

function abrirModalMorador(apto, moradores) {
    const modal = document.getElementById('modalMorador');
    const conteudo = document.getElementById('conteudoModalMorador');
    const veiculos = typeof veiculosGlobais !== 'undefined' ? veiculosGlobais : (JSON.parse(localStorage.getItem('veiculos')) || []);
    
    const cargo = localStorage.getItem("usuario_cargo");
    
    let html = `<h3 style="margin-bottom: 20px; color: #3b82f6; text-align: center; font-size: 24px;"><i class="fa-regular fa-building" style="margin-right: 8px; color: #64748b;"></i>Apto ${apto}</h3>`;
    
    moradores.forEach(m => {
        const carrosDoMorador = veiculos.filter(v => 
            !v.excluido && (
                v.morador.toLowerCase().trim() === m.nome.toLowerCase().trim() ||
                v.morador.toLowerCase().trim() === m.apto.toLowerCase().trim()
            )
        );

        let veiculosHtml = '';
        if (carrosDoMorador.length > 0) {
            veiculosHtml = `<p style="margin-bottom: 6px; font-size: 14px;"><i class="fa-solid fa-car-side" style="color: #f59e0b; width: 20px; text-align: center; margin-right: 5px;"></i><strong>Veículos vinculados:</strong></p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px;">`;
            
            carrosDoMorador.forEach(v => {
                veiculosHtml += `
                    <div onclick="redirecionarParaVeiculo('${v.id || v.idFirebase}')" style="cursor: pointer; background: white; border: 2px solid #1e293b; border-radius: 6px; text-align: center; font-weight: bold; width: 95px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.08); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Clique para ver a ficha completa deste carro">
                        <div style="background: #003399; color: white; font-size: 6px; display: flex; justify-content: space-between; padding: 1px 4px; letter-spacing: 0.5px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Mercosur_flag.svg/120px-Mercosur_flag.svg.png" style="height: 5px; opacity: 0.9;">
                            <span>BRASIL</span>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Flag_of_Brazil.svg/120px-Flag_of_Brazil.svg.png" style="height: 5px; opacity: 0.9;">
                        </div>
                        <div style="font-size: 12px; padding: 2px 0; letter-spacing: 0.5px; color: #1e293b; background: white;">${v.placa}</div>
                    </div>
                `;
            });
            veiculosHtml += `</div>`;
        } else {
            veiculosHtml = `<p style="margin-bottom: 12px; font-size: 14px;"><i class="fa-solid fa-car-side" style="color: #94a3b8; width: 20px; text-align: center; margin-right: 5px;"></i><strong>Veículos:</strong> <span style="color: #94a3b8; font-style: italic;">Nenhum veículo encontrado</span></p>`;
        }

        let botoesHtml = '';
        if (cargo === 'operacional') {
            botoesHtml = `
                <div style="display: grid; grid-template-columns: 1fr; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                    <button onclick="editarMoradorModal('${m.id}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Morador">
                        <i class="fa-solid fa-pen"></i> Editar Morador
                    </button>
                </div>
            `;
        } else {
            botoesHtml = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                    <button onclick="editarMoradorModal('${m.id}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'" title="Editar Morador">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button onclick="excluirMorador('${m.id}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; gap: 5px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'" title="Arquivar Morador">
                        <i class="fa-solid fa-trash-can"></i> Arquivar
                    </button>
                </div>
            `;
        }

        html += `
            <div style="background: white; padding: 18px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.01);">
                <p style="margin-bottom: 8px; font-size: 14px;">
                    <i class="fa-solid fa-user-tie" style="color: #3b82f6; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Responsável:</strong> <span style="color: #0f172a; font-weight: 600;">${m.nome}</span>
                </p>
                <p style="margin-bottom: 8px; font-size: 14px;">
                    <i class="fa-solid fa-broom" style="color: #8b5cf6; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Secretária:</strong> ${m.secretaria || '<span style="color: #94a3b8;">Nenhuma</span>'}
                </p>
                <p style="margin-bottom: 12px; font-size: 14px;">
                    <i class="fa-solid fa-users" style="color: #10b981; width: 20px; text-align: center; margin-right: 5px;"></i>
                    <strong>Autorizados:</strong> ${m.visitantes || '<span style="color: #94a3b8;">Nenhum</span>'}
                </p>
                
                ${veiculosHtml}
                
                ${botoesHtml}
            </div>
        `;
    });

    conteudo.innerHTML = html;
    modal.style.display = 'flex';
}

function editarMoradorModal(id) {
    const m = moradoresGlobais.find(mor => mor.id === id);
    if (!m) return;

    document.getElementById('nome').value = m.nome;
    document.getElementById('apto').value = m.apto;
    document.getElementById('secretaria').value = m.secretaria || '';
    document.getElementById('visitantes').value = m.visitantes || '';

    idMoradorEditandoFirebase = m.id;
    
    const btnSalvar = document.getElementById('btnSalvarMorador') || document.querySelector("button[onclick='addMorador()']");
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; 
    }

    fecharModalMorador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function fecharModalMorador() {
    document.getElementById('modalMorador').style.display = 'none';
}

// ==========================================
// 4. EXCLUIR DA NUVEM (Soft Delete)
// ==========================================
function excluirMorador(id) {
    if(confirm('🚨 Arquivar Registro: Tem certeza que deseja arquivar este morador? Ele sairá da tela principal, mas será mantido nos Relatórios de Auditoria.')) {
        db.collection("moradores").doc(id).update({
            excluido: true,
            dataExclusao: Date.now()
        })
        .then(() => {
            console.log("Morador arquivado na nuvem com sucesso.");
            fecharModalMorador();
        })
        .catch((err) => alert("Erro ao arquivar na nuvem: " + err));
    }
}

function gerarRelatorioMoradores() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text("Relatório de Moradores e Autorizados", 14, 20);
    
    const moradoresAtivos = moradoresGlobais.filter(m => !m.excluido);
    
    if (moradoresAtivos.length === 0) {
        alert("Não há moradores ativos cadastrados para gerar relatório.");
        return;
    }
    
    const dados = moradoresAtivos.map(m => [
        m.apto,
        m.nome,
        m.secretaria || '-',
        m.visitantes || '-'
    ]);

    doc.autoTable({
        startY: 30,
        head: [['Apto', 'Nome do Responsável', 'Secretária', 'Visitantes Autorizados']],
        body: dados,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, cellPadding: 4 }
    });

    doc.save("Auditoria_Moradores_Ativos.pdf");
}