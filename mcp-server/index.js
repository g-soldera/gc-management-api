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
        description: 'Create a new user account (supports Korean characters)',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username (can contain Korean characters)',
            },
          },
          required: ['username'],
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
            username: { type: 'string' },
            char_name: { type: 'string', description: 'Character name (ptbr or enus)' },
            date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
            atk_total: { type: 'integer' },
            atk: { type: 'integer' },
            atk_sp: { type: 'integer' },
            status_void_unificado_semanal: { type: 'string' },
            cristais_void_unificado: { type: 'integer' },
            status_void_4_semanal: { type: 'string' },
            cristais_void_4: { type: 'integer' },
            status_wl_semanal: { type: 'string' },
            andar_wl: { type: 'integer' },
            status_fornalha_infernal_semanal: { type: 'string' },
            status_altar_ruina_semanal: { type: 'string' },
            status_tod_diario: { type: 'string' },
            drop_perg_prop_uni: { type: 'boolean' },
            status_abissal_semanal: { type: 'string' },
            drop_grim_reaper_card: { type: 'boolean' },
            status_claustro_infinito_diario: { type: 'string' },
            nivel_claustro_infinito: { type: 'integer' },
            idas_calnat: { type: 'integer' },
            status_brinco_caos: { type: 'string' },
            status_piercing_caos: { type: 'string' },
            status_solene_semanal: { type: 'string' },
          },
          required: ['username', 'char_name'],
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
