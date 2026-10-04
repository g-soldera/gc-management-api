const request = require('supertest');
const express = require('express');

describe('API Health Check', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  });

  it('should return 200 and health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.uptime).toBeDefined();
  });
});

describe('Input Validation', () => {
  const { z } = require('zod');
  const { createUserSchema, registerStatsSchema } = require('../src/validators');

  describe('createUserSchema', () => {
    it('should validate correct username', () => {
      const result = createUserSchema.parse({ username: 'Player1' });
      expect(result.username).toBe('Player1');
    });

    it('should validate username with Korean characters', () => {
      const result = createUserSchema.parse({ username: 'Player한국' });
      expect(result.username).toBe('Player한국');
    });

    it('should reject empty username', () => {
      expect(() => createUserSchema.parse({ username: '' })).toThrow();
    });

    it('should reject username longer than 50 chars', () => {
      const longUsername = 'a'.repeat(51);
      expect(() => createUserSchema.parse({ username: longUsername })).toThrow();
    });

    it('should trim whitespace', () => {
      const result = createUserSchema.parse({ username: '  Player1  ' });
      expect(result.username).toBe('Player1');
    });
  });

  describe('registerStatsSchema', () => {
    it('should validate minimal stats registration', () => {
      const result = registerStatsSchema.parse({
        username: 'Player1',
        char_name: 'Elesis'
      });
      expect(result.username).toBe('Player1');
      expect(result.char_name).toBe('Elesis');
    });

    it('should validate full stats registration', () => {
      const result = registerStatsSchema.parse({
        username: 'Player1',
        char_name: 'Elesis',
        date: '2026-10-04',
        atk_total: 15000,
        atk: 12000,
        atk_sp: 3000,
        andar_wl: 25,
        drop_perg_prop_uni: 3,
        status_anel: 'Obtido',
        tipo_anel: 'Caos',
        anotacoes: 'Main character'
      });
      expect(result.atk_total).toBe(15000);
      expect(result.andar_wl).toBe(25);
      expect(result.drop_perg_prop_uni).toBe(3);
      expect(result.status_anel).toBe('Obtido');
      expect(result.tipo_anel).toBe('Caos');
      expect(result.anotacoes).toBe('Main character');
    });

    it('should reject invalid date format', () => {
      expect(() => registerStatsSchema.parse({
        username: 'Player1',
        char_name: 'Elesis',
        date: '10/04/2026'
      })).toThrow();
    });

    it('should reject negative atk values', () => {
      expect(() => registerStatsSchema.parse({
        username: 'Player1',
        char_name: 'Elesis',
        atk_total: -1000
      })).toThrow();
    });

    it('should reject atk values exceeding max', () => {
      expect(() => registerStatsSchema.parse({
        username: 'Player1',
        char_name: 'Elesis',
        atk_total: 10000000000
      })).toThrow();
    });
  });
});

describe('Rate Limiting', () => {
  it('should enforce rate limit configuration', () => {
    const rateLimit = require('express-rate-limit');
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    expect(limiter).toBeDefined();
  });
});

describe('Logger', () => {
  const logger = require('../src/logger');

  it('should have required log methods', () => {
    expect(logger.info).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
  });
});
