/*
 * Configuração do Firebase (banco de dados dos agendamentos).
 *
 * 1. Crie um projeto grátis em https://console.firebase.google.com
 * 2. No menu lateral, ative "Firestore Database" (modo produção).
 * 3. Em "Configurações do projeto" > "Geral" > "Seus apps", crie um
 *    app da Web e copie as chaves que aparecem ali para o objeto
 *    abaixo, substituindo os valores de exemplo.
 * 4. Em "Firestore Database" > "Regras", cole o conteúdo do arquivo
 *    firestore.rules (na raiz do projeto) e publique.
 *
 * Enquanto os valores abaixo continuarem como estão (placeholders),
 * o site funciona em MODO DE DEMONSTRAÇÃO: os horários aparecem
 * normalmente, mas marcar um horário não bloqueia ele para outros
 * clientes — é só ligar o Firebase para isso valer de verdade.
 */
window.SHALOM_FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};
