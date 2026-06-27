// ==========================================
// Evo Upi - PORTARIA PRO MASTER
// ajuda.js - Motor de Chamados de Suporte
// ==========================================

document.getElementById("formSuporte").addEventListener("submit", function(e) {
    e.preventDefault();

    const assunto = document.getElementById("supAssunto").value;
    const prioridade = document.getElementById("supPrioridade").value;
    const mensagem = document.getElementById("supMensagem").value;
    
    const user = auth.currentUser;
    const meuCondominio = localStorage.getItem("condominioId") || "Desconhecido";
    const nomeUsuario = user && user.displayName ? user.displayName : "Usuário sem nome cadastrado";
    const emailUsuario = user ? user.email : "Sem e-mail";

    if (!user) {
        alert("⚠️ Você precisa estar logado no sistema para abrir um chamado.");
        return;
    }

    const btn = document.getElementById("btnEnviarSuporte");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando para Condo Up...';
    btn.style.pointerEvents = "none";

    // Grava no banco de dados
    db.collection("suporte").add({
        condominioId: meuCondominio,
        usuarioUID: user.uid,
        nomeUsuario: nomeUsuario,
        emailUsuario: emailUsuario,
        assunto: assunto,
        prioridade: prioridade,
        mensagem: mensagem,
        status: "Aberto",
        dataEnvio: new Date().toISOString()
    }).then(() => {
        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        document.getElementById("formSuporte").reset();
        
        alert("✅ Chamado aberto com sucesso! A equipe de tecnologia (Condo Up) foi notificada.");
    }).catch((erro) => {
        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        console.error("Erro no suporte:", erro);
        alert("Erro ao enviar chamado: " + erro.message);
    });
});
