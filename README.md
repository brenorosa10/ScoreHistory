# ScoreHistory

Monorepo com API ASP.NET Core 10 e frontend React (Vite + Tailwind CSS + shadcn/ui).

```
/backend   API ASP.NET Core com autenticação JWT
/frontend  React + Vite + Tailwind CSS + shadcn/ui
```

## Requisitos

- Node.js 26+
- .NET SDK 10

## Como rodar

Backend (http://localhost:5247):

```bash
dotnet run --project backend/ScoreHistory.Api.csproj --launch-profile http
```

Frontend (http://localhost:5173), com proxy para `/api`:

```bash
cd frontend
npm install
npm run dev
```

Ou, na raiz do repositório: `npm run dev:frontend`.

## Rotas da API

| Método | Rota | Auth |
| --- | --- | --- |
| POST | `/api/users` | público (criação de usuário) |
| GET | `/api/users/{id}` | Bearer JWT |
| POST | `/api/auth/login` | público |
| GET | `/api/auth/me` | Bearer JWT |

Usuário de desenvolvimento:

- email: `admin@scorehistory.local`
- senha: `Admin123!`

A chave JWT local está em `backend/appsettings.Development.json`. Em produção, defina `Jwt__Key` com no mínimo 32 caracteres.

## Banco (Supabase Postgres)

A API usa PostgreSQL. A connection string fica em `backend/appsettings.Local.json` (arquivo local, fora do git):

```json
{
  "ConnectionStrings": {
    "Default": "Host=aws-0-REGION.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.PROJECT;Password=YOUR-PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
  }
}
```

No primeiro `dotnet run`, a tabela `users` é criada e o usuário de desenvolvimento é inserido se ainda não existir.

## Deploy automático (Docker + GitHub Actions)

Cada push na `main` constrói as imagens, publica no GitHub Container Registry e atualiza a VPS.

### 1. Um vez na VPS

Instale Docker Engine com o plugin Compose. Depois:

```bash
sudo mkdir -p /opt/scorehistory
sudo chown "$USER:$USER" /opt/scorehistory
nano /opt/scorehistory/.env
```

Cole o conteúdo de `env.example` com os valores de produção. O `.env` não vai para o git.

Adicione o usuário do deploy ao grupo `docker`:

```bash
sudo usermod -aG docker "$USER"
```

Crie um par de chaves só para o deploy (na sua máquina):

```bash
ssh-keygen -t ed25519 -f scorehistory-deploy -N ""
```

Coloque `scorehistory-deploy.pub` em `~/.ssh/authorized_keys` na VPS.

### 2. Secrets no GitHub

Em **Settings → Secrets and variables → Actions**:

| Secret | Exemplo |
| --- | --- |
| `DEPLOY_HOST` | `srv1916822.hstgr.cloud` |
| `DEPLOY_USER` | usuário SSH da VPS |
| `DEPLOY_SSH_KEY` | conteúdo privado de `scorehistory-deploy` |
| `DEPLOY_PATH` | `/opt/scorehistory` (opcional; esse é o padrão) |
| `DEPLOY_PORT` | `22` (opcional) |
| `GHCR_TOKEN` | PAT com `read:packages` (recomendado se o pacote for privado) |

O `GITHUB_TOKEN` do workflow já publica as imagens. Na VPS, o pull de imagens **privadas** costuma exigir `GHCR_TOKEN`. Alternativa: após o primeiro deploy, em **Packages**, deixe `scorehistory-backend` e `scorehistory-frontend` públicos.

### 3. Conferir

O workflow **Deploy** roda no push da `main` e também em **Actions → Deploy → Run workflow**. Na VPS:

```bash
cd /opt/scorehistory
docker compose ps
```
