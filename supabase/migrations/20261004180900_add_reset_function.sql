-- Add reset function that creates new records (preserves history)
-- Migration: 20261004180900

-- Function: reset one field for all users across all characters
-- Creates new daily/weekly records without touching historical data
CREATE OR REPLACE FUNCTION reset_field_all_users(
  p_field_name TEXT,
  p_field_value TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(affected_count INTEGER) AS $$
DECLARE
  v_time_id BIGINT;
  v_affected_count INTEGER := 0;
BEGIN
  -- Ensure time dimension
  SELECT ensure_time_dimension(p_date) INTO v_time_id;

  -- Validate field name (security: prevent SQL injection)
  IF p_field_name NOT IN (
    'status_void_unificado_semanal',
    'status_void_4_semanal',
    'status_wl_semanal',
    'status_fornalha_infernal_semanal',
    'status_altar_ruina_semanal',
    'status_abissal_semanal',
    'status_solene_semanal',
    'status_tod_diario',
    'status_claustro_infinito_diario',
    'status_berkas_diario'
  ) THEN
    RAISE EXCEPTION 'Invalid field name for reset: %', p_field_name;
  END IF;

  -- Insert new records for all users x all characters for this date
  -- ON CONFLICT DO UPDATE ensures idempotency (safe to run multiple times)
  EXECUTE format(
    'INSERT INTO fact_character_stats (user_id, char_id, time_id, %I, created_at, updated_at)
     SELECT u.user_id, c.char_id, $1, $2, NOW(), NOW()
     FROM dim_users u
     CROSS JOIN dim_characters c
     ON CONFLICT (user_id, char_id, time_id) 
     DO UPDATE SET %I = $2, updated_at = NOW()',
    p_field_name, p_field_name
  ) USING v_time_id, p_field_value;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;

  RETURN QUERY SELECT v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reset_field_all_users IS 'Reset one mission status field for all users and characters on a specific date. Creates new records (preserves history). Used by automated weekly/daily reset cron jobs.';
