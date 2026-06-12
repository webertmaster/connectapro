// ==========================================
// ZERO LABS - CONNECTA PRO (NUVEM FIREBASE)
// veiculos.js - Gestão Premium (MULTI-TENANT ATIVO)
// ==========================================

let idVeiculoEditandoFirebase = null;
let veiculosGlobais = [];

function mascararPlaca(input) {
    let valor = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (valor.length > 7) valor = valor.substring(0, 7);
    if (valor.length > 3) {
        valor = valor.substring(0, 3) + '-' + valor.substring(3);
    }
    input.value = valor;
}

function identificarMarca(modeloStr) {
    const m = modeloStr.toLowerCase();
    
    // 1. MOTOS
    if (m.includes('yamaha') || m.includes('fazer') || m.includes('mt') || m.includes('crosser')) return { nome: 'Yamaha', cor: '#003399', img: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/Yamaha_Motor_Logo.svg', logo: 'fa-motorcycle' };
    if (m.includes('kawasaki') || m.includes('ninja')) return { nome: 'Kawasaki', cor: '#3F9142', img: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Kawasaki_logo.svg', logo: 'fa-motorcycle' };
    if (m.includes('suzuki')) return { nome: 'Suzuki', cor: '#003399', img: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Suzuki_logo_2.svg', logo: 'fa-motorcycle' };
    if (m.includes('moto') || m.includes('pop') || m.includes('biz') || m.includes('cg') || m.includes('bros') || m.includes('xre') || m.includes('pcx') || m.includes('titan') || m.includes('honda moto')) {
        return { nome: 'Honda Motos', cor: '#cc0000', img: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Honda_Logo.svg', logo: 'fa-motorcycle' };
    }
    
    // 2. CARROS
    if (m.includes('toyota') || m.includes('corolla') || m.includes('hilux') || m.includes('yaris') || m.includes('sw4')) return { nome: 'Toyota', cor: '#eb0a1e', img: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg', logo: 'fa-car' };
    if (m.includes('honda') || m.includes('civic') || m.includes('hrv') || m.includes('fit') || m.includes('city')) return { nome: 'Honda', cor: '#000000', img: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Honda_Logo.svg', logo: 'fa-car' };
    if (m.includes('vw') || m.includes('volkswagen') || m.includes('gol') || m.includes('polo') || m.includes('nivus') || m.includes('jetta') || m.includes('saveiro')) return { nome: 'Volkswagen', cor: '#001e50', img: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg', logo: 'fa-car' };
    if (m.includes('chevrolet') || m.includes('gm') || m.includes('onix') || m.includes('tracker') || m.includes('cruze') || m.includes('s10') || m.includes('spin')) return { nome: 'Chevrolet', cor: '#b58500', img: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Chevrolet-logo.png', logo: 'fa-car' };
    if (m.includes('fiat') || m.includes('argo') || m.includes('strada') || m.includes('toro') || m.includes('mobi') || m.includes('pulse') || m.includes('fastback') || m.includes('uno')) return { nome: 'Fiat', cor: '#000E34', img: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Fiat_Automobiles_logo.svg', logo: 'fa-car' };
    if (m.includes('hyundai') || m.includes('hb20') || m.includes('creta') || m.includes('tucson')) return { nome: 'Hyundai', cor: '#002c5f', img: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg', logo: 'fa-car' };
    if (m.includes('jeep') || m.includes('renegade') || m.includes('compass') || m.includes('commander')) return { nome: 'Jeep', cor: '#ffba00', img: 'img/jeep.png.png', logo: 'fa-truck-field' };
    if (m.includes('nissan') || m.includes('kicks') || m.includes('versa') || m.includes('frontier')) return { nome: 'Nissan', cor: '#c3002f', img: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Nissan_logo.png', logo: 'fa-car' };
    if (m.includes('renault') || m.includes('kwid') || m.includes('sandero') || m.includes('duster') || m.includes('logan')) return { nome: 'Renault', cor: '#fbc400', img: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Renault_2021_logo.svg', logo: 'fa-car' };
    if (m.includes('ford') || m.includes('ka') || m.includes('ranger') || m.includes('ecosport') || m.includes('fiesta')) return { nome: 'Ford', cor: '#003478', img: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Ford_Motor_Company_Logo.svg', logo: 'fa-truck-pickup' };
    
    return { nome: 'Veículo', cor: '#64748b', img: null, logo: 'fa-car-side' };
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
        db.collection("veiculos").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
            veiculosGlobais = [];
            snapshot.forEach((doc) => {
                let veiculo = doc.data();
                veiculo.idFirebase = doc.id;
                veiculosGlobais.push(veiculo);
            });
            
            // Ordena os veículos alfabeticamente pela placa no JavaScript
            veiculosGlobais.sort((a, b) => a.placa.localeCompare(b.placa));

            // Salva cópia local para evitar "pisca-pisca" se houver integração com outras abas
            localStorage.setItem('veiculos', JSON.stringify(veiculosGlobais));

            mostrarVeiculos();
            if(typeof atualizarDashboard === 'function') atualizarDashboard();
        });
    } else {
        console.error("Firebase DB não encontrado.");
    }
});

// ==========================================
// 2. ADICIONAR E EDITAR (NUVEM)
// ==========================================
function addVeiculo() {
    const morador = document.getElementById('veiMorador').value.trim();
    const modelo = document.getElementById('veiModelo').value.trim();
    const placa = document.getElementById('veiPlaca').value.trim();
    const cor = document.getElementById('veiCor').value;
    const vaga = document.getElementById('veiVaga').value.trim();

    if (!morador || !modelo || !placa) {
        alert('⚠️ Preencha pelo menos o Morador, Modelo e a Placa!');
        return;
    }

    const btnSalvar = document.querySelector("#veiculos .btn[onclick='addVeiculo()']");
    let textoOriginal = idVeiculoEditandoFirebase ? "<i class='fa-solid fa-plus'></i> Cadastrar Veículo" : (btnSalvar ? btnSalvar.innerHTML : "<i class='fa-solid fa-plus'></i> Cadastrar Veículo");
    
    if(btnSalvar) {
        btnSalvar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando na Nuvem...';
        btnSalvar.style.pointerEvents = 'none';
    }

    // Pega a credencial para carimbar o documento
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosVeiculo = {
        morador,
        modelo,
        placa,
        cor: cor || 'Não informada',
        vaga: vaga || 'S/N',
        dataCadastro: new Date().toISOString(),
        condominioId: meuCondominio // A ETIQUETA INVISÍVEL FICA PRESA AQUI!
    };

    if (idVeiculoEditandoFirebase) {
        // MODO EDIÇÃO
        db.collection("veiculos").doc(idVeiculoEditandoFirebase).update(dadosVeiculo)
            .then(() => {
                alert('🚘 Veículo atualizado com sucesso na nuvem!');
                finalizarAcaoVeiculo(btnSalvar, "<i class='fa-solid fa-plus'></i> Cadastrar Veículo");
                idVeiculoEditandoFirebase = null;
            })
            .catch(err => {
                alert('Erro ao atualizar: ' + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    } else {
        // MODO CADASTRO
        dadosVeiculo.excluido = false; // Soft Delete
        db.collection("veiculos").add(dadosVeiculo)
            .then(() => {
                alert('🚘 Veículo registrado com sucesso na nuvem!');
                finalizarAcaoVeiculo(btnSalvar, textoOriginal);
            })
            .catch(err => {
                alert('Erro ao salvar: ' + err);
                if(btnSalvar) { btnSalvar.innerHTML = textoOriginal; btnSalvar.style.pointerEvents = 'auto'; }
            });
    }
}

function finalizarAcaoVeiculo(btnNode, textoFinal) {
    if(btnNode) {
        btnNode.innerHTML = textoFinal;
        btnNode.style.background = "#3b82f6"; // Volta para o azul padrão
        btnNode.style.pointerEvents = 'auto';
    }
    document.getElementById('veiMorador').value = '';
    document.getElementById('veiModelo').value = '';
    document.getElementById('veiPlaca').value = '';
    document.getElementById('veiCor').value = '';
    document.getElementById('veiVaga').value = '';
}

// ==========================================
// 3. RENDERIZAR NA TELA
// ==========================================
function mostrarVeiculos() {
    const lista = document.getElementById('listaVeiculos');
    if (!lista) return;

    // Filtra apenas os que não foram arquivados
    const ativos = veiculosGlobais.filter(v => !v.excluido);
    const termoBusca = (document.getElementById('pesquisaVeiculo')?.value || '').toLowerCase();

    lista.innerHTML = '';

    const filtrados = ativos.filter(v => 
        v.placa.toLowerCase().includes(termoBusca) || 
        v.modelo.toLowerCase().includes(termoBusca) || 
        v.vaga.toLowerCase().includes(termoBusca) ||
        v.morador.toLowerCase().includes(termoBusca)
    );

    if (filtrados.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-car-tunnel" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum veículo encontrado na garagem.</p></div>';
        return;
    }

    const agrupados = filtrados.reduce((acc, v) => {
        if (!acc[v.morador]) acc[v.morador] = [];
        acc[v.morador].push(v);
        return acc;
    }, {});

    for (const morador in agrupados) {
        const carrosDoMorador = agrupados[morador];
        
        const grupoDiv = document.createElement('div');
        grupoDiv.style = "background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 25px; box-shadow: 0 4px 15px rgba(0,0,0,0.02);";
        
        let htmlPlacas = `
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f8fafc; padding-bottom: 15px; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: #eff6ff; color: #3b82f6; width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        <i class="fa-solid fa-house-user"></i>
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 700;">${morador}</h3>
                        <span style="font-size: 13px; color: #64748b;">${carrosDoMorador.length} veículo(s) na garagem</span>
                    </div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 15px;">`;

        carrosDoMorador.forEach(v => {
            const marcaInfo = identificarMarca(v.modelo);
            
            htmlPlacas += `
                <div onclick="abrirModalVeiculo('${v.idFirebase}')" style="cursor: pointer; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px 12px; display: flex; flex-direction: column; align-items: center; position: relative; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);" onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='#3b82f6'; this.style.boxShadow='0 8px 15px rgba(59,130,246,0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='#cbd5e1'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.02)'" title="Clique para detalhes completos">
                    
                    <div style="position: absolute; top: -10px; right: -8px; background: #0f172a; color: white; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.15); border: 2px solid white;">
                        Vaga ${v.vaga}
                    </div>

                    <div style="background: white; border: 2px solid #1e293b; border-radius: 6px; text-align: center; font-weight: bold; width: 100%; overflow: hidden; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="background: #003399; color: white; font-size: 9px; padding: 3px 0; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; padding: 2px 6px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Mercosur_flag.svg/120px-Mercosur_flag.svg.png" style="height: 8px; opacity: 0.9;">
                            <span style="font-size: 9px;">BRASIL</span>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Flag_of_Brazil.svg/120px-Flag_of_Brazil.svg.png" style="height: 8px; opacity: 0.9;">
                        </div>
                        <div style="font-size: 18px; padding: 6px 0; letter-spacing: 2px; color: #1e293b; background: white;">${v.placa}</div>
                    </div>
                    
                    <div style="width: 100%; text-align: center;">
                        <div style="color: #0f172a; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; text-transform: capitalize;">
                            <i class="fa-solid ${marcaInfo.logo}" style="color: ${marcaInfo.cor}; margin-right: 5px;"></i>${v.modelo}
                        </div>
                        <div style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600;">
                            ${v.cor}
                        </div>
                    </div>
                </div>
            `;
        });

        htmlPlacas += `</div></div>`;
        grupoDiv.innerHTML = htmlPlacas;
        lista.appendChild(grupoDiv);
    }
}

function abrirModalVeiculo(idFirebase) {
    const v = veiculosGlobais.find(vei => vei.idFirebase === idFirebase);
    if (!v) return;

    const modal = document.getElementById('modalVeiculo');
    const conteudo = document.getElementById('conteudoModalVeiculo');
    
    const marcaInfo = identificarMarca(v.modelo);
    const buscaGoogle = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent('Carro Moto ' + v.modelo)}`;

    const iconeVisual = marcaInfo.img 
        ? `<img src="${marcaInfo.img}" style="width: 45px; height: 45px; object-fit: contain; background: white; border-radius: 50%; padding: 4px;">` 
        : `<i class="fa-solid ${marcaInfo.logo}"></i>`;

    // ==========================================
    // VERIFICA O CRACHÁ PARA DESENHAR OS BOTÕES
    // ==========================================
    const cargo = localStorage.getItem("usuario_cargo");
    let botoesAcaoHtml = '';

    if (cargo === 'operacional') {
        botoesAcaoHtml = `
            <div style="display: grid; grid-template-columns: 1fr; margin-top: 20px;">
                <button onclick="editarVeiculoModal('${v.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <i class="fa-solid fa-pen-to-square"></i> Editar Veículo
                </button>
            </div>
        `;
    } else {
        botoesAcaoHtml = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 20px;">
                <button onclick="editarVeiculoModal('${v.idFirebase}')" style="background: #eff6ff; color: #3b82f6; border: 1px solid #bfdbfe; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button onclick="arquivarVeiculoModal('${v.idFirebase}')" style="background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;" onmouseover="this.style.background='#fee2e2'" onmouseout="this.style.background='#fef2f2'">
                    <i class="fa-solid fa-trash-can"></i> Arquivar
                </button>
            </div>
        `;
    }

    conteudo.innerHTML = `
        <div style="background: ${marcaInfo.cor}; padding: 30px 20px 20px 20px; text-align: center; color: white; position: relative;">
            <div style="background: rgba(255,255,255,0.2); width: 65px; height: 65px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px auto; font-size: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
                ${iconeVisual}
            </div>
            <h2 style="margin: 0; font-size: 24px;">${marcaInfo.nome}</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 16px; text-transform: capitalize;">${v.modelo}</p>
            
            <a href="${buscaGoogle}" target="_blank" style="display: inline-flex; align-items: center; gap: 5px; margin-top: 15px; font-size: 12px; background: rgba(0,0,0,0.3); color: white; padding: 6px 14px; border-radius: 20px; text-decoration: none; transition: 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.5)'" onmouseout="this.style.background='rgba(0,0,0,0.3)'">
                <i class="fa-solid fa-magnifying-glass-plus"></i> Foto Web
            </a>
        </div>
        
        <div style="padding: 25px;">
            <div style="display: flex; justify-content: center; margin-bottom: 25px;">
                <div style="background: white; border: 2px solid #1e293b; border-radius: 6px; text-align: center; font-weight: bold; width: 160px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="background: #003399; color: white; font-size: 11px; padding: 4px 0; text-transform: uppercase; letter-spacing: 1px;">Brasil</div>
                    <div style="font-size: 24px; padding: 10px 0; letter-spacing: 2px; color: #1e293b;">${v.placa}</div>
                </div>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 13px;">👤 Proprietário</span>
                    <strong style="color: #0f172a;">${v.morador}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 13px;">🎨 Cor</span>
                    <strong style="color: #0f172a;">${v.cor}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b; font-size: 13px;">🅿️ Vaga</span>
                    <strong style="background: #e2e8f0; padding: 2px 8px; border-radius: 6px; color: #0f172a;">${v.vaga}</strong>
                </div>
            </div>

            ${botoesAcaoHtml}
        </div>
    `;

    modal.classList.add('ativo');
    modal.classList.add('active'); 
    modal.style.display = 'flex'; 
}

function fecharModalVeiculo() {
    const modal = document.getElementById('modalVeiculo');
    if (modal) {
        modal.classList.remove('ativo');
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function editarVeiculoModal(idFirebase) {
    const v = veiculosGlobais.find(vei => vei.idFirebase === idFirebase);
    if (!v) return;

    document.getElementById('veiMorador').value = v.morador;
    document.getElementById('veiModelo').value = v.modelo;
    document.getElementById('veiPlaca').value = v.placa;
    document.getElementById('veiCor').value = v.cor !== 'Não informada' ? v.cor : '';
    document.getElementById('veiVaga').value = v.vaga !== 'S/N' ? v.vaga : '';

    idVeiculoEditandoFirebase = idFirebase;
    
    const btnSalvar = document.querySelector("#veiculos .btn[onclick='addVeiculo()']");
    if(btnSalvar) {
        btnSalvar.innerHTML = "<i class='fa-solid fa-floppy-disk'></i> Salvar Alterações";
        btnSalvar.style.background = "#10b981"; // Verde de edição
    }

    fecharModalVeiculo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// 4. ARQUIVAR DA NUVEM (Soft Delete)
// ==========================================
function arquivarVeiculoModal(idFirebase) {
    if(confirm("🚨 Arquivar Registro: Remover este veículo da garagem principal? Ele continuará salvo para auditoria.")) {
        db.collection("veiculos").doc(idFirebase).update({
            excluido: true,
            dataExclusao: Date.now()
        })
        .then(() => {
            console.log("Veículo arquivado na nuvem");
            fecharModalVeiculo();
        })
        .catch(err => alert("Erro ao arquivar: " + err));
    }
}

function gerarRelatorioVeiculos() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const ativos = veiculosGlobais.filter(v => !v.excluido);
    
    if (ativos.length === 0) {
        alert("⚠️ Não há veículos ativos cadastrados para gerar o PDF.");
        return;
    }
    
    doc.setFontSize(16);
    doc.text("Relatório de Veículos Cadastrados", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')} | Connecta Pro`, 14, 26);
    
    const dados = ativos.map(v => {
        const marca = identificarMarca(v.modelo).nome;
        return [v.placa, `${marca} ${v.modelo}`, v.cor, v.morador, v.vaga];
    });

    doc.autoTable({
        startY: 32,
        head: [['Placa', 'Marca / Modelo', 'Cor', 'Morador Responsável', 'Vaga']],
        body: dados,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    doc.save("Auditoria_Garagem_Ativa.pdf");
}