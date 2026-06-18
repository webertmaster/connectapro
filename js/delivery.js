// ==========================================
// ZERO LABS - CONNECTA PRO
// delivery.js - Giro Rápido (MULTI-TENANT ATIVO)
// ==========================================

let deliveryGlobais = [];

// Banco de logos inteligente
const logosDelivery = {
    "ifood": "https://upload.wikimedia.org/wikipedia/commons/1/1a/Ifood-logo.svg",
    "rappi": "https://upload.wikimedia.org/wikipedia/commons/b/b5/Rappi_logo.svg",
    "ze delivery": "https://logospng.org/download/ze-delivery/ze-delivery-1024.png",
    "pague menos": "https://upload.wikimedia.org/wikipedia/commons/3/36/Pague_Menos_logo.svg",
    "drogasil": "https://upload.wikimedia.org/wikipedia/commons/9/91/Drogasil_logo.svg",
    "farmacia": "https://cdn-icons-png.flaticon.com/512/4320/4320337.png",
    "pizza": "https://cdn-icons-png.flaticon.com/512/3595/3595458.png",
    "burger": "https://cdn-icons-png.flaticon.com/512/3075/3075977.png"
};

// ==========================================
// 1. ESCUTADOR EM TEMPO REAL E DISPARADORES
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const meuCondominio = localStorage.getItem("condominioId");
    if (!meuCondominio || typeof db === 'undefined') return;

    // Sincronização com a Nuvem
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

    // ==========================================
    // 🛡️ MÁGICA DO CÓDIGO IFOOD (DENTRO DA PROTEÇÃO DOM)
    // ==========================================
    const inputAptoDelivery = document.getElementById('delApto');
    
    if (inputAptoDelivery) {
        inputAptoDelivery.addEventListener('blur', function() {
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

            // Vai na Nuvem procurar o morador desse apartamento
            db.collection("moradores")
              .where("condominioId", "==", meuCondominio)
              .where("apto", "==", aptoDigitado)
              .where("excluido", "==", false)
              .get()
              .then((querySnapshot) => {
                  if (!querySnapshot.empty) {
                      let dadosMorador = querySnapshot.docs[0].data();
                      
                      if(inputMorador) inputMorador.value = dadosMorador.nome;

                      let telefoneMorador = dadosMorador.telefone || dadosMorador.celular || "";
                      let numeroLimpo = telefoneMorador.replace(/\D/g, '');

                      if (numeroLimpo.length >= 4) {
                          let codigoIfood = numeroLimpo.slice(-4);
                          if(textoCodigo) textoCodigo.innerText = codigoIfood;
                          if(boxCodigo) boxCodigo.style.display = 'flex'; 
                      } else {
                          if(boxCodigo) boxCodigo.style.display = 'none'; 
                      }
                  } else {
                      if(boxCodigo) boxCodigo.style.display = 'none';
                  }
              })
              .catch((error) => {
                  console.error("Erro ao buscar dados do morador: ", error);
              });
        });
    }
});

// ==========================================
// 2. SALVAR NOVO DELIVERY
// ==========================================
function salvarDelivery() {
    const apto = document.getElementById('delApto').value.trim();
    const morador = document.getElementById('delMorador').value.trim();
    const plataforma = document.getElementById('delPlataforma').value.trim();
    const inputCodigo = document.getElementById('delCodigoInformado');
    const codigoInformado = inputCodigo ? inputCodigo.value.trim() : "";

    if (!morador || !apto || !plataforma) {
        alert('⚠️ Preencha Apto, Morador e o Aplicativo/Estabelecimento!');
        return;
    }

    const agora = new Date();
    const meuCondominio = localStorage.getItem("condominioId");

    const dadosDelivery = {
        morador,
        apto,
        plataforma,
        codigo: codigoInformado || "Não informado",
        status: "Aguardando Morador",
        horaChegada: agora.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        dataConsulta: agora.toISOString().split('T')[0],
        timestamp: agora.getTime(),
        excluido: false,
        condominioId: meuCondominio
    };

    db.collection("delivery").add(dadosDelivery).then((docRef) => {
        document.getElementById('delMorador').value = '';
        document.getElementById('delApto').value = '';
        document.getElementById('delPlataforma').value = '';
        if(inputCodigo) inputCodigo.value = '';
        
        const boxCodigo = document.getElementById('boxCodigoOculto');
        if(boxCodigo) boxCodigo.style.display = 'none';

        if(confirm("Delivery registrado! Deseja enviar o aviso para o WhatsApp do morador agora?")) {
            enviarAvisoDelivery(docRef.id);
        }
    }).catch(err => alert("Erro ao registrar: " + err));
}

// ==========================================
// 3. WHATSAPP (A MÁGICA DA COBRANÇA)
// ==========================================
function enviarAvisoDelivery(idFirebase) {
    let d = deliveryGlobais.find(item => item.idFirebase === idFirebase);
    if(!d) return;

    let msg = `Olá ${d.morador}! Seu pedido do(a) *${d.plataforma}* acabou de chegar na portaria. Você deseja me passar o código para eu liberar com o motoboy ou prefere vir até aqui buscar? 🏍️📦`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`);
}

// ==========================================
// 4. DAR BAIXA E RENDERIZAR
// ==========================================
function finalizarDelivery(idFirebase) {
    db.collection("delivery").doc(idFirebase).update({
        status: "Entregue ao Morador",
        horaEntrega: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        excluido: true 
    }).catch(err => alert("Erro ao dar baixa: " + err));
}

function mostrarDelivery() {
    const lista = document.getElementById('listaDelivery');
    if (!lista) return;
    lista.innerHTML = '';

    const ativos = deliveryGlobais.filter(d => !d.excluido);

    if (ativos.length === 0) {
        lista.innerHTML = '<div style="text-align: center; grid-column: 1 / -1; padding: 40px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1; color: #64748b;"><i class="fa-solid fa-mug-hot" style="font-size: 30px; margin-bottom: 10px; opacity: 0.5;"></i><p>Nenhum delivery aguardando na portaria.</p></div>';
        return;
    }

    ativos.forEach(d => {
        let nomePlataforma = d.plataforma.toLowerCase();
        let logoHtml = `<div style="background: #e2e8f0; width: 45px; height: 45px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #64748b;"><i class="fa-solid fa-motorcycle"></i></div>`;
        
        for (let chave in logosDelivery) {
            if (nomePlataforma.includes(chave)) {
                logoHtml = `<img src="${logosDelivery[chave]}" style="width: 45px; height: 45px; object-fit: contain; background: white; border-radius: 8px; padding: 2px; border: 1px solid #e2e8f0;">`;
                break;
            }
        }

        lista.innerHTML += `
        <div class="card" style="border-left: 5px solid #ef4444; padding: 15px; position: relative;">
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
                ${d.codigo && d.codigo !== "Não informado" ? `<p style="margin: 0; color: #059669;"><strong>Código:</strong> ${d.codigo}</p>` : ''}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button onclick="enviarAvisoDelivery('${d.idFirebase}')" style="background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#dcfce7'" onmouseout="this.style.background='#f0fdf4'">
                    <i class="fa-brands fa-whatsapp"></i> Cobrar
                </button>
                <button onclick="finalizarDelivery('${d.idFirebase}')" style="background: #10b981; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fa-solid fa-check-double"></i> Dar Baixa
                </button>
            </div>
        </div>
        `;
    });
}