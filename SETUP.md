# GrandChase Classic - Character Tracker API

Setup do projeto e deploy completos.

## Próximos passos

### 1. Configurar Supabase

```bash
supabase login
supabase link --project-ref seu-project-ref
supabase db push
```

Ou criar projeto novo:
```bash
supabase projects create gc-classic-tracker
supabase link
supabase db push
```

Obter credenciais:
- URL: Dashboard Supabase > Settings > API > Project URL
- Service Key: Dashboard Supabase > Settings > API > service_role key

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Editar `.env` com suas credenciais:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
API_KEY=gere-uma-chave-forte-aqui
PORT=3000
```

### 3. Testar localmente

```bash
npm start
```

Testar health:
```bash
curl http://localhost:3000/health
```

### 4. Deploy no Render

#### Via CLI:
```bash
C:\Users\Administrator\Desktop\render.exe login
C:\Users\Administrator\Desktop\render.exe create web gc-classic-api --branch main --build-command "npm install" --start-command "npm start"
```

#### Via Dashboard:
1. https://dashboard.render.com/
2. New > Web Service
3. Connect GitHub repo
4. Build: `npm install`
5. Start: `npm start`
6. Add env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `API_KEY`

### 5. Criar repo GitHub

```bash
git add .
git commit -m "Initial commit: GrandChase Classic API"
gh repo create gc-management-api --public --source=. --remote=origin
git push -u origin main
```

Ou manualmente:
1. https://github.com/new
2. Nome: `gc-management-api`
3. Public
4. Não inicializar README
5. Copiar URL e:
```bash
git remote add origin https://github.com/seu-usuario/gc-management-api.git
git branch -M main
git push -u origin main
```

### 6. Testar MCP Server

Adicionar ao config do seu cliente MCP (ex: Claude Desktop):
```json
{
  "mcpServers": {
    "grandchase": {
      "command": "node",
      "args": ["D:\\gc-management-api\\mcp-server\\index.js"],
      "env": {
        "API_URL": "https://seu-app.onrender.com",
        "API_KEY": "sua-api-key"
      }
    }
  }
}
```

## Arquitetura

```
gc-management-api/
├── src/
│   └── index.js          # API REST Express
├── mcp-server/
│   └── index.js          # MCP Server
├── supabase/
│   └── migrations/
│       └── 20261004_init_schema.sql  # Schema Kimball
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Modelo Kimball

- **dim_users**: Usuários (suporta caracteres coreanos)
- **dim_characters**: 19 personagens GC Classic (ptbr/enus)
- **dim_time**: Dimensão temporal auto-populada
- **fact_character_stats**: Fatos com todas as métricas

## Segurança garantida

✅ API Key obrigatória
✅ RLS habilitado
✅ Service key apenas backend
✅ Helmet.js
✅ Input validation
✅ .env no .gitignore
✅ CORS configurado

## Custo zero

✅ Supabase Free Tier (500MB, 2GB transfer)
✅ Render Free Tier (750h/mês)
