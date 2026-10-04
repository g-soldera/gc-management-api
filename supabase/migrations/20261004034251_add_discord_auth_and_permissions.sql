-- Discord authentication and permission system

-- Discord users table
CREATE TABLE discord_users (
  discord_id TEXT PRIMARY KEY,
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_discord_users_username ON discord_users(discord_username);

COMMENT ON TABLE discord_users IS 'Discord user accounts for authentication';
COMMENT ON COLUMN discord_users.discord_id IS 'Discord user ID (snowflake)';
COMMENT ON COLUMN discord_users.discord_username IS 'Discord username (without discriminator)';
COMMENT ON COLUMN discord_users.discord_discriminator IS 'Discord discriminator (legacy, optional)';
COMMENT ON COLUMN discord_users.discord_avatar IS 'Discord avatar hash';

-- Link game accounts to Discord owners
ALTER TABLE dim_users 
  ADD COLUMN discord_owner_id TEXT REFERENCES discord_users(discord_id) ON DELETE SET NULL;

CREATE INDEX idx_dim_users_discord_owner ON dim_users(discord_owner_id);

COMMENT ON COLUMN dim_users.discord_owner_id IS 'Discord user who owns this game account. Only owner can modify by default.';

-- Permission grants table (owner authorizes other Discord users)
CREATE TABLE user_permissions (
  permission_id BIGSERIAL PRIMARY KEY,
  game_account_id BIGINT NOT NULL REFERENCES dim_users(user_id) ON DELETE CASCADE,
  granted_to_discord_id TEXT NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
  granted_by_discord_id TEXT NOT NULL REFERENCES discord_users(discord_id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_account_id, granted_to_discord_id)
);

CREATE INDEX idx_user_permissions_game_account ON user_permissions(game_account_id);
CREATE INDEX idx_user_permissions_granted_to ON user_permissions(granted_to_discord_id);

COMMENT ON TABLE user_permissions IS 'Permission grants: owner authorizes other Discord users to edit their game accounts';
COMMENT ON COLUMN user_permissions.game_account_id IS 'Game account (username) that can be edited';
COMMENT ON COLUMN user_permissions.granted_to_discord_id IS 'Discord user who receives permission';
COMMENT ON COLUMN user_permissions.granted_by_discord_id IS 'Discord user who granted permission (typically the owner)';

-- Function: Check if Discord user can modify a game account
CREATE OR REPLACE FUNCTION can_modify_account(
  p_discord_id TEXT,
  p_username TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id BIGINT;
  v_owner_id TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Get game account
  SELECT user_id, discord_owner_id 
  INTO v_user_id, v_owner_id
  FROM dim_users 
  WHERE username = p_username;
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is the owner
  IF v_owner_id = p_discord_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit permission
  SELECT EXISTS(
    SELECT 1 FROM user_permissions
    WHERE game_account_id = v_user_id
    AND granted_to_discord_id = p_discord_id
  ) INTO v_has_permission;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_modify_account IS 'Check if Discord user can modify a game account (owner or granted permission)';

-- Function: Grant permission
CREATE OR REPLACE FUNCTION grant_permission(
  p_owner_discord_id TEXT,
  p_username TEXT,
  p_grant_to_discord_id TEXT
)
RETURNS TABLE(permission_id BIGINT, granted BOOLEAN, message TEXT) AS $$
DECLARE
  v_user_id BIGINT;
  v_owner_id TEXT;
  v_new_permission_id BIGINT;
BEGIN
  -- Get game account
  SELECT user_id, discord_owner_id 
  INTO v_user_id, v_owner_id
  FROM dim_users 
  WHERE username = p_username;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT NULL::BIGINT, FALSE, 'Game account not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if requester is the owner
  IF v_owner_id != p_owner_discord_id THEN
    RETURN QUERY SELECT NULL::BIGINT, FALSE, 'Only the owner can grant permissions'::TEXT;
    RETURN;
  END IF;
  
  -- Check if target Discord user exists
  IF NOT EXISTS(SELECT 1 FROM discord_users WHERE discord_id = p_grant_to_discord_id) THEN
    RETURN QUERY SELECT NULL::BIGINT, FALSE, 'Target Discord user not found'::TEXT;
    RETURN;
  END IF;
  
  -- Grant permission (idempotent)
  INSERT INTO user_permissions (game_account_id, granted_to_discord_id, granted_by_discord_id)
  VALUES (v_user_id, p_grant_to_discord_id, p_owner_discord_id)
  ON CONFLICT (game_account_id, granted_to_discord_id) DO NOTHING
  RETURNING user_permissions.permission_id INTO v_new_permission_id;
  
  IF v_new_permission_id IS NOT NULL THEN
    RETURN QUERY SELECT v_new_permission_id, TRUE, 'Permission granted'::TEXT;
  ELSE
    RETURN QUERY SELECT NULL::BIGINT, TRUE, 'Permission already exists'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_permission IS 'Owner grants permission to another Discord user to edit their game account';

-- Function: Revoke permission
CREATE OR REPLACE FUNCTION revoke_permission(
  p_owner_discord_id TEXT,
  p_username TEXT,
  p_revoke_from_discord_id TEXT
)
RETURNS TABLE(revoked BOOLEAN, message TEXT) AS $$
DECLARE
  v_user_id BIGINT;
  v_owner_id TEXT;
BEGIN
  -- Get game account
  SELECT user_id, discord_owner_id 
  INTO v_user_id, v_owner_id
  FROM dim_users 
  WHERE username = p_username;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Game account not found'::TEXT;
    RETURN;
  END IF;
  
  -- Check if requester is the owner
  IF v_owner_id != p_owner_discord_id THEN
    RETURN QUERY SELECT FALSE, 'Only the owner can revoke permissions'::TEXT;
    RETURN;
  END IF;
  
  -- Revoke permission
  DELETE FROM user_permissions
  WHERE game_account_id = v_user_id
  AND granted_to_discord_id = p_revoke_from_discord_id;
  
  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Permission revoked'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Permission not found'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_permission IS 'Owner revokes permission from a Discord user';

-- Trigger: Update updated_at on discord_users
CREATE TRIGGER trigger_discord_users_updated_at
  BEFORE UPDATE ON discord_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON discord_users FOR SELECT USING (true);
CREATE POLICY "Public read access" ON user_permissions FOR SELECT USING (true);
