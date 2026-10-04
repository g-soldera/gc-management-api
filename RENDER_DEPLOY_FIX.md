# Render Auto-Deploy Setup

## ⚠️ Auto-Deploy Atualmente Desabilitado

O auto-deploy do GitHub → Render não está funcionando. Siga os passos abaixo para habilitar.

## Passo 1: Habilitar Auto-Deploy no Dashboard Render

1. Acesse: https://dashboard.render.com/
2. Selecione o serviço: `gc-classic-api`
3. Vá em **Settings**
4. Na seção **Build & Deploy**:
   - ✅ Certifique-se que **Auto-Deploy** está **Yes**
   - Branch: `main`
5. Se estava "No", mude para "Yes" e clique **Save Changes**

## Passo 2: Verificar Integração GitHub

1. Ainda em Settings, vá até **GitHub**
2. Certifique-se que o repo `g-soldera/gc-management-api` está conectado
3. Se não estiver:
   - Clique em **Connect GitHub**
   - Autorize Render no GitHub
   - Selecione o repositório

## Passo 3: Forçar Deploy Manual (Agora)

### Via Dashboard:
1. Acesse: https://dashboard.render.com/web/gc-classic-api
2. Clique em **Manual Deploy** (botão superior direito)
3. Selecione branch `main`
4. Clique **Deploy**

### Via API (se tiver API Key):
```bash
curl -X POST https://api.render.com/v1/services/YOUR_SERVICE_ID/deploys \
  -H "Authorization: Bearer YOUR_RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache": false}'
```

## Passo 4: Adicionar OPENAI_API_KEY (Opcional)

Para funcionalidade OCR:

1. No dashboard Render, serviço `gc-classic-api`
2. **Environment** → **Add Environment Variable**
3. Key: `OPENAI_API_KEY`
4. Value: (copie do `.env` local do agente)
5. **Save Changes** (isso fará auto-deploy)

## Status Atual

- ✅ `render.yaml` configurado corretamente (branch: main, auto-deploy ready)
- ❌ Auto-deploy GitHub → Render não ativo
- ⏳ Aguardando deploy manual via dashboard

## Após Habilitar Auto-Deploy

Futuros `git push origin main` farão deploy automático em ~2-5 minutos.

## Teste Após Deploy

```bash
# Verificar versão deployada
curl https://gc-classic-api.onrender.com/health

# Testar endpoint de reset
curl -X POST https://gc-classic-api.onrender.com/api/maintenance/reset-daily \
  -H "X-API-Key: SEU_API_KEY" \
  -H "Content-Type: application/json"

# Deve retornar 200 com JSON (não 404)
```

## Próximas Ações

1. **Você:** Habilitar auto-deploy no dashboard Render
2. **Você:** Forçar deploy manual agora
3. **Sistema:** Testar workflows GitHub Actions após deploy
