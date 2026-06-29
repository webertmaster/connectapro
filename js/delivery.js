// ==========================================
// ZERO LABS - CONNECTA PRO
// delivery.js - Giro Rápido (MULTI-TENANT ATIVO)
// ==========================================

let deliveryGlobais = [];
let memoriaDominóMoradores = []; // Motor do Dominó

const logosDelivery = {
    "ifood": "https://logodownload.org/wp-content/uploads/2017/05/ifood-logo-0.png",
    "rappi": "https://logospng.org/download/rappi/logo-rappi-512.png",
    "ze": "https://logospng.org/download/ze-delivery/ze-delivery-1024.png",
    "paguemenos": "https://logospng.org/download/pague-menos/logo-pague-menos-512.png",
    "drogasil": "https://logospng.org/download/drogasil/logo-drogasil-512.png",
    "farmacia": "https://cdn-icons-png.flaticon.com/512/4320/4320337.png",
    "pizza": "https://cdn-icons-png.flaticon.com/512/3595/3595458.png",
    "lanche": "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    "burger": "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    "mercado": "https://cdn-icons-png.flaticon.com/512/3081/3081840.png"
};

// NOVA FUNÇÃO UNIVERSAL: INJETA OS APARTAMENTOS NO SELECT
async function carregarApartamentosNoSelect(idSelectDestino) {
    const meuCondominio = localStorage.getItem("condominioId");
    const select = document.getElementById(idSelectDestino);
    if (!meuCondominio || !select || typeof db === 'undefined') return;

    try {
        const snap = await db.collection("moradores")
            .where("condominioId", "==", meuCondominio)
            .where("excluido", "==", false)
            .get();

        memoriaDominóMoradores = [];
        select.innerHTML = '<option value="">Selecione o Apto...</option>';

        snap.forEach(doc => memoriaDominóMoradores.push(doc.data()));

        // Organiza em ordem alfabética bonita na tela (101 A, 101 B, 102 A...)
        memoriaDominóMoradores.sort((a, b) => (a.apto || "").localeCompare(b.apto || ""));

        memoriaDominóMoradores.forEach(m => {
            let opt = document.createElement('option');
            opt.value = m.apto;
            opt.textContent = `Apto ${m.apto} - ${m.nome}`; // Exibe: "Apto 101 - Carlos"
            select.appendChild(opt);
        });

    } catch (e) {
        console.error("Erro ao carregar lista de apartamentos:", e);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    carregarApartamentosNoSelect('delApto'); // <-- GATILHO ATIVADO AQUI

    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio || typeof db === 'undefined') return;

    db.collection("delivery").where("condominioId", "==", meuCondominio).onSnapshot((snapshot) => {
        deliveryGlobais = [];
        snapshot.forEach((doc) => {
            let d = doc.data();
            d.idFirebase = doc.id;
            deliveryGlobais.push(d);
        });
        
        deliveryGlobais.sort((a, b) => b.timestamp - a.timestamp);
        mostrarDelivery();
    });

    const inputAptoDelivery = document.getElementById('delApto');
    if (inputAptoDelivery) {
        inputAptoDelivery.addEventListener('change', function() { // <-- ATUALIZADO PARA CHANGE
            const aptoDigitado = this.value.trim();
            const boxCodigo = document.getElementById('boxCodigoOculto');
            const textoCodigo = document.getElementById('delCodigoFixo');
            const inputMorador = document.getElementById('delMorador');

            if (!aptoDigitado) {
                if(boxCodigo) boxCodigo.style.display = 'none';
                if(textoCodigo) textoCodigo.innerText = '';
                if(inputMorador) inputMorador.value = '';
                return;
            }

            db.collection("moradores")
              .where("condominioId", "==", meuCondominio)
              .where("apto", "==", aptoDigitado)
              .where("excluido", "==", false)
              .get()
              .then((querySnapshot) => {
                  if (!querySnapshot.empty) {
                      let dadosMorador = querySnapshot.docs[0].data();
                      if(inputMorador) inputMorador.value = dadosMorador.nome;

                      if (dadosMorador.codigoLembrado) {
                          if(textoCodigo) textoCodigo.innerHTML = `${dadosMorador.codigoLembrado} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(Último usado)</span>`;
                          if(boxCodigo) boxCodigo.style.display = 'flex';
                      } else {
                          let telefoneMorador = dadosMorador.telefone || dadosMorador.celular || "";
                          let numeroLimpo = telefoneMorador.replace(/\D/g, '');

                          if (numeroLimpo.length >= 4) {
                              let codigoIfood = numeroLimpo.slice(-4);
                              if(textoCodigo) textoCodigo.innerHTML = `${codigoIfood} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(Sugerido pelo final do celular)</span>`;
                              if(boxCodigo) boxCodigo.style.display = 'flex'; 
                          } else {
                              if(boxCodigo) boxCodigo.style.display = 'none'; 
                          }
                      }
                  } else {
                      if(boxCodigo) boxCodigo.style.display = 'none';
                  }
              });
        });
    }
});

function salvarDelivery() {
    const apto = document.getElementById('delApto').value.trim();
    const morador = document.getElementById('delMorador').value.trim();
    const plataforma = document.getElementById('delPlataforma').value.trim();
    const inputCodigo = document.getElementById('delCodigoInformado');
    const codigoInformado = inputCodigo ? inputCodigo.value.trim() : "";
    const inputEntregador = document.getElementById('delEntregador');
    const entregador = inputEntregador ? inputEntregador.value.trim() : "";
    const inputRG = document.getElementById('delRG');
    const rgEntregador = inputRG ? inputRG.value.trim() : "";

    if (!morador || !apto || !plataforma) {
        alert('⚠️ Preencha Apto, Morador e o Aplicativo/Estabelecimento!');
        return;
    }

    const agora = new Date();
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosDelivery = {
        morador, apto, plataforma,
        codigo: codigoInformado || "Não informado",
        entregador: entregador || "Não informado",
        rgEntregador: rgEntregador || "Não informado",
        status: "Aguardando Morador",
        horaChegada: agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        dataConsulta: agora.toISOString().split('T')[0],
        timestamp: agora.getTime(),
        excluido: false,
        condominioId: meuCondominio
    };

    db.collection("delivery").add(dadosDelivery).then((docRef) => {
        if (codigoInformado) {
            db.collection("moradores").where("condominioId", "==", meuCondominio).where("apto", "==", apto).where("excluido", "==", false).get().then(snap => {
                  if(!snap.empty) db.collection("moradores").doc(snap.docs[0].id).update({ codigoLembrado: codigoInformado });
              });
        }
        document.getElementById('delMorador').value = '';
        document.getElementById('delApto').value = ''; // Reseta o Select pro "Selecione..."
        document.getElementById('delPlataforma').value = '';
        if(inputCodigo) inputCodigo.value = '';
        if(inputEntregador) inputEntregador.value = '';
        if(inputRG) inputRG.value = '';
        
        const boxCodigo = document.getElementById('boxCodigoOculto');
        if(boxCodigo) boxCodigo.style.display = 'none';

        if(confirm("Delivery registrado! Deseja enviar o aviso para o WhatsApp do morador agora?")) enviarAvisoDelivery(docRef.id);
    }).catch(err => alert("Erro ao registrar: " + err));
}

function enviarAvisoDelivery(idFirebase) {
    let d = deliveryGlobais.find(item => item.idFirebase === idFirebase);
    if(!d) return;
    let msg = `Olá ${d.morador}! Seu pedido do(a) *${d.plataforma}* acabou de chegar na portaria. Você deseja me passar o código para eu liberar com o motoboy ou prefere vir até aqui buscar? 🏍️📦`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

function finalizarDelivery(idFirebase) {
    if(confirm("Confirmar a entrega deste pedido ao morador?")) {
        db.collection("delivery").doc(idFirebase).update({
            status: "Entregue",
            horaEntrega: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
        }).catch(err => alert("Erro ao dar baixa: " + err));
    }
}

function arquivarDelivery(idFirebase) {
    if(confirm("Remover este pedido da tela principal?")) {
        db.collection("delivery").doc(idFirebase).update({ excluido: true }).catch(err => alert("Erro ao arquivar: " + err));
    }
}

function memorizarCodigo(idFirebase, apto) {
    let codigoDigitado = prompt("O morador te passou o código no WhatsApp? Digite aqui para o sistema memorizar:");
    if (!codigoDigitado) return;

    const meuCondominio = localStorage.getItem("condominioId");

    db.collection("delivery").doc(idFirebase).update({
        codigo: codigoDigitado
    });

    db.collection("moradores")
      .where("condominioId", "==", meuCondominio)
      .where("apto", "==", apto)
      .where("excluido", "==", false)
      .get().then(snap => {
          if(!snap.empty) {
              db.collection("moradores").doc(snap.docs[0].id).update({
                  codigoLembrado: codigoDigitado
              });
              alert("🧠 Código salvo! Nas próximas vezes que você digitar esse apartamento, eu vou puxar esse código automaticamente!");
          }
      }).catch(err => console.log(err));
}

function mostrarDelivery() {
    const listaAguardando = document.getElementById('listaDelivery');
    const listaEntregues = document.getElementById('listaDeliveryEntregues');
    
    if (!listaAguardando || !listaEntregues) return;
    
    listaAguardando.innerHTML = '';
    listaEntregues.innerHTML = '';

    let contAguardando = 0;
    let contEntregues = 0;

    deliveryGlobais.forEach(d => {
        if (d.excluido) return;

        let nomeLimpo = d.plataforma.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        let logoHtml = `<div style="background: #e2e8f0; width: 45px; height: 45px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #64748b;"><i class="fa-solid fa-motorcycle"></i></div>`;
        for (let chave in logosDelivery) {
            if (nomeLimpo.includes(chave)) {
                logoHtml = `<img src="${logosDelivery[chave]}" style="width: 45px; height: 45px; object-fit: contain; background: white; border-radius: 8px; padding: 2px; border: 1px solid #e2e8f0;">`;
                break;
            }
        }

        let infoEntregador = '';
        if (d.entregador !== "Não informado") {
            infoEntregador = `<p style="margin: 0; color: #64748b; font-size: 13px;"><i class="fa-solid fa-helmet-safety"></i> <strong>Entregador:</strong> ${d.entregador} ${d.rgEntregador !== "Não informado" ? `(RG: ${d.rgEntregador})` : ''}</p>`;
        }

        if (d.status === "Aguardando Morador" || d.status === "Aguardando") {
            contAguardando++;
            listaAguardando.innerHTML += `
            <div class="card" style="border-left: 5px solid #ef4444; padding: 15px;">
                <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 15px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 15px;">
                    ${logoHtml}
                    <div>
                        <h3 style="margin: 0; font-size: 18px; color: #0f172a; text-transform: capitalize;">${d.plataforma}</h3>
                        <span style="font-size: 12px; color: #ef4444; font-weight: bold; background: #fef2f2; padding: 2px 8px; border-radius: 10px;">Aguardando Morador</span>
                    </div>
                </div>
                <div style="font-size: 14px; color: #475569; margin-bottom: 15px; display: grid; gap: 6px;">
                    <p style="margin: 0;"><strong>Apto:</strong> <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${d.apto}</span></p>
                    <p style="margin: 0;"><strong>Morador:</strong> ${d.morador}</p>
                    <p style="margin: 0;"><strong>Chegada:</strong> <i class="fa-regular fa-clock"></i> ${d.horaChegada}</p>
                    ${infoEntregador}
                    ${d.codigo && d.codigo !== "Não informado" ? `<p style="margin: 0; color: #059669; margin-top: 5px; font-size: 16px;"><strong>Código:</strong> ${d.codigo}</p>` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button onclick="enviarAvisoDelivery('${d.idFirebase}')" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                        <i class="fa-brands fa-whatsapp"></i> Avisar
                    </button>
                    <button onclick="finalizarDelivery('${d.idFirebase}')" style="background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        <i class="fa-solid fa-check-double"></i> Dar Baixa
                    </button>
                    <button onclick="memorizarCodigo('${d.idFirebase}', '${d.apto}')" style="grid-column: 1 / -1; background: #f8fafc; border: 1px dashed #94a3b8; color: #475569; padding: 8px; border-radius: 8px; font-size: 13px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#f8fafc'">
                        <i class="fa-solid fa-brain" style="color: #8b5cf6;"></i> Morador passou o código? Clique para salvar
                    </button>
                </div>
            </div>`;
        } 
        else {
            if (contEntregues < 6) {
                contEntregues++;
                listaEntregues.innerHTML += `
                <div class="card" style="border-left: 5px solid #10b981; padding: 15px; position: relative; background: #f8fafc;">
                    <button onclick="arquivarDelivery('${d.idFirebase}')" style="position: absolute; right: 10px; top: 10px; background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;" title="Limpar da tela"><i class="fa-solid fa-xmark"></i></button>
                    
                    <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 10px;">
                        ${logoHtml}
                        <div>
                            <h3 style="margin: 0; font-size: 16px; color: #0f172a; text-transform: capitalize;">${d.plataforma}</h3>
                            <span style="font-size: 11px; color: #10b981; font-weight: bold; background: #dcfce7; padding: 2px 6px; border-radius: 10px;">Finalizado</span>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: #475569; display: grid; gap: 4px;">
                        <p style="margin: 0;"><strong>Apto:</strong> ${d.apto} - ${d.morador}</p>
                        <p style="margin: 0;"><strong>Chegada:</strong> <i class="fa-regular fa-clock"></i> ${d.horaChegada}</p>
                        ${infoEntregador}
                        <p style="margin: 0; color: #10b981; font-weight: bold; margin-top: 5px;"><i class="fa-solid fa-check-double"></i> Entregue às: ${d.horaEntrega || '--:--'}</p>
                    </div>
                </div>`;
            }
        }
    });

    if (contAguardando === 0) listaAguardando.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #94a3b8; font-style: italic; border: 1px dashed #cbd5e1; border-radius: 8px;">Nenhum delivery aguardando.</div>';
    if (contEntregues === 0) listaEntregues.innerHTML = '<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #94a3b8; font-style: italic; border: 1px dashed #cbd5e1; border-radius: 8px;">Nenhum histórico recente.</div>';
}

function gerarRelatorioDelivery(btn) {
    const dataInicio = document.getElementById('relDataInicio').value;
    const dataFim = document.getElementById('relDataFim').value;

    if (!dataInicio || !dataFim) {
        alert('⚠️ Selecione a Data Inicial e a Data Final no topo da tela de relatórios!');
        return;
    }

    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    const diferencaTempo = Math.abs(d2 - d1);
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

    if (d1 > d2) {
        alert('⚠️ A Data Inicial não pode ser maior que a Data Final.');
        return;
    }

    if (diferencaDias > 60) {
        alert('🚨 Acesso Negado: Para evitar travamentos, o sistema permite puxar no máximo 60 dias por relatório. Diminua o período e tente novamente.');
        return;
    }

    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Puxando da Nuvem...';
    btn.style.pointerEvents = 'none';

    const meuCondominio = localStorage.getItem("condominioId");

    db.collection("delivery")
        .where("condominioId", "==", meuCondominio)
        .where("dataConsulta", ">=", dataInicio)
        .where("dataConsulta", "<=", dataFim)
        .get()
        .then((snapshot) => {
            if (snapshot.empty) {
                alert('Nenhum registro de delivery encontrado neste período.');
                btn.innerHTML = textoOriginal;
                btn.style.pointerEvents = 'auto';
                return;
            }

            let listaRelatorio = [];
            snapshot.forEach(doc => listaRelatorio.push(doc.data()));
            listaRelatorio.sort((a, b) => a.timestamp - b.timestamp);

            let dadosPdf = listaRelatorio.map(d => {
                let dataF = d.dataConsulta.split('-').reverse().join('/');
                let statusTxt = d.status === "Entregue" ? `Entregue ${d.horaEntrega}` : "Pendente";
                let infoEntregador = d.entregador !== "Não informado" ? d.entregador : '--';
                
                return [ dataF, d.apto, d.morador, d.plataforma, d.horaChegada, infoEntregador, statusTxt ];
            });

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text(`Relatório de Auditoria - Delivery Rápido`, 14, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Período de Extração: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')} (Total: ${listaRelatorio.length} registros)`, 14, 28);

            doc.autoTable({
                startY: 35,
                head: [['Data', 'Apto / Bloco', 'Morador', 'Aplicativo', 'Chegada', 'Entregador', 'Status']],
                body: dadosPdf,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [239, 68, 68] },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            doc.save(`Auditoria_Delivery_${dataInicio}_a_${dataFim}.pdf`);
            
            btn.innerHTML = textoOriginal;
            btn.style.pointerEvents = 'auto';
        })
        .catch(err => {
            alert("Erro ao extrair relatório: " + err);
            btn.innerHTML = textoOriginal;
            btn.style.pointerEvents = 'auto';
        });
}
