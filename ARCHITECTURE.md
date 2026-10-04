# Architecture - GrandChase Classic API

## Overview

Sistema de rastreamento de personagens e atividades do GrandChase Classic, construído com arquitetura RESTful e modelo dimensional Kimball para análise de dados históricos.

## Stack Tecnológico

```mermaid
graph TB
    Client[Cliente<br/>Agentes via MCP / HTTP Clients / Postman]
    
    subgraph API["API REST Layer (Express.js + Node.js)"]
        Middleware[Middlewares<br/>Helmet, CORS, Auth, JSON Parser]
        Routes[Routes<br/>/users, /characters, /stats, /stats/batch<br/>/stats/update-all-chars]
    end
    
    DB[(Supabase PostgreSQL<br/>Kimball Data Model)]
    
    subgraph MCP[MCP Server]
        Tools[Tools: create_user, register_stats<br/>register_stats_batch, query_stats<br/>update_stat_all_chars<br/>list_users, list_characters]
    end
    
    Client -->|HTTP/HTTPS + X-API-Key| Middleware
    Middleware --> Routes
    Routes -->|Supabase SDK| DB
    MCP -->|HTTP + X-API-Key| API
```

## Modelo de Dados - Kimball Dimensional Model

### Diagrama Entidade-Relacionamento (Star Schema)

```mermaid
erDiagram
    dim_users ||--o{ fact_character_stats : "user_id"
    dim_characters ||--o{ fact_character_stats : "char_id"
    dim_time ||--o{ fact_character_stats : "time_id"

    dim_users {
        bigserial user_id PK
        text username UK
        timestamptz created_at
        timestamptz updated_at
    }

    dim_characters {
        smallserial char_id PK
        text char_name_ptbr
        text char_name_enus
        timestamptz created_at
    }

    dim_time {
        bigserial time_id PK
        date date UK
        smallint year
        smallint month
        smallint week
        smallint day
        smallint day_of_week
    }

    fact_character_stats {
        bigserial fact_id PK
        bigint user_id FK
        smallint char_id FK
        bigint time_id FK
        smallint nivel
        text status_despertar
        integer atk_total
        integer atk
        integer atk_sp
        text status_void_unificado_semanal
        integer cristais_void_unificado
        text status_void_4_semanal
        integer cristais_void_4
        text status_wl_semanal
        smallint andar_wl
        text status_fornalha_infernal_semanal
        text status_altar_ruina_semanal
        text status_tod_diario
        integer drop_perg_prop_uni
        text status_abissal_semanal
        integer drop_grim_reaper_card
        text status_claustro_infinito_diario
        smallint nivel_claustro_infinito
        integer idas_calnat
        text status_brinco_caos
        text status_piercing_caos
        text status_solene_semanal
        text status_berkas_diario
        timestamptz created_at
        timestamptz updated_at
    }
```

### Medidas por Categoria

**Character Info:** `nivel`, `status_despertar`

**Combat Stats:** `atk_total`, `atk`, `atk_sp`

**Weekly Activities:** `status_void_unificado_semanal`, `cristais_void_unificado`, `status_void_4_semanal`, `cristais_void_4`, `status_wl_semanal`, `andar_wl`, `status_fornalha_infernal_semanal`, `status_altar_ruina_semanal`, `status_abissal_semanal`, `status_solene_semanal`

**Daily Activities:** `status_tod_diario`, `status_claustro_infinito_diario`, `nivel_claustro_infinito`, `status_berkas_diario`

**Drops & Items:** `drop_perg_prop_uni` (int), `drop_grim_reaper_card` (int), `status_brinco_caos`, `status_piercing_caos`

**Other:** `idas_calnat`

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

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as Supabase

    Client->>API: POST /api/users {username: "Player한국"}
    API->>API: Auth Middleware (X-API-Key)
    API->>DB: INSERT INTO dim_users
    DB-->>API: {user_id: 123, username, created_at}
    API-->>Client: 201 Created
```

### 2. Registro de Stats (Individual)

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as Supabase

    Client->>API: POST /api/stats {username, char_name, date, atk_total, ...}
    API->>API: Auth + Validation
    API->>DB: SELECT user_id FROM dim_users WHERE username = ?
    DB-->>API: user_id
    API->>DB: SELECT char_id FROM dim_characters WHERE char_name = ?
    DB-->>API: char_id
    API->>DB: CALL ensure_time_dimension(date)
    DB-->>API: time_id
    API->>DB: UPSERT INTO fact_character_stats
    DB-->>API: {fact_id, user_id, char_id, time_id, ...}
    API-->>Client: 201 Created
```

### 3. Registro de Stats (Batch)

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as Supabase

    Client->>API: POST /api/stats/batch {records: [...]}
    API->>API: Auth Middleware
    loop For each record
        API->>DB: Resolve user_id
        API->>DB: Resolve char_id
        API->>DB: Ensure time_id
        API->>DB: UPSERT fact_character_stats
    end
    API-->>Client: {success: N, results: [...], errors: [...]}
```

### 4. Batch Update (All Characters)

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as Supabase

    Client->>API: POST /api/stats/update-all-chars {username, field_name, field_value}
    API->>API: Auth + Validation (field_name whitelist)
    API->>DB: SELECT user_id FROM dim_users WHERE username = ?
    DB-->>API: user_id
    API->>DB: CALL update_stat_all_chars(user_id, field_name, field_value, date)
    DB->>DB: FOR EACH character: UPSERT into fact_character_stats
    DB-->>API: {updated_count: 25, char_names: [...]}
    API-->>Client: 200 OK
```

### 5. Consulta de Stats

```mermaid
sequenceDiagram
    participant Client
    participant API as Express API
    participant DB as Supabase

    Client->>API: GET /api/stats?username=X&char_name=Y
    API->>API: Auth Middleware
    API->>DB: SELECT * FROM fact_character_stats<br/>JOIN dim_users, dim_characters, dim_time<br/>WHERE filters ORDER BY created_at DESC LIMIT 100
    DB-->>API: [{fact_id, username, char_name, date, ...}, ...]
    API-->>Client: 200 OK + JSON
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

update_stat_all_chars(username, field_name, field_value, date?)
  → POST /api/stats/update-all-chars
  → Batch: update 1 field for all 25 characters
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

```mermaid
graph LR
    GitHub[GitHub Repo<br/>gc-management-api]
    
    Render[Render Web Service<br/>Auto-deploy on push<br/>Build: npm install<br/>Start: npm start]
    
    Supabase[(Supabase PostgreSQL<br/>Migrations applied<br/>RLS enabled<br/>Free tier)]
    
    Env[Environment Variables<br/>SUPABASE_URL<br/>SUPABASE_SERVICE_KEY<br/>API_KEY]
    
    GitHub -->|git push| Render
    Env -.->|config| Render
    Render -->|Supabase SDK| Supabase
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
3. **Webhooks** para notificações
4. **GraphQL API** além do REST
5. **Real-time subscriptions** via Supabase Realtime
6. **Backup automático** de dados críticos
7. **Dashboard web** para visualização

## SQL Functions

### `ensure_time_dimension(input_date DATE)`
Auto-popula `dim_time` com year/month/week/day metadata. Chamada automaticamente em todos os registros de stats.

### `update_stat_all_chars(p_username, p_field_name, p_field_value, p_date)`
Batch update: atualiza 1 campo em todos os 25 personagens da conta.

**Segurança:** Whitelist de 14 campos permitidos (SQL injection protection).

**Campos permitidos:**
- `nivel`, `status_despertar`
- `status_void_unificado_semanal`, `status_void_4_semanal`, `status_wl_semanal`
- `status_fornalha_infernal_semanal`, `status_altar_ruina_semanal`
- `status_tod_diario`, `status_abissal_semanal`, `status_claustro_infinito_diario`
- `status_brinco_caos`, `status_piercing_caos`
- `status_solene_semanal`, `status_berkas_diario`

**Exemplo:**
```sql
SELECT * FROM update_stat_all_chars(
  'oGus', 
  'status_berkas_diario', 
  'Feito', 
  '2026-10-04'
);
-- Retorna: {updated_count: 25, char_names: [...]}
```
