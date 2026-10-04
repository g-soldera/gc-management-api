require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
const { validate, createUserSchema, registerStatsSchema, batchStatsSchema, queryStatsSchema, updateAllCharsSchema, createDiscordUserSchema, grantPermissionSchema, revokePermissionSchema } = require('./validators');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.API_KEY) {
  logger.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded');
    res.status(429).json({ error: 'Too many requests' });
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts',
  skipSuccessfulRequests: true
});

app.use(limiter);

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    logger.warn({ ip: req.ip, path: req.path }, 'Unauthorized access attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const checkDiscordPermission = async (req, res, next) => {
  const { username, discord_id } = req.validated;
  
  if (!discord_id) {
    logger.warn({ username }, 'Discord ID not provided for permission check');
    return res.status(403).json({ error: 'Discord ID required for this operation' });
  }

  try {
    const { data, error } = await supabase.rpc('can_modify_account', {
      p_discord_id: discord_id,
      p_username: username
    });

    if (error) throw error;

    if (!data) {
      logger.warn({ discord_id, username }, 'Permission denied');
      return res.status(403).json({ error: 'Permission denied: you do not have access to this account' });
    }

    next();
  } catch (error) {
    logger.error({ error: error.message, discord_id, username }, 'Permission check failed');
    next(error);
  }
};

const errorHandler = (err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  res.status(500).json({ error: 'Internal server error' });
};

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.post('/api/users', authMiddleware, authLimiter, validate(createUserSchema), async (req, res, next) => {
  try {
    const { username, discord_owner_id } = req.validated;
    
    logger.info({ username, discord_owner_id }, 'Creating user');
    const { data, error } = await supabase
      .from('dim_users')
      .insert({ username, discord_owner_id })
      .select()
      .single();

    if (error) throw error;
    logger.info({ user_id: data.user_id, username }, 'User created');
    res.status(201).json(data);
  } catch (error) {
    if (error.code === '23505') {
      logger.warn({ username: req.validated.username }, 'Duplicate username');
      return res.status(409).json({ error: 'Username already exists' });
    }
    next(error);
  }
});

app.get('/api/users', authMiddleware, async (req, res, next) => {
  try {
    logger.info('Fetching users list');
    const { data, error } = await supabase
      .from('dim_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    logger.info({ count: data?.length }, 'Users fetched');
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.get('/api/characters', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('dim_characters')
      .select('*')
      .order('char_id');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/discord/users', authMiddleware, validate(createDiscordUserSchema), async (req, res, next) => {
  try {
    const { discord_id, discord_username, discord_discriminator, discord_avatar } = req.validated;
    
    logger.info({ discord_id, discord_username }, 'Creating Discord user');
    const { data, error } = await supabase
      .from('discord_users')
      .upsert({ discord_id, discord_username, discord_discriminator, discord_avatar }, { onConflict: 'discord_id' })
      .select()
      .single();

    if (error) throw error;
    logger.info({ discord_id }, 'Discord user created/updated');
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/permissions/grant', authMiddleware, validate(grantPermissionSchema), async (req, res, next) => {
  try {
    const { owner_discord_id, username, grant_to_discord_id } = req.validated;
    
    logger.info({ owner_discord_id, username, grant_to_discord_id }, 'Granting permission');
    const { data, error } = await supabase.rpc('grant_permission', {
      p_owner_discord_id: owner_discord_id,
      p_username: username,
      p_grant_to_discord_id: grant_to_discord_id
    });

    if (error) throw error;
    
    const result = data[0];
    if (!result.granted) {
      return res.status(403).json({ error: result.message });
    }
    
    logger.info({ permission_id: result.permission_id }, 'Permission granted');
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/permissions/revoke', authMiddleware, validate(revokePermissionSchema), async (req, res, next) => {
  try {
    const { owner_discord_id, username, revoke_from_discord_id } = req.validated;
    
    logger.info({ owner_discord_id, username, revoke_from_discord_id }, 'Revoking permission');
    const { data, error } = await supabase.rpc('revoke_permission', {
      p_owner_discord_id: owner_discord_id,
      p_username: username,
      p_revoke_from_discord_id: revoke_from_discord_id
    });

    if (error) throw error;
    
    const result = data[0];
    if (!result.revoked) {
      return res.status(404).json({ error: result.message });
    }
    
    logger.info({ username, revoke_from_discord_id }, 'Permission revoked');
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.get('/api/permissions/:username', authMiddleware, async (req, res, next) => {
  try {
    const { username } = req.params;
    
    logger.info({ username }, 'Fetching permissions');
    
    const { data: user } = await supabase
      .from('dim_users')
      .select('user_id, discord_owner_id')
      .eq('username', username)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select(`
        *,
        granted_to:discord_users!granted_to_discord_id(discord_id, discord_username),
        granted_by:discord_users!granted_by_discord_id(discord_id, discord_username)
      `)
      .eq('game_account_id', user.user_id);

    if (error) throw error;
    
    res.json({
      username,
      owner_discord_id: user.discord_owner_id,
      permissions
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/stats', authMiddleware, validate(registerStatsSchema), checkDiscordPermission, async (req, res, next) => {
  try {
    const { username, char_name, date, discord_id, ...stats } = req.validated;

    logger.info({ username, char_name }, 'Registering stats');
    const { data: user, error: userError } = await supabase
      .from('dim_users')
      .select('user_id')
      .eq('username', username)
      .single();

    if (userError || !user) {
      logger.warn({ username }, 'User not found');
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: char, error: charError } = await supabase
      .from('dim_characters')
      .select('char_id')
      .or(`char_name_ptbr.eq.${char_name},char_name_enus.eq.${char_name}`)
      .single();

    if (charError || !char) {
      logger.warn({ char_name }, 'Character not found');
      return res.status(404).json({ error: 'Character not found' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data: timeData } = await supabase.rpc('ensure_time_dimension', { input_date: targetDate });
    const timeId = timeData;

    const { data, error } = await supabase
      .from('fact_character_stats')
      .upsert({
        user_id: user.user_id,
        char_id: char.char_id,
        time_id: timeId,
        ...stats
      }, { onConflict: 'user_id,char_id,time_id' })
      .select()
      .single();

    if (error) throw error;
    logger.info({ fact_id: data.fact_id, username, char_name }, 'Stats registered');
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
});

app.post('/api/stats/batch', authMiddleware, validate(batchStatsSchema), async (req, res, next) => {
  try {
    const { records } = req.validated;

    logger.info({ count: records.length }, 'Batch registering stats');
    const results = [];
    const errors = [];

    for (const record of records) {
      const { username, char_name, date, ...stats } = record;

      try {
        const { data: user } = await supabase
          .from('dim_users')
          .select('user_id')
          .eq('username', username)
          .single();

        if (!user) {
          errors.push({ username, char_name, error: 'User not found' });
          continue;
        }

        const { data: char } = await supabase
          .from('dim_characters')
          .select('char_id')
          .or(`char_name_ptbr.eq.${char_name},char_name_enus.eq.${char_name}`)
          .single();

        if (!char) {
          errors.push({ username, char_name, error: 'Character not found' });
          continue;
        }

        const targetDate = date || new Date().toISOString().split('T')[0];
        const { data: timeData } = await supabase.rpc('ensure_time_dimension', { input_date: targetDate });

        const { data, error } = await supabase
          .from('fact_character_stats')
          .upsert({
            user_id: user.user_id,
            char_id: char.char_id,
            time_id: timeData,
            ...stats
          }, { onConflict: 'user_id,char_id,time_id' })
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      } catch (err) {
        logger.warn({ username, char_name, error: err.message }, 'Batch record failed');
        errors.push({ username, char_name, error: err.message });
      }
    }

    logger.info({ success: results.length, errors: errors.length }, 'Batch complete');
    res.status(201).json({ success: results.length, results, errors });
  } catch (error) {
    next(error);
  }
});

app.get('/api/stats', authMiddleware, validate(queryStatsSchema), async (req, res, next) => {
  try {
    const { username, char_name, from_date, to_date, limit = 50, offset = 0 } = req.validated;

    logger.info({ username, char_name, limit, offset }, 'Querying stats');

    let query = supabase
      .from('fact_character_stats')
      .select(`
        *,
        dim_users (username),
        dim_characters (char_name_ptbr, char_name_enus),
        dim_time (date)
      `, { count: 'exact' });

    if (username) {
      const { data: user } = await supabase
        .from('dim_users')
        .select('user_id')
        .eq('username', username)
        .single();
      if (user) query = query.eq('user_id', user.user_id);
    }

    if (char_name) {
      const { data: char } = await supabase
        .from('dim_characters')
        .select('char_id')
        .or(`char_name_ptbr.eq.${char_name},char_name_enus.eq.${char_name}`)
        .single();
      if (char) query = query.eq('char_id', char.char_id);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    
    res.json({
      data,
      pagination: {
        offset,
        limit,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/stats/update-all-chars', authMiddleware, validate(updateAllCharsSchema), checkDiscordPermission, async (req, res, next) => {
  try {
    const { username, field_name, field_value, date, discord_id } = req.validated;

    logger.info({ username, field_name, field_value, discord_id }, 'Updating stat for all characters');
    
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('update_stat_all_chars', {
      p_username: username,
      p_field_name: field_name,
      p_field_value: field_value,
      p_date: targetDate
    });

    if (error) throw error;
    
    logger.info({ username, updated_count: data[0].updated_count }, 'All characters updated');
    res.status(200).json(data[0]);
  } catch (error) {
    if (error.message?.includes('User not found')) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Maintenance endpoints (automated reset)
const { resetWeeklyMissions, resetDailyMissions } = require('./maintenance');
const { extractStatsFromImage } = require('./ocr');

app.post('/api/maintenance/reset-weekly', authMiddleware, async (req, res, next) => {
  try {
    const { date } = req.body || {};
    logger.info({ date }, 'Weekly reset triggered');
    
    const result = await resetWeeklyMissions(date);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

app.post('/api/maintenance/reset-daily', authMiddleware, async (req, res, next) => {
  try {
    const { date } = req.body || {};
    logger.info({ date }, 'Daily reset triggered');
    
    const result = await resetDailyMissions(date);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// OCR endpoint (GPT-4o Vision)
app.post('/api/ocr/extract-stats', authMiddleware, async (req, res, next) => {
  try {
    const { image_url, image_base64, char_name } = req.body;
    
    if (!image_url && !image_base64) {
      return res.status(400).json({ error: 'image_url or image_base64 required' });
    }
    
    const imageInput = image_url || `data:image/png;base64,${image_base64}`;
    
    logger.info({ char_name, has_url: !!image_url, has_base64: !!image_base64 }, 'OCR extraction requested');
    
    const extracted = await extractStatsFromImage(imageInput, char_name);
    
    res.status(200).json({
      success: true,
      extracted,
      note: 'Use these values with POST /api/stats to register'
    });
  } catch (error) {
    if (error.message.includes('OCR not available')) {
      return res.status(503).json({ error: error.message });
    }
    next(error);
  }
});

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, 'API started');
});

