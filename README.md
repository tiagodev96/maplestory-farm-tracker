# Farm Tracker

Registro de sessões de grind no MapleStory Classic World: mesos, EXP e tempo por sessão, com
totais por dia e por monstro. Multi-usuário, cada conta vê apenas os próprios dados.

Stack: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, Drizzle ORM,
Better Auth, Postgres (Neon em produção, PGlite em desenvolvimento).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run dev
```

Sem `DATABASE_URL`, o app usa um Postgres em processo (PGlite) gravado em `./.pglite` e aplica
as migrações sozinho ao subir. Para zerar os dados locais, apague a pasta `.pglite` com o
servidor parado.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run test` | Testes da lógica pura (`src/lib`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | Build de produção |
| `npm run db:generate` | Gera uma migração a partir de `src/db/schema.ts` |
| `npm run db:migrate` | Aplica as migrações no banco de `DATABASE_URL` |

## Conectar o Neon

1. Crie um projeto em [neon.com](https://neon.com) (plano Free, sem cartão). Escolha a região
   mais próxima e, em *Compute*, limite o autoscaling a 0,25 CU para não estourar as
   100 CU-horas mensais do plano gratuito.
2. Copie a connection string (a versão *pooled*) para `DATABASE_URL` no `.env.local`.
3. Rode `npm run db:migrate`.
4. Suba o app de novo. Com `DATABASE_URL` definida ele deixa de usar o PGlite.

Os dados do PGlite local não são copiados para o Neon. Para levar sessões de um para o outro,
use a exportação do tracker antigo ou registre de novo.

## Deploy na Vercel

1. Importe o repositório na Vercel.
2. Em *Storage*, conecte o projeto Neon: isso preenche `DATABASE_URL`.
3. Defina `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` (a URL pública, por exemplo
   `https://seu-app.vercel.app`).
4. Rode `npm run db:migrate` apontando para o banco de produção antes do primeiro acesso.

## Login com Discord e Google (opcional)

E-mail e senha funcionam sem configuração. Cada provedor social aparece na tela de login
quando as duas variáveis dele estão definidas.

- **Discord:** [discord.com/developers/applications](https://discord.com/developers/applications)
  → New Application → OAuth2 → adicione o redirect `<URL do app>/api/auth/callback/discord`.
  Copie Client ID e Client Secret para `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET`.
- **Google:** [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
  → Create credentials → OAuth client ID (Web application) → redirect
  `<URL do app>/api/auth/callback/google`. Copie para `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.

Em desenvolvimento, `<URL do app>` é `http://localhost:3000`.

## Trazer os dados do tracker antigo

A versão anterior é uma página única, guardada em `legacy/farm-tracker.html`. Nela, use
"Exportar backup"; aqui, vá em Configurações → "Importar do tracker antigo" e envie o arquivo.
Personagens que faltarem são criados e sessões já existentes são ignoradas.

## Estrutura

```
src/
  app/(auth)/        login e registro
  app/(app)/         telas autenticadas: grind, histórico, estatísticas, personagens, configurações
  app/api/           handler do Better Auth e exportação CSV
  db/                schema Drizzle e cliente (Neon ou PGlite)
  features/grind/    queries, server actions, validação e componentes
  lib/               lógica pura (tabela de EXP, cálculos, formatação) e auth
drizzle/             migrações SQL
legacy/              tracker original em HTML
```

Toda query e toda server action resolve o usuário pela sessão e filtra por ele; ids vindos do
cliente nunca são confiados sozinhos.

A tabela de EXP por level (1 a 100) em `src/lib/exp-table.ts` é a do MapleStory Classic World,
conforme publicada pelo MeowDB.
