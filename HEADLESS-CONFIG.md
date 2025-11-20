# 🎭 Configuração Headless

## Mudanças Aplicadas

### ✅ Modo Headless Ativado

O navegador agora roda em modo headless (sem interface gráfica), ideal para:
- 🚀 Produção
- 🐳 Containers Docker
- ☁️ Deploy no Render
- 🤖 Automação em servidores

### 📋 Configurações Aplicadas

```javascript
puppeteerOptions: {
  headless: 'new', // Modo headless moderno (Chrome 112+)
  defaultViewport: {
    width: 1920,
    height: 1080
  },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-web-security',
    '--disable-features=BlockInsecurePrivateNetworkRequests',
    '--disable-dev-shm-usage',        // Importante para ambientes com pouca memória
    '--disable-accelerated-2d-canvas', // Desabilita aceleração de canvas
    '--disable-gpu',                   // Desabilita GPU (não necessária em headless)
    '--window-size=1920,1080',        // Define tamanho da janela virtual
    '--no-zygote'
  ],
  ignoreDefaultArgs: ['--enable-automation'],
  ignoreHTTPSErrors: true
}
```

### 🔄 Diferenças entre Headless e Headed

| Aspecto | Headed (headless: false) | Headless (headless: 'new') |
|---------|-------------------------|---------------------------|
| Interface Gráfica | ✅ Visível | ❌ Invisível |
| Uso de Memória | ~200-300 MB | ~100-150 MB |
| Velocidade | Normal | ~10-20% mais rápido |
| Debug Visual | ✅ Fácil | ❌ Precisa screenshots |
| Produção | ❌ Não recomendado | ✅ Recomendado |
| Viewport | Dinâmico | Fixo (1920x1080) |

### 🎯 Modo Headless 'new' vs 'true'

- `headless: true` - Modo antigo (deprecated)
- `headless: 'new'` - Modo moderno (Chrome 112+)
  - Melhor compatibilidade
  - Menos bugs
  - Mais próximo do comportamento headed

### 🧪 Como Testar

```bash
# Teste com OTP
./test-api.sh SEU_CODIGO_OTP

# Monitorar logs
./watch-logs.sh
```

### 📸 Debug em Headless

Se precisar debugar em modo headless, você pode tirar screenshots:

```javascript
// Adicione isso em qualquer ponto do código
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 🔄 Voltar para Modo Headed (com interface)

Se precisar voltar para modo com interface gráfica (para debug):

```javascript
// Em src/config.js
puppeteerOptions: {
  headless: false,
  defaultViewport: null,
  // ... resto das configurações
}
```

### ⚠️ Observações Importantes

1. **Memória**: Headless usa menos memória, mas ainda precisa de ~512MB disponível
2. **Timeouts**: Podem ser ligeiramente diferentes em headless
3. **Fontes**: Algumas fontes podem renderizar diferente
4. **Screenshots**: Úteis para debug quando não há interface visual

### 🚀 Pronto para Produção

Com essas configurações, o scraper está otimizado para:
- ✅ Rodar em servidores sem interface gráfica
- ✅ Deploy no Render
- ✅ Containers Docker
- ✅ Menor consumo de recursos
- ✅ Melhor performance
