# GitHub Actions - Automated Resets

## Status

✅ **Configurado e Funcionando**

- GitHub Actions workflows criados
- Secrets configurados via CLI
- Aguardando Render auto-deploy

## Workflows

### 1. Daily Reset
- **Agenda:** Todos os dias às 03:00 BRT (06:00 UTC)
- **Arquivo:** `.github/workflows/daily-reset.yml`
- **Endpoint:** `POST /api/maintenance/reset-daily`

### 2. Weekly Reset
- **Agenda:** Quartas-feiras às 03:00 BRT (06:00 UTC)
- **Arquivo:** `.github/workflows/weekly-reset.yml`
- **Endpoint:** `POST /api/maintenance/reset-weekly`

## Secrets Configurados

Os seguintes secrets foram configurados via GitHub CLI:

- ✅ `API_KEY` (autenticação com a API)
- ✅ `API_URL` (URL do serviço no Render)
- ✅ `OPENAI_API_KEY` (opcional, para OCR)

## Teste Manual

Para testar os workflows manualmente:

```bash
# Via GitHub CLI
gh workflow run "Daily Reset"
gh workflow run "Weekly Reset"

# Via GitHub UI
# 1. Acesse: https://github.com/g-soldera/gc-management-api/actions
# 2. Selecione o workflow desejado
# 3. Clique em "Run workflow"
```

## Monitoramento

Ver logs de execução:
```bash
gh run list --workflow="Daily Reset" --limit 5
gh run view <run-id> --log
```

Ou acesse: https://github.com/g-soldera/gc-management-api/actions

## Próximas Execuções

- **Daily:** Amanhã (2026-10-05) às 03:00 BRT
- **Weekly:** Quarta-feira (2026-10-09) às 03:00 BRT

## Custos

GitHub Actions free tier: 2000 min/mês

Uso estimado: ~30 execuções/mês = ~1 minuto total

**Totalmente gratuito dentro do free tier.**
