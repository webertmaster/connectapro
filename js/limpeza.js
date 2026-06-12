// ==========================================
// ZERO LABS - FAXINEIRO AUTOMÁTICO DA NUVEM (60 DIAS)
// ==========================================
function executarLimpezaAutomatica() {
    if (typeof db === 'undefined') return;

    // Lista das coleções do Firebase que usam o nosso sistema de Arquivamento (Soft Delete)
    const colecoes = ["encomendas", "ocorrencias", "passagem", "moradores", "veiculos", "comunicados"];
    
    // Matemática mágica: 60 dias * 24 horas * 60 minutos * 60 segundos * 1000 milissegundos
    const limite60Dias = Date.now() - (60 * 24 * 60 * 60 * 1000);

    colecoes.forEach(colecao => {
        // Pede pro Firebase apenas os registros que estão "arquivados"
        db.collection(colecao).where("excluido", "==", true).get()
        .then(snapshot => {
            snapshot.forEach(doc => {
                let registro = doc.data();
                
                // Se a data em que foi arquivado for mais velha que 60 dias, exclui para sempre
                if (registro.dataExclusao && registro.dataExclusao < limite60Dias) {
                    db.collection(colecao).doc(doc.id).delete().then(() => {
                        console.log(`🧹 Faxina Automática: Registro velho apagado definitivamente de [${colecao}]`);
                    });
                }
            });
        }).catch(err => console.log(`Erro na faxina silenciosa de ${colecao}:`, err));
    });
}

// Escutador que dispara o faxineiro sozinho toda vez que a portaria abre o sistema
window.addEventListener('DOMContentLoaded', () => {
    // Espera 5 segundos (5000 ms) para rodar, garantindo que a tela principal carregue rápido primeiro
    setTimeout(executarLimpezaAutomatica, 5000); 
});