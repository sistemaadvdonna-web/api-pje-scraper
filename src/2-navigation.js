import { initBrowser, closeBrowser } from './browser.js';
import { config } from './config.js';
import { performLoginWithOTP } from './1-login.js';

/**
 * Executa uma sequência de ações de navegação
 * @param {Page} page - Página do Puppeteer
 * @param {Array} actions - Array de ações a executar
 */
export async function executeNavigationActions(page, actions) {
  console.log(`🧭 Executando ${actions.length} ações de navegação...\n`);
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`[${i + 1}/${actions.length}] ${action.description}`);
    
    try {
      switch (action.type) {
        case 'click':
          await page.waitForSelector(action.selector, { timeout: 30000 });
          await page.click(action.selector);
          if (action.waitForNavigation) {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
          } else if (action.waitTime) {
            await new Promise(resolve => setTimeout(resolve, action.waitTime));
          }
          break;
          
        case 'type':
          await page.waitForSelector(action.selector, { timeout: 30000 });
          await page.type(action.selector, action.text);
          if (action.waitTime) {
            await new Promise(resolve => setTimeout(resolve, action.waitTime));
          }
          break;
          
        case 'select':
          await page.waitForSelector(action.selector, { timeout: 30000 });
          await page.select(action.selector, action.value);
          if (action.waitTime) {
            await new Promise(resolve => setTimeout(resolve, action.waitTime));
          }
          break;
          
        case 'goto':
          await page.goto(action.url, { waitUntil: 'networkidle2', timeout: 30000 });
          break;
          
        case 'wait':
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: 30000 });
          } else if (action.time) {
            await new Promise(resolve => setTimeout(resolve, action.time));
          }
          break;
          
        case 'evaluate':
          await page.evaluate(action.script);
          break;
          
        default:
          console.log(`⚠️  Tipo de ação desconhecido: ${action.type}`);
      }
      
      console.log(`✓ Ação concluída\n`);
      
    } catch (error) {
      console.error(`❌ Erro na ação: ${error.message}`);
      throw error;
    }
  }
  
  console.log('✅ Todas as ações de navegação concluídas!');
  return page;
}

/**
 * Função legada - mantida para compatibilidade
 */
export async function navigateToTarget(page) {
  console.log('🧭 Navegando para a página de extração...');
  
  // Usa as ações configuradas se existirem
  if (config.navigation && config.navigation.actions) {
    return await executeNavigationActions(page, config.navigation.actions);
  }
  
  // Fallback para o método antigo
  if (config.selectors.navigation.targetLink) {
    await page.waitForSelector(config.selectors.navigation.targetLink);
    await page.click(config.selectors.navigation.targetLink);
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
  } else if (config.targetUrl) {
    await page.goto(config.targetUrl, { waitUntil: 'networkidle2' });
  }
  
  console.log('✓ Página de extração carregada');
  return page;
}

// Teste standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando módulo de navegação...\n');
  
  const { browser, page } = await initBrowser();
  
  try {
    const { page: loggedPage } = await performLoginWithOTP(page);
    await navigateToTarget(loggedPage);
    console.log('\n✅ Teste de navegação concluído! Verifique o navegador.');
    console.log('Pressione Ctrl+C para fechar.');
  } catch (error) {
    console.error('❌ Erro na navegação:', error.message);
    await closeBrowser(browser);
  }
}
