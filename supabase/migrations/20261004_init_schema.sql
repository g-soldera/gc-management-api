-- Kimball dimensional model for GrandChase character tracking

-- Dimension: Users
CREATE TABLE dim_users (
  user_id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dim_users_username ON dim_users(username);

-- Dimension: Characters (25 GrandChase Classic characters)
CREATE TABLE dim_characters (
  char_id SMALLSERIAL PRIMARY KEY,
  char_name_ptbr TEXT NOT NULL,
  char_name_enus TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO dim_characters (char_name_ptbr, char_name_enus) VALUES
  ('Elesis', 'Elesis'),
  ('Arme', 'Arme'),
  ('Lire', 'Lire'),
  ('Lass', 'Lass'),
  ('Ryan', 'Ryan'),
  ('Ronan', 'Ronan'),
  ('Amy', 'Amy'),
  ('Jin', 'Jin'),
  ('Sieghart', 'Sieghart'),
  ('Mari', 'Mari'),
  ('Dio', 'Dio'),
  ('Zero', 'Zero'),
  ('Rey', 'Ley'),
  ('Lupus', 'Rufus'),
  ('Lin', 'Rin'),
  ('Azin', 'Asin'),
  ('Holy', 'Lime'),
  ('Edel', 'Edel'),
  ('Veigas', 'Veigas'),
  ('Uno', 'Uno'),
  ('Decane', 'Decane'),
  ('Ai', 'Ai'),
  ('Kallia', 'Kallia'),
  ('Iris', 'Iris'),
  ('Ereb', 'Ereb');

-- Dimension: Time
CREATE TABLE dim_time (
  time_id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  year SMALLINT NOT NULL,
  month SMALLINT NOT NULL,
  week SMALLINT NOT NULL,
  day SMALLINT NOT NULL,
  day_of_week SMALLINT NOT NULL
);

CREATE INDEX idx_dim_time_date ON dim_time(date);

-- Fact: Character Stats (Kimball fact table)
CREATE TABLE fact_character_stats (
  fact_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES dim_users(user_id) ON DELETE CASCADE,
  char_id SMALLINT NOT NULL REFERENCES dim_characters(char_id),
  time_id BIGINT NOT NULL REFERENCES dim_time(time_id),
  
  -- Combat stats
  atk_total INTEGER,
  atk INTEGER,
  atk_sp INTEGER,
  
  -- Weekly activities
  status_void_unificado_semanal TEXT,
  cristais_void_unificado INTEGER,
  status_void_4_semanal TEXT,
  cristais_void_4 INTEGER,
  status_wl_semanal TEXT,
  andar_wl SMALLINT,
  status_fornalha_infernal_semanal TEXT,
  status_altar_ruina_semanal TEXT,
  status_abissal_semanal TEXT,
  status_solene_semanal TEXT,
  
  -- Daily activities
  status_tod_diario TEXT,
  status_claustro_infinito_diario TEXT,
  nivel_claustro_infinito SMALLINT,
  
  -- Drops & items
  drop_perg_prop_uni BOOLEAN DEFAULT FALSE,
  drop_grim_reaper_card BOOLEAN DEFAULT FALSE,
  status_brinco_caos TEXT,
  status_piercing_caos TEXT,
  
  -- Other
  idas_calnat INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, char_id, time_id)
);

CREATE INDEX idx_fact_char_stats_user ON fact_character_stats(user_id);
CREATE INDEX idx_fact_char_stats_char ON fact_character_stats(char_id);
CREATE INDEX idx_fact_char_stats_time ON fact_character_stats(time_id);
CREATE INDEX idx_fact_char_stats_created ON fact_character_stats(created_at DESC);

-- Function: Auto-populate dim_time
CREATE OR REPLACE FUNCTION ensure_time_dimension(input_date DATE)
RETURNS BIGINT AS $$
DECLARE
  result_id BIGINT;
BEGIN
  INSERT INTO dim_time (date, year, month, week, day, day_of_week)
  VALUES (
    input_date,
    EXTRACT(YEAR FROM input_date),
    EXTRACT(MONTH FROM input_date),
    EXTRACT(WEEK FROM input_date),
    EXTRACT(DAY FROM input_date),
    EXTRACT(DOW FROM input_date)
  )
  ON CONFLICT (date) DO NOTHING
  RETURNING time_id INTO result_id;
  
  IF result_id IS NULL THEN
    SELECT time_id INTO result_id FROM dim_time WHERE date = input_date;
  END IF;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dim_users_updated_at
  BEFORE UPDATE ON dim_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_fact_character_stats_updated_at
  BEFORE UPDATE ON fact_character_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies (security)
ALTER TABLE dim_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_character_stats ENABLE ROW LEVEL SECURITY;

-- API key auth will handle this, but RLS as defense-in-depth
CREATE POLICY "Public read access" ON dim_users FOR SELECT USING (true);
CREATE POLICY "Public read access" ON fact_character_stats FOR SELECT USING (true);
