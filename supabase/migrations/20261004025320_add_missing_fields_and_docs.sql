-- Add missing fields and improve documentation

-- Add nivel (level) to fact table
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS nivel SMALLINT;

-- Add status_despertar (awakening status)
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS status_despertar TEXT;

-- Add status_berkas_diario (daily berkas status)
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS status_berkas_diario TEXT;

-- Add drop count fields (change from boolean to integer for accumulation)
ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_perg_prop_uni DROP DEFAULT;

ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_grim_reaper_card DROP DEFAULT;

ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_perg_prop_uni TYPE INTEGER USING CASE WHEN drop_perg_prop_uni THEN 1 ELSE 0 END;

ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_grim_reaper_card TYPE INTEGER USING CASE WHEN drop_grim_reaper_card THEN 1 ELSE 0 END;

ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_perg_prop_uni SET DEFAULT 0;

ALTER TABLE fact_character_stats 
  ALTER COLUMN drop_grim_reaper_card SET DEFAULT 0;

-- Add field documentation as comments
COMMENT ON TABLE fact_character_stats IS 'Character stats and progress tracking (fact table)';

COMMENT ON COLUMN fact_character_stats.user_id IS 'Foreign key to dim_users (player account)';
COMMENT ON COLUMN fact_character_stats.char_id IS 'Foreign key to dim_characters (one of 25 GrandChase characters)';
COMMENT ON COLUMN fact_character_stats.time_id IS 'Foreign key to dim_time (date dimension)';

-- Combat stats
COMMENT ON COLUMN fact_character_stats.nivel IS 'Character level (1-90+)';
COMMENT ON COLUMN fact_character_stats.status_despertar IS 'Awakening status: unlocks awakening talent tree';
COMMENT ON COLUMN fact_character_stats.atk_total IS 'Total attack power of the character';
COMMENT ON COLUMN fact_character_stats.atk IS 'Physical attack stat';
COMMENT ON COLUMN fact_character_stats.atk_sp IS 'Special attack stat';

-- Weekly missions: Void Unificado (Unified Void 1/2/3)
COMMENT ON COLUMN fact_character_stats.status_void_unificado_semanal IS 'Weekly status for Unified Void (1, 2, or 3), considering 2 runs per character';
COMMENT ON COLUMN fact_character_stats.cristais_void_unificado IS 'Yellow void crystals available in inventory. Player gains 5 per run weekly, each item costs 40';

-- Weekly missions: Void 4 (Apocalypse Void)
COMMENT ON COLUMN fact_character_stats.status_void_4_semanal IS 'Weekly status for Apocalypse Void (Void 4), considering 2 runs per character';
COMMENT ON COLUMN fact_character_stats.cristais_void_4 IS 'Blue void crystals available in inventory. Player gains 5 per run weekly, each item costs 40';

-- Weekly missions: WL (Tower of Illusions)
COMMENT ON COLUMN fact_character_stats.status_wl_semanal IS 'Weekly status for Tower of Illusions, considering 5 runs per character';
COMMENT ON COLUMN fact_character_stats.andar_wl IS 'Current floor in Tower of Illusions (1-30)';

-- Weekly missions: Infernal Furnace
COMMENT ON COLUMN fact_character_stats.status_fornalha_infernal_semanal IS 'Weekly status for Infernal Furnace, considering 3 runs per character';

-- Weekly missions: Altar of Ruin
COMMENT ON COLUMN fact_character_stats.status_altar_ruina_semanal IS 'Weekly status for Altar of Ruin, considering 3 runs per character';

-- Weekly missions: Abyssal Path
COMMENT ON COLUMN fact_character_stats.status_abissal_semanal IS 'Weekly status for Abyssal Path. Completed = collected 100 purple + 100 red crystals, one full run (1-12 or 2-12)';

-- Weekly missions: Solene
COMMENT ON COLUMN fact_character_stats.status_solene_semanal IS 'Weekly status for completing minimum 5 runs in any Solene continent map in the Other World';

-- Daily missions: Tower of Extinction (ToD)
COMMENT ON COLUMN fact_character_stats.status_tod_diario IS 'Daily status for Tower of Extinction, considering 3 runs per character';

-- Daily missions: Infinite Cloister
COMMENT ON COLUMN fact_character_stats.status_claustro_infinito_diario IS 'Daily status for Infinite Cloister (account-level: 3 runs per account/username per day, NOT per character)';
COMMENT ON COLUMN fact_character_stats.nivel_claustro_infinito IS 'Character level in Infinite Cloister (1-4, individual per character)';

-- Daily missions: Berkas
COMMENT ON COLUMN fact_character_stats.status_berkas_diario IS 'Daily status for completing Berkas with the character';

-- Drops and items
COMMENT ON COLUMN fact_character_stats.drop_perg_prop_uni IS 'Count of Unique Property Scrolls dropped in Tower of Extinction. Logged for weekly/monthly aggregation';
COMMENT ON COLUMN fact_character_stats.drop_grim_reaper_card IS 'Count of Grim Reaper Cards dropped by the character in Abyssal Path 2-12';
COMMENT ON COLUMN fact_character_stats.status_brinco_caos IS 'Status of obtaining Chaos Earring with the character';
COMMENT ON COLUMN fact_character_stats.status_piercing_caos IS 'Status of obtaining Chaos Piercing with the character';

-- Farming
COMMENT ON COLUMN fact_character_stats.idas_calnat IS 'Number of times the character completed Calnat (last Kricktria map) to farm Chaos Earring and Piercing';

-- Function: batch update one stat for all characters of a user
CREATE OR REPLACE FUNCTION update_stat_all_chars(
  p_username TEXT,
  p_field_name TEXT,
  p_field_value TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(updated_count INTEGER, char_names TEXT[]) AS $$
DECLARE
  v_user_id BIGINT;
  v_time_id BIGINT;
  v_updated_count INTEGER;
  v_char_names TEXT[];
BEGIN
  -- Get user_id
  SELECT user_id INTO v_user_id FROM dim_users WHERE username = p_username;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_username;
  END IF;

  -- Ensure time dimension
  SELECT ensure_time_dimension(p_date) INTO v_time_id;

  -- Validate field name (security: prevent SQL injection)
  IF p_field_name NOT IN (
    'nivel',
    'status_despertar',
    'status_void_unificado_semanal',
    'status_void_4_semanal',
    'status_wl_semanal',
    'status_fornalha_infernal_semanal',
    'status_altar_ruina_semanal',
    'status_tod_diario',
    'status_abissal_semanal',
    'status_claustro_infinito_diario',
    'status_brinco_caos',
    'status_piercing_caos',
    'status_solene_semanal',
    'status_berkas_diario'
  ) THEN
    RAISE EXCEPTION 'Invalid field name: %', p_field_name;
  END IF;

  -- Dynamic update for all characters (upsert pattern)
  EXECUTE format(
    'INSERT INTO fact_character_stats (user_id, char_id, time_id, %I, updated_at)
     SELECT $1, char_id, $2, $3, NOW()
     FROM dim_characters
     ON CONFLICT (user_id, char_id, time_id) 
     DO UPDATE SET %I = $3, updated_at = NOW()',
    p_field_name, p_field_name
  ) USING v_user_id, v_time_id, p_field_value;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Get affected character names
  SELECT array_agg(char_name_ptbr ORDER BY char_id)
  INTO v_char_names
  FROM dim_characters;

  RETURN QUERY SELECT v_updated_count, v_char_names;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_stat_all_chars IS 'Batch update one stat field for all 25 characters of a user account. Example: mark daily berkas as done for all characters.';
