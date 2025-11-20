# 🚀 Deploy no Render

## ✅ Pré-requisitos

- [x] Código commitado e enviado para o GitHub
- [x] Modo headless ativado
- [x] Configuração do Render pronta (render.yaml)
- [x] Dependências corretas no package.json

## 📋 Passos para Deploy

### 1. Acesse o Render Dashboard

1. Vá para [https://dashboard.render.com](https://dashboard.render.com)
2. Faça login com sua conta

### 2. Crie um Novo Web Service

1. Clique em **"New +"** → **"Web Service"**
2. Conecte seu repositório GitHub: `opeclat/api-pje-scraper`
3. Ou use o link direto se já estiver conectado

### 3. Configure o Web Service

#### Configurações Básicas:
- **Name**: `pje-scraper-api` (ou o nome que preferir)
- **Region**: `Oregon (US West)` ou mais próximo de você
- **Branch**: `master`
- **Root Directory**: (deixe vazio)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run api`

#### Configurações de Instância:
- **Instance Type**: `Free` (para testes) ou `Starter` (para produção)
  - Free: 512 MB RAM, suspende após inatividade
  - Starter: 512 MB RAM, sempre ativo ($7/mês)

#### Variáveis de Ambiente:
Adicione estas variáveis em **Environment**:

```bash
NODE_ENV=production
RENDER=true
PORT=3001
```

**⚠️ IMPORTANTE**: Não adicione credenciais sensíveis aqui! 
As credenciais já estão no código (src/config.js) mas você pode movê-las para variáveis de ambiente depois.

### 4. Deploy Automático

1. Clique em **"Create Web Service"**
2. O Render vai:
   - ✅ Clonar o repositório
   - ✅ Instalar dependências (incluindo @sparticuz/chromium)
   - ✅ Iniciar o servidor
   - ✅ Gerar uma URL pública

### 5. Acompanhe o Deploy

No painel do Render você verá:
```
==> Cloning from https://github.com/opeclat/api-pje-scraper...
==> Running 'npm install'
==> Installing dependencies...
==> Starting service with 'npm run api'
==> Your service is live 🎉
```

### 6. Teste a API

Após o deploy, você receberá uma URL como:
```
https://pje-scraper-api.onrender.com
```

Teste o health check:
```bash
curl https://pje-scraper-api.onrender.com/
```

Resposta esperada:
```json
{
  "status": "online",
  "service": "PJE Scraper API",
  "version": "1.0.0",
  "endpoints": {
    "scrape": "POST /api/scrape",
    "health": "GET /api/health"
  }
}
```

### 7. Teste o Scraping

```bash
curl -X POST https://pje-scraper-api.onrender.com/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "searches": [{"numeroOAB": "142942", "letraOAB": "", "ufOAB": "MG"}],
    "otpCode": "SEU_CODIGO_OTP"
  }'
```

## 🔧 Configurações Importantes

### Timeout
O Render tem timeout de **30 segundos** para requisições HTTP no plano Free.
Se o scraping demorar mais, considere:
- Usar plano Starter (timeout de 300s)
- Implementar sistema de webhooks
- Usar jobs em background

### Memória
- **Free**: 512 MB RAM
- **Starter**: 512 MB RAM
- **Standard**: 2 GB RAM

O Chromium headless usa ~100-150 MB, deixando espaço para a aplicação.

### Cold Start
No plano Free, o serviço **suspende após 15 minutos de inatividade**.
A primeira requisição após suspensão demora ~30-60 segundos (cold start).

Soluções:
- Upgrade para Starter ($7/mês) - sempre ativo
- Usar cron job para manter ativo
- Aceitar o cold start (ok para uso esporádico)

## 📊 Monitoramento

### Logs em Tempo Real
No dashboard do Render:
1. Clique no seu serviço
2. Vá em **"Logs"**
3. Veja os logs em tempo real

### Métricas
- CPU usage
- Memory usage
- Request count
- Response times

## 🔄 Deploy Automático

O Render faz deploy automático quando você faz push para o GitHub:

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin master
# Deploy automático inicia no Render! 🚀
```

## ⚠️ Troubleshooting

### Erro: "Out of memory"
- Upgrade para instância maior
- Otimize uso de memória
- Feche navegadores após uso

### Erro: "Timeout"
- Aumente timeout (plano Starter+)
- Otimize scraping
- Use sistema assíncrono

### Erro: "Chromium not found"
- Verifique se @sparticuz/chromium está instalado
- Confirme que RENDER=true está nas variáveis de ambiente

### Erro: "Port already in use"
- Não defina PORT manualmente no código
- Use `process.env.PORT || 3001`

## 🎯 Checklist Final

Antes de fazer o primeiro deploy:

- [x] Código no GitHub atualizado
- [x] Modo headless ativado
- [x] @sparticuz/chromium no package.json
- [x] render.yaml configurado
- [x] Variáveis de ambiente definidas
- [ ] Conta no Render criada
- [ ] Repositório conectado ao Render
- [ ] Web Service criado
- [ ] Deploy realizado
- [ ] Testes executados

## 🔐 Segurança (Próximos Passos)

Após o deploy funcionar, considere:

1. **Mover credenciais para variáveis de ambiente**:
```javascript
credentials: {
  username: process.env.PJE_USERNAME,
  password: process.env.PJE_PASSWORD
}
```

2. **Adicionar autenticação na API**:
```javascript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

3. **Rate limiting**:
```bash
npm install express-rate-limit
```

## 📚 Recursos

- [Render Docs](https://render.com/docs)
- [Puppeteer on Render](https://render.com/docs/puppeteer)
- [@sparticuz/chromium](https://github.com/Sparticuz/chromium)

---

**Pronto para deploy!** 🚀

Qualquer dúvida durante o processo, consulte os logs no dashboard do Render.
