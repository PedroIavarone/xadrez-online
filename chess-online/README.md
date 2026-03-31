# ♟ Xadrez Online

Jogue xadrez com seu amigo em tempo real. Cada um no seu computador, sem conta necessária.

---

## 🚀 Configuração em 5 minutos

### 1. Crie uma conta gratuita no Pusher

Acesse [pusher.com](https://pusher.com) → **Sign Up** (gratuito, sem cartão de crédito).

### 2. Crie um App no Pusher

- Clique em **Channels** → **Create app**
- Escolha um nome (ex: `meu-xadrez`)
- Selecione o cluster mais próximo (ex: `mt1` para South America)
- Clique em **Create app**

### 3. Ative Client Events

- Acesse **App Settings** do seu app
- Role até **Enable client events** e ative ✅
- Salve

### 4. Copie as credenciais

- Acesse **App Keys**
- Copie: `app_id`, `key`, `secret`, `cluster`

### 5. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com seus dados:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_PUSHER_KEY=sua_key_aqui
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
PUSHER_APP_ID=seu_app_id_aqui
PUSHER_SECRET=seu_secret_aqui
```

### 6. Instale e rode

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## ☁️ Deploy no Vercel

### Opção A — Via GitHub (recomendado)

1. Suba o projeto para um repositório no GitHub
2. Acesse [vercel.com](https://vercel.com) → **New Project**
3. Importe o repositório
4. Em **Environment Variables**, adicione as 4 variáveis do `.env.local`
5. Clique em **Deploy** 🎉

### Opção B — Via CLI

```bash
npm i -g vercel
vercel
# Siga as instruções e adicione as variáveis quando solicitado
```

---

## 🎮 Como jogar

1. Acesse o site e clique em **Criar Partida**
2. Copie o link ou código da sala
3. Envie para seu amigo
4. Quando ele entrar, a partida começa automaticamente!

### Regras implementadas
- ✅ Todos os movimentos padrão do xadrez
- ✅ Roque (kingside e queenside)
- ✅ En passant
- ✅ Promoção de peão (escolha a peça)
- ✅ Detecção de xeque e xeque-mate
- ✅ Empate por afogamento
- ✅ Timer de 10 minutos por jogador
- ✅ Tabuleiro virado para as pretas
- ✅ Histórico de lances em notação algébrica
- ✅ Destaque do último movimento
- ✅ Botão de desistência

---

## 🛠 Tecnologias

- **Next.js 14** — Framework React
- **Pusher Channels** — WebSockets em tempo real
- **chess.js** — Lógica e validação do xadrez
- **Tailwind CSS** — Estilização
- **Wikimedia Commons** — Imagens das peças (domínio público)

---

## 📁 Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx              # Página inicial (criar/entrar)
│   ├── game/[roomId]/        # Página da partida
│   └── api/pusher/auth/      # Autenticação Pusher
├── components/
│   ├── ChessBoard.tsx        # Tabuleiro interativo
│   └── MoveHistory.tsx       # Histórico de lances
└── lib/
    ├── pusherServer.ts       # Cliente Pusher (servidor)
    └── utils.ts              # Utilitários e URLs das peças
```

---

**Bom jogo!** ♟♔
