# Schema Fields Documentation

Complete field reference for AI agents consuming the MCP server.

## User Account

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `username` | TEXT | `oGus` | Player account username (GrandChase account) |

## Character Reference

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `char_name` | TEXT | `Uno` | Character name (one of 25 GrandChase Classic characters, ptbr or enus) |

## Combat Stats

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `nivel` | INTEGER | `90` | Character level (1-90+) |
| `status_despertar` | TEXT | `Despertado` | Awakening status. When awakened, unlocks the awakening talent tree |
| `atk_total` | INTEGER | `1000000` | Total attack power of the character |
| `atk` | INTEGER | `40000` | Physical attack stat |
| `atk_sp` | INTEGER | `20000` | Special attack stat |

## Weekly Missions: Unified Void (1, 2, 3)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_void_unificado_semanal` | TEXT | `Feito` | Weekly status for Unified Void (levels 1, 2, or 3). Completed = 2 runs per character |
| `cristais_void_unificado` | INTEGER | `10` | Yellow unified void crystals available in character inventory. Player gains 5 per run weekly, each item costs 40 |

## Weekly Missions: Void 4 (Apocalypse Void)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_void_4_semanal` | TEXT | `Feito` | Weekly status for Apocalypse Void (Void 4). Completed = 2 runs per character |
| `cristais_void_4` | INTEGER | `10` | Blue apocalypse void crystals available in character inventory. Player gains 5 per run weekly, each item costs 40 |

## Weekly Missions: Tower of Illusions (WL)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_wl_semanal` | TEXT | `Feito` | Weekly status for Tower of Illusions. Completed = 5 runs per character |
| `andar_wl` | INTEGER | `30` | Current floor in Tower of Illusions (1-30) |

## Weekly Missions: Infernal Furnace

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_fornalha_infernal_semanal` | TEXT | `Feito` | Weekly status for Infernal Furnace. Completed = 3 runs per character |

## Weekly Missions: Altar of Ruin

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_altar_ruina_semanal` | TEXT | `Feito` | Weekly status for Altar of Ruin. Completed = 3 runs per character |

## Weekly Missions: Abyssal Path

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_abissal_semanal` | TEXT | `A fazer` | Weekly status for Abyssal Path. Completed = collected 100 purple + 100 red crystals, one full run (1-12 or 2-12) |
| `drop_grim_reaper_card` | INTEGER | `6` | Count of Grim Reaper Cards dropped by the character in Abyssal Path 2-12. Logged for aggregation |

## Weekly Missions: Solene Continent

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_solene_semanal` | TEXT | `Feito` | Weekly status for completing minimum 5 runs in any Solene continent map (Other World) |

## Daily Missions: Tower of Extinction (ToD)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_tod_diario` | TEXT | `Feito` | Daily status for Tower of Extinction. Completed = 3 runs per character |
| `drop_perg_prop_uni` | INTEGER | `3` | Count of Unique Property Scrolls dropped in Tower of Extinction. Logged for weekly/monthly aggregation |

## Daily Missions: Infinite Cloister

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_claustro_infinito_diario` | TEXT | `Feito` | Daily status for Infinite Cloister. **Account-level:** 3 runs per account/username per day (NOT per character) |
| `nivel_claustro_infinito` | INTEGER | `4` | Character level in Infinite Cloister (1-4, individual per character) |

## Daily Missions: Berkas

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `status_berkas_diario` | TEXT | `Feito` | Daily status for completing Berkas with this character |

## Farming: Calnat (Chaos Items)

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `idas_calnat` | INTEGER | `603` | Number of times the character completed Calnat (last Kricktria map) to farm Chaos Earring and Piercing |
| `status_brinco_caos` | TEXT | `Obtido` | Status of obtaining Chaos Earring with the character |
| `status_piercing_caos` | TEXT | `Não obtido` | Status of obtaining Chaos Piercing with the character |

## Meta Fields

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `date` | DATE | `2026-10-04` | Date for the stats entry (YYYY-MM-DD format, defaults to today) |

## Status Value Conventions

Common values for status fields:

- `Feito` - Completed/Done
- `A fazer` - To do/Not done
- `Despertado` - Awakened
- `Obtido` - Obtained
- `Não obtido` - Not obtained

## Batch Update Usage

Use `update_stat_all_chars` to update ONE field across all 25 characters of an account:

```json
{
  "username": "oGus",
  "field_name": "status_berkas_diario",
  "field_value": "Feito",
  "date": "2026-10-04"
}
```

**Allowed `field_name` values:**
- `nivel`
- `status_despertar`
- `status_void_unificado_semanal`
- `status_void_4_semanal`
- `status_wl_semanal`
- `status_fornalha_infernal_semanal`
- `status_altar_ruina_semanal`
- `status_tod_diario`
- `status_abissal_semanal`
- `status_claustro_infinito_diario`
- `status_brinco_caos`
- `status_piercing_caos`
- `status_solene_semanal`
- `status_berkas_diario`

**Use case examples:**
- Player completed Berkas on all characters → mark `status_berkas_diario` as `Feito` for all
- Weekly reset → mark all weekly status fields as `A fazer` for all characters
- All characters reached level 90 → set `nivel` to `90` for all
