# 🔧 Troubleshooting - Problemas Resolvidos

## Problema: "Execution context was destroyed" após validação OTP

### 🔍 Descrição do Problema

O navegador fechava automaticamente após validar o código OTP, retornando o erro:
```
Execution context was destroyed, most likely because of a navigation.
```

### 📋 Causa Raiz

O problema ocorria em **dois momentos diferentes**:

#### 1. Durante a validação do OTP (RESOLVIDO)
- Após clicar no botão de validação do OTP, o PJE faz um **redirect automático**
- O código antigo tentava fazer `page.reload()` **depois** que o contexto já tinha sido destruído
- Isso causava erro porque não é possível recarregar uma página cujo contexto foi destruído

#### 2. Após navegar para a URL base (RESOLVIDO)
- Após extrair a URL base e navegar para ela, a página fazia **outro redirect automático**
- O código tentava executar ações de navegação (clicar no menu) antes da página estabilizar
- O contexto era destruído pelo redirect enquanto tentávamos interagir com a página

### ✅ Solução Implementada

#### Correção 1: Aguardar navegação após OTP
**Antes:**
```javascript
await page.click(botão);
await sleep(5000);
await page.reload(); // ❌ Contexto já destruído aqui
```

**Depois:**
```javascript
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
  page.click(botão)
]);
// ✅ Aguarda a navegação acontecer naturalmente
```

#### Correção 2: Aguardar estabilização da página
**Antes:**
```javascript
await page.goto(baseUrl, { waitUntil: 'networkidle2' });
// Tenta executar ações imediatamente ❌
await executeNavigationActions(page, actions);
```

**Depois:**
```javascript
await page.goto(baseUrl, { waitUntil: 'networkidle2' });

// Aguarda a página estabilizar completamente (pode haver redirects)
console.log('⏳ Aguardando página estabilizar...');
await new Promise(resolve => setTimeout(resolve, 3000));

// Verifica se houve redirect
const urlAposEstabilizar = page.url();
if (urlAposEstabilizar !== baseUrl) {
  console.log(`📍 Redirect detectado: ${urlAposEstabilizar}`);
}

// Agora sim executa as ações ✅
await executeNavigationActions(page, actions);
```

#### Correção 3: Melhor tratamento de cliques com navegação
**Antes:**
```javascript
await page.click(selector);
if (action.waitForNavigation) {
  await page.waitForNavigation(); // ❌ Pode perder a navegação
}
```

**Depois:**
```javascript
if (action.waitForNavigation) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click(selector)
  ]);
} else {
  await page.click(selector);
}
// ✅ Garante que a navegação seja capturada
```

### 🎯 Resultado

Agora o fluxo funciona corretamente:

1. ✅ Login com credenciais
2. ✅ Validação do OTP → aguarda navegação automática
3. ✅ Navega para URL base → aguarda estabilização (3s)
4. ✅ Executa ações de navegação (menu lateral, etc)
5. ✅ Extrai dados com paginação
6. ✅ Mantém navegador aberto para próximas pesquisas

### 📝 Arquivos Modificados

- `api/server.js` - Endpoint `/api/scrape/start`
- `src/1-login.js` - Função `performLoginWithOTP()`
- `src/2-navigation.js` - Função `executeNavigationActions()`

### 🧪 Como Testar

```bash
curl -X POST http://localhost:3001/api/scrape/start \
  -H "Content-Type: application/json" \
  -d '{
    "searches": [{"numeroOAB": "142942", "letraOAB": "", "ufOAB": "MG"}],
    "otpCode": "SEU_CODIGO_AQUI"
  }'
```

### 💡 Lições Aprendidas

1. **Sempre aguarde navegações explicitamente** usando `Promise.all([waitForNavigation(), click()])`
2. **Páginas podem fazer redirects automáticos** - aguarde estabilização antes de interagir
3. **`networkidle2` não garante que redirects terminaram** - adicione delay adicional se necessário
4. **Contextos destruídos não podem ser recuperados** - previna ao invés de tentar corrigir depois
