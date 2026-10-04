# GrandChase Classic - Character Tracker API

API REST para rastreamento de personagens e atividades do GrandChase Classic com banco de dados Kimball dimensional.

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-52.63%25-yellow)]()

## Características

✅ **25 personagens** do GrandChase Classic  
✅ **Modelo dimensional Kimball** (star schema otimizado)  
✅ **Suporte a caracteres coreanos** em usernames  
✅ **API REST** com autenticação via API Key  
✅ **MCP Server** para integração com agentes  
✅ **Rate limiting** (100 req/15min global, 5 req/15min auth)  
✅ **Input validation** (Zod schemas)  
✅ **Paginação** (cursor-based com offset/limit)  
✅ **Logging estruturado** (Pino)  
✅ **Testes unitários** (Jest + 13 tests)  
✅ **RLS habilitado** para segurança  
✅ **Custo zero** (free tier Supabase + Render)

## Quick Start

```bash
# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env
# Editar .env com credenciais Supabase

# Rodar testes
npm test

# Iniciar API
npm start

# Iniciar MCP Server
npm run mcp
```

## Endpoints

### Autenticação
Todos os endpoints protegidos requerem header:
```
X-API-Key: sua-chave-secreta
```

### `GET /health`
Health check (sem autenticação)
```json
{
  "status": "ok",
  "timestamp": "2026-10-04T05:21:26.838Z",
  "uptime": 42.5
}
```

### `POST /api/users`
Criar usuário (suporta caracteres coreanos)
```json
{
  "username": "PlayerKR한국"
}
```

**Rate limit:** 5 req/15min

### `GET /api/users`
Listar todos os usuários

### `GET /api/characters`
Listar 25 personagens (ptbr/enus)

### `POST /api/stats`
Registrar stats de personagem (atualização parcial suportada)
```json
{
  "username": "PlayerKR",
  "char_name": "Elesis",
  "date": "2026-10-04",
  "atk_total": 15000,
  "andar_wl": 25,
  "drop_perg_prop_uni": true
}
```

### `POST /api/stats/batch`
Registrar múltiplos stats (max 100 records)
```json
{
  "records": [
    {"username": "Player1", "char_name": "Elesis", "atk_total": 15000},
    {"username": "Player2", "char_name": "Lass", "atk_total": 14000}
  ]
}
```

### `GET /api/stats`
Consultar stats com paginação
```
GET /api/stats?username=Player1&char_name=Elesis&limit=20&offset=0
```

**Resposta:**
```json
{
  "data": [...],
  "pagination": {
    "offset": 0,
    "limit": 20,
    "total": 150
  }
}
```

**Query params:**
- `username` (opcional)
- `char_name` (opcional) 
- `from_date` (opcional, formato YYYY-MM-DD)
- `to_date` (opcional, formato YYYY-MM-DD)
- `limit` (opcional, padrão 50, max 100)
- `offset` (opcional, padrão 0)

## MCP Server Tools

- `create_user(username)` - Criar usuário
- `list_users()` - Listar usuários
- `list_characters()` - Listar personagens
- `register_stats(username, char_name, date, ...stats)` - Registrar stats individual
- `register_stats_batch(records: [...])` - Registrar stats em lote
- `query_stats(username?, char_name?, from_date?, to_date?)` - Consultar stats

### Configuração Cliente MCP

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

## Segurança

- ✅ API Key obrigatória (header `X-API-Key`)
- ✅ Rate limiting (100 req/15min global, 5 req/15min auth)
- ✅ Input validation (Zod schemas com ranges e tamanhos)
- ✅ RLS habilitado em todas as tabelas
- ✅ Service role key apenas no backend
- ✅ Helmet.js (headers de segurança)
- ✅ CORS configurado
- ✅ Body size limit (1MB)
- ✅ Logging estruturado (auditoria)
- ✅ Error handling centralizado

## Rate Limits

| Endpoint | Limite |
|----------|--------|
| Global | 100 req/15min por IP |
| POST /api/users | 5 req/15min por IP |
| Demais endpoints | Global limit |

## Validações

- **Username:** 1-50 chars, trim automático
- **ATK values:** 0-999,999,999 (int)
- **Andar WL:** 0-999 (smallint)
- **Date:** YYYY-MM-DD format
- **Batch:** max 100 records por request
- **Status fields:** max 100 chars
- **Pagination limit:** max 100 por request

## Testes

```bash
# Rodar todos os testes
npm test

# Rodar com watch mode
npm run test:watch
```

**Coverage atual:** 52.63% (13 tests passing)

## Deploy

Ver `SETUP.md` para instruções completas.

**Resumo:**
1. Configurar Supabase project + push migrations
2. Deploy no Render (GitHub integration)
3. Adicionar env vars no Render
4. API estará disponível em `https://seu-app.onrender.com`

## Arquitetura

Ver `ARCHITECTURE.md` para diagramas Mermaid completos do modelo Kimball, fluxos de dados e deploy.

## Personagens (25 Total)

| PT-BR | EN-US |
|-------|-------|
| Elesis | Elesis |
| Arme | Arme |
| Lire | Lire |
| Lass | Lass |
| Ryan | Ryan |
| Ronan | Ronan |
| Amy | Amy |
| Jin | Jin |
| Sieghart | Sieghart |
| Mari | Mari |
| Dio | Dio |
| Zero | Zero |
| Rey | Ley |
| Lupus | Rufus |
| Lin | Rin |
| Azin | Asin |
| Holy | Lime |
| Edel | Edel |
| Veigas | Veigas |
| Uno | Uno |
| Decane | Decane |
| Ai | Ai |
| Kallia | Kallia |
| Iris | Iris |
| Ereb | Ereb |

## Custos

| Serviço | Tier | Custo |
|---------|------|-------|
| Supabase | Free | $0 (500MB DB, 2GB transfer) |
| Render | Free | $0 (750h/mês) |
| **Total** | | **$0/mês** |

## Licença

MIT
