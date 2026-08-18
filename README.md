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
