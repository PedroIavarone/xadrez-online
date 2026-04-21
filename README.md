# ♟ Xadrez Online

Plataforma de xadrez multiplayer em tempo real com suporte a **2 jogadores** e **4 jogadores**, rodando no browser sem instalação.

---
## 🚀 Como jogar

Acesse diretamente pelo link:

👉 **[https://chess-do-iavarone.vercel.app/](https://chess-do-iavarone.vercel.app/)**

Nenhuma instalação necessária. Funciona direto no navegador.

## 🖥️ Requisitos

- Navegador moderno (Chrome recomendado)
- Conexão com a internet

## Funcionalidades

### Modo 2 Jogadores
- Partida online em tempo real via Pusher
- Validação completa de movimentos (chess.js)
- Promoção de peão, roque, en passant
- Detecção de xeque, xeque-mate, afogamento e empate
- Resignação
- Controles de tempo:
  - **Bullet** — 1 minuto por jogador
  - **Blitz** — 3 minutos por jogador
  - **Padrão** — 10 minutos por jogador
  - **Livre** — tempo personalizado (1–180 min)

### Modo 4 Jogadores
- Tabuleiro 14×14 em forma de cruz (cantos 3×3 removidos)
- Quatro cores: **Vermelho** (topo), **Azul** (esquerda), **Amarelo** (baixo), **Verde** (direita)
- Peças rotacionadas para cada jogador encarar o centro
- Turno circular: Vermelho → Azul → Amarelo → Verde
- Jogador eliminado quando seu rei é capturado
- Último rei em campo vence
- Links de convite individuais por cor

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Lógica de xadrez | chess.js |
| Tempo real | Pusher (Presence Channels) |

---

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- Conta no [Pusher](https://pusher.com) (plano gratuito funciona)

### Instalação

```bash
cd chess-online
npm install
```

### Variáveis de ambiente

Crie o arquivo `chess-online/.env.local`:

```env
NEXT_PUBLIC_PUSHER_KEY=sua_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=seu_cluster
PUSHER_APP_ID=seu_app_id
PUSHER_SECRET=seu_pusher_secret
```

> No painel do Pusher, habilite **Client Events** nas configurações do app.

### Executar

```bash
npm run dev
```

Acesse `http://localhost:3000`.

---

## Como jogar

### 2 Jogadores
1. Escolha o controle de tempo desejado
2. Clique em **Criar Partida** — você joga com as brancas
3. Compartilhe o código ou link com seu amigo
4. Quando ele entrar, a partida começa automaticamente

### 4 Jogadores
1. Selecione a aba **4 Jogadores**
2. Clique em **Criar Partida** — você joga como **Vermelho**
3. Na tela de espera, copie e envie os links individuais para cada amigo (Azul, Amarelo e Verde)
4. A partida começa assim que 2 ou mais jogadores estiverem conectados

---

## Deploy (Vercel)

```bash
vercel --cwd chess-online
```

Configure as variáveis de ambiente do `.env.local` no painel da Vercel.

---

## Estrutura do projeto

```
chess-online/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Home / menu principal
│   │   ├── game/[roomId]/        # Partida 2 jogadores
│   │   └── game4/[roomId]/       # Partida 4 jogadores
│   ├── components/
│   │   ├── ChessBoard.tsx        # Tabuleiro 2 jogadores
│   │   ├── ChessBoard4.tsx       # Tabuleiro 4 jogadores (14x14)
│   │   └── MoveHistory.tsx       # Histórico de lances
│   └── lib/
│       ├── chess4.ts             # Lógica do xadrez 4 jogadores
│       ├── utils.ts              # Utilitários e imagens de peças
│       └── pusherServer.ts       # Configuração Pusher server-side
└── package.json
```
