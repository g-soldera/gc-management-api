#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

const server = new Server(
  {
    name: 'grandchase-tracker',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'create_user',
        description: 'Create a new game account linked to a Discord user',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Game account username (can contain Korean characters)',
            },
            discord_owner_id: {
              type: 'string',
              description: 'Discord user ID (snowflake) who owns this account',
            },
          },
          required: ['username', 'discord_owner_id'],
        },
      },
      {
        name: 'list_users',
        description: 'List all registered users',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_characters',
        description: 'List all 25 GrandChase characters (ptbr and enus)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'register_stats',
        description: 'Register character stats for a user (single)',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Player account username' },
            char_name: { type: 'string', description: 'Character name (ptbr or enus, one of 25 GrandChase characters)' },
            date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
            nivel: { type: 'integer', description: 'Character level (1-90+)' },
            status_despertar: { type: 'string', description: 'Awakening status: unlocks awakening talent tree' },
            atk_total: { type: 'integer', description: 'Total attack power' },
            atk: { type: 'integer', description: 'Physical attack stat' },
            atk_sp: { type: 'integer', description: 'Special attack stat' },
            status_void_unificado_semanal: { type: 'string', description: 'Weekly Unified Void status (1/2/3), 2 runs per char' },
            cristais_void_unificado: { type: 'integer', description: 'Yellow void crystals in inventory. 5 per run, items cost 40' },
            status_void_4_semanal: { type: 'string', description: 'Weekly Void 4 (Apocalypse) status, 2 runs per char' },
            cristais_void_4: { type: 'integer', description: 'Blue void crystals in inventory. 5 per run, items cost 40' },
            status_wl_semanal: { type: 'string', description: 'Weekly Tower of Illusions status, 5 runs per char' },
            andar_wl: { type: 'integer', description: 'Tower of Illusions floor (1-30)' },
            status_fornalha_infernal_semanal: { type: 'string', description: 'Weekly Infernal Furnace status, 3 runs per char' },
            status_altar_ruina_semanal: { type: 'string', description: 'Weekly Altar of Ruin status, 3 runs per char' },
            status_tod_diario: { type: 'string', description: 'Daily Tower of Extinction status, 3 runs per char' },
            drop_perg_prop_uni: { type: 'integer', description: 'Count of Unique Property Scrolls dropped in ToD (logged for aggregation)' },
            status_abissal_semanal: { type: 'string', description: 'Weekly Abyssal Path status. Done = 100 purple + 100 red crystals, full run 1-12 or 2-12' },
            drop_grim_reaper_card: { type: 'integer', description: 'Count of Grim Reaper Cards dropped in Abyssal Path 2-12' },
            status_claustro_infinito_diario: { type: 'string', description: 'Daily Infinite Cloister status (account-level: 3 runs per account/day, NOT per char)' },
            nivel_claustro_infinito: { type: 'integer', description: 'Character level in Infinite Cloister (1-4, per char)' },
            idas_calnat: { type: 'integer', description: 'Calnat runs (Kricktria map) to farm Chaos Earring/Piercing' },
            status_brinco_caos: { type: 'string', description: 'Chaos Earring obtained status' },
            status_piercing_caos: { type: 'string', description: 'Chaos Piercing obtained status' },
            status_solene_semanal: { type: 'string', description: 'Weekly Solene status: minimum 5 runs in any Solene map (Other World)' },
            status_berkas_diario: { type: 'string', description: 'Daily Berkas completion status for this character' },
            discord_id: { type: 'string', description: 'Discord user ID (required for permission check)' },
          },
          required: ['username', 'char_name', 'discord_id'],
        },
      },
      {
        name: 'register_stats_batch',
        description: 'Register character stats in batch (multiple users/characters)',
        inputSchema: {
          type: 'object',
          properties: {
            records: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  char_name: { type: 'string' },
                  date: { type: 'string' },
                  atk_total: { type: 'integer' },
                  atk: { type: 'integer' },
                  atk_sp: { type: 'integer' },
                },
              },
            },
          },
          required: ['records'],
        },
      },
      {
        name: 'query_stats',
        description: 'Query character stats with filters',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            char_name: { type: 'string' },
            from_date: { type: 'string' },
            to_date: { type: 'string' },
          },
        },
      },
      {
        name: 'update_stat_all_chars',
        description: 'Update ONE stat field for ALL 25 characters of a user account. Example: mark daily Berkas as done for all characters at once.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Player account username' },
            field_name: { 
              type: 'string', 
              description: 'Field to update. Allowed: nivel, status_despertar, status_void_unificado_semanal, status_void_4_semanal, status_wl_semanal, status_fornalha_infernal_semanal, status_altar_ruina_semanal, status_tod_diario, status_abissal_semanal, status_claustro_infinito_diario, status_brinco_caos, status_piercing_caos, status_solene_semanal, status_berkas_diario',
              enum: [
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
              ]
            },
            field_value: { type: 'string', description: 'Value to set for this field (e.g., "Feito", "Despertado", "90")' },
            date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
            discord_id: { type: 'string', description: 'Discord user ID (required for permission check)' },
          },
          required: ['username', 'field_name', 'field_value', 'discord_id'],
        },
      },
      {
        name: 'create_discord_user',
        description: 'Register a Discord user in the system (required before creating game accounts)',
        inputSchema: {
          type: 'object',
          properties: {
            discord_id: { type: 'string', description: 'Discord user ID (snowflake)' },
            discord_username: { type: 'string', description: 'Discord username' },
            discord_discriminator: { type: 'string', description: 'Discord discriminator (optional, legacy)' },
            discord_avatar: { type: 'string', description: 'Discord avatar hash (optional)' },
          },
          required: ['discord_id', 'discord_username'],
        },
      },
      {
        name: 'grant_permission',
        description: 'Owner grants permission to another Discord user to edit their game account',
        inputSchema: {
          type: 'object',
          properties: {
            owner_discord_id: { type: 'string', description: 'Discord ID of the account owner' },
            username: { type: 'string', description: 'Game account username' },
            grant_to_discord_id: { type: 'string', description: 'Discord ID to grant permission to' },
          },
          required: ['owner_discord_id', 'username', 'grant_to_discord_id'],
        },
      },
      {
        name: 'revoke_permission',
        description: 'Owner revokes permission from a Discord user',
        inputSchema: {
          type: 'object',
          properties: {
            owner_discord_id: { type: 'string', description: 'Discord ID of the account owner' },
            username: { type: 'string', description: 'Game account username' },
            revoke_from_discord_id: { type: 'string', description: 'Discord ID to revoke permission from' },
          },
          required: ['owner_discord_id', 'username', 'revoke_from_discord_id'],
        },
      },
      {
        name: 'list_permissions',
        description: 'List all permissions for a game account',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Game account username' },
          },
          required: ['username'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    const makeRequest = async (endpoint, method = 'GET', body = null) => {
      const opts = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      };
      if (body) opts.body = JSON.stringify(body);

      const res = await fetch(`${API_URL}${endpoint}`, opts);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return data;
    };

    switch (name) {
      case 'create_user':
        const userData = await makeRequest('/api/users', 'POST', { username: args.username });
        return {
          content: [
            {
              type: 'text',
              text: `User created: ${userData.username} (ID: ${userData.user_id})`,
            },
          ],
        };

      case 'list_users':
        const users = await makeRequest('/api/users');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };

      case 'list_characters':
        const chars = await makeRequest('/api/characters');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(chars, null, 2),
            },
          ],
        };

      case 'register_stats':
        const statsData = await makeRequest('/api/stats', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Stats registered: ${JSON.stringify(statsData)}`,
            },
          ],
        };

      case 'register_stats_batch':
        const batchData = await makeRequest('/api/stats/batch', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Batch completed: ${batchData.success} success, ${batchData.errors.length} errors\n${JSON.stringify(batchData, null, 2)}`,
            },
          ],
        };

      case 'query_stats':
        const query = new URLSearchParams();
        if (args.username) query.set('username', args.username);
        if (args.char_name) query.set('char_name', args.char_name);
        if (args.from_date) query.set('from_date', args.from_date);
        if (args.to_date) query.set('to_date', args.to_date);

        const queryData = await makeRequest(`/api/stats?${query}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(queryData, null, 2),
            },
          ],
        };

      case 'update_stat_all_chars':
        const updateData = await makeRequest('/api/stats/update-all-chars', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Updated ${updateData.updated_count} characters for user ${args.username}: ${updateData.char_names.join(', ')}`,
            },
          ],
        };

      case 'create_discord_user':
        const discordUserData = await makeRequest('/api/discord/users', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Discord user registered: ${discordUserData.discord_username} (ID: ${discordUserData.discord_id})`,
            },
          ],
        };

      case 'grant_permission':
        const grantData = await makeRequest('/api/permissions/grant', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Permission granted: ${grantData.message}`,
            },
          ],
        };

      case 'revoke_permission':
        const revokeData = await makeRequest('/api/permissions/revoke', 'POST', args);
        return {
          content: [
            {
              type: 'text',
              text: `Permission revoked: ${revokeData.message}`,
            },
          ],
        };

      case 'list_permissions':
        const permData = await makeRequest(`/api/permissions/${args.username}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(permData, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GrandChase MCP server running on stdio');
}

main().catch(console.error);
