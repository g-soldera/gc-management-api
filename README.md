# GrandChase Classic - Character Tracker API v1.2.0

API REST para rastreamento de personagens e atividades do GrandChase Classic com banco de dados Kimball dimensional.

[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-52.63%25-yellow)]()
[![Version](https://img.shields.io/badge/version-1.2.0-blue)]()

## Características

✅ **25 personagens** do GrandChase Classic  
✅ **Modelo dimensional Kimball** (star schema otimizado)  
✅ **Discord Authentication** (ownership + permission system)  
✅ **Suporte a caracteres coreanos** em usernames  
✅ **API REST** com autenticação via API Key  
✅ **MCP Server** para integração com agentes (12 tools)  
✅ **Batch updates** (1 stat para todos os 25 personagens da conta)  
✅ **Reset automático** semanal/diário (GitHub Actions)  
✅ **OCR de screenshots** (GPT-4o Vision)  
✅ **Rate limiting** (100 req/15min global, 5 req/15min auth)  
✅ **Input validation** (Zod schemas)  
✅ **Paginação** (cursor-based com offset/limit)  
✅ **Logging estruturado** (Pino)  
✅ **Testes unitários** (Jest + 13 tests)  
✅ **RLS habilitado** para segurança  
✅ **Custo zero** (free tier Supabase + Render + GitHub Actions)

## Novidades v1.2.0

🎉 **Acessórios:**
- Campos: `status_anel`, `tipo_anel`, `status_tornozeleira`, `tipo_tornozeleira`
- Tipos suportados: Esmaecido, Silencioso, Sangrento, Caos (anel) / Eternidade, Redenção, Perfeição, Caos (tornozeleira)

🎉 **Notas por Personagem:**
- Campo `anotacoes` (TEXT, max 5000 chars)

🎉 **Poder Calculado:**
- Campo `poder` (read-only, auto: (atk + atk_sp) / 10000)

🎉 **Reset Automático:**
- Endpoints `/api/maintenance/reset-weekly` e `/reset-daily`
- GitHub Actions agendadas (quartas 03:00, diário 03:00 BRT)
- Preserva histórico completo para rankings

🎉 **OCR de Screenshots:**
- Endpoint `/api/ocr/extract-stats`
- Extrai atributos de prints via GPT-4o Vision
- Confidence score incluído

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

### Sistema de Permissões Discord

**Conceito:** Cada conta de jogo (username) é vinculada a um usuário Discord (owner). Apenas o owner ou usuários autorizados por ele podem modificar stats.

**Fluxo:**
1. Registrar usuário Discord: `POST /api/discord/users`
2. Criar conta de jogo vinculada ao Discord: `POST /api/users` (com `discord_owner_id`)
3. Modificar stats: requer `discord_id` nos endpoints de escrita
4. Owner pode conceder permissões: `POST /api/permissions/grant`

### `GET /health`
Health check (sem autenticação)
```json
{
  "status": "ok",
  "timestamp": "2026-10-04T05:21:26.838Z",
  "uptime": 42.5
}
```

### `POST /api/discord/users`
Registrar usuário Discord no sistema (upsert)
```json
{
  "discord_id": "123456789012345678",
  "discord_username": "PlayerDiscord",
  "discord_discriminator": "0001",
  "discord_avatar": "abc123"
}
```

### `POST /api/users`
Criar conta de jogo vinculada a Discord owner
```json
{
  "username": "PlayerKR한국",
  "discord_owner_id": "123456789012345678"
}
```

**Rate limit:** 5 req/15min

### `GET /api/users`
Listar todos os usuários

### `GET /api/characters`
Listar 25 personagens (ptbr/enus)

### `POST /api/permissions/grant`
Owner concede permissão a outro usuário Discord
```json
{
  "owner_discord_id": "123456789012345678",
  "username": "PlayerKR",
  "grant_to_discord_id": "987654321098765432"
}
```

**Resposta:**
```json
{
  "permission_id": 1,
  "granted": true,
  "message": "Permission granted"
}
```

### `POST /api/permissions/revoke`
Owner revoga permissão
```json
{
  "owner_discord_id": "123456789012345678",
  "username": "PlayerKR",
  "revoke_from_discord_id": "987654321098765432"
}
```

### `GET /api/permissions/:username`
Listar permissões de uma conta
```
GET /api/permissions/PlayerKR
```

**Resposta:**
```json
{
  "username": "PlayerKR",
  "owner_discord_id": "123456789012345678",
  "permissions": [
    {
      "permission_id": 1,
      "granted_to": {
        "discord_id": "987654321098765432",
        "discord_username": "Friend"
      },
      "granted_by": {
        "discord_id": "123456789012345678",
        "discord_username": "Owner"
      },
      "granted_at": "2026-10-04T06:00:00Z"
    }
  ]
}
```

### `POST /api/stats`
Registrar stats de personagem (**requer discord_id para autorização**)
```json
{
  "username": "PlayerKR",
  "char_name": "Elesis",
  "discord_id": "123456789012345678",
  "date": "2026-10-04",
  "nivel": 90,
  "status_despertar": "Despertado",
  "atk_total": 1000000,
  "atk": 40000,
  "atk_sp": 20000,
  "status_void_unificado_semanal": "Feito",
  "cristais_void_unificado": 10,
  "status_berkas_diario": "Feito"
}
```

**Autorização:** Owner ou usuário com permissão concedida.

**Campos suportados:**
- Combat: `nivel`, `status_despertar`, `atk_total`, `atk`, `atk_sp`
- Weekly: `status_void_unificado_semanal`, `cristais_void_unificado`, `status_void_4_semanal`, `cristais_void_4`, `status_wl_semanal`, `andar_wl`, `status_fornalha_infernal_semanal`, `status_altar_ruina_semanal`, `status_abissal_semanal`, `status_solene_semanal`
- Daily: `status_tod_diario`, `status_claustro_infinito_diario`, `nivel_claustro_infinito`, `status_berkas_diario`
- Drops: `drop_perg_prop_uni` (int), `drop_grim_reaper_card` (int), `status_brinco_caos`, `status_piercing_caos`, `idas_calnat`
- Accessories: `status_anel`, `tipo_anel`, `status_tornozeleira`, `tipo_tornozeleira`
- Notes: `anotacoes` (TEXT, max 5000 chars)
- Calculated: `poder` (auto-computed from atk + atk_sp)

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

### `POST /api/stats/update-all-chars`
**Atualizar 1 campo em todos os 25 personagens da conta** (**requer discord_id para autorização**)
```json
{
  "username": "PlayerKR",
  "discord_id": "123456789012345678",
  "field_name": "status_berkas_diario",
  "field_value": "Feito",
  "date": "2026-10-04"
}
```

**Autorização:** Owner ou usuário com permissão concedida.

**Exemplo de uso:** Marcar Berkas como "Feito" para todos os personagens em uma única chamada.

**Campo `field_name` permitidos:**
- Combat: `nivel`, `status_despertar`
- Weekly: `status_void_unificado_semanal`, `status_void_4_semanal`, `status_wl_semanal`, `status_fornalha_infernal_semanal`, `status_altar_ruina_semanal`, `status_abissal_semanal`, `status_solene_semanal`
- Daily: `status_tod_diario`, `status_claustro_infinito_diario`, `status_berkas_diario`
- Items: `status_brinco_caos`, `status_piercing_caos`
- Accessories: `status_anel`, `tipo_anel`, `status_tornozeleira`, `tipo_tornozeleira`

**Resposta:**
```json
{
  "updated_count": 25,
  "char_names": ["Elesis", "Arme", "Lire", ..., "Ereb"]
}
```

## Maintenance Endpoints

### `POST /api/maintenance/reset-weekly`
**Reset semanal automático** (quartas-feiras 03:00 BRT)

Cria novos registros com status `A fazer` para todas as missões semanais. **Preserva histórico** (não deleta dados antigos).

**Headers:**
```
X-API-Key: sua-chave-secreta
```

**Body (opcional):**
```json
{
  "date": "2026-10-09"
}
```

**Resposta:**
```json
{
  "success": true,
  "totalUpdated": 175,
  "resetDate": "2026-10-09"
}
```

**Campos resetados:**
- `status_void_unificado_semanal`
- `status_void_4_semanal`
- `status_wl_semanal`
- `status_fornalha_infernal_semanal`
- `status_altar_ruina_semanal`
- `status_abissal_semanal`
- `status_solene_semanal`

### `POST /api/maintenance/reset-daily`
**Reset diário automático** (todos os dias 03:00 BRT)

Cria novos registros com status `A fazer` para todas as missões diárias. **Preserva histórico** (não deleta dados antigos).

**Headers:**
```
X-API-Key: sua-chave-secreta
```

**Body (opcional):**
```json
{
  "date": "2026-10-05"
}
```

**Resposta:**
```json
{
  "success": true,
  "totalUpdated": 75,
  "resetDate": "2026-10-05"
}
```

**Campos resetados:**
- `status_tod_diario`
- `status_claustro_infinito_diario`
- `status_berkas_diario`

**Configuração de Cron:** Ver seção "Automated Resets" abaixo.

## OCR Endpoint

### `POST /api/ocr/extract-stats`
**Extrair atributos de personagem via screenshot** (GPT-4o Vision)

Envia imagem de tela de atributos e recebe JSON estruturado com stats extraídos.

**Headers:**
```
X-API-Key: sua-chave-secreta
Content-Type: application/json
```

**Body (opção 1 - URL):**
```json
{
  "image_url": "https://example.com/screenshot.png",
  "char_name": "Elesis"
}
```

**Body (opção 2 - Base64):**
```json
{
  "image_base64": "iVBORw0KGgoAAAANS...",
  "char_name": "Elesis"
}
```

**Resposta:**
```json
{
  "success": true,
  "extracted": {
    "atk": 45000,
    "atk_sp": 15000,
    "nivel": 90,
    "status_despertar": "Despertado",
    "andar_wl": 28,
    "status_anel": "Obtido",
    "tipo_anel": "Caos",
    "confidence": 0.95
  },
  "note": "Use these values with POST /api/stats to register"
}
```

**Campos extraíveis:**
- `atk`, `atk_sp`, `nivel`, `status_despertar` (sempre tentados)
- `andar_wl`, acessórios (status/tipo de anel, tornozeleira, brinco, piercing) (se visíveis na imagem)
- `confidence` (0-1): confiança do modelo na extração

**Uso recomendado:**
1. Usuário tira screenshot da tela de atributos
2. Frontend envia para `/api/ocr/extract-stats`
3. Frontend exibe valores extraídos para confirmação
4. Usuário confirma e frontend chama `/api/stats` para persistir

**Configuração:**
Requer `OPENAI_API_KEY` no `.env`. Se não configurado, endpoint retorna 503.

**Custos:**
~$0.003-0.01 por imagem (GPT-4o vision, depende de resolução). Ver [OpenAI Pricing](https://openai.com/pricing).

## MCP Server Tools

**Total: 12 ferramentas disponíveis**

### Discord & Permissions (5 tools)
- `create_discord_user(discord_id, discord_username, ...)` - Registrar usuário Discord
- `create_user(username, discord_owner_id)` - Criar conta de jogo vinculada a Discord owner
- `grant_permission(owner_discord_id, username, grant_to_discord_id)` - Conceder permissão
- `revoke_permission(owner_discord_id, username, revoke_from_discord_id)` - Revogar permissão
- `list_permissions(username)` - Listar permissões de uma conta

### Data Management (6 tools)
- `list_users()` - Listar usuários
- `list_characters()` - Listar personagens
- `register_stats(username, char_name, discord_id, date, ...stats)` - Registrar stats individual (**requer discord_id**, agora inclui acessórios + anotacoes)
- `register_stats_batch(records: [...])` - Registrar stats em lote
- `query_stats(username?, char_name?, from_date?, to_date?)` - Consultar stats
- `update_stat_all_chars(username, discord_id, field_name, field_value, date?)` - **Batch: atualizar 1 stat em todos os 25 personagens** (**requer discord_id**, agora suporta acessórios)

### OCR & Automation (1 tool)
- `extract_stats_from_image(image_url?, image_base64?, char_name?)` - **Extrair stats de screenshot via GPT-4o Vision** (retorna: atk, atk_sp, nivel, despertar, acessórios, confidence)

### Exemplos de Uso

**1. Registrar Discord user:**
```json
{
  "tool": "create_discord_user",
  "discord_id": "123456789012345678",
  "discord_username": "PlayerDiscord"
}
```

**2. Criar conta de jogo:**
```json
{
  "tool": "create_user",
  "username": "oGus",
  "discord_owner_id": "123456789012345678"
}
```

**3. Extrair stats de screenshot (OCR):**
```json
{
  "tool": "extract_stats_from_image",
  "image_url": "https://i.imgur.com/screenshot.png",
  "char_name": "Elesis"
}
```

**4. Marcar Berkas como Feito (todos os personagens):**
```json
{
  "tool": "update_stat_all_chars",
  "username": "oGus",
  "discord_id": "123456789012345678",
  "field_name": "status_berkas_diario",
  "field_value": "Feito"
}
```

**4. Conceder permissão a um amigo:**
```json
{
  "tool": "grant_permission",
  "owner_discord_id": "123456789012345678",
  "username": "oGus",
  "grant_to_discord_id": "987654321098765432"
}
```

Resposta:
```json
{
  "updated_count": 25,
  "char_names": ["Elesis", "Arme", "Lire", "Lass", "Ryan", "Ronan", "Amy", "Jin", "Sieghart", "Mari", "Dio", "Zero", "Ley", "Rufus", "Rin", "Asin", "Lime", "Edel", "Veigas", "Uno", "Decane", "Ai", "Kallia", "Iris", "Ereb"]
}
```

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
- ✅ **Discord Authentication** (ownership por Discord ID)
- ✅ **Permission System** (whitelist por conta, grant/revoke via SQL functions)
- ✅ **Authorization Middleware** (valida owner ou permissão concedida antes de modificações)
- ✅ Rate limiting (100 req/15min global, 5 req/15min auth)
- ✅ Input validation (Zod schemas com ranges e tamanhos)
- ✅ **Discord ID validation** (snowflake 17-20 digits)
- ✅ **SQL Injection protection** (field_name whitelist, prepared statements)
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
- **Drops:** 0-99,999 (int, para acumulação)
- **Date:** YYYY-MM-DD format
- **Batch:** max 100 records por request
- **Status fields:** max 100 chars
- **Pagination limit:** max 100 por request
- **Field names (batch update):** whitelist de 14 campos permitidos

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

## Automated Resets

O sistema preserva histórico completo. Resets criam novos registros sem deletar dados antigos.

### Configuração via GitHub Actions (Recomendado - Grátis)

**Status:** ✅ Configurado automaticamente neste repo

As Actions rodam automaticamente:
- **Daily Reset:** Todos os dias às 03:00 BRT (06:00 UTC)
- **Weekly Reset:** Quartas-feiras às 03:00 BRT (06:00 UTC)

**Configuração necessária (GitHub Secrets):**
1. Vá em `Settings` → `Secrets and variables` → `Actions`
2. Adicione:
   - `API_KEY`: Sua API key (mesmo valor do `.env`)
   - `API_URL`: `https://gc-classic-api.onrender.com` (ou sua URL do Render)

**Trigger manual:**
- Vá em `Actions` → escolha workflow → `Run workflow`

**Logs:**
- Vá em `Actions` para ver execuções e logs

**Limites GitHub Actions (Free tier):**
- 2000 minutos/mês (suficiente para ~60,000 execuções de 2 segundos)
- Este cron usa ~30 execuções/mês = ~1 minuto total

### Alternativas

**EasyCron (se GitHub Actions falhar):**
```
URL: https://gc-classic-api.onrender.com/api/maintenance/reset-weekly
Method: POST
Schedule: 0 3 * * 3 (every Wednesday at 03:00)
Timezone: America/Sao_Paulo
Headers: X-API-Key: YOUR_API_KEY
```

**Supabase pg_cron (avançado):**
```sql
SELECT cron.schedule('daily-reset', '0 6 * * *', 
  $$ SELECT net.http_post(
    url:='https://gc-classic-api.onrender.com/api/maintenance/reset-daily',
    headers:='{"X-API-Key": "YOUR_KEY"}'::jsonb
  ) $$
);
```

### Comportamento do Reset

**Antes do reset:**
```sql
-- 2026-10-02 (terça)
user_id=1, char_id=1, date=2026-10-02, status_berkas_diario='Feito'
```

**Após reset (quarta 03:00):**
```sql
-- Registro antigo preservado
user_id=1, char_id=1, date=2026-10-02, status_berkas_diario='Feito'

-- Novo registro criado
user_id=1, char_id=1, date=2026-10-09, status_berkas_diario='A fazer'
```

**Queries de ranking funcionam normalmente:**
```sql
SELECT username, COUNT(*) as berkas_count
FROM fact_character_stats
WHERE status_berkas_diario = 'Feito'
  AND date >= '2026-09-01'
GROUP BY username
ORDER BY berkas_count DESC;
```

## Licença

MIT
