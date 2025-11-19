import { initBrowser, closeBrowser } from './browser.js';
import { config } from './config.js';
import { performLoginWithOTP } from './1-login.js';
import { navigateToTarget } from './2-navigation.js';
import { executeNavigationActions } from './2-navigation.js';

/**
 * Executa uma pesquisa com um parâmetro específico
 */
async function performSearch(page, parameters, searchActions) {
  console.log(`\n🔍 Pesquisando com parâmetros:`);
  console.log(`   Número OAB: ${parameters.numeroOAB}`);
  console.log(`   Letra OAB: ${parameters.letraOAB || '(não informado)'}`);
  console.log(`   UF: ${parameters.ufOAB}`);
  
  for (const action of searchActions) {
    try {
      const actionCopy = { ...action };
      
      // Substitui o parâmetro se necessário
      if (actionCopy.parameterKey) {
        actionCopy.text = parameters[actionCopy.parameterKey] || '';
      }
      
      console.log(`  ${actionCopy.description}`);
      await executeAction(page, actionCopy);
      
    } catch (error) {
      console.error(`❌ Erro na ação de pesquisa: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Executa uma ação individual
 */
async function executeAction(page, action) {
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
      // Pula se for opcional e não tiver texto
      if (action.optional && (!action.text || action.text.trim() === '')) {
        console.log('  ⊘ Campo opcional vazio, pulando...');
        return;
      }
      
      await page.waitForSelector(action.selector, { timeout: 30000 });
      await page.click(action.selector, { clickCount: 3 }); // Seleciona tudo
      await page.keyboard.press('Backspace'); // Limpa
      if (action.text && action.text.trim() !== '') {
        await page.type(action.selector, action.text);
      }
      if (action.waitTime) {
        await new Promise(resolve => setTimeout(resolve, action.waitTime));
      }
      break;
      
    case 'select2':
      // Select2 é um dropdown especial
      await page.waitForSelector(action.selector, { timeout: 30000 });
      await page.click(action.selector);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Digita o valor no campo de busca do Select2
      await page.keyboard.type(action.text);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Pressiona Enter para selecionar
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 500));
      break;
      
    case 'wait':
      if (action.selector) {
        await page.waitForSelector(action.selector, { timeout: 30000 });
      } else if (action.time) {
        await new Promise(resolve => setTimeout(resolve, action.time));
      }
      break;
  }
}

/**
 * Extrai dados de uma única página
 */
async function extractPageData(page, extractionConfig) {
  // Aguarda o container de resultados
  await page.waitForSelector(extractionConfig.resultContainer, { timeout: 10000 });
  
  // Extrai os dados
  const data = await page.evaluate((config) => {
    const results = [];
    const container = document.querySelector(config.resultContainer);
    if (!container) return results;
    
    const items = container.querySelectorAll(config.resultItem);
    
    items.forEach((item, index) => {
      // Pula o header da tabela se for tr
      if (item.querySelector('th')) return;
      
      const extractedItem = {};
      
      if (config.fields && config.fields.length > 0) {
        // Extrai campos configurados
        config.fields.forEach(field => {
          const element = item.querySelector(field.selector);
          if (element) {
            if (field.attribute === 'textContent') {
              extractedItem[field.name] = element.textContent.trim();
            } else {
              extractedItem[field.name] = element.getAttribute(field.attribute);
            }
          } else {
            extractedItem[field.name] = null;
          }
        });
      } else {
        // Se não houver campos configurados, extrai todas as células
        const cells = item.querySelectorAll('td');
        cells.forEach((cell, i) => {
          extractedItem[`coluna_${i + 1}`] = cell.textContent.trim();
        });
      }
      
      if (Object.keys(extractedItem).length > 0) {
        results.push(extractedItem);
      }
    });
    
    return results;
  }, extractionConfig);
  
  return data;
}

/**
 * Obtém informações detalhadas da paginação
 */
async function getPaginationInfo(page, paginationContainer) {
  try {
    const info = await page.evaluate((container) => {
      const paginationElement = document.querySelector(container);
      
      if (!paginationElement) {
        return {
          found: false,
          html: 'Container não encontrado',
          pages: [],
          totalPages: 0
        };
      }
      
      // Busca TODOS os elementos dentro do container
      const allElements = paginationElement.querySelectorAll('*');
      const pages = [];
      let maxPage = 0;
      
      allElements.forEach(el => {
        const text = el.textContent.trim();
        const pageNum = parseInt(text);
        
        // Se é um número válido
        if (!isNaN(pageNum) && pageNum > 0 && text === pageNum.toString()) {
          maxPage = Math.max(maxPage, pageNum);
          pages.push({
            number: pageNum,
            tag: el.tagName,
            classes: el.className,
            text: text,
            isLink: el.tagName === 'A',
            isActive: el.classList.contains('ui-state-active') || 
                     el.classList.contains('ui-paginator-page-active') ||
                     el.classList.contains('active')
          });
        }
      });
      
      // Remove duplicatas
      const uniquePages = [];
      const seen = new Set();
      pages.forEach(p => {
        if (!seen.has(p.number)) {
          seen.add(p.number);
          uniquePages.push(p);
        }
      });
      
      return {
        found: true,
        html: paginationElement.innerHTML.substring(0, 500),
        pages: uniquePages.sort((a, b) => a.number - b.number),
        totalPages: maxPage
      };
    }, paginationContainer);
    
    return info;
  } catch (error) {
    console.log(`  ⚠️  Erro ao obter info de paginação: ${error.message}`);
    return { found: false, pages: [], totalPages: 0 };
  }
}

/**
 * Verifica se há próxima página e se ela existe
 */
async function hasNextPage(page, paginationContainer, currentPage) {
  try {
    const info = await page.evaluate((container, current) => {
      const paginationElement = document.querySelector(container);
      if (!paginationElement) return { hasNext: false, totalPages: 0 };
      
      // Busca todos os números de página
      const pageLinks = paginationElement.querySelectorAll('a, span.ui-paginator-page');
      let maxPage = 0;
      let currentPageElement = null;
      
      pageLinks.forEach(link => {
        const text = link.textContent.trim();
        const pageNum = parseInt(text);
        
        if (!isNaN(pageNum) && pageNum > 0) {
          maxPage = Math.max(maxPage, pageNum);
          
          if (link.classList.contains('ui-state-active') || 
              link.classList.contains('ui-paginator-page-active')) {
            currentPageElement = pageNum;
          }
        }
      });
      
      // Verifica botão "próxima"
      const nextButton = paginationElement.querySelector('a.ui-paginator-next, span.ui-paginator-next');
      const nextDisabled = nextButton && (
        nextButton.classList.contains('ui-state-disabled') ||
        nextButton.hasAttribute('disabled') ||
        nextButton.getAttribute('aria-disabled') === 'true'
      );
      
      return {
        hasNext: !nextDisabled && current < maxPage,
        totalPages: maxPage,
        currentPageDetected: currentPageElement
      };
    }, paginationContainer, currentPage);
    
    return info;
  } catch (error) {
    console.log(`  ⚠️  Erro ao verificar próxima página: ${error.message}`);
    return { hasNext: false, totalPages: 0 };
  }
}

/**
 * Clica na próxima página usando evento RichFaces
 */
async function goToNextPage(page, nextButtonSelector) {
  try {
    // Verifica se o botão existe e está habilitado
    const canClick = await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (!button) return false;
      
      // Verifica se está desabilitado
      const isDisabled = button.classList.contains('rich-datascr-button-dsbld') ||
                        button.classList.contains('ui-state-disabled') ||
                        button.hasAttribute('disabled');
      
      return !isDisabled;
    }, nextButtonSelector);
    
    if (!canClick) {
      return false;
    }
    
    // Dispara evento RichFaces para próxima página
    const clicked = await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (!button) return false;
      
      // Tenta disparar evento RichFaces
      if (typeof Event !== 'undefined' && Event.fire) {
        Event.fire(button, 'rich:datascroller:onscroll', {'page': 'fastforward'});
        return true;
      }
      
      // Fallback: clique normal
      button.click();
      return true;
    }, nextButtonSelector);
    
    return clicked;
    
  } catch (error) {
    console.log(`  ⚠️  Erro ao clicar na próxima página: ${error.message}`);
    return false;
  }
}

/**
 * Dispara evento customizado do RichFaces
 */
async function fireRichEvent(page, selector, eventType) {
  return await page.evaluate((sel, type) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    // Dispara o evento customizado do RichFaces
    if (typeof Event !== 'undefined' && Event.fire) {
      Event.fire(element, 'rich:datascroller:onscroll', {'page': type});
      return true;
    }
    
    // Fallback: clica normalmente
    element.click();
    return true;
  }, selector, eventType);
}

/**
 * Obtém o número total de páginas indo até a última
 */
async function getTotalPages(page, lastPageButton, firstPageButton, paginationContainer) {
  console.log('🔍 Descobrindo total de páginas...');
  
  try {
    // 1. FALLBACK: Primeiro vai para a primeira página (garantia de posição)
    console.log('   → [Fallback] Indo para primeira página...');
    try {
      await fireRichEvent(page, firstPageButton, 'first');
      console.log('   ⏳ Aguardando carregamento (3 segundos)...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('   ✓ Posicionado na primeira página');
    } catch (e) {
      console.log('   ⚠️  Botão primeira página não disponível (já está na primeira)');
    }
    
    // 2. Vai para a última página usando evento RichFaces
    console.log('   → Indo para última página (evento RichFaces)...');
    const clicked = await fireRichEvent(page, lastPageButton, 'last');
    
    if (!clicked) {
      console.log('   ⚠️  Erro ao disparar evento, tentando cliques múltiplos...');
      for (let i = 1; i <= 6; i++) {
        await page.click(lastPageButton);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('   ⏳ Aguardando carregamento completo (8 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    console.log('   ✓ Última página carregada');
    
    // 3. Pega o número da última página
    const totalPages = await page.evaluate((container) => {
      const paginationElement = document.querySelector(container);
      if (!paginationElement) return 1;
      
      // Busca todos os números visíveis
      const allElements = paginationElement.querySelectorAll('td');
      let maxPage = 1;
      
      allElements.forEach(el => {
        const text = el.textContent.trim();
        const pageNum = parseInt(text);
        if (!isNaN(pageNum) && pageNum > 0 && text === pageNum.toString()) {
          maxPage = Math.max(maxPage, pageNum);
        }
      });
      
      return maxPage;
    }, paginationContainer);
    
    console.log(`   ✓ Total de páginas detectado: ${totalPages}`);
    
    // 4. Volta para a primeira página
    console.log('   → Voltando para a primeira página...');
    await fireRichEvent(page, firstPageButton, 'first');
    console.log('   ⏳ Aguardando carregamento (5 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('   ✓ Pronto para iniciar scraping da página 1\n');
    
    return totalPages;
    
  } catch (error) {
    console.log(`   ⚠️  Erro ao descobrir total de páginas: ${error.message}`);
    console.log('   → Usando detecção padrão\n');
    return 1;
  }
}

/**
 * Extrai dados com paginação
 */
async function extractResults(page, extractionConfig) {
  console.log('📊 Extraindo resultados...\n');
  
  const allData = [];
  let currentPage = 1;
  
  // Verifica se paginação está habilitada
  if (!extractionConfig.pagination || !extractionConfig.pagination.enabled) {
    const data = await extractPageData(page, extractionConfig);
    console.log(`✓ ${data.length} itens extraídos`);
    return data;
  }
  
  // Descobre o total de páginas indo até a última
  const totalPages = await getTotalPages(
    page,
    extractionConfig.pagination.lastPageButton,
    extractionConfig.pagination.firstPageButton,
    extractionConfig.pagination.paginationContainer
  );
  
  if (totalPages === 0 || totalPages === 1) {
    console.log('⚠️  Apenas 1 página detectada, extraindo página única\n');
    const data = await extractPageData(page, extractionConfig);
    console.log(`✓ ${data.length} itens extraídos`);
    return data;
  }
  
  const maxPages = Math.min(
    extractionConfig.pagination.maxPages || 100,
    totalPages
  );
  
  console.log(`📋 Iniciando extração de ${maxPages} página(s)...\n`);
  
  // Loop de extração
  while (currentPage <= maxPages) {
    console.log(`${'─'.repeat(50)}`);
    console.log(`📄 PÁGINA ${currentPage} de ${maxPages}`);
    console.log(`${'─'.repeat(50)}`);
    
    // Extrai dados da página atual
    const pageData = await extractPageData(page, extractionConfig);
    console.log(`✓ ${pageData.length} itens extraídos desta página`);
    
    // Log dos primeiros 2 itens para conferência
    if (pageData.length > 0) {
      console.log('\n📋 Amostra dos dados extraídos:');
      pageData.slice(0, 2).forEach((item, i) => {
        console.log(`   Item ${i + 1}:`, JSON.stringify(item).substring(0, 150) + '...');
      });
    }
    
    allData.push(...pageData);
    console.log(`📊 Total acumulado: ${allData.length} itens\n`);
    
    // Se não extraiu nada e não é a primeira página, para
    if (pageData.length === 0 && currentPage > 1) {
      console.log('⚠️  Nenhum dado encontrado, parando extração\n');
      break;
    }
    
    // Se chegou na última página, para
    if (currentPage >= maxPages) {
      console.log(`✅ Última página alcançada (${currentPage}/${maxPages})\n`);
      break;
    }
    
    // Tenta ir para próxima página
    console.log(`→ Tentando navegar para página ${currentPage + 1}...`);
    const clicked = await goToNextPage(page, extractionConfig.pagination.nextButton);
    
    if (!clicked) {
      console.log('⚠️  Botão de próxima página não disponível ou desabilitado\n');
      break;
    }
    
    console.log('✓ Clique realizado, aguardando carregamento...');
    
    // Aguarda a tabela atualizar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verifica se a tabela ainda existe
    try {
      await page.waitForSelector(extractionConfig.resultContainer, { timeout: 10000 });
      console.log('✓ Próxima página carregada\n');
    } catch (error) {
      console.log('⚠️  Timeout ao aguardar próxima página\n');
      break;
    }
    
    currentPage++;
  }
  
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ EXTRAÇÃO COMPLETA`);
  console.log(`   Total de páginas processadas: ${currentPage}`);
  console.log(`   Total de itens extraídos: ${allData.length}`);
  console.log(`${'='.repeat(50)}\n`);
  
  return allData;
}

/**
 * Reseta a busca para a próxima pesquisa
 */
async function resetSearch(page, resetActions) {
  if (!resetActions || resetActions.length === 0) return;
  
  console.log('🔄 Resetando busca...');
  
  for (const action of resetActions) {
    await executeAction(page, action);
  }
}

/**
 * Função principal de extração com loop
 */
export async function extractDataWithLoop(page, parametersList) {
  const allResults = [];
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 INICIANDO EXTRAÇÃO PARA ${parametersList.length} PESQUISA(S)`);
  console.log('='.repeat(60));
  
  for (let i = 0; i < parametersList.length; i++) {
    const parameters = parametersList[i];
    
    console.log(`\n[${i + 1}/${parametersList.length}] Processando pesquisa ${i + 1}`);
    
    try {
      // 1. Realiza a pesquisa
      await performSearch(page, parameters, config.extraction.search.actions);
      
      // 2. Extrai os resultados (se configurado)
      let results = [];
      if (config.extraction.extraction.resultContainer) {
        results = await extractResults(page, config.extraction.extraction);
      } else {
        console.log('⚠️  Extração de dados não configurada ainda');
      }
      
      // 3. Salva os resultados
      allResults.push({
        parameters: parameters,
        success: true,
        count: results.length,
        data: results
      });
      
      console.log(`✅ Sucesso: ${results.length} resultados encontrados`);
      
      // 4. Reset para próxima pesquisa (se configurado)
      if (config.extraction.reset && config.extraction.reset.actions.length > 0 && i < parametersList.length - 1) {
        await resetSearch(page, config.extraction.reset.actions);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar: ${error.message}`);
      allResults.push({
        parameters: parameters,
        success: false,
        error: error.message,
        count: 0,
        data: []
      });
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ EXTRAÇÃO COMPLETA');
  console.log('='.repeat(60));
  
  return {
    timestamp: new Date().toISOString(),
    totalSearches: parametersList.length,
    successCount: allResults.filter(r => r.success).length,
    results: allResults
  };
}

/**
 * Função legada - mantida para compatibilidade
 */
export async function extractData(page) {
  console.log('📊 Extraindo dados...');
  
  if (config.extraction && config.extraction.testParameters) {
    return await extractDataWithLoop(page, config.extraction.testParameters);
  }
  
  // Fallback para método antigo
  await page.waitForSelector(config.selectors.extraction.dataContainer);
  const data = await page.evaluate((selectors) => {
    const results = [];
    const items = document.querySelectorAll(selectors.dataContainer);
    
    items.forEach(item => {
      const extractedItem = {};
      selectors.items.forEach(field => {
        const element = item.querySelector(field.selector);
        extractedItem[field.name] = element ? element.textContent.trim() : null;
      });
      results.push(extractedItem);
    });
    
    return results;
  }, config.selectors.extraction);
  
  console.log(`✓ ${data.length} itens extraídos`);
  return data;
}

// Teste standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando módulo de extração...\n');
  
  const { browser, page } = await initBrowser();
  
  try {
    const { page: loggedPage } = await performLoginWithOTP(page);
    await navigateToTarget(loggedPage);
    const data = await extractData(loggedPage);
    
    console.log('\n📋 Dados extraídos:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n✅ Teste de extração concluído!');
    
    await closeBrowser(browser);
  } catch (error) {
    console.error('❌ Erro na extração:', error.message);
    await closeBrowser(browser);
  }
}
