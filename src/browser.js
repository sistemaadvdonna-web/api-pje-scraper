import puppeteer from 'puppeteer';
import chromium from '@sparticuz/chromium';
import { config } from './config.js';

export async function initBrowser() {
  // Usa Chromium otimizado para serverless
  const options = { ...config.puppeteerOptions };
  
  // Detecta ambiente Render especificamente
  const isRender = process.env.RENDER === 'true' || 
                   process.env.RENDER_SERVICE_NAME || 
                   process.env.RENDER_EXTERNAL_URL;
  
  if (isRender) {
    console.log('🌐 Usando @sparticuz/chromium para Render');
    try {
      options.executablePath = await chromium.executablePath();
      options.args = chromium.args;
    } catch (error) {
      console.log('⚠️  Erro ao carregar chromium, usando padrão:', error.message);
    }
  } else {
    console.log('🌐 Usando Puppeteer padrão (local)');
    // Remove executablePath para usar o Chrome local
    delete options.executablePath;
  }
  
  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  
  // Configurações úteis
  await page.setDefaultNavigationTimeout(60000);
  
  // Remove sinais de automação - faz o navegador parecer humano
  await page.evaluateOnNewDocument(() => {
    // Remove webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Adiciona plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Adiciona languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
    
    // Chrome runtime
    window.chrome = {
      runtime: {},
    };
    
    // Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  // User agent realista
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  // Headers extras
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  });
  
  // Habilita JavaScript (já é padrão, mas garantindo)
  await page.setJavaScriptEnabled(true);
  
  return { browser, page };
}

export async function closeBrowser(browser) {
  await browser.close();
}
