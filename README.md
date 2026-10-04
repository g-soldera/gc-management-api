# GrandChase Classic - Character Tracker API

API REST para rastreamento de personagens e atividades do GrandChase Classic com banco de dados Kimball dimensional.

## Stack

- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Deploy**: Render
- **MCP Server**: Model Context Protocol para integração com agentes

## Características

- 19 personagens do GrandChase Classic
- Modelo dimensional Kimball (dim_users, dim_characters, dim_time, fact_character_stats)
- Suporte a caracteres coreanos em usernames
- API REST com autenticação via API Key
- MCP Server para cadastro individual e em lote
- RLS habilitado para segurança
- Custo zero (free tier Supabase + Render)

## Setup Local

```bash
npm install
cp .env.example .env
```

Configure `.env`:
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key
API_KEY=sua-chave-secreta
PORT=3000
```

### Inicializar banco Supabase

```bash
supabase start
supabase db reset
```

### Rodar API

```bash
node src/index.js
```

### Rodar MCP Server

```bash
node mcp-server/index.js
```

## Endpoints

### `POST /api/users`
Criar usuário (suporta caracteres coreanos)
```json
{
  "username": "PlayerKR한국"
}
```

### `GET /api/users`
Listar todos os usuários

### `GET /api/characters`
Listar 19 personagens (ptbr/enus)

### `POST /api/stats`
Registrar stats de personagem
```json
{
  "username": "PlayerKR",
  "char_name": "Elesis",
  "date": "2026-10-04",
  "atk_total": 15000,
  "atk": 12000,
  "atk_sp": 3000,
  "status_void_unificado_semanal": "completo",
  "cristais_void_unificado": 50,
  "andar_wl": 25,
  "drop_perg_prop_uni": true
}
```

### `POST /api/stats/batch`
Registrar múltiplos stats
```json
{
  "records": [
    {
      "username": "Player1",
      "char_name": "Elesis",
      "atk_total": 15000
    },
    {
      "username": "Player2",
      "char_name": "Lass",
      "atk_total": 14000
    }
  ]
}
```

### `GET /api/stats?username=X&char_name=Y`
Consultar stats com filtros

## MCP Server Tools

- `create_user` - Criar usuário
- `list_users` - Listar usuários
- `list_characters` - Listar personagens
- `register_stats` - Registrar stats individual
- `register_stats_batch` - Registrar stats em lote
- `query_stats` - Consultar stats com filtros

## Deploy Render

1. Criar Web Service no Render
2. Conectar repo GitHub
3. Build: `npm install`
4. Start: `node src/index.js`
5. Adicionar env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `API_KEY`

## Segurança

- API Key obrigatória em todos endpoints (header `X-API-Key`)
- RLS habilitado em todas tabelas
- Service role key apenas no backend
- Helmet.js para headers de segurança
- Input validation em todos endpoints

## Campos Disponíveis

### Stats de Combate
- `atk_total`, `atk`, `atk_sp`

### Atividades Semanais
- `status_void_unificado_semanal`, `cristais_void_unificado`
- `status_void_4_semanal`, `cristais_void_4`
- `status_wl_semanal`, `andar_wl`
- `status_fornalha_infernal_semanal`
- `status_altar_ruina_semanal`
- `status_abissal_semanal`
- `status_solene_semanal`

### Atividades Diárias
- `status_tod_diario`
- `status_claustro_infinito_diario`, `nivel_claustro_infinito`

### Drops e Itens
- `drop_perg_prop_uni` (boolean)
- `drop_grim_reaper_card` (boolean)
- `status_brinco_caos`
- `status_piercing_caos`

### Outros
- `idas_calnat`

## Personagens GrandChase Classic (25)

**PT-BR:** Elesis, Arme, Lire, Lass, Ryan, Ronan, Amy, Jin, Sieghart, Mari, Dio, Zero, Rey, Lupus, Lin, Azin, Holy, Edel, Veigas, Uno, Decane, Ai, Kallia, Iris, Ereb

**EN-US:** Elesis, Arme, Lire, Lass, Ryan, Ronan, Amy, Jin, Sieghart, Mari, Dio, Zero, Ley, Rufus, Rin, Asin, Lime, Edel, Veigas, Uno, Decane, Ai, Kallia, Iris, Ereb

## Licença

MIT
