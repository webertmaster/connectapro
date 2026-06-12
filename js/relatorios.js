// ==========================================
// ZERO LABS - PORTARIA PRO MASTER
// relatorios.js - Motor de PDF (MULTI-TENANT ATIVO)
// ==========================================

function gerarRelatorioFiltrado(modulo, exigeData, btnBotao) {
    let dataInicio = document.getElementById("relDataInicio").value;
    let dataFim = document.getElementById("relDataFim").value;

    if (exigeData && (!dataInicio || !dataFim)) {
        alert("⚠️ Por favor, selecione a Data Inicial e a Data Final no filtro!");
        return;
    }

    // 1. Pega a credencial do prédio no bolso do navegador
    const meuCondominio = localStorage.getItem("condominioId");

    if (!meuCondominio) {
        alert("Erro Crítico: Condomínio não identificado no navegador!");
        return;
    }

    let textoOriginal = btnBotao.innerHTML;
    btnBotao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extraindo...';
    btnBotao.style.pointerEvents = "none";

    // 2. MÁGICA MULTI-TENANT: Onde condominioId for igual ao meuCondominio
    db.collection(modulo).where("condominioId", "==", meuCondominio).get().then((querySnapshot) => {
        let dadosFiltrados = [];
        let hojeCalculo = new Date(); hojeCalculo.setHours(0,0,0,0);
        
        querySnapshot.forEach((doc) => {
            let item = doc.data();
            
            // ==========================================
            // TRAVA DO RELATÓRIO ESPELHO (60 DIAS)
            // ==========================================
            if (modulo === 'encomendas' && item.status === 'Entregue' && item.dataEntrega) {
                let partes = item.dataEntrega.split('/'); // Pega o formato DD/MM/YYYY do banco
                let dEntrega = new Date(partes[2], partes[1] - 1, partes[0]);
                
                // Calcula a diferença em dias
                let diffDias = Math.floor((hojeCalculo - dEntrega) / (1000 * 60 * 60 * 24));
                
                if (diffDias > 60) {
                    return; // Ignora o registro antigo, pulando para o próximo sem salvar no PDF
                }
            }
            // ==========================================

            if (exigeData) {
                // Tenta mapear o campo de data correspondente de cada coleção
                let dataDoItem = item.dataCadastro ? item.dataCadastro.split('T')[0] : 
                                 (item.dataChegada || item.data || "");
                
                if (dataDoItem >= dataInicio && dataDoItem <= dataFim) {
                    dadosFiltrados.push(item);
                }
            } else {
                dadosFiltrados.push(item);
            }
        });

        btnBotao.innerHTML = textoOriginal;
        btnBotao.style.pointerEvents = "auto";

        if (dadosFiltrados.length === 0) {
            alert(`Nenhum registro encontrado em ${modulo.toUpperCase()} para este filtro.`);
            return;
        }

        montarPDF(modulo, dadosFiltrados, dataInicio, dataFim, exigeData);

    }).catch(err => {
        btnBotao.innerHTML = textoOriginal;
        btnBotao.style.pointerEvents = "auto";
        alert("Erro ao buscar no banco de dados: " + err);
    });
}

function montarPDF(modulo, dados, dataInicio, dataFim, exigeData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text(`Relatório Gerencial - ${modulo.toUpperCase()}`, 40, 40);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); 
    
    if (exigeData) {
        let dIn = dataInicio.split('-').reverse().join('/');
        let dFi = dataFim.split('-').reverse().join('/');
        doc.text(`Período analisado: ${dIn} até ${dFi}`, 40, 60);
    } else {
        doc.text(`Posição Geral Atualizada (Base Completa)`, 40, 60);
    }
    
    doc.text(`Total de registros: ${dados.length}`, 40, 75);

    let colunas = [];
    let linhas = [];

    // Mapeamento específico de colunas e dados para cada tabela do PDF
    if (modulo === 'encomendas') {
        colunas = ["Data", "Apto", "Morador", "Transportadora", "Status"];
        dados.forEach(d => {
            let dt = d.dataChegada ? d.dataChegada.split('-').reverse().join('/') : "-";
            linhas.push([dt, d.apto || "-", d.morador || "-", d.transportadora || "-", d.status || "-"]);
        });
    } else if (modulo === 'ocorrencias') {
        colunas = ["Data", "Tipo", "Apto/Local", "Responsável", "Status"];
        dados.forEach(d => {
            let dt = d.data ? d.data.split('-').reverse().join('/') : "-";
            linhas.push([dt, d.tipo || "-", d.apto || "-", d.registradoPor || "-", d.status || "-"]);
        });
    } else if (modulo === 'passagem') {
        colunas = ["Data", "Hora", "Porteiro", "Observações"];
        dados.forEach(d => {
            let dt = d.data ? d.data.split('-').reverse().join('/') : "-";
            linhas.push([dt, d.hora || "-", d.porteiro || "-", d.obs || d.observacoes || "Sem pendências"]);
        });
    } else if (modulo === 'reservas') {
        colunas = ["Data", "Hora", "Espaço", "Responsável", "Apto", "Situação"];
        dados.forEach(d => {
            let dt = d.data ? d.data.split('-').reverse().join('/') : "-";
            let situacao = d.excluido ? "ARQUIVADA" : "ATIVA"; 
            linhas.push([dt, d.hora || "-", d.tipo || "-", d.responsavel || "-", d.apto || "-", situacao]);
        });
    } else if (modulo === 'veiculos') {
        colunas = ["Apto/Morador", "Modelo", "Placa", "Cor"];
        dados.forEach(d => {
            linhas.push([d.morador || d.vaga || "-", d.modelo || "-", d.placa || "-", d.cor || "-"]);
        });
    } else if (modulo === 'moradores') {
        colunas = ["Apto", "Nome", "Secretária", "Visitantes Autorizados"];
        dados.forEach(d => {
            linhas.push([d.apto || "-", d.nome || "-", d.secretaria || "-", d.visitantes || "-"]);
        });
    } else if (modulo === 'equipe') {
        colunas = ["Nome do Funcionário", "Cargo"];
        dados.forEach(d => {
            linhas.push([d.nome || "-", d.cargo || "-"]);
        });
    }

    doc.autoTable({
        startY: 90,
        head: [colunas],
        body: lines = linhas,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }, 
        styles: { fontSize: 10, cellPadding: 5 }
    });

    let nomeArquivo = exigeData ? `PortariaPRO_${modulo}_filtrado.pdf` : `PortariaPRO_${modulo}_completo.pdf`;
    doc.save(nomeArquivo);
}