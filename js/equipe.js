// ==========================================
// ZERO LABS - CONNECTA PRO
// equipe.js - Gestão de Equipe na Nuvem (MULTI-TENANT ATIVO)
// ==========================================

let equipeGlobais = [];
let idFuncionarioEditando = null; // Controla se estamos adicionando ou editando

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL (FIREBASE COM FILTRO)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        console.error("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    if (typeof db !== 'undefined') {
        // Filtra a equipe para mostrar apenas os funcionários do condomínio logado
        db.collection("equipe").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            equipeGlobais = [];
            snapshot.forEach((doc) => {
                let func = doc.data();
                func.id = doc.id; // ID do Firebase
                equipeGlobais.push(func);
            });
            
            // Ordena a equipe alfabeticamente para organização do painel
            equipeGlobais.sort((a, b) => a.nome.localeCompare(b.nome));
            
            localStorage.setItem('equipe', JSON.stringify(equipeGlobais));
            atualizarListaEquipe();
            if(typeof atualizarSelectsEquipe === 'function') atualizarSelectsEquipe();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    }
});

function addFuncionario() {
    const nome = document.getElementById('funcNome').value.trim();
    const cargo = document.getElementById('funcCargo').value.trim();

    if (!nome || !cargo) {
        alert('⚠️ O Nome e o Cargo são obrigatórios!');
        return;
    }

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    if (idFuncionarioEditando) {
        // MODO EDIÇÃO
        db.collection("equipe").doc(idFuncionarioEditando).update({
            nome,
            cargo
        }).then(() => {
            idFuncionarioEditando = null;
            
            // Volta o botão para o visual original
            const btnSalvar = document.querySelector("button[onclick='addFuncionario()']");
            if (btnSalvar) {
                btnSalvar.innerHTML = "<i class='fa-solid fa-plus'></i> Adicionar";
                btnSalvar.style.background = "#3b82f6";
            }
            
            document.getElementById('funcNome').value = '';
            document.getElementById('funcCargo').value = '';
            alert('✅ Dados do funcionário atualizados na nuvem!');
        }).catch(err => alert("Erro ao editar: " + err));

    } else {
        // MODO NOVO FUNCIONÁRIO
        db.collection("equipe").add({
            nome,
            cargo,
            dataCadastro: new Date().toISOString(),
            condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
        })
        .then(() => {
            document.getElementById('funcNome').value = '';
            document.getElementById('funcCargo').value = '';
            alert('👥 Funcionário cadastrado na nuvem!');
        })
        .catch(err => alert("Erro ao salvar: " + err));
    }
}

function carregarFuncionarioParaEdicao(index) {
    let func = equipeGlobais[index];
    idFuncionarioEditando = func.id;

    document.getElementById('funcNome').value = func.nome;
    document.getElementById('funcCargo').value = func.cargo;

    // Altera visualmente o botão para mostrar que é uma edição
    const btnSalvar = document.querySelector("button[onclick='addFuncionario()']");
    if (btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; // Verde para confirmar edição
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function atualizarListaEquipe() {
    const lista = document.getElementById('listaEquipe');
    if (!lista) return;
    lista.innerHTML = '';

    if (equipeGlobais.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-users-slash" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum funcionário cadastrado.</p></div>';
        return;
    }

    // LÊ O CRACHÁ PARA DEFINIR A PERMISSÃO DOS BOTÕES
    const cargoUsuario = localStorage.getItem("usuario_cargo");

    // 1. Dicionário inteligente de categorias
    const categorias = {
        "Administração": ['Síndico', 'Gerente', 'Admin', 'Sub-síndico'],
        "Portaria e Segurança": ['Porteiro', 'Segurança', 'Vigilante'],
        "Manutenção e Limpeza": ['Zelador', 'Limpeza', 'Faxina', 'Manutenção']
    };

    // 2. Agrupando a equipe atual com base no cargo
    const grupos = {};
    equipeGlobais.forEach((func, index) => {
        let catEncontrada = "Outros"; // Categoria padrão caso o cargo seja diferente
        for (let cat in categorias) {
            if (categorias[cat].some(palavraChave => func.cargo.includes(palavraChave))) {
                catEncontrada = cat;
                break;
            }
        }
        if (!grupos[catEncontrada]) grupos[catEncontrada] = [];
        grupos[catEncontrada].push({ func, index });
    });

    // 3. Ordem de renderização na tela
    const ordemExibicao = ["Administração", "Portaria e Segurança", "Manutenção e Limpeza", "Outros"];

    ordemExibicao.forEach(nomeGrupo => {
        if (grupos[nomeGrupo] && grupos[nomeGrupo].length > 0) {
            
            // Cria o título da seção separadora
            const tituloSessao = document.createElement('h2');
            tituloSessao.style.cssText = "grid-column: 1 / -1; margin-top: 25px; margin-bottom: 10px; font-size: 18px; color: #475569; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; display: flex; align-items: center; gap: 8px;";
            
            // Define um ícone menor para o título da seção
            let iconTitulo = 'fa-users';
            if(nomeGrupo === "Administração") iconTitulo = 'fa-building-user';
            if(nomeGrupo === "Portaria e Segurança") iconTitulo = 'fa-shield-halved';
            if(nomeGrupo === "Manutenção e Limpeza") iconTitulo = 'fa-toolbox';
            
            tituloSessao.innerHTML = `<i class="fa-solid ${iconTitulo}" style="color: #94a3b8;"></i> ${nomeGrupo}`;
            lista.appendChild(tituloSessao);

            // Cria um sub-grid só para os cards dessa categoria
            const gridSessao = document.createElement('div');
            gridSessao.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; grid-column: 1 / -1;";

            // Desenha os cards dentro da seção correta
            grupos[nomeGrupo].forEach(item => {
                const func = item.func;
                const index = item.index;

                let corBadge = '#3b82f6', icone = 'fa-user';
                if (nomeGrupo === "Portaria e Segurança") { corBadge = '#10b981'; icone = 'fa-user-shield'; }
                else if (nomeGrupo === "Manutenção e Limpeza") { corBadge = '#f59e0b'; icone = 'fa-broom'; }
                else if (nomeGrupo === "Administração") { corBadge = '#8b5cf6'; icone = 'fa-user-tie'; }

                // BLINDAGEM DOS BOTÕES DE GESTÃO (EDITAR/REMOVER)
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
                        <p style="font-size: 15px; color: #0f172a; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-id-card-clip" style="color: #64748b; width: 15px;"></i> 
                            <strong>Cargo:</strong> <span style="background: ${corBadge}20; color: ${corBadge}; padding: 3px 8px; border-radius: 6px; font-weight: bold; font-size: 13px;">${func.cargo}</span>
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