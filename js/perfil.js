// ==========================================
// Evo Upi - PORTARIA PRO MASTER
// perfil.js - Gestão de Perfil e Segurança
// ==========================================

// 1. Verifica se o usuário está logado e carrega os dados
auth.onAuthStateChanged((user) => {
    if (user) {
        // Exibe o e-mail do Auth que está bloqueado para edição
        document.getElementById("perfilEmail").value = user.email;
        
        // Busca os dados complementares no Firestore na coleção 'usuarios'
        db.collection("usuarios").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const dadosUsuario = doc.data();
                document.getElementById("perfilNome").value = dadosUsuario.nome || "";
                document.getElementById("perfilWhatsapp").value = dadosUsuario.whatsapp || "";
            } else {
                // Se o documento não existir, deixa os campos prontos para criar
                document.getElementById("perfilNome").value = user.displayName || "";
                document.getElementById("perfilNome").placeholder = "Digite seu nome";
            }
        }).catch((erro) => {
            console.error("Erro ao carregar dados do Firestore:", erro);
        });
    } else {
        // Se não estiver logado, chuta de volta para o login
        alert("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = "login.html";
    }
});

// 2. Salvar Dados Pessoais (Nome e Zap)
document.getElementById("formDadosPessoais").addEventListener("submit", function(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById("btnSalvarDados");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';
    btn.style.pointerEvents = "none";

    const nomeAtualizado = document.getElementById("perfilNome").value;
    const whatsappAtualizado = document.getElementById("perfilWhatsapp").value;

    // Atualiza no Firestore mantendo o Multi-Tenant estável
    db.collection("usuarios").doc(user.uid).set({
        nome: nomeAtualizado,
        whatsapp: whatsappAtualizado,
        email: user.email,
        ultimoAcesso: new Date()
    }, { merge: true }).then(() => {
        // Opcional: Atualiza também o perfil nativo do Firebase Auth
        user.updateProfile({ displayName: nomeAtualizado });

        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        alert("✅ Perfil atualizado com sucesso!");
    }).catch((erro) => {
        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        alert("Erro ao salvar dados: " + erro.message);
    });
});

// 3. Atualizar a Senha de Acesso
document.getElementById("formAlterarSenha").addEventListener("submit", function(e) {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const novaSenha = document.getElementById("novaSenha").value;
    const confirmarSenha = document.getElementById("confirmarNovaSenha").value;

    if (novaSenha.length < 6) {
        alert("⚠️ A nova senha deve ter pelo menos 6 caracteres!");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        alert("⚠️ As senhas digitadas não são iguais!");
        return;
    }

    const btn = document.getElementById("btnSalvarSenha");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
    btn.style.style.pointerEvents = "none";

    // Executa a troca de senha nativa do Firebase
    user.updatePassword(novaSenha).then(() => {
        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        document.getElementById("formAlterarSenha").reset();
        alert("🚀 Senha atualizada com sucesso! Use a nova senha no seu próximo login.");
    }).catch((erro) => {
        btn.innerHTML = textoOriginal;
        btn.style.pointerEvents = "auto";
        
        // Tratamento para quando o Firebase exige que o usuário deslogue e logue de novo para mudar a senha
        if (erro.code === "auth/requires-recent-login") {
            alert("🔒 Por segurança, você precisa fazer login novamente antes de alterar a senha.");
            auth.signOut().then(() => { window.location.href = "login.html"; });
        } else {
            alert("Erro ao atualizar senha: " + erro.message);
        }
    });
});
