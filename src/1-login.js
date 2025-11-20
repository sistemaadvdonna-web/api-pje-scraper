import { initBrowser, closeBrowser } from './browser.js';
import { config } from './config.js';
import { askQuestion } from './utils/input.js';
import { saveCookies } from './utils/cookies.js';
import { extractBaseUrl } from './utils/url-extractor.js';

/**
 * Função de login que pode receber o código OTP como parâmetro
 * Se otpCode não for fornecido, solicita via terminal
 * Isso facilita a transformação em API depois
 */
export async function performLoginWithOTP(page, otpCode = null) {
  console.log('🔐 Iniciando login...');
  
  // Navega para a página de login
  await page.goto(config.loginUrl, { waitUntil: 'networkidle2' });
  console.log('✓ Página de login carregada');
  
  // Aguarda os campos estarem visíveis
  await page.waitForSelector(config.selectors.login.usernameField);
  
  // Preenche o formulário
  await page.type(config.selectors.login.usernameField, config.credentials.username);
  await page.type(config.selectors.login.passwordField, config.credentials.password);
  console.log('✓ Credenciais preenchidas');
  
  // Clica no botão de login
  await page.click(config.selectors.login.submitButton);
  console.log('✓ Botão de login clicado');
  
  // Aguarda a página de 2FA carregar
  console.log('\n⏳ Aguardando tela de autenticação de dois fatores...');
  await page.waitForSelector(config.selectors.login.otpField, { timeout: 30000 });
  console.log('✓ Tela de 2FA carregada');
  
  // Se o código OTP não foi fornecido, solicita via terminal
  if (!otpCode) {
    console.log('\n🔑 AUTENTICAÇÃO DE DOIS FATORES NECESSÁRIA');
    otpCode = await askQuestion('Digite o código OTP: ');
  } else {
    console.log('\n🔑 Usando código OTP fornecido');
  }
  
  // Preenche o campo OTP
  await page.type(config.selectors.login.otpField, otpCode);
  console.log('✓ Código OTP inserido');
  
  // Clica no botão de confirmar OTP e aguarda a navegação
  const otpSubmitButton = config.selectors.login.otpSubmitButton || '#kc-login';
  console.log('✓ Clicando no botão de confirmação...');
  
  // Aguarda a navegação que acontece após validar o OTP
  console.log('\n⏳ Aguardando navegação após validação do OTP...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
    page.click(otpSubmitButton)
  ]);
  
  const finalUrlAfterReload = page.url();
  console.log('✅ Login com 2FA realizado com sucesso!');
  console.log('📍 URL final:', finalUrlAfterReload);
  
  return { page, finalUrl: finalUrlAfterReload };
}

// Teste standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🧪 Testando módulo de login com OTP...\n');
  
  const { browser, page } = await initBrowser();
  
  try {
    // Você pode passar o código OTP como argumento: node src/1-login-api-ready.js 123456
    const otpFromArgs = process.argv[2];
    
    const { page: loggedPage, finalUrl } = await performLoginWithOTP(page, otpFromArgs);
    
    // Salva os cookies
    await saveCookies(loggedPage, config.cookiesPath);
    
    // Extrai a URL base e navega
    const baseUrl = extractBaseUrl(finalUrl);
    console.log('\n🔄 Navegando para a URL base do sistema...');
    console.log('📍 URL destino:', baseUrl);
    
    await loggedPage.goto(baseUrl, { waitUntil: 'networkidle2' });
    
    // Aguarda a página estabilizar completamente
    console.log('⏳ Aguardando página estabilizar...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Página principal carregada!');
    
    console.log('\n✅ Teste de login concluído!');
    console.log('📋 Cookies salvos para uso futuro.');
    console.log('✨ Navegador permanecerá aberto. Pressione Ctrl+C para fechar.');
    
    // Mantém o navegador aberto
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    await closeBrowser(browser);
    process.exit(1);
  }
}
