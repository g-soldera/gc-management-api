-- Add accessories fields (anel and tornozeleira) and notes field
-- Migration: 20261004180200

-- Add anel (ring) status and type
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS status_anel TEXT,
  ADD COLUMN IF NOT EXISTS tipo_anel TEXT;

-- Add tornozeleira (ankle bracelet) status and type
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS status_tornozeleira TEXT,
  ADD COLUMN IF NOT EXISTS tipo_tornozeleira TEXT;

-- Add anotacoes (notes) field for per-character annotations
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS anotacoes TEXT;

-- Add poder (calculated power: (atk + atk_sp) / 10000) as a generated column
ALTER TABLE fact_character_stats 
  ADD COLUMN IF NOT EXISTS poder NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN atk IS NOT NULL AND atk_sp IS NOT NULL 
      THEN ROUND((atk + atk_sp)::NUMERIC / 10000, 2)
      ELSE NULL
    END
  ) STORED;

-- Documentation comments
COMMENT ON COLUMN fact_character_stats.status_anel IS 'Status of obtaining ring accessory (e.g., Obtido, Não obtido)';
COMMENT ON COLUMN fact_character_stats.tipo_anel IS 'Type of ring accessory (e.g., Esmaecido, Silencioso, Sangrento, Caos)';
COMMENT ON COLUMN fact_character_stats.status_tornozeleira IS 'Status of obtaining ankle bracelet accessory (e.g., Obtido, Não obtido)';
COMMENT ON COLUMN fact_character_stats.tipo_tornozeleira IS 'Type of ankle bracelet accessory (e.g., Eternidade, Redenção, Perfeição, Caos)';
COMMENT ON COLUMN fact_character_stats.anotacoes IS 'Free-text notes and observations for the character';
COMMENT ON COLUMN fact_character_stats.poder IS 'Calculated power: (atk + atk_sp) / 10000, auto-computed';

-- Update batch update function to include new fields
DROP FUNCTION IF EXISTS update_stat_all_chars(TEXT, TEXT, TEXT, DATE);

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
  -- Added: status_anel, tipo_anel, status_tornozeleira, tipo_tornozeleira
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
    'status_berkas_diario',
    'status_anel',
    'tipo_anel',
    'status_tornozeleira',
    'tipo_tornozeleira'
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

COMMENT ON FUNCTION update_stat_all_chars IS 'Batch update one stat field for all 25 characters of a user account. Supports accessories (status_anel, tipo_anel, status_tornozeleira, tipo_tornozeleira) and all mission status fields.';
