require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(helmet());
app.use(cors());
app.use(express.json());

const authMiddleware = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/users', authMiddleware, async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const { data, error } = await supabase
      .from('dim_users')
      .insert({ username })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dim_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/characters', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dim_characters')
      .select('*')
      .order('char_id');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { username, char_name, date, ...stats } = req.body;

    if (!username || !char_name) {
      return res.status(400).json({ error: 'Username and char_name required' });
    }

    const { data: user, error: userError } = await supabase
      .from('dim_users')
      .select('user_id')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: char, error: charError } = await supabase
      .from('dim_characters')
      .select('char_id')
      .or(`char_name_ptbr.eq.${char_name},char_name_enus.eq.${char_name}`)
      .single();

    if (charError || !char) {
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
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stats/batch', authMiddleware, async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Records array required' });
    }

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
        errors.push({ username, char_name, error: err.message });
      }
    }

    res.status(201).json({ success: results.length, results, errors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const { username, char_name, from_date, to_date } = req.query;

    let query = supabase
      .from('fact_character_stats')
      .select(`
        *,
        dim_users (username),
        dim_characters (char_name_ptbr, char_name_enus),
        dim_time (date)
      `);

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

    query = query.order('created_at', { ascending: false }).limit(100);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`GrandChase API running on port ${PORT}`);
});
