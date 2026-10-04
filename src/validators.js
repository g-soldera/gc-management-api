const { z } = require('zod');

const discordIdSchema = z.string().regex(/^\d{17,20}$/, 'Invalid Discord ID (snowflake)');

const createUserSchema = z.object({
  username: z.string()
    .min(1, 'Username required')
    .max(50, 'Username too long (max 50 chars)')
    .trim(),
  discord_owner_id: discordIdSchema.optional()
});

const registerStatsSchema = z.object({
  username: z.string().min(1).max(50).trim(),
  char_name: z.string().min(1).max(50).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  discord_id: discordIdSchema.optional(),
  
  nivel: z.number().int().min(0).max(999).optional(),
  status_despertar: z.string().max(100).optional(),
  atk_total: z.number().int().min(0).max(999999999).optional(),
  atk: z.number().int().min(0).max(999999999).optional(),
  atk_sp: z.number().int().min(0).max(999999999).optional(),
  
  status_void_unificado_semanal: z.string().max(100).optional(),
  cristais_void_unificado: z.number().int().min(0).max(99999).optional(),
  status_void_4_semanal: z.string().max(100).optional(),
  cristais_void_4: z.number().int().min(0).max(99999).optional(),
  status_wl_semanal: z.string().max(100).optional(),
  andar_wl: z.number().int().min(0).max(999).optional(),
  status_fornalha_infernal_semanal: z.string().max(100).optional(),
  status_altar_ruina_semanal: z.string().max(100).optional(),
  status_tod_diario: z.string().max(100).optional(),
  drop_perg_prop_uni: z.number().int().min(0).max(99999).optional(),
  status_abissal_semanal: z.string().max(100).optional(),
  drop_grim_reaper_card: z.number().int().min(0).max(99999).optional(),
  status_claustro_infinito_diario: z.string().max(100).optional(),
  nivel_claustro_infinito: z.number().int().min(0).max(999).optional(),
  idas_calnat: z.number().int().min(0).max(999999).optional(),
  status_brinco_caos: z.string().max(100).optional(),
  status_piercing_caos: z.string().max(100).optional(),
  status_solene_semanal: z.string().max(100).optional(),
  status_berkas_diario: z.string().max(100).optional()
});

const batchStatsSchema = z.object({
  records: z.array(registerStatsSchema).min(1).max(100)
});

const queryStatsSchema = z.object({
  username: z.string().max(50).optional(),
  char_name: z.string().max(50).optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0)).optional()
});

const updateAllCharsSchema = z.object({
  username: z.string().min(1).max(50).trim(),
  field_name: z.enum([
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
  ]),
  field_value: z.string().max(100).trim(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  discord_id: discordIdSchema.optional()
});

const createDiscordUserSchema = z.object({
  discord_id: discordIdSchema,
  discord_username: z.string().min(1).max(100).trim(),
  discord_discriminator: z.string().max(10).optional(),
  discord_avatar: z.string().max(200).optional()
});

const grantPermissionSchema = z.object({
  owner_discord_id: discordIdSchema,
  username: z.string().min(1).max(50).trim(),
  grant_to_discord_id: discordIdSchema
});

const revokePermissionSchema = z.object({
  owner_discord_id: discordIdSchema,
  username: z.string().min(1).max(50).trim(),
  revoke_from_discord_id: discordIdSchema
});

const validate = (schema) => (req, res, next) => {
  try {
    const data = req.method === 'GET' ? req.query : req.body;
    req.validated = schema.parse(data);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    next(error);
  }
};

module.exports = {
  createUserSchema,
  registerStatsSchema,
  batchStatsSchema,
  queryStatsSchema,
  updateAllCharsSchema,
  createDiscordUserSchema,
  grantPermissionSchema,
  revokePermissionSchema,
  validate
};
