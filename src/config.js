export const config = {
  // URL que será configurada
  loginUrl: 'https://sso.cloud.pje.jus.br/auth/realms/pje/protocol/openid-connect/auth?response_type=code&client_id=pje-tjmg-1g&redirect_uri=https%3A%2F%2Fpje.tjmg.jus.br%2Fpje%2Flogin.seam&state=cdaf0c2e-64d0-43c1-a6e5-b0e5434c5122&login=true&scope=openid',
  targetUrl: '',
  
  // Credenciais
  credentials: {
    username: '09571180661',
    password: 'gpradoslima9099'
  },
  
  // Configurações do Puppeteer
  puppeteerOptions: {
    headless: 'new', // Modo headless moderno
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
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--no-zygote'
    ],
    ignoreDefaultArgs: ['--enable-automation'],
    ignoreHTTPSErrors: true
  },
  
  // Caminho para salvar cookies
  cookiesPath: './cookies.json',
  
  // Seletores
  selectors: {
    login: {
      usernameField: '#username',
      passwordField: '#password',
      submitButton: '#kc-login',
      otpField: '#otp',
      otpSubmitButton: '#kc-login'
    },
    navigation: {
      targetLink: ''
    },
    extraction: {
      dataContainer: '',
      items: []
    }
  },
  
  // Configuração de navegação (Fase 2)
  navigation: {
    actions: [
      {
        type: 'click',
        selector: '#barraSuperiorPrincipal > div > div.navbar-header > ul > li > a',
        description: '1. Abre menu lateral',
        waitTime: 1000
      },
      {
        type: 'click',
        selector: '#menu > div.nivel.nivel-aberto > ul > li:nth-child(2) > a',
        description: '2. Clica no segundo item do menu',
        waitTime: 1000
      },
      {
        type: 'click',
        selector: '#menu > div.nivel.nivel-aberto.nivel-overlay > ul > li:nth-child(2) > div > ul > li:nth-child(4) > a',
        description: '3. Clica no quarto item do submenu',
        waitTime: 1000
      },
      {
        type: 'click',
        selector: '#menu > div.nivel.nivel-aberto.nivel-overlay > ul > li:nth-child(2) > div > ul > li:nth-child(4) > div > ul > li > a',
        description: '4. Clica no item final (muda URL)',
        waitTime: 3000
      },
      {
        type: 'wait',
        time: 2000,
        description: '5. Aguarda página carregar completamente'
      }
    ]
  },
  
  // Configuração de extração (Fase 3)
  extraction: {
    // Campos de entrada (serão preenchidos pelo usuário)
    inputFields: {
      numeroOAB: {
        selector: '#fPP\\:decorationDados\\:numeroOAB',
        required: true,
        description: 'Número OAB (6 dígitos)'
      },
      letraOAB: {
        selector: '#fPP\\:decorationDados\\:letraOAB',
        required: false,
        description: 'Letra OAB (opcional)'
      },
      ufOAB: {
        selector: '#select2-fPP\\:decorationDados\\:ufOABCombo-container',
        type: 'select2',
        required: true,
        description: 'UF da OAB (2 letras)'
      }
    },
    
    // Botão de pesquisar
    searchButton: '#fPP\\:searchProcessos',
    
    // Ações de pesquisa
    search: {
      actions: [
        {
          type: 'type',
          selector: '#fPP\\:decorationDados\\:numeroOAB',
          parameterKey: 'numeroOAB',
          description: 'Digita número OAB'
        },
        {
          type: 'type',
          selector: '#fPP\\:decorationDados\\:letraOAB',
          parameterKey: 'letraOAB',
          description: 'Digita letra OAB (opcional)',
          optional: true
        },
        {
          type: 'select2',
          selector: '#select2-fPP\\:decorationDados\\:ufOABCombo-container',
          parameterKey: 'ufOAB',
          description: 'Seleciona UF da OAB'
        },
        {
          type: 'click',
          selector: '#fPP\\:searchProcessos',
          description: 'Clica no botão pesquisar',
          waitTime: 3000
        },
        {
          type: 'wait',
          time: 2000,
          description: 'Aguarda resultados carregarem'
        }
      ]
    },
    
    // Seletores de extração
    extraction: {
      resultContainer: '#fPP\\:processosTable\\:tb',
      resultItem: 'tr',
      
      // Paginação
      pagination: {
        enabled: true,
        paginationContainer: '#fPP\\:processosTable\\:j_id492 > div.pull-left',
        nextButton: '#fPP\\:processosTable\\:scTabela_table > tbody > tr > td:nth-child(12)',
        lastPageButton: '#fPP\\:processosTable\\:scTabela_table > tbody > tr > td:nth-child(13)',
        firstPageButton: '#fPP\\:processosTable\\:scTabela_table > tbody > tr > td:nth-child(1)',
        maxPages: 1000  // Limite de segurança
      },
      
      fields: [
        // Configurar depois com os campos da tabela
      ]
    },
    
    // Reset (opcional)
    reset: {
      actions: []
    }
  }
};
