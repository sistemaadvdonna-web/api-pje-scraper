import express from 'express';
import cors from 'cors';
import { initBrowser, closeBrowser } from '../src/browser.js';
import { config } from '../src/config.js';
import { executeNavigationActions } from '../src/2-navigation.js';
import { extractDataWithLoop } from '../src/3-extraction.js';
import { extractBaseUrl } from '../src/utils/url-extractor.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Armazena sessões ativas em memória (limpa ao reiniciar)
const activeSessions = new Map();

// Estrutura de sessão:
// {
//   sessionId: string,
//   browser: Browser,
//   page: Page,
//   searches: Array,
//   currentIndex: number,
//   results: Array,
//   createdAt: Date
// }

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'PJE Scraper API',
    version: '1.0.0',
    endpoints: {
      scrape: 'POST /api/scrape',
      health: 'GET /api/health'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    activeSessions: activeSessions.size,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Endpoint para iniciar scraping (primeira requisição)
app.post('/api/scrape/start', async (req, res) => {
  const startTime = Date.now();
  let browser = null;
  
  try {
    const { searches, otpCode } = req.body;
    
    // Validação
    if (!searches || !Array.isArray(searches) || searches.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Campo "searches" é obrigatório e deve ser um array'
      });
    }
    
    if (!otpCode) {
      return res.status(400).json({
        success: false,
        error: 'Campo "otpCode" é obrigatório'
      });
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Nova requisição de scraping`);
    console.log(`   Pesquisas: ${searches.length}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Inicia navegador
    console.log('🌐 Iniciando navegador...');
    const { browser: newBrowser, page } = await initBrowser();
    browser = newBrowser;
    
    // FASE 1: Login
    console.log('\n📝 FASE 1: Autenticação');
    await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
    
    await page.waitForSelector(config.selectors.login.usernameField);
    await page.type(config.selectors.login.usernameField, config.credentials.username);
    await page.type(config.selectors.login.passwordField, config.credentials.password);
    await page.click(config.selectors.login.submitButton);
    
    await page.waitForSelector(config.selectors.login.otpField, { timeout: 30000 });
    await page.type(config.selectors.login.otpField, otpCode);
    await page.click(config.selectors.login.otpSubmitButton);
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    await page.reload({ waitUntil: 'networkidle2' });
    
    const urlFinal = page.url();
    const baseUrl = extractBaseUrl(urlFinal);
    await page.goto(baseUrl, { waitUntil: 'networkidle2' });
    
    console.log('✅ Login completo');
    
    // FASE 2: Navegação
    console.log('\n🧭 FASE 2: Navegação');
    await executeNavigationActions(page, config.navigation.actions);
    console.log('✅ Navegação completa');
    
    // FASE 3: Primeira extração
    console.log('\n📊 FASE 3: Primeira extração');
    
    const search = searches[0];
    console.log(`\n[1/${searches.length}] Processando: OAB ${search.numeroOAB} - ${search.ufOAB}`);
    
    const parameters = [{
      numeroOAB: search.numeroOAB,
      letraOAB: search.letraOAB || '',
      ufOAB: search.ufOAB
    }];
    
    const result = await extractDataWithLoop(page, parameters);
    
    const firstResult = {
      numeroOAB: search.numeroOAB,
      letraOAB: search.letraOAB || '',
      ufOAB: search.ufOAB,
      success: result.results[0].success,
      count: result.results[0].count,
      data: result.results[0].data
    };
    
    // Cria sessão para as próximas pesquisas
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    activeSessions.set(sessionId, {
      sessionId,
      browser,
      page,
      searches,
      currentIndex: 1, // Próxima pesquisa
      results: [firstResult],
      createdAt: new Date()
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Primeira pesquisa completa em ${duration}s`);
    console.log(`📋 Sessão criada: ${sessionId}`);
    console.log(`📊 Restam ${searches.length - 1} pesquisa(s)`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Retorna primeiro resultado + info da sessão
    res.json({
      success: true,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      currentSearch: 1,
      totalSearches: searches.length,
      hasMore: searches.length > 1,
      result: firstResult
    });
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    
    if (browser) {
      await closeBrowser(browser).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para buscar próximo resultado
app.post('/api/scrape/next', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Campo "sessionId" é obrigatório'
      });
    }
    
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada ou expirada'
      });
    }
    
    const { browser, page, searches, currentIndex } = session;
    
    // Verifica se ainda há pesquisas
    if (currentIndex >= searches.length) {
      // Fecha navegador e remove sessão
      await closeBrowser(browser);
      activeSessions.delete(sessionId);
      
      return res.json({
        success: true,
        sessionId: sessionId,
        completed: true,
        message: 'Todas as pesquisas foram concluídas',
        totalSearches: searches.length,
        allResults: session.results
      });
    }
    
    // Processa próxima pesquisa
    const search = searches[currentIndex];
    console.log(`\n[${currentIndex + 1}/${searches.length}] Processando: OAB ${search.numeroOAB} - ${search.ufOAB}`);
    
    // Recarrega página
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const parameters = [{
      numeroOAB: search.numeroOAB,
      letraOAB: search.letraOAB || '',
      ufOAB: search.ufOAB
    }];
    
    const result = await extractDataWithLoop(page, parameters);
    
    const searchResult = {
      numeroOAB: search.numeroOAB,
      letraOAB: search.letraOAB || '',
      ufOAB: search.ufOAB,
      success: result.results[0].success,
      count: result.results[0].count,
      data: result.results[0].data
    };
    
    // Atualiza sessão
    session.currentIndex++;
    session.results.push(searchResult);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const hasMore = session.currentIndex < searches.length;
    
    console.log(`✅ Pesquisa ${currentIndex + 1} completa em ${duration}s`);
    console.log(`📊 Restam ${searches.length - session.currentIndex} pesquisa(s)\n`);
    
    res.json({
      success: true,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      currentSearch: currentIndex + 1,
      totalSearches: searches.length,
      hasMore: hasMore,
      result: searchResult
    });
    
  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para obter status da sessão
app.get('/api/scrape/status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Sessão não encontrada'
    });
  }
  
  res.json({
    success: true,
    sessionId: sessionId,
    currentSearch: session.currentIndex,
    totalSearches: session.searches.length,
    completed: session.currentIndex >= session.searches.length,
    resultsCount: session.results.length,
    createdAt: session.createdAt
  });
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 API PJE Scraper rodando na porta ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM recebido, fechando servidor...');
  process.exit(0);
});
