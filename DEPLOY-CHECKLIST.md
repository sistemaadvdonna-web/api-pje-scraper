# ✅ Checklist de Deploy - Render

## 📦 Preparação (COMPLETO)

- [x] Código testado localmente em modo headless
- [x] Erro "Execution context destroyed" corrigido
- [x] Navegador não fecha mais prematuramente
- [x] Modo headless ativado
- [x] @sparticuz/chromium instalado
- [x] render.yaml criado
- [x] Documentação completa
- [x] Código commitado e enviado para GitHub

## 🚀 Próximos Passos no Render

### 1. Acesse o Render
👉 https://dashboard.render.com

### 2. Crie um Novo Web Service
1. Clique em **"New +"** → **"Web Service"**
2. Conecte o repositório: `opeclat/api-pje-scraper`
3. Selecione o branch: `master`

### 3. Configurações Automáticas
O Render vai detectar o `render.yaml` e configurar automaticamente:
- ✅ Name: `pje-scraper-api`
- ✅ Runtime: Node
- ✅ Build Command: `npm install`
- ✅ Start Command: `npm run api`
- ✅ Environment Variables: NODE_ENV, RENDER, PORT
- ✅ Health Check: `/api/health`

### 4. Escolha o Plano
- **Free**: Grátis, suspende após 15min de inatividade
- **Starter**: $7/mês, sempre ativo, melhor para produção

### 5. Deploy
Clique em **"Create Web Service"** e aguarde ~5-10 minutos

## 🧪 Testes Após Deploy

### 1. Health Check
```bash
curl https://SEU-APP.onrender.com/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "activeSessions": 0,
  "uptime": 123.45,
  "memory": {...}
}
```

### 2. Teste de Scraping
```bash
curl -X POST https://SEU-APP.onrender.com/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "searches": [{"numeroOAB": "142942", "letraOAB": "", "ufOAB": "MG"}],
    "otpCode": "SEU_CODIGO_OTP"
  }'
```

## 📊 Monitoramento

### Logs
No dashboard do Render → Seu serviço → **Logs**

Você verá:
```
🌐 Usando @sparticuz/chromium para Render
🚀 API PJE Scraper rodando na porta 3001
📍 http://localhost:3001
```

### Métricas
- CPU Usage
- Memory Usage
- Request Count
- Response Times

## ⚠️ Problemas Comuns

### Cold Start (Plano Free)
**Sintoma**: Primeira requisição demora 30-60s
**Solução**: Normal no plano Free, upgrade para Starter se necessário

### Timeout
**Sintoma**: Erro após 30 segundos
**Solução**: 
- Plano Free tem timeout de 30s
- Upgrade para Starter (timeout de 300s)
- Otimize o scraping

### Out of Memory
**Sintoma**: Serviço crasha
**Solução**:
- Feche navegadores após uso
- Upgrade para instância maior
- Otimize uso de memória

## 🔐 Segurança (Próximos Passos)

### 1. Mover Credenciais para Variáveis de Ambiente
No Render Dashboard → Environment:
```
PJE_USERNAME=seu_cpf
PJE_PASSWORD=sua_senha
```

Depois atualizar `src/config.js`:
```javascript
credentials: {
  username: process.env.PJE_USERNAME || '09571180661',
  password: process.env.PJE_PASSWORD || 'gpradoslima9099'
}
```

### 2. Adicionar API Key
```
API_KEY=sua_chave_secreta_aqui
```

### 3. Rate Limiting
```bash
npm install express-rate-limit
```

## 📚 Documentação

- [RENDER-DEPLOY.md](./RENDER-DEPLOY.md) - Guia completo de deploy
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Problemas resolvidos
- [HEADLESS-CONFIG.md](./HEADLESS-CONFIG.md) - Configuração headless
- [API-DOCS.md](./API-DOCS.md) - Documentação da API
- [README.md](./README.md) - Visão geral do projeto

## 🎯 Status Atual

```
✅ Código pronto para produção
✅ Testes locais passando
✅ Modo headless funcionando
✅ Documentação completa
✅ GitHub atualizado
⏳ Aguardando deploy no Render
```

## 🚀 URL do Repositório

https://github.com/opeclat/api-pje-scraper

---

**Tudo pronto para o deploy!** 🎉

Siga os passos acima e em ~10 minutos sua API estará no ar.
