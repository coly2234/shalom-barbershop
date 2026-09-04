# Agendamento com horários em tempo real (Firebase)

Sem essa configuração, o site funciona em **modo de demonstração**: os
horários aparecem, mas marcar um horário não bloqueia ele para outros
clientes. Para ligar o bloqueio de verdade entre todos os visitantes
do site, siga os passos abaixo (leva uns 5 minutos, é gratuito).

## 1. Criar o projeto

1. Acesse https://console.firebase.google.com e clique em "Adicionar projeto".
2. Dê um nome (ex.: `shalom-barbershop`) e siga o assistente até o final.

## 2. Ativar o Firestore

1. No menu lateral, clique em **Firestore Database** → **Criar banco de dados**.
2. Escolha **modo de produção** e a região mais próxima (ex.: `southamerica-east1`).
3. Depois de criado, vá em **Regras** e cole o conteúdo do arquivo
   `firestore.rules` (na raiz deste projeto), substituindo o que já
   está lá. Clique em **Publicar**.

## 3. Pegar as chaves do site

1. No menu lateral, clique na engrenagem → **Configurações do projeto**.
2. Em "Seus apps", clique no ícone **</>** (Web) para registrar um app.
3. Dê um nome (ex.: `site`) e clique em **Registrar app**.
4. Copie o objeto `firebaseConfig` que aparece.

## 4. Colar no site

Abra `assets/firebase-config.js` e substitua os valores de exemplo
pelos que você copiou:

```js
window.SHALOM_FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "shalom-barbershop.firebaseapp.com",
  projectId: "shalom-barbershop",
  storageBucket: "shalom-barbershop.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
};
```

Salve o arquivo e suba o site de novo. A partir daí, cada horário
reservado por um cliente some automaticamente para os outros — em
tempo real, sem precisar recarregar a página.

## Sobre os "profissionais"

Os nomes "Barbeiro 1/2/3" em `assets/booking.js` (lista `PROFESSIONALS`
no topo do arquivo) são placeholders — troque pelos nomes reais da
equipe.

## Cancelar um agendamento

Pelo site público não dá para cancelar (por segurança — veja
`firestore.rules`). Para cancelar um horário, acesse **Firestore
Database** no console do Firebase, abra a coleção `bookings` e apague
o documento correspondente manualmente.

## Duração dos serviços

Os horários são calculados a partir da duração de cada serviço, em
`DURATIONS` no topo de `assets/booking.js`. Ajuste os minutos para
bater com o tempo real de cada corte/barba na sua barbearia.
