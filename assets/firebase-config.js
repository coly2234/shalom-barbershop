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
  apiKey: "AIzaSyCCNJoi-oBl_glNf7utXq2cUKnNT91Pstk",
  authDomain: "shalombarbershop-a28f6.firebaseapp.com",
  projectId: "shalombarbershop-a28f6",
  storageBucket: "shalombarbershop-a28f6.firebasestorage.app",
  messagingSenderId: "360057176645",
  appId: "1:360057176645:web:ee78ad8af4d2e96294192c",
};
