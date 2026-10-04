# Architecture - GrandChase Classic API

## Overview

Sistema de rastreamento de personagens e atividades do GrandChase Classic, construído com arquitetura RESTful e modelo dimensional Kimball para análise de dados históricos.

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                         Cliente                              │
│  (Agentes via MCP Server / HTTP Clients / Postman)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS + X-API-Key
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API REST Layer                          │
│                    (Express.js + Node.js)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middlewares: Helmet, CORS, Auth, JSON Parser       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routes: /users, /characters, /stats, /stats/batch  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client SDK
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│                     Kimball Data Model                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       MCP Server                             │
│             (Model Context Protocol Interface)               │
│  Tools: create_user, register_stats, register_stats_batch   │
│         query_stats, list_users, list_characters            │
└─────────────────────────────────────────────────────────────┘
```

## Modelo de Dados - Kimball Dimensional Model

### Diagrama Entidade-Relacionamento

```
┌─────────────────────────┐
│      dim_users          │
│─────────────────────────│
│ PK  user_id (BIGSERIAL) │
│ UK  username (TEXT)     │ ◄────┐
│     created_at          │      │
│     updated_at          │      │
└─────────────────────────┘      │
                                 │
                                 │ FK
┌─────────────────────────┐      │
│    dim_characters       │      │
│─────────────────────────│      │
│ PK  char_id (SMALLINT)  │ ◄──┐ │
│     char_name_ptbr      │    │ │
│     char_name_enus      │    │ │
│     created_at          │    │ │
└─────────────────────────┘    │ │
                               │ │ FK
                               │ │
┌─────────────────────────┐    │ │
│       dim_time          │    │ │
│─────────────────────────│    │ │
│ PK  time_id (BIGSERIAL) │ ◄─┐│ │
│ UK  date (DATE)         │   ││ │
│     year (SMALLINT)     │   ││ │
│     month (SMALLINT)    │   ││ │
│     week (SMALLINT)     │   ││ │
│     day (SMALLINT)      │   ││ │
│     day_of_week         │   ││ │
└─────────────────────────┘   ││ │
                              ││ │
                              ││ │
        ┌─────────────────────┘│ │
        │  ┌───────────────────┘ │
        │  │  ┌──────────────────┘
        │  │  │
        ▼  ▼  ▼
┌────────────────────────────────────────────────────────┐
│            fact_character_stats (FACT TABLE)           │
│────────────────────────────────────────────────────────│
│ PK  fact_id (BIGSERIAL)                                │
│ FK  user_id (BIGINT) → dim_users.user_id               │
│ FK  char_id (SMALLINT) → dim_characters.char_id        │
│ FK  time_id (BIGINT) → dim_time.time_id                │
│ UK  (user_id, char_id, time_id)                        │
│────────────────────────────────────────────────────────│
│ MEASURES - Combat Stats:                               │
│     atk_total (INTEGER)                                │
│     atk (INTEGER)                                      │
│     atk_sp (INTEGER)                                   │
│────────────────────────────────────────────────────────│
│ MEASURES - Weekly Activities:                          │
│     status_void_unificado_semanal (TEXT)               │
│     cristais_void_unificado (INTEGER)                  │
│     status_void_4_semanal (TEXT)                       │
│     cristais_void_4 (INTEGER)                          │
│     status_wl_semanal (TEXT)                           │
│     andar_wl (SMALLINT)                                │
│     status_fornalha_infernal_semanal (TEXT)            │
│     status_altar_ruina_semanal (TEXT)                  │
│     status_abissal_semanal (TEXT)                      │
│     status_solene_semanal (TEXT)                       │
│────────────────────────────────────────────────────────│
│ MEASURES - Daily Activities:                           │
│     status_tod_diario (TEXT)                           │
│     status_claustro_infinito_diario (TEXT)             │
│     nivel_claustro_infinito (SMALLINT)                 │
│────────────────────────────────────────────────────────│
│ MEASURES - Drops & Items:                              │
│     drop_perg_prop_uni (BOOLEAN)                       │
│     drop_grim_reaper_card (BOOLEAN)                    │
│     status_brinco_caos (TEXT)                          │
│     status_piercing_caos (TEXT)                        │
│────────────────────────────────────────────────────────│
│ MEASURES - Other:                                      │
│     idas_calnat (INTEGER)                              │
│────────────────────────────────────────────────────────│
│     created_at (TIMESTAMPTZ)                           │
│     updated_at (TIMESTAMPTZ)                           │
└────────────────────────────────────────────────────────┘
```

### Índices de Performance

```sql
-- dim_users
idx_dim_users_username ON username

-- dim_time
idx_dim_time_date ON date

-- fact_character_stats
idx_fact_char_stats_user ON user_id
idx_fact_char_stats_char ON char_id
idx_fact_char_stats_time ON time_id
idx_fact_char_stats_created ON created_at DESC
```

## Fluxo de Dados

### 1. Cadastro de Usuário

```
Cliente → POST /api/users {username: "Player한국"}
   ↓
Express Middleware (Auth Check)
   ↓
Supabase INSERT INTO dim_users
   ↓
Response: {user_id: 123, username: "Player한국", created_at: "..."}
```

### 2. Registro de Stats (Individual)

```
Cliente → POST /api/stats {username, char_name, date, atk_total, ...}
   ↓
Express Middleware (Auth + Validation)
   ↓
Resolve user_id FROM dim_users WHERE username = ?
   ↓
Resolve char_id FROM dim_characters WHERE char_name = ?
   ↓
Ensure time_id via ensure_time_dimension(date)
   ↓
Supabase UPSERT INTO fact_character_stats
   ↓
Response: {fact_id, user_id, char_id, time_id, ...}
```

### 3. Registro de Stats (Batch)

```
Cliente → POST /api/stats/batch {records: [{username, char_name, ...}, ...]}
   ↓
Express Middleware (Auth)
   ↓
FOR EACH record:
   ├─ Resolve user_id
   ├─ Resolve char_id
   ├─ Ensure time_id
   └─ UPSERT fact_character_stats
   ↓
Response: {success: N, results: [...], errors: [...]}
```

### 4. Consulta de Stats

```
Cliente → GET /api/stats?username=X&char_name=Y&from_date=Z
   ↓
Express Middleware (Auth)
   ↓
Build query with JOINs:
   fact_character_stats
   LEFT JOIN dim_users
   LEFT JOIN dim_characters
   LEFT JOIN dim_time
   ↓
WHERE filters applied
   ↓
ORDER BY created_at DESC LIMIT 100
   ↓
Response: [{fact_id, username, char_name, date, atk_total, ...}, ...]
```

## Segurança

### Camadas de Proteção

1. **API Key Authentication**
   - Header obrigatório: `X-API-Key`
   - Validado em middleware antes de todos os endpoints protegidos

2. **Row Level Security (RLS)**
   - Habilitado em `dim_users` e `fact_character_stats`
   - Políticas: Public read access (defesa em profundidade)

3. **Service Role Key**
   - Usado apenas no backend
   - Nunca exposto ao cliente

4. **Helmet.js**
   - Headers de segurança HTTP (CSP, XSS Protection, etc)

5. **Input Validation**
   - Validação de campos obrigatórios
   - Sanitização de inputs
   - Tratamento de SQL injection via prepared statements (Supabase SDK)

6. **CORS**
   - Configurado para permitir origens controladas

## Modelo Kimball - Benefícios

### Star Schema

- **1 Fact Table**: `fact_character_stats` (centro)
- **3 Dimension Tables**: `dim_users`, `dim_characters`, `dim_time` (pontas)

### Vantagens

1. **Performance de Queries**: JOINs simples e rápidos
2. **Análise Temporal**: Agregações por dia/semana/mês via `dim_time`
3. **Escalabilidade**: Suporta milhões de registros de stats
4. **Business Intelligence**: Pronto para ferramentas de BI (Metabase, Superset)
5. **Data Warehouse Pattern**: Separação clara entre dimensões e fatos

### Consultas Analíticas Possíveis

```sql
-- Progressão de ATK de um usuário ao longo do tempo
SELECT dt.date, fcs.atk_total
FROM fact_character_stats fcs
JOIN dim_users du ON fcs.user_id = du.user_id
JOIN dim_time dt ON fcs.time_id = dt.time_id
WHERE du.username = 'Player1'
ORDER BY dt.date;

-- Top 10 jogadores por ATK total por personagem
SELECT du.username, dc.char_name_ptbr, MAX(fcs.atk_total) as max_atk
FROM fact_character_stats fcs
JOIN dim_users du ON fcs.user_id = du.user_id
JOIN dim_characters dc ON fcs.char_id = dc.char_id
GROUP BY du.username, dc.char_name_ptbr
ORDER BY max_atk DESC
LIMIT 10;

-- Atividades semanais completadas por mês
SELECT dt.year, dt.month, COUNT(*) as completed
FROM fact_character_stats fcs
JOIN dim_time dt ON fcs.time_id = dt.time_id
WHERE fcs.status_void_unificado_semanal = 'completo'
GROUP BY dt.year, dt.month;
```

## MCP Server Integration

### Tools Disponíveis

```javascript
create_user(username)
  → POST /api/users

list_users()
  → GET /api/users

list_characters()
  → GET /api/characters

register_stats(username, char_name, date, ...stats)
  → POST /api/stats

register_stats_batch(records: [...])
  → POST /api/stats/batch

query_stats(username?, char_name?, from_date?, to_date?)
  → GET /api/stats?filters
```

### Configuração Cliente

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

## Deploy Architecture

```
GitHub Repo
    ↓
    ↓ (git push)
    ↓
Render Web Service
    ├─ Auto-deploy on push
    ├─ Build: npm install
    ├─ Start: npm start
    └─ Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, API_KEY
    ↓
    ↓ (connects to)
    ↓
Supabase Project (PostgreSQL)
    ├─ Migrations applied via supabase db push
    ├─ RLS enabled
    └─ Free tier: 500MB DB, 2GB bandwidth
```

## Custos Estimados

| Serviço | Tier | Custo |
|---------|------|-------|
| Supabase | Free | $0 (até 500MB DB, 2GB transfer) |
| Render | Free | $0 (750h/mês, sleep após inatividade) |
| **Total** | | **$0/mês** |

### Limites Free Tier

- **Supabase**: 500MB storage, 2GB bandwidth, 50K requests/dia
- **Render**: 750h/mês, sleep após 15min inatividade, 512MB RAM

## Personagens (25 Total)

| # | PT-BR | EN-US |
|---|-------|-------|
| 1 | Elesis | Elesis |
| 2 | Arme | Arme |
| 3 | Lire | Lire |
| 4 | Lass | Lass |
| 5 | Ryan | Ryan |
| 6 | Ronan | Ronan |
| 7 | Amy | Amy |
| 8 | Jin | Jin |
| 9 | Sieghart | Sieghart |
| 10 | Mari | Mari |
| 11 | Dio | Dio |
| 12 | Zero | Zero |
| 13 | Rey | Ley |
| 14 | Lupus | Rufus |
| 15 | Lin | Rin |
| 16 | Azin | Asin |
| 17 | Holy | Lime |
| 18 | Edel | Edel |
| 19 | Veigas | Veigas |
| 20 | Uno | Uno |
| 21 | Decane | Decane |
| 22 | Ai | Ai |
| 23 | Kallia | Kallia |
| 24 | Iris | Iris |
| 25 | Ereb | Ereb |

## Extensibilidade Futura

### Possíveis Adições

1. **Agregações pré-computadas** (tabelas de sumário)
2. **Cache layer** (Redis) para queries frequentes
3. **Rate limiting** por API key
4. **Webhooks** para notificações
5. **GraphQL API** além do REST
6. **Real-time subscriptions** via Supabase Realtime
7. **Backup automático** de dados críticos
8. **Dashboard web** para visualização
