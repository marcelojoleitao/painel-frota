/**
 * ============================================================
 *  PAINEL DA FROTA — 16ª SPRF/CE
 *  Web App de consulta gerencial da frota (somente leitura)
 *
 *  Fonte: planilha "Frota 16ª SPRF - Gestão"
 *    - ConsultaBD  : cadastro da frota (uma linha por viatura)
 *    - AbastBD     : transações de abastecimento (GoodManager)
 *    - ManutBD     : transações de manutenção (GoodManager)
 *    - Gestores    : contatos por unidade
 *  Login: planilha SGP (col. B = e-mail, col. G = matrícula)
 *
 *  Nada é gravado em lugar nenhum. O app só lê.
 *  Arquivos: Codigo.gs | App.html | Login.html | Estilos.html | Scripts.html
 * ============================================================
 */

/** Versão deste arquivo — o painel compara com a versão da interface. */
const CODIGO_VERSAO = '2.88.4';

const CONFIG = {
  ID_BASE:        '1w2K4UNAmMY_2WCTlyNdmj-b7AEgvBiW0wxW_1PPa6a8',
  ABA_BASE:       'ConsultaBD',
  ABA_GESTORES:   'Gestores',
  ABA_ABAST:      'AbastBD',
  ABA_MANUT:      'ManutBD',

  // Login
  ID_LOGIN:       '1hjw3_XM7qglPGBabhQeba8KGhK2p-MR1l9rtzVEGG_k',
  ABA_LOGIN:      'SGP',
  COL_LOGIN_MATR:  2,   // B  MATRÍCULA
  COL_LOGIN_NOME:  3,   // C  SERVIDORES
  COL_LOGIN_LOT:   6,   // F  LOTAÇÃO ATUAL
  COL_LOGIN_EMAIL: 7,   // G  E-MAIL
  ADMINS:         ['marcelo.leitao@prf.gov.br', 'luciano.savi@prf.gov.br'],
  SESSAO_SEG:     6 * 3600,

  // Ordens de serviço (planilha base). Se o nome não bater, o app procura pelo cabeçalho.
  ABA_OS_PENDENTES: 'OS',
  ABA_OS_ACEITES:   'Aceites',
  ABA_SOLICITACOES: 'Desfazimento',   // solicitações de prefeituras (Processo | Data Ofício | Município)

  // PDFs de ordens de serviço (pasta raiz; subpastas são varridas)
  PASTA_OS_PDF: '1epJ-keipHjLW8opRhWKbRZbQoBtWxLR4',

  // Pagamentos (títulos Ticket Log)
  ID_TITULOS:     '1qbyt1iCKP8dvZFDTmA3Zk-UHHdYYugDeO12WyJYGKYM',
  ABA_TIT_ABAST:  'Títulos Abast.',
  ABA_TIT_MANUT:  'Títulos Manut.',
  COLS_TIT_ABAST: 18,   // A:R (até Chave de Acesso)
  COLS_TIT_MANUT: 19,   // A:S (até Chave de Acesso)
  // Multas (planilha de acompanhamento dos processos)
  ID_MULTAS: '12gJWTsSfj_TqIAFvlrqsLUpBf2qMlZ9xXmgodA2fVDc',
  // Antes de 2024 não havia gestão do acompanhamento — os registros ficam de fora
  MULTAS_ANO_INICIAL: 2024,
  PASTA_DEFESAS: '1bJVCw-Lkvfi3dyNPHEP6tC9tymAbbZML',
  // Mesma pasta guarda os modelos das defesas e os do processo de pagamento
  PASTA_MODELOS_MULTAS: '1MDuD2wfSBuealux2lVoVTlFpq-BOPNrS',
  PASTA_MODELOS_PAGAMENTO: '1MDuD2wfSBuealux2lVoVTlFpq-BOPNrS',
  // PDFs das notas fiscais importadas (um por competência e tipo)
  PASTA_NOTAS_FISCAIS: '1f4lCVwDVkii42XvvfxBCNI-XzfB6wPcZ',

  // Processo de pagamento
  ABA_CONTROLE_PROC: 'ControleProcesso',        // criada na planilha de títulos
  PASTA_DOCS_PAGAMENTO: '1bJVCw-Lkvfi3dyNPHEP6tC9tymAbbZML',
  MODELOS_PAGAMENTO: {
    Abastecimento: {
      'Despacho Abastecimento':       '1efYsQ04Em9qQsZiDvmkifnQ6bpjhoJTnzKepUTHzIpc',
      'Relatório Abastecimento':      '1BWOogwcClGUCA8sSmBS-W4Zpe8IPwwHzgg_wwEXyBCQ',
      'Termo de Atesto Abastecimento':'1NpsEL3SeZVRBjUYHkKZkH74xElanm0J-pwmvyXIHfQk'
    },
    'Manutenção': {
      'Despacho Manutenção':        '13eUxk7pFbhYlJrML_KQjX0C1pe3hiUnfMmQIVtNl52Q',
      'Relatório Manutenção':       '1kzhNdkapDvPZuO40VB6wqt5qkMl-MU66qsz1oGshfTA',
      'Termo de Atesto Manutenção': '1PjtECC-WhtBeWrYnHhfVRc5OmrHYEwCbB0zUf5SzyAI'
    }
  },

  STATUS_OCULTOS_PADRAO: ['ALIENADO'],
  CACHE_SEG: 3600,        // 1 h (máximo do CacheService: 6 h). Use instalarGatilho() para manter aquecido.

  // Edição (somente ADMINS): coluna bloqueada se tiver fórmula nas linhas de
  // verificação ou fundo nessas cores (azul = fórmula, cinza = preenchida por script)
  EDICAO_CORES_BLOQUEADAS: ['#cfe2f3', '#e8e8e8'],
  EDICAO_LINHAS_VERIFICACAO: [2, 3],
  EDICAO_OBRIGATORIOS: ['placa', 'modelo', 'tipo', 'categoria', 'especie', 'cor', 'comb', 'anoFab', 'anoMod', 'chassi', 'renavam', 'blind', 'carac'],

  // As seis colunas de link (fotos, CRLV e termo de tombamento) são pintadas
  // porque um script as preenche. O painel passa a ser mais um desses scripts,
  // então só elas ficam liberadas apesar da cor. Todo o resto segue a regra
  // normal: fórmula ou cor = bloqueado.
  EDICAO_EXCECOES: ['fotoFD', 'fotoLE', 'fotoTR', 'fotoLD', 'linkCrlv', 'linkTomb'],

  // Fotos das viaturas (mesma pasta do consultas_detran.py)
  PASTA_FOTOS: '1RXE1xx0GPYZhtZAuWArmU9z7RVueOcUT',
  // CRLVs baixados/anexados (mesma pasta do consultas_detran.py)
  PASTA_CRLV: '1RAs2cZEE4MzQJHKRiYKZFLefYrQcSAcC',
  // Termos de tombamento (vazio = usa a pasta dos CRLVs)
  PASTA_TOMBAMENTO: '',
  // Registro das ações executadas pelo painel (aba criada automaticamente na planilha base)
  ABA_LOG: 'LogAcoes',
  // Fila de ações que dependem do DETRAN (executadas pelo trabalhador Python local)
  ABA_FILA: 'FilaAcoes',
  // Importação (arquivos .xlsx do GoodManager/Ticket Log)
  DEST_COLS: 40,          // AbastBD e ManutBD gravam A:AN

  // Demais destinos de importação (herdados do importador da planilha)
  // DetalhamentoDB, AceitesDB e OrçamentosDB passaram para a planilha-mãe.
  // Este ID fica só para a migração inicial (migrarDadosManutencao).
  ID_MANUT_ANTIGA: '1WpI_krrzyB65lfN6lYZHr9aD1-x0cSUg_g61xGgvNrk',
  ABA_DETALHE:    'DetalhamentoDB',
  ABA_ORCAMENTOS: 'OrçamentosDB',
  // abas auxiliares citadas pelas fórmulas das bases (migram junto)
  ABAS_AUX_MANUT: ['Glosa'],
  ABA_ACIDENTES:  'Acidentes',   // na planilha-mãe: col B = placa, col C vazia = processo em aberto
  ABA_ACEITES:    'AceitesDB',

  // Glosa de preços: tudo passa a viver na planilha-mãe (abas criadas pela migração)
  ABA_ANP:          'HistoricoANP',
  ABA_RESUMO_GLOSA: 'ResumoGlosa',
  ID_GLOSA_ANTIGA:  '1VRF3ulO6Z0c0WwyPCwN5dLGWjPiSuTEmEQ7eqXwEaNc',   // só para a migração inicial
  // Brasão no cabeçalho dos relatórios: ID de uma imagem no Drive (vazio = emblema desenhado)
  LOGO_DRIVE_ID:    '',
  // Pasta onde os relatórios em PDF são salvos (vazio = raiz do Drive)
  PASTA_RELATORIOS: '',
  URL_GLOSA_ANP:  'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-estados-desde-jan2013.xlsx',
  CHAVE_NF:       'nacional',   // 'nacional' ou 'municipal'

  // DETRAN-CE — Central de Serviços
  DETRAN_BASE: 'https://sistemas.detran.ce.gov.br/central',

  TITULO: 'Painel da Frota — 16ª SPRF/CE',
  FUSO: 'America/Fortaleza'
};

/* ------------------------------------------------------------ */
/*  Entrada do Web App                                           */
/* ------------------------------------------------------------ */

/**
 * Origem do HTML:
 *   'github' — App/Login/Estilos/Scripts vêm do repositório (cache de 5 min).
 *              Push no GitHub = painel atualizado, sem tocar no editor.
 *   'local'  — usa os arquivos deste projeto (reserva).
 * A troca também pode ser feita sem editar código:
 * propriedade de script HTML_ORIGEM = github | local.
 */
const HTML_ORIGEM_PADRAO = 'github';
const HTML_CACHE_SEG = 300;

function doGet() {
  // Monta a página por substituição direta — não depende do motor de templates,
  // que não processa scriptlets de conteúdo carregado em tempo de execução.
  let pagina = _arquivoHtml_('App');
  pagina = pagina.replace(/<\?=\s*titulo\s*\?>/g, CONFIG.TITULO);
  pagina = pagina.replace(/<\?!=\s*incluir\(\s*'([^']+)'\s*\);?\s*\?>/g, function (m, nome) { return _arquivoHtml_(nome); });
  // carimbo escrito pelo servidor: aparece mesmo que o JavaScript falhe
  Logger.log('doGet: ' + pagina.length + ' caracteres servidos (o código do painel vai à parte).');
  // O código do painel não vem mais dentro da página, então a versão da
  // interface é lida do VERSAO.txt; se a leitura falhar, usamos a do servidor,
  // que é sempre conhecida — nunca mais "v?".
  let v = CODIGO_VERSAO;
  try {
    const t = _baixarDoGitHub_('VERSAO.txt');
    if (t && /^\d+\.\d+/.test(String(t).trim())) v = String(t).trim();
  } catch (e) { Logger.log('Versão da interface não lida: ' + e); }
  const naPagina = (pagina.match(/VERSAO_PAINEL\s*=\s*'([^']+)'/) || [])[1];
  if (naPagina) v = naPagina;
  const origem = (PropertiesService.getScriptProperties().getProperty('HTML_ORIGEM') || HTML_ORIGEM_PADRAO) === 'github' ? 'GitHub' : 'projeto';
  pagina = pagina.replace(/\{\{VERSAO\}\}/g, 'v' + v + ' — ' + origem);
  return HtmlService.createHtmlOutput(pagina)
    .setTitle(CONFIG.TITULO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function incluir(nome) {
  return _arquivoHtml_(nome);
}

/**
 * Devolve o corpo do Scripts.html (sem as marcas <script>) para o navegador injetar.
 * A página do Apps Script tem um teto de tamanho; mandar o código por aqui evita
 * que ele chegue cortado — sintoma antigo: "Missing } in template expression".
 */
function obterScriptsJs() {
  const html = _arquivoHtml_('Scripts');
  const ini = html.indexOf('<script>');
  const fim = html.lastIndexOf('<\/script>');
  const js = (ini >= 0 && fim > ini) ? html.substring(ini + 8, fim) : html;
  Logger.log('obterScriptsJs: ' + js.length + ' caracteres enviados ao navegador.');
  return js;
}

function _arquivoHtml_(nome) {
  const origem = PropertiesService.getScriptProperties().getProperty('HTML_ORIGEM') || HTML_ORIGEM_PADRAO;
  if (origem === 'github') {
    try {
      const texto = _baixarDoGitHub_(nome + '.html');
      if (texto !== null && texto.length > 50) return texto;
      Logger.log('HTML ' + nome + ' não encontrado no GitHub; usando arquivo local.');
    } catch (e) { Logger.log('GitHub indisponível para ' + nome + ' (' + e + '); usando arquivo local.'); }
  }
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/**
 * Sem cache por decisão: o HTML é buscado inteiro a cada carregamento.
 * O cache fatiado que existia aqui servia arquivos truncados quando o Scripts
 * passou de 100 KB, e um script cortado derruba a página inteira.
 * Custo atual: ~1 s por carregamento. Mantido assim por ser previsível.
 */
function limparCacheHtml() {
  return 'Não há mais cache de HTML — cada carregamento busca o GitHub direto.';
}

/** Diz exatamente o que está sendo servido em cada arquivo — rode no editor. */
function diagnosticarHtml() {
  const origem = PropertiesService.getScriptProperties().getProperty('HTML_ORIGEM') || HTML_ORIGEM_PADRAO;
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '';
  Logger.log('Origem: ' + origem + ' | token: ' + (token ? 'presente (' + token.length + ' caracteres)' : 'AUSENTE'));
  limparCacheHtml();
  ['App', 'Login', 'Estilos', 'Scripts'].forEach(nome => {
    let doGitHub = null;
    try { doGitHub = _baixarDoGitHub_(nome + '.html'); } catch (e) { Logger.log(nome + ': GitHub falhou — ' + e); }
    const local = HtmlService.createHtmlOutputFromFile(nome).getContent();
    const servido = _arquivoHtml_(nome);
    const versao = (servido.match(/VERSAO_PAINEL\s*=\s*'([^']+)'/) || [])[1];
    Logger.log(nome + ': GitHub ' + (doGitHub === null ? 'INDISPONÍVEL' : doGitHub.length + ' car.') +
      ' | local ' + local.length + ' car. | servido ' + servido.length + ' car. → ' +
      (doGitHub !== null && servido.length === doGitHub.length ? 'GITHUB' : 'LOCAL') +
      (versao ? ' | versão ' + versao : ''));
  });
  limparCacheHtml();
}

/* ------------------------------------------------------------ */
/*  LOGIN / SESSÃO                                               */
/* ------------------------------------------------------------ */

function login(email, matricula) {
  email = String(email || '').trim().toLowerCase();
  matricula = String(matricula || '').replace(/\D/g, '');
  if (!email || !matricula) return { ok: false, erro: 'Informe e-mail e matrícula.' };

  let usuarios;
  try { usuarios = _lerUsuarios_(); }
  catch (e) { return { ok: false, erro: 'Não foi possível ler a base de acesso (SGP): ' + e.message }; }

  email = _limparEmail_(email);
  const u = usuarios.find(x => x.email === email);
  if (!u) return { ok: false, erro: 'E-mail não encontrado na base SGP.' };
  if (u.matricula !== matricula) return { ok: false, erro: 'Matrícula não confere com o e-mail informado.' };

  const token = Utilities.getUuid();
  const sessao = { email: email, nome: u.nome, lotacao: u.lotacao, admin: CONFIG.ADMINS.indexOf(email) >= 0, criadoEm: Date.now() };
  CacheService.getScriptCache().put('sessao_' + token, JSON.stringify(sessao), CONFIG.SESSAO_SEG);
  return { ok: true, token: token, usuario: { email: email, nome: u.nome, lotacao: u.lotacao, admin: sessao.admin } };
}

function sair(token) {
  if (token) CacheService.getScriptCache().remove('sessao_' + token);
  return { ok: true };
}

function _sessao_(token) {
  if (!token) return null;
  const s = CacheService.getScriptCache().get('sessao_' + token);
  if (!s) return null;
  CacheService.getScriptCache().put('sessao_' + token, s, CONFIG.SESSAO_SEG);   // renova a validade
  return JSON.parse(s);
}

function _lerUsuarios_() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_LOGIN);
  const aba = ss.getSheetByName(CONFIG.ABA_LOGIN);
  if (!aba) throw new Error('aba "' + CONFIG.ABA_LOGIN + '" não encontrada');
  const nCols = Math.max(CONFIG.COL_LOGIN_EMAIL, CONFIG.COL_LOGIN_MATR, CONFIG.COL_LOGIN_NOME, CONFIG.COL_LOGIN_LOT);
  const valores = aba.getRange(1, 1, aba.getLastRow(), nCols).getValues();
  const saida = [];
  valores.forEach(l => {
    const email = _limparEmail_(l[CONFIG.COL_LOGIN_EMAIL - 1]);
    const matr  = String(l[CONFIG.COL_LOGIN_MATR - 1] || '').replace(/\.0$/, '').replace(/\D/g, '');
    if (email.indexOf('@') > 0 && matr) {
      saida.push({ email: email, matricula: matr, nome: String(l[CONFIG.COL_LOGIN_NOME - 1] || '').trim(), lotacao: String(l[CONFIG.COL_LOGIN_LOT - 1] || '').trim() });
    }
  });
  return saida;
}

/** Remove espaços, "<", ">" e outros restos de colagem; aceita "@prf.gov.b" (erro de digitação na SGP). */
function _limparEmail_(v) {
  let e = String(v || '').trim().toLowerCase().replace(/[^a-z0-9.@_\-]/g, '');
  if (/@prf\.gov\.b$/.test(e)) e += 'r';
  return e;
}

/* ------------------------------------------------------------ */
/*  API — cadastro da frota                                      */
/* ------------------------------------------------------------ */

function carregarDados(token, forcarAtualizacao) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };

  const chave = 'painel_frota_v2';
  let payload = (!forcarAtualizacao && CONFIG.CACHE_SEG > 0) ? _cacheLer_(chave) : null;
  if (!payload) {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    payload = {
      veiculos:     _lerVeiculos_(ss),
      gestores:     _lerGestores_(ss),
      os:           _lerOS_(ss),
      solicitacoes: _lerSolicitacoes_(ss),
      pdfsOS:       _indexarPdfsOS_(),
      titulos:      _lerTitulos_(),
      datasFotos:   _datasFotos_(null),
      meta: {
        atualizadoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm'),
        statusOcultosPadrao: CONFIG.STATUS_OCULTOS_PADRAO,
        versaoCodigo: CODIGO_VERSAO,
        pgfAtualizado: _pgfAtualizado_(),
        fipeAtualizado: _fipeAtualizado_()
      }
    };
    if (CONFIG.CACHE_SEG > 0) _cacheGravar_(chave, payload, CONFIG.CACHE_SEG);
    payload.meta.doCache = false;
  } else payload.meta.doCache = true;

  payload.usuario = { email: sessao.email, nome: sessao.nome || '', lotacao: sessao.lotacao || '', admin: !!sessao.admin };
  payload.meta.versaoCodigo = CODIGO_VERSAO;   // mesmo vindo do cache, informa a versão em execução
  payload.meta.pgfAtualizado = _pgfAtualizado_();
  payload.meta.fipeAtualizado = _fipeAtualizado_();
  if (!sessao.admin) { payload.solicitacoes = []; payload.edicao = null; }
  else {
    try {
      payload.edicao = _mapaEdicao_(SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE)).lista;
      payload.edicaoObrigatorios = CONFIG.EDICAO_OBRIGATORIOS;
      payload.fotosHabilitadas = !!CONFIG.PASTA_FOTOS;
    }
    catch (e) { payload.edicao = null; Logger.log('Mapa de edição: ' + e); }
  }
  return payload;
}

/* ------------------------------------------------------------ */
/*  API — abastecimento e manutenção (carga sob demanda)         */
/* ------------------------------------------------------------ */

function carregarUso(token, forcarAtualizacao) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };

  const chave = 'painel_uso_v2';
  let payload = (!forcarAtualizacao && CONFIG.CACHE_SEG > 0) ? _cacheLer_(chave) : null;
  if (!payload) {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const ab = _lerAbastecimento_(ss);
    const ma = _lerManutencao_(ss);
    payload = {
      abast: ab.mensal, abastAlertas: ab.alertas, postos: ab.postos,
      manut: ma.lista,
      meta: {
        abastLinhas: ab.linhas, abastDe: ab.de, abastAte: ab.ate,
        manutLinhas: ma.linhas, manutDe: ma.de, manutAte: ma.ate,
        atualizadoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm')
      }
    };
    if (CONFIG.CACHE_SEG > 0) _cacheGravar_(chave, payload, CONFIG.CACHE_SEG);
  }
  return payload;
}

/**
 * AbastBD → agregado por placa × mês + alertas por transação + postos.
 * Colunas usadas (por nome): DATA TRANSACAO, PLACA, LITROS, HODOMETRO OU HORIMETRO,
 * KM RODADOS OU HORAS TRABALHADAS, KM/LITRO OU LITROS/HORA, VALOR EMISSAO, TIPO COMBUSTIVEL,
 * NOME ESTABELECIMENTO, CIDADE, UF, NOME MOTORISTA, SERVICO
 */
function _lerAbastecimento_(ss) {
  const tab = _abaTransacoes_(ss, CONFIG.ABA_ABAST, ['PLACA', 'LITROS', 'VALOR EMISSAO']);
  const vazio = { mensal: [], alertas: [], postos: [], linhas: 0, de: '', ate: '' };
  if (!tab) return vazio;
  const { valores, cab } = tab;
  const c = nome => cab.indexOf(nome);
  const iData = c('DATA TRANSACAO'), iPlaca = c('PLACA'), iLit = c('LITROS'),
        iOdo = c('HODOMETRO OU HORIMETRO'), iKm = c('KM RODADOS OU HORAS TRABALHADAS'),
        iKmL = c('KM/LITRO OU LITROS/HORA'), iVal = c('VALOR EMISSAO'), iComb = c('TIPO COMBUSTIVEL'),
        iEst = c('NOME ESTABELECIMENTO'), iCid = c('CIDADE'), iUf = c('UF'), iMot = c('NOME MOTORISTA');

  const mensal = {}, postos = {}, alertas = [];
  const porPlaca = {};
  let linhas = 0, de = '', ate = '';

  for (let r = tab.inicio; r < valores.length; r++) {
    const l = valores[r];
    const placa = String(l[iPlaca] || '').trim().toUpperCase();
    if (!placa) continue;
    const dia = _diaISO_(l[iData]);
    if (!dia) continue;
    const valor = _num_(l[iVal]) || 0;
    linhas++;
    const mes = dia.substring(0, 7);
    if (!de || dia < de) de = dia;
    if (!ate || dia > ate) ate = dia;
    const litros = _num_(l[iLit]) || 0, km = _num_(l[iKm]) || 0, odo = _num_(l[iOdo]) || 0,
          kml = _num_(l[iKmL]) || 0, comb = String(l[iComb] || '').trim().toUpperCase() || 'N/I';

    const k = placa + '|' + mes;
    const a = mensal[k] || (mensal[k] = { p: placa, m: mes, v: 0, l: 0, km: 0, q: 0, oMin: null, oMax: null, c: {} });
    a.v += valor; a.l += litros; a.km += km; a.q++;
    if (odo > 0) { a.oMin = a.oMin === null ? odo : Math.min(a.oMin, odo); a.oMax = a.oMax === null ? odo : Math.max(a.oMax, odo); }
    a.c[comb] = (a.c[comb] || 0) + litros;

    const est = String(l[iEst] || '').trim();
    if (est) {
      const pk = est + '|' + String(l[iCid] || '').trim();
      const po = postos[pk] || (postos[pk] = { nome: est, cid: String(l[iCid] || '').trim(), uf: String(l[iUf] || '').trim(), v: 0, q: 0 });
      po.v += valor; po.q++;
    }

    // ---- alertas por transação
    const uf = String(l[iUf] || '').trim().toUpperCase();
    const mot = String(l[iMot] || '').trim();
    if (km > 0 && litros > 0) {
      const c2 = kml || km / litros;
      if (c2 < 3) alertas.push({ p: placa, d: dia, t: 'CONSUMO BAIXO', det: c2.toFixed(1) + ' km/l (' + km + ' km / ' + litros + ' l)', v: valor, mot: mot });
      else if (c2 > 25) alertas.push({ p: placa, d: dia, t: 'CONSUMO ALTO', det: c2.toFixed(1) + ' km/l (' + km + ' km / ' + litros + ' l)', v: valor, mot: mot });
    }
    if (litros > 100) alertas.push({ p: placa, d: dia, t: 'VOLUME ALTO', det: litros + ' litros em um abastecimento', v: valor, mot: mot });
    if (uf && uf !== 'CE') alertas.push({ p: placa, d: dia, t: 'FORA DO CE', det: String(l[iCid] || '').trim() + '/' + uf + ' — ' + est, v: valor, mot: mot });
    if (odo > 0) {
      const ant = porPlaca[placa];
      if (ant && dia >= ant.dia && odo < ant.odo - 50) alertas.push({ p: placa, d: dia, t: 'ODÔMETRO RETROATIVO', det: 'informado ' + odo + ' km, anterior ' + ant.odo + ' km em ' + _brDia_(ant.dia), v: valor, mot: mot });
      if (!ant || dia >= ant.dia) porPlaca[placa] = { dia: dia, odo: odo };
    }
  }

  const listaMensal = Object.values(mensal).map(a => {
    a.v = _r2_(a.v); a.l = _r2_(a.l);
    a.comb = Object.keys(a.c).sort((x, y) => a.c[y] - a.c[x])[0] || 'N/I';
    delete a.c;
    return a;
  });
  const listaPostos = Object.values(postos).map(p => { p.v = _r2_(p.v); return p; }).sort((x, y) => y.v - x.v).slice(0, 40);
  alertas.sort((x, y) => y.d.localeCompare(x.d));
  return { mensal: listaMensal, alertas: alertas.slice(0, 600), postos: listaPostos, linhas: linhas, de: de, ate: ate };
}

/**
 * ManutBD → uma linha enxuta por transação.
 * Colunas: DATA TRANSACAO, PLACA, VALOR EMISSAO, NOME ESTABELECIMENTO, TIPO ESTABELECIMENTO,
 * CIDADE, UF, HODOMETRO OU HORIMETRO, NOME MOTORISTA, INFORMACAO ADIDIONAL 2 (unidade), SERVICO,
 * ACIDENTE, COMPETÊNCIA
 */
function _lerManutencao_(ss) {
  const tab = _abaTransacoes_(ss, CONFIG.ABA_MANUT, ['PLACA', 'VALOR EMISSAO', 'NOME ESTABELECIMENTO']);
  const vazio = { lista: [], linhas: 0, de: '', ate: '' };
  if (!tab) return vazio;
  const { valores, cab } = tab;
  const c = nome => cab.indexOf(nome);
  const iData = c('DATA TRANSACAO'), iPlaca = c('PLACA'), iVal = c('VALOR EMISSAO'), iEst = c('NOME ESTABELECIMENTO'),
        iTipo = c('TIPO ESTABELECIMENTO'), iCid = c('CIDADE'), iUf = c('UF'), iOdo = c('HODOMETRO OU HORIMETRO'),
        iUni = c('INFORMACAO ADIDIONAL 2'),
        iAcid = c('ACIDENTE'), iComp = c('COMPETÊNCIA');
  const lista = []; let de = '', ate = '';
  for (let r = tab.inicio; r < valores.length; r++) {
    const l = valores[r];
    const placa = String(l[iPlaca] || '').trim().toUpperCase();
    if (!placa) continue;
    let dia = _diaISO_(l[iData]);
    if (!dia && iComp >= 0) { const m = String(l[iComp] || '').match(/(\d{1,2})\/(\d{4})/); if (m) dia = m[2] + '-' + ('0' + m[1]).slice(-2) + '-01'; }
    if (!dia) continue;
    const valor = _num_(l[iVal]) || 0;
    if (!de || dia < de) de = dia;
    if (!ate || dia > ate) ate = dia;
    lista.push({
      d: dia, p: placa, v: _r2_(valor),
      ofi: String(l[iEst] || '').trim(), te: String(l[iTipo] || '').trim().toUpperCase() || 'N/I',
      cid: String(l[iCid] || '').trim(), uf: String(l[iUf] || '').trim().toUpperCase(),
      odo: _num_(l[iOdo]) || 0,
      uni: iUni >= 0 ? String(l[iUni] || '').trim().toUpperCase() : '',
      acid: iAcid >= 0 && /sim|x|acid/i.test(String(l[iAcid] || '')) ? 1 : 0
    });
  }
  lista.sort((a, b) => b.d.localeCompare(a.d));
  return { lista: lista, linhas: lista.length, de: de, ate: ate };
}

/** Aba de transações do GoodManager: acha a linha de cabeçalho nas 5 primeiras. */
function _abaTransacoes_(ss, nome, rotulos) {
  let aba = nome ? ss.getSheetByName(nome) : null;
  if (!aba) {
    const abas = ss.getSheets();
    for (let i = 0; i < abas.length && !aba; i++) {
      const a = abas[i]; if (a.getName() === CONFIG.ABA_BASE) continue;
      const nLin = Math.min(5, a.getLastRow()); if (nLin < 1) continue;
      const topo = a.getRange(1, 1, nLin, Math.max(1, a.getLastColumn())).getValues();
      if (topo.some(l => rotulos.every(r => l.map(x => String(x).trim().toUpperCase()).indexOf(r) >= 0))) aba = a;
    }
  }
  if (!aba) { Logger.log('Aba de transações não encontrada: ' + nome); return null; }
  // lê o cabeçalho primeiro e depois só até a última coluna realmente usada
  const nCols = Math.max(1, aba.getLastColumn()), nLin = aba.getLastRow();
  const topo = aba.getRange(1, 1, Math.min(5, nLin), nCols).getValues();
  const usadas = ['DATA TRANSACAO', 'PLACA', 'LITROS', 'HODOMETRO OU HORIMETRO', 'KM RODADOS OU HORAS TRABALHADAS', 'KM/LITRO OU LITROS/HORA', 'VALOR EMISSAO',
    'TIPO COMBUSTIVEL', 'NOME ESTABELECIMENTO', 'TIPO ESTABELECIMENTO', 'CIDADE', 'UF', 'NOME MOTORISTA', 'INFORMACAO ADIDIONAL 2', 'SERVICO', 'ACIDENTE', 'COMPETÊNCIA'];
  for (let i = 0; i < topo.length; i++) {
    const cab = topo[i].map(x => String(x).trim().toUpperCase());
    if (rotulos.every(r => cab.indexOf(r) >= 0)) {
      let ultima = 0; usadas.forEach(u => { const k = cab.indexOf(u); if (k > ultima) ultima = k; });
      const valores = aba.getRange(1, 1, nLin, ultima + 1).getValues();
      return { valores: valores, cab: cab.slice(0, ultima + 1), inicio: i + 1 };
    }
  }
  Logger.log('Cabeçalho não reconhecido na aba ' + aba.getName());
  return null;
}

/* ------------------------------------------------------------ */
/*  PDFs de ordens de serviço (Drive)                            */
/* ------------------------------------------------------------ */

/**
 * Varre a pasta (e subpastas) e devolve [{id, nome, url, pasta, os:[...], placas:[...]}].
 * Nomes aceitos: "20403763.pdf", "SBP9G67 - 20403763.pdf", "OS 20403763 PMB2448.pdf" etc.
 * Cache próprio de 6 h (o cache principal expira antes; a varredura é o passo mais lento).
 */
function _indexarPdfsOS_() {
  if (!CONFIG.PASTA_OS_PDF) return [];
  const chave = 'painel_pdfs_v1';
  const emCache = _cacheLer_(chave);
  if (emCache) return emCache;
  const saida = [];
  try {
    const raiz = DriveApp.getFolderById(CONFIG.PASTA_OS_PDF);
    _varrerPasta_(raiz, '', saida, 0);
  } catch (e) { Logger.log('Não foi possível indexar a pasta de PDFs: ' + e); return []; }   // não cacheia falha
  saida.sort((a, b) => a.nome.localeCompare(b.nome));
  _cacheGravar_(chave, saida, 6 * 3600);
  return saida;
}

function _varrerPasta_(pasta, caminho, saida, nivel) {
  if (nivel > 6) return;
  const nomePasta = caminho ? caminho + '/' + pasta.getName() : pasta.getName();
  const arquivos = pasta.getFilesByType(MimeType.PDF);
  while (arquivos.hasNext()) {
    const f = arquivos.next();
    const nome = f.getName();
    const base = nome.replace(/\.pdf$/i, '').toUpperCase();
    const os = (base.match(/\d{7,9}/g) || []);
    const placas = (base.replace(/[^A-Z0-9]/g, ' ').match(/\b[A-Z]{3}\d[A-Z0-9]\d{2}\b/g) || []);
    saida.push({ id: f.getId(), nome: nome, url: 'https://drive.google.com/file/d/' + f.getId() + '/view', pasta: nivel ? pasta.getName() : '', os: os, placas: placas });
  }
  const sub = pasta.getFolders();
  while (sub.hasNext()) _varrerPasta_(sub.next(), nomePasta, saida, nivel + 1);
}

/* ------------------------------------------------------------ */
/*  Datas das fotos (metadados do Drive)                          */
/* ------------------------------------------------------------ */

/**
 * Devolve { idDoArquivo: 'dd/MM/yyyy' } para as fotos das viaturas.
 * Usa a data EXIF (quando o aparelho gravou) e, senão, a data de envio ao Drive.
 * Só consulta o Drive para ids ainda não conhecidos; resultado fica 6 h em cache.
 * Chamado com veiculos = null apenas devolve o que já está em cache (carga do usuário nunca espera o Drive).
 */
/**
 * Datas de arquivos do Drive (fotos e documentos).
 * Identificadores terminados em "__" são recusados pelo armazenamento de
 * propriedades do Apps Script, então ficam de fora do mapa — melhor perder a
 * data de um arquivo do que derrubar o carregamento do painel.
 */
function _idUsavelComoChave_(id) {
  return !!id && !/__$/.test(id) && /^[\w-]{10,}$/.test(id);
}

function _datasFotos_(veiculos) {
  const chave = 'painel_fotos_v1';
  const mapa = _cacheLer_(chave) || {};
  // limpa o que já tiver sido guardado com identificador problemático
  Object.keys(mapa).forEach(k => { if (!_idUsavelComoChave_(k)) delete mapa[k]; });
  if (!veiculos) return mapa;
  const ids = [];
  veiculos.forEach(v => {
    ['FD', 'LE', 'TR', 'LD'].forEach(a => {
      const id = _idDrive_(v.fotos && v.fotos[a]);
      if (_idUsavelComoChave_(id) && mapa[id] === undefined) ids.push(id);
    });
    // documentos também: a data de envio diz desde quando aquele CRLV ou termo está lá
    [v.linkCrlv, v.linkTomb].forEach(link => {
      const id = _idDrive_(link);
      if (_idUsavelComoChave_(id) && mapa[id] === undefined) ids.push(id);
      else if (id && !_idUsavelComoChave_(id)) Logger.log('Arquivo ignorado no mapa de datas (identificador incompatível): ' + id);
    });
  });
  if (!ids.length) return mapa;
  const t0 = Date.now(); let ok = 0;
  const temApi = (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.get);
  ids.forEach(id => {
    if (Date.now() - t0 > 240000) return;   // não passa de 4 min por rodada; o resto fica para a próxima
    try {
      let data = '';
      if (temApi) {
        const f = Drive.Files.get(id, { fields: 'createdTime,imageMediaMetadata(time)', supportsAllDrives: true });
        const exif = f.imageMediaMetadata && f.imageMediaMetadata.time;   // "yyyy:MM:dd HH:mm:ss"
        if (exif) { const m = String(exif).match(/(\d{4}):(\d{2}):(\d{2})/); if (m) data = m[3] + '/' + m[2] + '/' + m[1]; }
        if (!data && f.createdTime) data = _brDia_(String(f.createdTime).substring(0, 10)) + ' (envio)';
      } else {
        data = _brDia_(_diaISO_(DriveApp.getFileById(id).getDateCreated())) + ' (envio)';
      }
      mapa[id] = data; ok++;
    } catch (e) { mapa[id] = ''; }
  });
  Logger.log('Datas de fotos: ' + ok + ' de ' + ids.length + ' consultadas em ' + (Date.now() - t0) + ' ms' + (temApi ? '' : ' (sem Drive API — só data de envio)'));
  _cacheGravar_(chave, mapa, 6 * 3600);
  return mapa;
}

function _idDrive_(url) {
  const m = String(url || '').match(/[?&]id=([\w-]{10,})|\/d\/([\w-]{10,})/);
  return m ? (m[1] || m[2]) : '';
}


/* ============================================================
   CENTRAL DE AÇÕES — DETRAN-CE (porte do consultas_detran.py)
   Fluxos HTTP idênticos aos do Python: login por veículo com
   CSRF + cookies, CRLV-e, licenciamento/boleto e multas.
   ============================================================ */

const DETRAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0';

/** Cliente HTTP com pote de cookies (UrlFetchApp não guarda cookies sozinho). */
function _detranCliente_() {
  const pote = {};
  const guardarCookies = resp => {
    const h = resp.getAllHeaders();
    let sc = h['Set-Cookie'] || h['set-cookie'];
    if (!sc) return;
    if (!Array.isArray(sc)) sc = [sc];
    sc.forEach(c => { const m = String(c).match(/^([^=]+)=([^;]*)/); if (m) pote[m[1]] = m[2]; });
  };
  const cookieHeader = () => Object.keys(pote).map(k => k + '=' + pote[k]).join('; ');
  const pedir = (metodo, url, extras, payload) => {
    const op = {
      method: metodo, muteHttpExceptions: true, followRedirects: true,
      headers: Object.assign({
        'User-Agent': DETRAN_UA,
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
        'Cookie': cookieHeader()
      }, extras || {})
    };
    if (payload !== undefined) op.payload = payload;
    let resp, erro;
    for (let t = 1; t <= 3; t++) {
      try {
        resp = UrlFetchApp.fetch(url, op);
        if (resp.getResponseCode() < 500) break;
        erro = 'HTTP ' + resp.getResponseCode();
      } catch (e) { erro = String(e); resp = null; }
      if (t < 3) Utilities.sleep(4000);
    }
    if (!resp) throw new Error('DETRAN inacessível: ' + erro);
    guardarCookies(resp);
    return resp;
  };
  return { get: (u, h) => pedir('get', u, h), post: (u, h, p) => pedir('post', u, h, p) };
}

function _detranCsrf_(html) { const m = String(html).match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i) || String(html).match(/content=["']([^"']+)["'][^>]+name=["']csrf-token["']/i); return m ? m[1] : ''; }
function _detranAuth_(html) { const m = String(html).match(/name=["']authenticity_token["'][^>]*value=["']([^"']+)["']/i) || String(html).match(/value=["']([^"']+)["'][^>]*name=["']authenticity_token["']/i); return m ? m[1] : ''; }
function _semTags_(html) { return String(html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function _normTxt_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

/** Login por veículo (placa + renavam). Devolve {cli, csrf} ou lança erro com a mensagem do DETRAN. */
function _detranLogin_(placa, renavam) {
  const B = CONFIG.DETRAN_BASE;
  const cli = _detranCliente_();
  const r1 = cli.get(B, { 'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8' });
  const csrf = _detranCsrf_(r1.getContentText());
  if (!csrf) throw new Error('CSRF do DETRAN não encontrado (site fora do ar ou mudou).');
  const cab = { 'X-CSRF-Token': csrf, 'X-Requested-With': 'XMLHttpRequest', 'Referer': B };
  const r2 = cli.get(B + '/veiculos/detalhamento_servico?codigo=0', cab);
  const auth = _detranAuth_(r2.getContentText());
  if (!auth) throw new Error('authenticity_token não encontrado.');
  const r3 = cli.post(B + '/veiculos/login',
    Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/json, text/javascript, */*; q=0.01' }, cab),
    { 'authenticity_token': auth, 'veiculo[tipo_formulario]': '1', 'veiculo[placa]': placa, 'veiculo[renavam_chassi]': renavam, 'veiculo[chassi]': '' });
  let j;
  try { j = JSON.parse(r3.getContentText()); } catch (e) { throw new Error('Login DETRAN sem JSON (HTTP ' + r3.getResponseCode() + ').'); }
  if (j.status !== 'succ') {
    const e = j.errors || {};
    throw new Error('Login DETRAN falhou: ' + (e.error_message || JSON.stringify(e || j)).substring(0, 200));
  }
  return { cli: cli, csrf: csrf, cab: cab };
}

/* ---------------- CRLV ---------------- */
function _detranBaixarCrlvPdf_(sess, crv, cod) {
  const B = CONFIG.DETRAN_BASE;
  const cab = Object.assign({}, sess.cab, { 'Referer': B + '/veiculos/principal', 'Accept': 'text/html, */*; q=0.01' });
  sess.cli.get(B + '/veiculos/consultar_crlve', cab);
  const r5 = sess.cli.post(B + '/veiculos/consultar_crlve',
    Object.assign({}, cab, { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }),
    { 'numero_crv': crv, 'codigo_seguranca': cod });
  if (r5.getContentText().indexOf('baixar_crlve') < 0) {
    throw new Error('Download não liberado (CRV/código?): ' + _semTags_(r5.getContentText()).substring(0, 250));
  }
  const r6 = sess.cli.post(B + '/veiculos/baixar_crlve',
    Object.assign({}, cab, { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/pdf,application/octet-stream,*/*' }),
    { '_method': 'post', 'authenticity_token': sess.csrf });
  const ct = String((r6.getAllHeaders()['Content-Type'] || '')).toLowerCase();
  const bytes = r6.getContent();
  if (ct.indexOf('pdf') < 0 || bytes.length < 500) throw new Error('Resposta do DETRAN não é um PDF válido.');
  return bytes;
}

/** Salva o PDF na pasta de CRLVs com o nome PLACA.pdf (apaga homônimo antes, como no Python). */
function _salvarCrlvDrive_(placa, bytes) {
  const pasta = DriveApp.getFolderById(CONFIG.PASTA_CRLV);
  const nome = placa + '.pdf';
  const iguais = pasta.getFilesByName(nome);
  while (iguais.hasNext()) { try { iguais.next().setTrashed(true); } catch (e) {} }
  const arq = pasta.createFile(Utilities.newBlob(bytes, 'application/pdf', nome));
  try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { id: arq.getId(), link: 'https://drive.google.com/file/d/' + arq.getId() + '/view?usp=sharing' };
}

/** Texto de um PDF via conversão do Drive (OCR) — cria um Doc temporário e o remove. */
function _pdfTexto_(bytes) {
  const blob = Utilities.newBlob(bytes, 'application/pdf', 'tmp_auditoria.pdf');
  const doc = Drive.Files.create({ name: 'tmp_auditoria_painel', mimeType: 'application/vnd.google-apps.document' }, blob, { ocrLanguage: 'pt' });
  try {
    const resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + doc.id + '/export?mimeType=text/plain',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    if (resp.getResponseCode() !== 200) throw new Error('Export do texto falhou (HTTP ' + resp.getResponseCode() + ').');
    return resp.getContentText();
  } finally {
    try { Drive.Files.remove(doc.id); } catch (e) {}
  }
}

function _extrairExercicio_(texto, placa) {
  const s = String(texto).replace(/\s+/g, ' ');
  if (placa) {
    const i = s.indexOf(placa);
    if (i >= 0) { const m = s.substring(i, i + 250).match(/\b(20\d{2})\b/); if (m) return parseInt(m[1], 10); }
  }
  let m = s.match(/EXERC[IÍ]CIO[\s\S]{0,80}?\b(20\d{2})\b/i); if (m) return parseInt(m[1], 10);
  m = s.match(/\b(20\d{2})\b/); if (m) return parseInt(m[1], 10);
  return 0;
}
function _extrairPlacaPdf_(texto) {
  const s = String(texto).toUpperCase().replace(/\s+/g, ' ');
  let m = s.match(/PLACA\W{0,15}([A-Z]{3}[- ]?\d[A-Z0-9]\d{2})/);
  if (!m) m = s.match(/\b([A-Z]{3}[- ]?\d[A-Z0-9]\d{2})\b/);
  return m ? m[1].replace(/[^A-Z0-9]/g, '') : '';
}

/** Baixa bytes de um arquivo do Drive a partir do link salvo na planilha. */
function _baixarDoDrive_(link) {
  const m = String(link || '').match(/[?&]id=([\w-]{10,})|\/d\/([\w-]{10,})/);
  const id = m ? (m[1] || m[2]) : '';
  if (!id) throw new Error('Link do Drive inválido.');
  const resp = UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media&supportsAllDrives=true',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) throw new Error('Não consegui abrir o arquivo do link (HTTP ' + resp.getResponseCode() + ').');
  return resp.getContent();
}

/* ---------------- Acesso à linha da viatura ---------------- */
function _linhaDaPlaca_(aba, placa) {
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
  const idx = _mapearCampos_(cab);
  const colPlaca = (idx.placa !== undefined ? idx.placa : 0) + 1;
  const placas = aba.getRange(2, colPlaca, Math.max(1, aba.getLastRow() - 1), 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());
  const pos = placas.indexOf(placa);
  return { linha: pos < 0 ? -1 : pos + 2, idx: idx };
}

/* ---------------- Registro (LogAcoes) ---------------- */
function _abaLog_(ss) {
  let aba = ss.getSheetByName(CONFIG.ABA_LOG);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_LOG);
    aba.appendRow(['Data/Hora', 'Usuário', 'Ação', 'Placa', 'Resultado', 'Detalhe']);
    aba.setFrozenRows(1);
  }
  return aba;
}
function _logAcao_(ss, email, acao, placa, resultado, detalhe) {
  try {
    _abaLog_(ss).appendRow([Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm:ss'), email, acao, placa, resultado, String(detalhe || '').substring(0, 900)]);
  } catch (e) { Logger.log('Log não gravado: ' + e); }
}

function obterLogAcoes(token, quantidade) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };
  if (!sessao.admin) return { ok: false, erro: 'Somente administrador.' };
  const aba = _abaLog_(SpreadsheetApp.openById(CONFIG.ID_BASE));
  const n = Math.min(quantidade || 100, 500);
  const total = aba.getLastRow();
  if (total < 2) return { ok: true, linhas: [] };
  const ini = Math.max(2, total - n + 1);
  const linhas = aba.getRange(ini, 1, total - ini + 1, 6).getValues()
    .map(l => ({ quando: _dataTxt_(l[0]), quem: String(l[1]), acao: String(l[2]), placa: String(l[3]), resultado: String(l[4]), detalhe: String(l[5]) }))
    .reverse();
  return { ok: true, linhas: linhas };
}

/* ---------------- AÇÕES (uma placa por chamada; o lote é orquestrado no navegador) ---------------- */
function _prepararAcao_(token) {
  const sessao = _sessao_(token);
  if (!sessao) return { erroPadrao: { expirado: true } };
  if (!sessao.admin) return { erroPadrao: { ok: false, erro: 'Somente o administrador executa ações.' } };
  return { sessao: sessao, ss: SpreadsheetApp.openById(CONFIG.ID_BASE) };
}

/** BAIXAR CRLV: login DETRAN → PDF → Drive → link na coluna BO + auditoria do exercício. */
function acaoBaixarCrlv(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
  const ler = campo => alvo.idx[campo] !== undefined ? String(aba.getRange(alvo.linha, alvo.idx[campo] + 1).getValue() || '').trim() : '';
  const renavam = ler('renavam').replace(/\D/g, '').padStart(11, '0');
  const crv = ler('crv').replace(/\D/g, ''), cod = ler('codCrv').replace(/\D/g, '');
  try {
    if (!renavam || renavam === '00000000000') throw new Error('Sem renavam na planilha.');
    if (!crv || !cod) throw new Error('Sem CRV/código de segurança na planilha (colunas BA/BB).');
    const sess = _detranLogin_(placa, renavam);
    const bytes = _detranBaixarCrlvPdf_(sess, crv, cod);
    const salvo = _salvarCrlvDrive_(placa, bytes);
    if (alvo.idx.linkCrlv !== undefined) aba.getRange(alvo.linha, alvo.idx.linkCrlv + 1).setValue(salvo.link);
    let detalhe = 'PDF salvo no Drive';
    try {
      const ex = _extrairExercicio_(_pdfTexto_(bytes), placa);
      if (ex && alvo.idx.anoEx !== undefined) { aba.getRange(alvo.linha, alvo.idx.anoEx + 1).setValue(ex); detalhe += ' • exercício ' + ex + ' gravado'; }
    } catch (e) { detalhe += ' • exercício não lido (' + String(e.message || e).substring(0, 80) + ')'; }
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Baixar CRLV', placa, 'OK', detalhe);
    return { ok: true, status: 'CRLV BAIXADO', detalhe: detalhe, link: salvo.link };
  } catch (e) {
    const msg = String(e.message || e);
    _logAcao_(p.ss, p.sessao.email, 'Baixar CRLV', placa, 'ERRO', msg);
    return { ok: false, erro: msg };
  }
}

/** CONSULTAR MULTAS: grava na coluna O "Data da Última Consulta: ..." + resultado. */
function acaoConsultarMultas(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
  const renavam = (alvo.idx.renavam !== undefined ? String(aba.getRange(alvo.linha, alvo.idx.renavam + 1).getValue() || '') : '').replace(/\D/g, '').padStart(11, '0');
  try {
    if (!renavam || renavam === '00000000000') throw new Error('Sem renavam na planilha.');
    const sess = _detranLogin_(placa, renavam);
    const B = CONFIG.DETRAN_BASE;
    const cab = Object.assign({}, sess.cab, { 'Referer': B + '/veiculos/principal', 'Accept': 'text/html, */*; q=0.01' });
    const r4 = sess.cli.get(B + '/veiculos/principal', cab);
    const html = r4.getContentText();
    let resultado;
    const blocos = html.match(/<div[^>]*class="[^"]*links-veiculo[^"]*"[\s\S]*?<\/div>/gi) || [];
    const blocoMulta = blocos.find(b => /multa/i.test(b));
    if (blocoMulta && /alert-success/.test(blocoMulta) && /n[ãa]o possui multas/i.test(_normTxt_(blocoMulta))) resultado = 'SEM MULTAS';
    else if (blocoMulta && /alert-danger/.test(blocoMulta)) {
      const r5 = sess.cli.get(B + '/veiculos/multas', cab);
      resultado = _parsearTabelaMultas_(r5.getContentText());
    } else resultado = 'Situação não identificada.';
    const conteudo = 'Data da Última Consulta: ' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy') + '\n' + resultado;
    if (alvo.idx.multasTxt !== undefined) aba.getRange(alvo.linha, alvo.idx.multasTxt + 1).setValue(conteudo);
    SpreadsheetApp.flush(); limparCache();
    const n = (resultado.match(/AIT:/g) || []).length;
    const status = resultado === 'SEM MULTAS' ? 'SEM MULTAS' : n ? n + ' MULTA(S)' : 'VERIFICAR';
    _logAcao_(p.ss, p.sessao.email, 'Consultar multas', placa, status, resultado.replace(/\n/g, ' · ').substring(0, 300));
    return { ok: true, status: status, detalhe: resultado.replace(/\n/g, ' · ').substring(0, 300) };
  } catch (e) {
    const msg = String(e.message || e);
    _logAcao_(p.ss, p.sessao.email, 'Consultar multas', placa, 'ERRO', msg);
    return { ok: false, erro: msg };
  }
}

function _parsearTabelaMultas_(html) {
  const mt = String(html).match(/<table[^>]*id=["']emissao-multas["'][\s\S]*?<\/table>/i);
  if (!mt) return 'Tabela de multas não encontrada.';
  const linhas = [];
  (mt[0].match(/<tr[\s\S]*?<\/tr>/gi) || []).forEach(tr => {
    const tds = (tr.match(/<td[\s\S]*?<\/td>/gi) || []).map(td => _semTags_(td));
    if (tds.length < 8 || /total/i.test(tds[0])) return;
    const ait = tds[1]; if (!ait) return;
    linhas.push('AIT:' + ait + ' | ' + tds[3] + ' | Infração:' + tds[4] + ' | Venc:' + tds[5] +
      ' | Valor:R$' + tds[6].replace(/R\$/g, '').trim() + ' | A pagar:R$' + tds[7].replace(/R\$/g, '').trim());
  });
  return linhas.length ? linhas.join('\n') : 'Multas indicadas, tabela vazia.';
}

/** GERAR BOLETO DE LICENCIAMENTO: JÁ LICENCIADO | PENDÊNCIA | BOLETO GERADO (PDF no Drive). */
function acaoGerarBoleto(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
  const renavam = (alvo.idx.renavam !== undefined ? String(aba.getRange(alvo.linha, alvo.idx.renavam + 1).getValue() || '') : '').replace(/\D/g, '').padStart(11, '0');
  try {
    if (!renavam || renavam === '00000000000') throw new Error('Sem renavam na planilha.');
    const sess = _detranLogin_(placa, renavam);
    const B = CONFIG.DETRAN_BASE;
    const cab = Object.assign({}, sess.cab, { 'Referer': B + '/veiculos/principal', 'Accept': 'text/html, */*; q=0.01' });
    const r4 = sess.cli.get(B + '/veiculos/licenciamento', cab);
    const html = r4.getContentText();
    if (_normTxt_(_semTags_(html)).indexOf('veiculo ja licenciado') >= 0) {
      _logAcao_(p.ss, p.sessao.email, 'Gerar boleto', placa, 'JÁ LICENCIADO', '');
      return { ok: true, status: 'JÁ LICENCIADO', detalhe: 'DETRAN informa licenciamento em dia.' };
    }
    if (!/id=["']btn-emitir-licenciamento["']/.test(html)) {
      _logAcao_(p.ss, p.sessao.email, 'Gerar boleto', placa, 'PENDÊNCIA', 'sem botão de emissão');
      return { ok: true, status: 'PENDÊNCIA', detalhe: 'DETRAN não liberou a emissão (impedimento/pendência).' };
    }
    const auth = _detranAuth_(html);
    if (!auth) throw new Error('authenticity_token do licenciamento não encontrado.');
    const r5 = sess.cli.post(B + '/veiculos/gerar_boleto',
      Object.assign({}, cab, { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Accept': 'application/pdf,application/octet-stream,*/*' }),
      { 'authenticity_token': auth });
    const ct = String((r5.getAllHeaders()['Content-Type'] || '')).toLowerCase();
    const bytes = r5.getContent();
    if (ct.indexOf('pdf') < 0 && bytes.length < 1000) throw new Error('gerar_boleto não retornou PDF.');
    const ano = new Date().getFullYear();
    const pasta = DriveApp.getFolderById(CONFIG.PASTA_CRLV);
    const nome = placa + ' - ' + ano + '.pdf';
    const iguais = pasta.getFilesByName(nome);
    while (iguais.hasNext()) { try { iguais.next().setTrashed(true); } catch (e) {} }
    const arq = pasta.createFile(Utilities.newBlob(bytes, 'application/pdf', nome));
    try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const link = 'https://drive.google.com/file/d/' + arq.getId() + '/view?usp=sharing';
    _logAcao_(p.ss, p.sessao.email, 'Gerar boleto', placa, 'BOLETO GERADO', link);
    return { ok: true, status: 'BOLETO GERADO', detalhe: 'PDF salvo na pasta de CRLVs.', link: link };
  } catch (e) {
    const msg = String(e.message || e);
    _logAcao_(p.ss, p.sessao.email, 'Gerar boleto', placa, 'ERRO', msg);
    return { ok: false, erro: msg };
  }
}

/** AUDITAR CRLV: lê o PDF do link salvo, confere a placa e ajusta o Ano Exercício. */
function acaoAuditarCrlv(token, placa) { return _crlvViatura_(token, placa, false); }

/** Mesma leitura, mas gravando as lacunas. */
function acaoAplicarCrlv(token, placa) { return _crlvViatura_(token, placa, true); }

function _crlvViatura_(token, placa, aplicar) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, placa);
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const mapa = _mapaEdicao_(aba);
    const r = _lerCrlvDaViatura_(aba, mapa, alvo.linha, alvo.idx);
    if (r.erro) return { ok: true, status: /sem CRLV/.test(r.erro) ? 'SEM CRLV' : 'ERRO', detalhe: r.erro };

    // só grava no modo aplicar; na conferência apenas relata
    if (aplicar && r.preencher.length) {
      r.preencher.forEach(x => aba.getRange(alvo.linha, x.col).setValue(x.valor));
      SpreadsheetApp.flush();
      limparCache();
    }
    const partes = [];
    if (r.preencher.length) partes.push(r.preencher.length + ' campo(s) ' + (aplicar ? 'preenchido(s)' : 'a preencher') + ': ' +
      r.preencher.map(x => x.campo + '=' + x.valor).join(', '));
    const travados = (r.ignorados || []).filter(x => x.valor && /bloqueada|sem coluna/.test(x.motivo));
    if (travados.length) partes.push(travados.length + ' campo(s) que o CRLV traz mas o painel não grava: ' +
      travados.map(x => x.campo + ' (' + x.motivo + ')').join(', '));
    if (r.divergencias.length) partes.push(r.divergencias.length + ' divergência(s): ' +
      r.divergencias.map(d => d.campo + ' planilha "' + d.atual + '" × CRLV "' + d.crlv + '"').join(' | '));
    if (!partes.length) partes.push('cadastro confere com o CRLV');

    const status = r.divergencias.length ? 'DIVERGÊNCIA' : (r.preencher.length ? (aplicar ? 'PREENCHIDO' : 'A PREENCHER') : 'OK');
    if (aplicar) _logAcao_(p.ss, p.sessao.email, 'Completar pelo CRLV', placa, status, partes.join(' • '));
    return { ok: true, status: status, detalhe: partes.join(' • '), aplicado: !!aplicar,
      preencheu: r.preencher.length, divergentes: r.divergencias.length,
      campos: r.preencher.map(x => ({ campo: x.campo, valor: x.valor })),
      conflitos: r.divergencias.map(d => ({ campo: d.campo, atual: d.atual, crlv: d.crlv, bloqueada: !!d.bloqueada })),
      ignorados: (r.ignorados || []).filter(x => x.valor),
      naoLidos: (r.ignorados || []).filter(x => !x.valor).map(x => x.campo),
      lidos: r.lidos || {} };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  }
}

/**
 * Documentos que a ficha da viatura aceita anexar. Faltava esta definição: a
 * função de anexo a usava e quebrava com "DOCUMENTOS_VIATURA is not defined"
 * no momento do envio.
 *   pasta   — chave do CONFIG com a pasta do Drive (reserva: PASTA_CRLV)
 *   campo   — campo da ConsultaBD onde o link é gravado
 *   sufixo  — compõe o nome do arquivo: PLACA + sufixo + .pdf
 */
const DOCUMENTOS_VIATURA = {
  crlv:       { rotulo: 'CRLV',                campo: 'linkCrlv', pasta: 'PASTA_CRLV',       sufixo: '' },
  tombamento: { rotulo: 'Termo de tombamento', campo: 'linkTomb', pasta: 'PASTA_TOMBAMENTO', sufixo: ' - Tombamento' }
};

function anexarDocumento(token, placa, tipo, base64, nomeArquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const doc = DOCUMENTOS_VIATURA[tipo];
  if (!doc) return { ok: false, erro: 'Tipo de documento inválido.' };
  placa = String(placa || '').trim().toUpperCase();
  if (!base64 || base64.length < 100) return { ok: false, erro: 'Arquivo vazio.' };
  if (base64.length > 12 * 1024 * 1024) return { ok: false, erro: 'PDF acima de 9 MB.' };
  const idPasta = CONFIG[doc.pasta] || CONFIG.PASTA_CRLV;
  if (!idPasta) return { ok: false, erro: 'Pasta do Drive não configurada para ' + doc.rotulo + '.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Outra gravação em andamento.' }; }
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const mapa = _mapaEdicao_(aba);
    const info = mapa.porCampo[doc.campo];
    if (!info) return { ok: false, erro: 'Coluna de ' + doc.rotulo + ' não encontrada na ConsultaBD.' };
    if (!info.editavel) return { ok: false, erro: 'A coluna ' + info.nome + ' está bloqueada (' + info.motivo + ').' };
    const alvo = _linhaDaPlaca_(aba, placa);
    if (alvo.linha < 0) return { ok: false, erro: 'Placa ' + placa + ' não encontrada.' };

    const bytes = Utilities.base64Decode(base64);
    const pasta = DriveApp.getFolderById(idPasta);
    const nome = placa + doc.sufixo + '.pdf';
    const iguais = pasta.getFilesByName(nome);
    while (iguais.hasNext()) { try { iguais.next().setTrashed(true); } catch (e) {} }
    const arq = pasta.createFile(Utilities.newBlob(bytes, 'application/pdf', nome));
    try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const link = 'https://drive.google.com/file/d/' + arq.getId() + '/view?usp=sharing';
    aba.getRange(alvo.linha, info.col).setValue(link);

    let detalhe = doc.rotulo + ' anexado' + (nomeArquivo ? ' (' + nomeArquivo + ')' : '');
    if (tipo === 'crlv') {
      try {
        const texto = _pdfTexto_(bytes);
        const placaPdf = _extrairPlacaPdf_(texto);
        if (placaPdf && placaPdf !== placa) detalhe += ' • ATENÇÃO: o PDF parece ser da placa ' + placaPdf;
        const ex = _extrairExercicio_(texto, placa);
        if (ex && alvo.idx.anoEx !== undefined) { aba.getRange(alvo.linha, alvo.idx.anoEx + 1).setValue(ex); detalhe += ' • exercício ' + ex + ' gravado'; }
      } catch (e) { detalhe += ' • leitura do PDF indisponível'; }
    }
    SpreadsheetApp.flush();
    limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Anexar ' + doc.rotulo, placa, 'OK', detalhe);
    return { ok: true, link: link, nome: nome, detalhe: detalhe };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/** ANEXAR CRLV manual: recebe o PDF do navegador, salva como PLACA.pdf e grava o link. */
function anexarCrlv(token, placa, base64) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  if (!base64 || base64.length < 100) return { ok: false, erro: 'Arquivo vazio.' };
  const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
  try {
    const bytes = Utilities.base64Decode(base64);
    const salvo = _salvarCrlvDrive_(placa, bytes);
    if (alvo.idx.linkCrlv !== undefined) aba.getRange(alvo.linha, alvo.idx.linkCrlv + 1).setValue(salvo.link);
    let detalhe = 'PDF anexado manualmente';
    try {
      const texto = _pdfTexto_(bytes);
      const placaPdf = _extrairPlacaPdf_(texto);
      if (placaPdf && placaPdf !== placa) detalhe += ' • ATENÇÃO: o PDF parece ser da placa ' + placaPdf;
      const ex = _extrairExercicio_(texto, placa);
      if (ex && alvo.idx.anoEx !== undefined) { aba.getRange(alvo.linha, alvo.idx.anoEx + 1).setValue(ex); detalhe += ' • exercício ' + ex + ' gravado'; }
    } catch (e) { detalhe += ' • leitura do PDF indisponível'; }
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Anexar CRLV', placa, 'OK', detalhe);
    return { ok: true, status: 'CRLV ANEXADO', detalhe: detalhe, link: salvo.link };
  } catch (e) {
    const msg = String(e.message || e);
    _logAcao_(p.ss, p.sessao.email, 'Anexar CRLV', placa, 'ERRO', msg);
    return { ok: false, erro: msg };
  }
}

/**
 * Só Google Docs: rode no editor para aceitar o consentimento desse escopo.
 * Se nenhuma tela de autorização aparecer e o erro persistir, revogue o acesso
 * do projeto em myaccount.google.com/permissions e rode esta função de novo.
 */
function autorizarDocs() {
  const doc = DocumentApp.create('teste-docs-painel');
  const id = doc.getId();
  doc.getBody().appendParagraph('permissão concedida');
  doc.saveAndClose();
  Logger.log('Criar e editar documento: OK (' + id + ')');
  // abrir pelo id é exatamente o que a geração dos documentos faz
  const aberto = DocumentApp.openById(id);
  Logger.log('Abrir documento pelo id: OK — ' + aberto.getName());
  DriveApp.getFileById(id).setTrashed(true);
  const modelos = _modelosPagamento_() || {};
  Object.keys(modelos).forEach(tipo => {
    Object.keys(modelos[tipo]).forEach(nome => {
      try { DocumentApp.openById(modelos[tipo][nome]); Logger.log('Modelo "' + nome + '": acessível'); }
      catch (e) { Logger.log('Modelo "' + nome + '": FALHOU — ' + String(e).substring(0, 120)); }
    });
  });
  Logger.log('Agora faça Implantar → Gerenciar implantações → editar → Nova versão.');
}

/**
 * Rode no editor para o Google pedir a permissão de ESCRITA no Drive.
 * O autorizarDrive() só lê, e por isso não dispara o consentimento de escrita —
 * era por isso que copiar os modelos falhava mesmo com o escopo no manifesto.
 * Esta função cria um arquivo de teste, copia um documento e apaga os dois.
 */
function autorizarDriveEscrita() {
  Logger.log('Conta em uso: ' + Session.getEffectiveUser().getEmail());
  const temp = DriveApp.createFile('teste-permissao-painel.txt', 'ok', MimeType.PLAIN_TEXT);
  Logger.log('Criar arquivo: OK (' + temp.getId() + ')');
  temp.setTrashed(true);

  const modelos = _modelosPagamento_() || {};
  const primeiro = Object.keys(modelos).map(t => Object.keys(modelos[t]).map(n => ({ t: t, n: n, id: modelos[t][n] }))[0]).filter(Boolean)[0];
  if (primeiro) {
    try {
      const copia = DriveApp.getFileById(primeiro.id).makeCopy('teste-copia-painel', DriveApp.getFolderById(CONFIG.PASTA_DOCS_PAGAMENTO));
      Logger.log('Copiar modelo "' + primeiro.n + '": OK');
      copia.setTrashed(true);
    } catch (e) { Logger.log('Copiar modelo FALHOU: ' + e); }
  }
  [['PASTA_FOTOS', 'fotos'], ['PASTA_CRLV', 'CRLVs'], ['PASTA_DOCS_PAGAMENTO', 'documentos de pagamento']].forEach(par => {
    const id = CONFIG[par[0]];
    if (!id) { Logger.log('Pasta de ' + par[1] + ': não configurada'); return; }
    try { Logger.log('Pasta de ' + par[1] + ': ' + DriveApp.getFolderById(id).getName() + ' — acessível'); }
    catch (e) { Logger.log('Pasta de ' + par[1] + ': SEM ACESSO (' + e + ')'); }
  });
  // Documentos: necessário para preencher os modelos
  try {
    const doc = DocumentApp.create('teste-doc-painel');
    doc.getBody().appendParagraph('ok');
    doc.saveAndClose();
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    Logger.log('Editar documentos (Google Docs): OK');
  } catch (e) { Logger.log('Editar documentos FALHOU: ' + e); }
  Logger.log('Se tudo acima deu OK, faça Implantar → Gerenciar implantações → Nova versão.');
}

/** Rode UMA vez no editor para o Apps Script pedir a permissão de leitura do Drive. */
function autorizarDrive() {
  const pasta = DriveApp.getFolderById(CONFIG.PASTA_OS_PDF);
  Logger.log('Drive autorizado. Pasta: ' + pasta.getName());
  const cache = CacheService.getScriptCache();
  const n = parseInt(cache.get('painel_pdfs_v1_n'), 10) || 0;
  const lista = ['painel_pdfs_v1_n']; for (let i = 0; i < n; i++) lista.push('painel_pdfs_v1_' + i);
  cache.removeAll(lista);
  const t0 = Date.now(); const pdfs = _indexarPdfsOS_();
  Logger.log('PDFs indexados: ' + pdfs.length + ' em ' + (Date.now() - t0) + ' ms');
}

/* ------------------------------------------------------------ */
/*  Títulos / pagamentos Ticket Log                              */
/* ------------------------------------------------------------ */

/**
 * Lê as abas de títulos "como estão": cabeçalho + linhas (A:L e A:N).
 * O navegador reconhece os campos pelo nome do cabeçalho.
 */
function _lerTitulos_() {
  const saida = { abast: null, manut: null, glosaHist: [], erro: '' };
  if (!CONFIG.ID_TITULOS) return saida;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_TITULOS);
    saida.abast = _lerTabelaBruta_(ss.getSheetByName(CONFIG.ABA_TIT_ABAST), CONFIG.COLS_TIT_ABAST);
    saida.manut = _lerTabelaBruta_(ss.getSheetByName(CONFIG.ABA_TIT_MANUT), CONFIG.COLS_TIT_MANUT);
    // Histórico da glosa: agora na planilha-mãe (aba ResumoGlosa)
    try {
      const abaResumo = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_RESUMO_GLOSA);
      if (abaResumo && abaResumo.getLastRow() > 1) {
        saida.glosaHist = abaResumo.getRange(2, 1, abaResumo.getLastRow() - 1, 2).getValues()
          .map(l => ({ comp: _competenciaDaCelula_(l[0]) || _txt_(l[0]), valor: _num_(l[1]) || 0 }))
          .filter(x => /\d{2}\/\d{4}/.test(x.comp));
      }
    } catch (e) { Logger.log('ResumoGlosa: ' + e); }
  } catch (e) { saida.erro = String(e.message || e); Logger.log('Títulos: ' + e); }
  return saida;
}

/** Cabeçalho = a linha (entre as 5 primeiras) com mais células de texto dentro das colunas lidas. */
function _lerTabelaBruta_(aba, nCols) {
  if (!aba) return null;
  const nLin = aba.getLastRow(); if (nLin < 1) return { cab: [], linhas: [] };
  const valores = aba.getRange(1, 1, nLin, nCols).getValues();
  let h = -1, melhor = 2;
  for (let i = 0; i < Math.min(5, valores.length); i++) {
    const n = valores[i].filter(c => typeof c === 'string' && c.trim()).length;
    if (n > melhor) { melhor = n; h = i; }
  }
  if (h < 0) return { cab: [], linhas: [] };
  const cab = valores[h].map(c => String(c || '').trim());
  const linhas = [];
  for (let r = h + 1; r < valores.length; r++) {
    const l = valores[r];
    if (!String(l[0] || '').trim()) continue;          // linha sem nº de título = rodapé / anotação
    linhas.push(l.map(c => {
      if (c instanceof Date) return isNaN(c) ? '' : Utilities.formatDate(c, CONFIG.FUSO, 'dd/MM/yyyy');
      if (typeof c === 'number') return c;
      return String(c).trim();
    }));
  }
  return { cab: cab, linhas: linhas, aba: aba.getName() };
}

/* ------------------------------------------------------------ */
/*  Aquecimento do cache (gatilho de tempo)                       */
/* ------------------------------------------------------------ */

/** Recarrega tudo no cache. Rode via gatilho a cada hora para ninguém esperar a leitura. */
function aquecerCache() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  limparCache();
  const t0 = Date.now();
  const veiculos = _lerVeiculos_(ss);
  const frota = { veiculos: veiculos, gestores: _lerGestores_(ss), os: _lerOS_(ss), solicitacoes: _lerSolicitacoes_(ss),
    pdfsOS: _indexarPdfsOS_(), titulos: _lerTitulos_(), datasFotos: _datasFotos_(veiculos),
    meta: { atualizadoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm'), statusOcultosPadrao: CONFIG.STATUS_OCULTOS_PADRAO } };
  _cacheGravar_('painel_frota_v2', frota, CONFIG.CACHE_SEG);
  const ab = _lerAbastecimento_(ss), ma = _lerManutencao_(ss);
  _cacheGravar_('painel_uso_v2', { abast: ab.mensal, abastAlertas: ab.alertas, postos: ab.postos, manut: ma.lista,
    meta: { abastLinhas: ab.linhas, abastDe: ab.de, abastAte: ab.ate, manutLinhas: ma.linhas, manutDe: ma.de, manutAte: ma.ate,
      atualizadoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm') } }, CONFIG.CACHE_SEG);
  Logger.log('Cache aquecido em ' + (Date.now() - t0) + ' ms | PDFs indexados: ' + frota.pdfsOS.length + ' | datas de fotos: ' + Object.keys(frota.datasFotos).length);
}

/** Cria (uma vez) o gatilho horário de aquecimento. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === 'aquecerCache') ScriptApp.deleteTrigger(t); });
  const gatilho = ScriptApp.newTrigger('aquecerCache').timeBased();
  if (CONFIG.CACHE_SEG >= 3600) gatilho.everyHours(Math.max(1, Math.floor(CONFIG.CACHE_SEG / 3600))).create();
  else gatilho.everyMinutes(30).create();
  aquecerCache();
  return 'Gatilho instalado.';
}



/* ============================================================
   PROJEÇÃO DE FATURAMENTO DA MANUTENÇÃO
   A fatura do mês é formada pelas OS que chegam a "cobradas".
   O caminho é: aguardando aprovação → aprovada → executada →
   concluída → cobrada. Cada estágio tem uma chance diferente de
   entrar na próxima fatura, e é isso que a projeção usa.
   ============================================================ */

/**
 * O fluxo real de uma OS até virar fatura:
 *   aguardando nível 1 → nível 2 → aprovada e não iniciada → oficina executa
 *   → concluída → aceite → oficina anexa a NF → Ticket cobra → "Cobrada"
 * A fatura de uma competência é o conjunto de OS que consta no OrçamentosDB
 * com aquela competência. Logo, a projeção não é sobre o que está "orçado":
 * é sobre as OS que já viraram cobrança e ainda não entraram em nenhuma fatura.
 */

/** Cruza a aba OS com o OrçamentosDB e explica como a fatura se forma. */
function analisarFormacaoFatura(token, competencia) {
  const p = token ? _prepararAcao_(token) : { ss: SpreadsheetApp.openById(CONFIG.ID_BASE) };
  if (p.erroPadrao) return p.erroPadrao;
  try {
    const dados = _dadosFatura_();
    const comps = Object.keys(dados.porComp).sort((a, b) => _ordemComp_(a).localeCompare(_ordemComp_(b)));
    const alvo = competencia || comps[comps.length - 1];
    const daComp = dados.porComp[alvo] || [];
    const cobradasNaAba = dados.osPorStatus['Cobradas'] || [];
    const jaFaturadas = cobradasNaAba.filter(o => dados.faturadas[o.os]);
    const aFaturar = cobradasNaAba.filter(o => !dados.faturadas[o.os]);

    const linhas = [];
    linhas.push('Competências no OrçamentosDB: ' + comps.length + ' (de ' + comps[0] + ' a ' + comps[comps.length - 1] + ')');
    linhas.push('Fatura ' + alvo + ': ' + daComp.length + ' OS, total ' + _moedaBR_(daComp.reduce((s, x) => s + x.valor, 0)));
    linhas.push('');
    linhas.push('Na aba OS, status "Cobradas": ' + cobradasNaAba.length + ' OS');
    linhas.push('   já constam em alguma fatura: ' + jaFaturadas.length + ' (' + _moedaBR_(jaFaturadas.reduce((s, o) => s + o.valor, 0)) + ')');
    linhas.push('   ainda NÃO faturadas:        ' + aFaturar.length + ' (' + _moedaBR_(aFaturar.reduce((s, o) => s + o.valor, 0)) + ') ← entram na próxima');
    linhas.push('');
    // de onde vieram as OS da fatura: qual era o status delas na aba OS
    const statusDaFatura = {};
    daComp.forEach(x => {
      const naAba = dados.osPorNumero[x.os];
      const st = naAba ? naAba.status : '(não está na aba OS)';
      const e = statusDaFatura[st] || (statusDaFatura[st] = { qtd: 0, valor: 0 });
      e.qtd++; e.valor += x.valor;
    });
    linhas.push('Status, na aba OS, das ' + daComp.length + ' OS da fatura ' + alvo + ':');
    Object.keys(statusDaFatura).forEach(st => linhas.push('   ' + st + ': ' + statusDaFatura[st].qtd + ' OS, ' + _moedaBR_(statusDaFatura[st].valor)));
    linhas.push('');
    // tempo entre conclusão e competência faturada
    const atrasos = [];
    daComp.forEach(x => {
      if (!x.conclusao) return;
      const m = String(x.conclusao).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!m) return;
      const concl = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      const comp = new Date(Number(alvo.substring(3)), Number(alvo.substring(0, 2)) - 1, 1);
      atrasos.push(Math.round((comp - concl) / 86400000));
    });
    if (atrasos.length) {
      atrasos.sort((a, b) => a - b);
      linhas.push('Dias entre a conclusão do serviço e a competência faturada:');
      linhas.push('   mínimo ' + atrasos[0] + ' | mediana ' + atrasos[Math.floor(atrasos.length / 2)] + ' | máximo ' + atrasos[atrasos.length - 1]);
      linhas.push('   concluídas no próprio mês da competência: ' + atrasos.filter(d => d >= 0 && d <= 31).length + ' de ' + atrasos.length);
    }
    linhas.forEach(l => Logger.log(l));
    return { ok: true, relatorio: linhas, competencia: alvo, competencias: comps };
  } catch (e) { Logger.log('Erro: ' + e); return { ok: false, erro: String(e.message || e) }; }
}

function _ordemComp_(c) { return c.substring(3) + c.substring(0, 2); }

/** Lê, de uma vez, o OrçamentosDB (faturas) e a aba OS (situação atual). */
function _dadosFatura_() {
  const saida = { porComp: {}, faturadas: {}, osPorNumero: {}, osPorStatus: {} };
  // faturas
  const abaOrc = _ssManut_().getSheetByName(CONFIG.ABA_ORCAMENTOS);
  if (abaOrc && abaOrc.getLastRow() > 2) {
    const valores = abaOrc.getDataRange().getValues();
    let cab = 0;
    for (let i = 0; i < Math.min(6, valores.length); i++) {
      if (valores[i].some(c => /ORDEM\s*SERVI/i.test(String(c)))) { cab = i; break; }
    }
    const nomes = valores[cab].map(c => _normCab_(c));
    const iOs = nomes.findIndex(c => /ORDEM SERVICO|^OS$/.test(c));
    const iTot = nomes.findIndex(c => /TOTAL O ?S|TOTAL OS|^TOTAL/.test(c));
    const iComp = nomes.findIndex(c => /COMPET/.test(c));
    const iConcl = nomes.findIndex(c => /DATA CONCLUS/.test(c));
    for (let r = cab + 1; r < valores.length; r++) {
      const os = String(valores[r][iOs] || '').replace(/\D/g, '');
      if (!os) continue;
      const comp = _compSegura_(valores[r][iComp]);
      const item = { os: os, valor: _num_(valores[r][iTot]) || 0, conclusao: iConcl >= 0 ? _dataTxt_(valores[r][iConcl]) : '' };
      saida.faturadas[os] = comp || true;
      if (comp) (saida.porComp[comp] = saida.porComp[comp] || []).push(item);
    }
  }
  // aba OS
  const tab = _abaPorCabecalho_(SpreadsheetApp.openById(CONFIG.ID_BASE), CONFIG.ABA_OS_PENDENTES, ['OS', 'Placa', 'Orçado', 'Status']);
  if (tab) {
    _linhasComoObjetos_(tab).forEach(o => {
      const os = String(_txt_(o['OS'])).replace(/\D/g, '');
      if (!os) return;
      const item = { os: os, placa: _txt_(o['Placa']), status: _txt_(o['Status']),
        orcado: _num_(o['Orçado']) || 0, aprovado: _num_(o['Aprovado']) || 0, data: _dataTxt_(o['Data']) };
      item.valor = item.aprovado > 0 ? item.aprovado : item.orcado;
      saida.osPorNumero[os] = item;
      (saida.osPorStatus[item.status] = saida.osPorStatus[item.status] || []).push(item);
    });
  }
  return saida;
}

/**
 * Projeção de faturamento da manutenção.
 *
 * O que realmente vira fatura é o serviço CONCLUÍDO. Por isso a base é:
 *   1. OS com status "Cobradas" que ainda não aparecem em nenhuma fatura
 *      do OrçamentosDB — já viraram cobrança e entram na próxima;
 *   2. aceites pendentes (aba Aceites) — a oficina concluiu e aguarda o
 *      aceite; é o valor efetivamente medido, não o orçado;
 *   3. "Concluídas e não cobradas" da aba OS que não estejam já contadas
 *      em 1 ou 2;
 *   4. "Aprovadas e não iniciadas", só pelo valor APROVADO, e apenas para o
 *      mês seguinte, porque ainda dependem de execução.
 *
 * Fica de fora de qualquer projeção: OS aguardando aprovação, em revisão ou
 * não enviadas (não há data para executar), o valor "Orçado" de OS sem valor
 * aprovado (o orçado traz itens que não serão pagos) e registros antigos
 * demais, que costumam ser resíduo de meses já faturados.
 */
const PROJECAO_MESES_VALIDOS = 6;   // registros mais antigos que isto não entram

/** As maiores OS de uma parcela, para a conta poder ser conferida. */
function _maioresItens_(lista) {
  return (lista || []).slice()
    .map(o => ({ os: o.os, placa: o.placa || '', valor: o.aprovado !== undefined && o.aprovado > 0 ? o.aprovado : (o.valor || 0),
                 data: o.data || o.conclusao || '', status: o.status || '' }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
}

function projecaoOS(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const d = _dadosFatura_();
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const hoje = new Date();
    const limite = new Date(hoje.getFullYear(), hoje.getMonth() - PROJECAO_MESES_VALIDOS, 1);
    const recente = txt => {
      const m = String(txt || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) return true;                       // sem data, não descarta
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) >= limite;
    };

    // ---- a aba Aceites define o universo válido: OS que não estão nela são
    // antigas e não entram em projeção nenhuma
    const naAbaAceites = {};
    const aceites = [];
    try {
      const tab = _abaPorCabecalho_(ss, CONFIG.ABA_OS_ACEITES, ['OS', 'Placa', 'Valor Total']);
      if (tab) _linhasComoObjetos_(tab).forEach(o => {
        const chave = String(_txt_(o['OS'])).replace(/\D/g, '');
        if (chave) naAbaAceites[chave] = { status: _txt_(o['Status']), valor: _num_(o['Valor Total']) || 0 };
        const os = chave;
        const status = _txt_(o['Status']);
        if (!os || d.faturadas[os]) return;                       // já faturada
        if (/cobrad/i.test(status)) return;                       // entra como cobrada, abaixo
        const valor = _num_(o['Valor Total']) || 0;
        if (valor <= 0) return;
        aceites.push({ os: os, placa: _txt_(o['Placa']), valor: valor, status: status,
          conclusao: _dataTxt_(o['Data Conclusão Serviço']) });
      });
    } catch (e) { Logger.log('Aceites na projeção: ' + e); }

    // ---- 1. cobradas ainda não faturadas, somente as que constam na aba Aceites
    const cobradas = (d.osPorStatus['Cobradas'] || []);
    const aFaturar = cobradas.filter(o => !d.faturadas[o.os] && naAbaAceites[o.os] && o.aprovado > 0);

    const jaContadas = {};
    aFaturar.forEach(o => { jaContadas[o.os] = true; });
    const aceitesLimpos = aceites.filter(a => !jaContadas[a.os]);
    aceitesLimpos.forEach(a => { jaContadas[a.os] = true; });

    // ---- 3. concluídas e não cobradas, também só as que estão na aba Aceites
    const concluidas = (d.osPorStatus['Concluídas e Não Cobradas'] || [])
      .filter(o => !jaContadas[o.os] && !d.faturadas[o.os] && naAbaAceites[o.os] && o.aprovado > 0);
    concluidas.forEach(o => { jaContadas[o.os] = true; });

    // ---- 4. aprovadas e não iniciadas: ainda não chegaram à aba Aceites (o
    // serviço nem começou), então aqui o corte por data continua valendo
    const aprovadas = (d.osPorStatus['Aprovadas e Não Iniciadas'] || [])
      .filter(o => !jaContadas[o.os] && !d.faturadas[o.os] && recente(o.data) && o.aprovado > 0);

    const soma = arr => Math.round(arr.reduce((s, o) => s + (o.aprovado !== undefined ? o.aprovado : o.valor || 0), 0) * 100) / 100;
    const somaAceites = Math.round(aceitesLimpos.reduce((s, a) => s + a.valor, 0) * 100) / 100;

    // histórico real
    const comps = Object.keys(d.porComp).sort((a, b) => _ordemComp_(a).localeCompare(_ordemComp_(b)));
    const historico = comps.slice(-12).map(c => ({ comp: c, valor: Math.round(d.porComp[c].reduce((s, x) => s + x.valor, 0) * 100) / 100 }));
    const ultimos = historico.slice(-6);
    const media = ultimos.length ? Math.round(ultimos.reduce((s, x) => s + x.valor, 0) / ultimos.length * 100) / 100 : 0;

    const diaDoMes = hoje.getDate();
    const fatiaAceites = diaDoMes <= 20 ? 0.8 : 0.5;        // depende de a NF da oficina entrar a tempo
    const fatiaAprovadas = diaDoMes <= 10 ? 0.25 : 0.10;    // precisa executar e concluir ainda neste mês

    const proximoValor = Math.round((soma(aFaturar) + somaAceites * fatiaAceites + soma(concluidas) * 0.7 + soma(aprovadas) * fatiaAprovadas) * 100) / 100;
    const seguinteValor = Math.round((somaAceites * (1 - fatiaAceites) + soma(concluidas) * 0.3 + soma(aprovadas) * (1 - fatiaAprovadas)) * 100) / 100;

    const rot = n => { const x = new Date(hoje.getFullYear(), hoje.getMonth() + n, 1); return ('0' + (x.getMonth() + 1)).slice(-2) + '/' + x.getFullYear(); };

    // fora da projeção, apenas informativo
    const foraStatus = Object.keys(d.osPorStatus).filter(st => !/^COBRADAS$|CONCLU|APROVADAS E NAO INICIADAS/i.test(_normCab_(st)));
    const fora = [];
    foraStatus.forEach(st => d.osPorStatus[st].forEach(o => fora.push(Object.assign({ statusNome: st }, o))));

    return { ok: true,
      proximo: { comp: rot(1), valor: proximoValor },
      seguinte: { comp: rot(2), valor: seguinteValor },
      composicao: [
        { rotulo: 'Cobradas ainda não faturadas', qtd: aFaturar.length, valor: soma(aFaturar),
          noProximo: soma(aFaturar), noSeguinte: 0, nota: 'já viraram cobrança e não constam em nenhuma fatura',
          itens: _maioresItens_(aFaturar) },
        { rotulo: 'Aceites pendentes', qtd: aceitesLimpos.length, valor: somaAceites,
          noProximo: Math.round(somaAceites * fatiaAceites * 100) / 100,
          noSeguinte: Math.round(somaAceites * (1 - fatiaAceites) * 100) / 100,
          nota: 'serviço concluído; falta o aceite e a nota fiscal da oficina',
          itens: _maioresItens_(aceitesLimpos) },
        { rotulo: 'Concluídas e não cobradas', qtd: concluidas.length, valor: soma(concluidas),
          noProximo: Math.round(soma(concluidas) * 0.7 * 100) / 100, noSeguinte: Math.round(soma(concluidas) * 0.3 * 100) / 100,
          nota: 'da aba OS, sem aceite correspondente', itens: _maioresItens_(concluidas) },
        { rotulo: 'Aprovadas e não iniciadas', qtd: aprovadas.length, valor: soma(aprovadas),
          noProximo: Math.round(soma(aprovadas) * fatiaAprovadas * 100) / 100,
          noSeguinte: Math.round(soma(aprovadas) * (1 - fatiaAprovadas) * 100) / 100,
          nota: 'valor aprovado; ainda depende de a oficina executar', itens: _maioresItens_(aprovadas) }
      ],
      semPrevisao: { qtd: fora.length,
        valor: Math.round(fora.reduce((s, o) => s + (o.aprovado > 0 ? o.aprovado : 0), 0) * 100) / 100,
        orcado: Math.round(fora.reduce((s, o) => s + (o.orcado || 0), 0) * 100) / 100,
        porStatus: foraStatus.map(st => ({ status: st, qtd: d.osPorStatus[st].length,
          valor: Math.round(d.osPorStatus[st].reduce((s, o) => s + (o.aprovado > 0 ? o.aprovado : 0), 0) * 100) / 100,
          orcado: Math.round(d.osPorStatus[st].reduce((s, o) => s + (o.orcado || 0), 0) * 100) / 100 })).sort((a, b) => b.orcado - a.orcado) },
      jaFaturadas: cobradas.length - aFaturar.length,
      foraDaAbaAceites: cobradas.filter(o => !d.faturadas[o.os] && !naAbaAceites[o.os]).length,
      totalNaAbaAceites: Object.keys(naAbaAceites).length,
      historico: historico, media: media, diaDoMes: diaDoMes,
      fatiaAceites: fatiaAceites, fatiaAprovadas: fatiaAprovadas, mesesValidos: PROJECAO_MESES_VALIDOS,
      descartados: (cobradas.length - aFaturar.length) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}


/**
 * Lista, no editor, todas as OS que a projeção considera "cobradas e ainda não
 * faturadas" e diz por que cada uma não casou com o OrçamentosDB. É a forma de
 * separar faturamento real a vir de simples diferença de número entre as bases.
 */
function listarCobradasSemFatura() {
  const d = _dadosFatura_();
  const cobradas = d.osPorStatus['Cobradas'] || [];
  const faturadas = Object.keys(d.faturadas);
  Logger.log('OS com status "Cobradas" na aba OS: ' + cobradas.length);
  Logger.log('Números distintos no OrçamentosDB: ' + faturadas.length);

  const hoje = new Date();
  const limite = new Date(hoje.getFullYear(), hoje.getMonth() - PROJECAO_MESES_VALIDOS, 1);
  const semFatura = [], comFatura = [];
  cobradas.forEach(o => (d.faturadas[o.os] ? comFatura : semFatura).push(o));
  Logger.log('Já faturadas: ' + comFatura.length + ' | sem fatura: ' + semFatura.length);
  Logger.log('');

  let total = 0, antigas = 0, semValor = 0;
  semFatura.sort((a, b) => (b.aprovado || 0) - (a.aprovado || 0)).forEach(o => {
    const m = String(o.data || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const data = m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
    const antiga = data && data < limite;
    const entra = !antiga && o.aprovado > 0;
    if (entra) total += o.aprovado; else if (antiga) antigas++; else semValor++;

    // o número aparece no OrçamentosDB de outra forma? (zeros à esquerda, sufixo)
    let parecido = '';
    for (let i = 0; i < faturadas.length; i++) {
      const f = faturadas[i];
      if (f !== o.os && (f.indexOf(o.os) >= 0 || o.os.indexOf(f) >= 0)) { parecido = f; break; }
    }
    Logger.log((entra ? '→ ENTRA  ' : antiga ? '  antiga ' : '  s/valor') +
      ' OS ' + o.os + ' | ' + (o.placa || '—') + ' | ' + (o.data || 's/data') +
      ' | aprovado ' + _moedaBR_(o.aprovado || 0) + ' | orçado ' + _moedaBR_(o.orcado || 0) +
      (parecido ? '  ⚠ número parecido no OrçamentosDB: ' + parecido : ''));
  });
  Logger.log('');
  Logger.log('TOTAL que entra na projeção: ' + _moedaBR_(total));
  Logger.log('Descartadas por serem anteriores a ' + Utilities.formatDate(limite, CONFIG.FUSO, 'MM/yyyy') + ': ' + antigas);
  Logger.log('Descartadas por não terem valor aprovado: ' + semValor);
  Logger.log('');
  Logger.log('Se aparecer "número parecido", as duas bases escrevem a OS de formas diferentes');
  Logger.log('e o cruzamento precisa ser ajustado — me avise que eu corrijo a normalização.');
  return total;
}

/** Atalho para rodar a análise no editor. */
function analisarFatura() { return analisarFormacaoFatura(null, null); }

/* ------------------------------------------------------------ */
/*  Edição de campos da aba OS (observações, relato, justificativa) */
/* ------------------------------------------------------------ */

/**
 * Valor de um registro procurando o cabeçalho por nomes alternativos e, se
 * nenhum casar, por prefixo normalizado. Cabeçalhos mudam na planilha; o
 * painel não deveria deixar de ler por causa disso.
 */
function _valorPorCabecalho_(obj, nomes, prefixo) {
  for (let i = 0; i < nomes.length; i++) {
    if (obj[nomes[i]] !== undefined && String(obj[nomes[i]]).trim() !== '') return _txt_(obj[nomes[i]]);
  }
  if (prefixo) {
    const chaves = Object.keys(obj);
    for (let i = 0; i < chaves.length; i++) {
      if (_normCab_(chaves[i]).indexOf(prefixo) === 0) return _txt_(obj[chaves[i]]);
    }
  }
  return '';
}


/** Mostra onde o painel encontrou cada coluna editável da aba OS. */
function conferirColunasOS() {
  const ss = _ssManut_();
  const aba = ss.getSheetByName(CONFIG.ABA_OS) || SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_OS);
  if (!aba) { Logger.log('Aba OS não encontrada.'); return; }
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  Logger.log('Cabeçalho da aba ' + aba.getName() + ':');
  cab.forEach((c, i) => { if (c) Logger.log('   ' + _letraColuna_(i + 1) + ': ' + c); });
  Logger.log('');
  Logger.log('Campos editáveis pelo painel:');
  Object.keys(CAMPOS_OS_EDITAVEIS).forEach(chave => {
    const nomes = ALTERNATIVAS_OS[chave] || [CAMPOS_OS_EDITAVEIS[chave]];
    let col = -1;
    for (let i = 0; i < nomes.length && col < 0; i++) col = cab.findIndex(c => c.toUpperCase() === nomes[i].toUpperCase());
    let porPrefixo = false;
    if (col < 0) {
      const alvo = _normCab_(nomes[0]);
      col = cab.findIndex(c => _normCab_(c).indexOf(alvo) === 0);
      porPrefixo = col >= 0;
    }
    Logger.log('   ' + chave.padEnd(14) + (col < 0 ? 'NÃO ENCONTRADA — procurei por: ' + nomes.join(', ')
      : _letraColuna_(col + 1) + '  "' + cab[col] + '"' + (porPrefixo ? '  (casou pelo início do nome)' : '')));
  });
  return 'ok';
}

const CAMPOS_OS_EDITAVEIS = { obs: 'Observações', relato: 'Relato', diligencia: 'Diligência', justificativa: 'Justificativa', status: 'Status' };
/** Rótulos alternativos aceitos para cada campo editável da aba OS. */
const ALTERNATIVAS_OS = { aprovacao: ['Aprovação', 'Aprovacao', 'Análise', 'Analise'], obs: ['Observações', 'Observacoes'],
  relato: ['Relato'], justificativa: ['Justificativa'],
  // o cabeçalho desta coluna já mudou algumas vezes; aceitamos as variações
  diligencia: ['Diligência', 'Diligencia', 'Diligência/Revisão/Fórum', 'Diligencia/Revisao/Forum',
               'Diligência / Revisão / Fórum', 'Revisão', 'Fórum'],
  status: ['Status', 'Situação', 'Situacao'] };

function salvarCamposOS(token, os, campos) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const numero = String(os || '').replace(/\D/g, '');
  if (!numero) return { ok: false, erro: 'OS não informada.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha ocupada. Tente de novo.' }; }
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_OS_PENDENTES);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_OS_PENDENTES + '" não encontrada.' };
    const valores = aba.getDataRange().getValues();
    let linhaCab = -1;
    for (let i = 0; i < Math.min(5, valores.length); i++) {
      if (valores[i].some(c => String(c).trim().toUpperCase() === 'OS')) { linhaCab = i; break; }
    }
    if (linhaCab < 0) return { ok: false, erro: 'Não encontrei o cabeçalho da aba OS.' };
    const cab = valores[linhaCab].map(c => String(c || '').trim());
    const colOs = cab.findIndex(c => c.toUpperCase() === 'OS');
    if (colOs < 0) return { ok: false, erro: 'Coluna OS não encontrada.' };

    let linha = -1;
    for (let r = linhaCab + 1; r < valores.length; r++) {
      if (String(valores[r][colOs] || '').replace(/\D/g, '') === numero) { linha = r + 1; break; }
    }
    if (linha < 0) return { ok: false, erro: 'OS ' + numero + ' não encontrada na planilha.' };

    const gravados = [], recusados = [];
    Object.keys(campos || {}).forEach(chave => {
      const rotulo = CAMPOS_OS_EDITAVEIS[chave];
      if (!rotulo) { recusados.push(chave); return; }
      const nomes = ALTERNATIVAS_OS[chave] || [rotulo];
      let col = -1;
      for (let i = 0; i < nomes.length && col < 0; i++) col = cab.findIndex(c => c.toUpperCase() === nomes[i].toUpperCase());
      // se nenhum nome casar, aceita o cabeçalho que comece pelo primeiro nome
      if (col < 0) {
        const alvo = _normCab_(nomes[0]);
        col = cab.findIndex(c => _normCab_(c).indexOf(alvo) === 0);
      }
      if (col < 0) { recusados.push(rotulo + ' (coluna inexistente)'); return; }
      const celula = aba.getRange(linha, col + 1);
      if (celula.getFormula()) { recusados.push(rotulo + ' (coluna com fórmula)'); return; }
      celula.setValue(String(campos[chave] === null || campos[chave] === undefined ? '' : campos[chave]));
      gravados.push(rotulo);
    });
    SpreadsheetApp.flush();
    if (gravados.length) { limparCache(); _logAcao_(p.ss, p.sessao.email, 'Editar OS', numero, gravados.join(', '), JSON.stringify(campos).substring(0, 400)); }
    return { ok: true, gravados: gravados, recusados: recusados, linha: linha };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}


/* ============================================================
   COMPLETAR DADOS ÓBVIOS POR MODELO
   Viaturas do mesmo modelo compartilham espécie, categoria, tipo e
   característica. Onde o campo está vazio e as demais do mesmo modelo
   concordam entre si, o valor é preenchido. Havendo divergência, a
   viatura é apenas listada — nada é escrito no escuro.
   ============================================================ */

/** Campos que se deduzem do modelo, com o rótulo usado no log. */
const CAMPOS_DEDUZIVEIS = [
  { campo: 'especie',   rotulo: 'Espécie' },
  { campo: 'categoria', rotulo: 'Categoria' },
  { campo: 'tipo',      rotulo: 'Tipo' },
  { campo: 'carac',     rotulo: 'Característica' },
  { campo: 'comb',      rotulo: 'Combustível' }
];

/** Confere o que seria preenchido, sem alterar nada. */
function completarPorModelo() { return _completarPorModelo_(false); }

/** Preenche de fato as células vazias. */
function completarPorModeloAplicar() { return _completarPorModelo_(true); }

function _completarPorModelo_(aplicar) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_BASE);
  if (!aba) throw new Error('Aba ' + CONFIG.ABA_BASE + ' não encontrada.');

  const nLin = aba.getLastRow(), nCol = aba.getLastColumn();
  const cab = aba.getRange(1, 1, 1, nCol).getValues()[0].map(c => String(c || '').trim());
  const idx = _mapearCampos_(cab);
  const mapa = _mapaEdicao_(aba);

  if (idx.modelo === undefined) throw new Error('Coluna de modelo não encontrada.');
  const valores = aba.getRange(2, 1, nLin - 1, nCol).getValues();

  // quais campos podem ser escritos
  const alvos = CAMPOS_DEDUZIVEIS.filter(f => {
    if (idx[f.campo] === undefined) { Logger.log('· ' + f.rotulo + ': coluna não existe — ignorado'); return false; }
    const info = mapa.porCampo[f.campo];
    if (info && !info.editavel) { Logger.log('· ' + f.rotulo + ': coluna bloqueada (' + info.motivo + ') — ignorado'); return false; }
    return true;
  });
  if (!alvos.length) { Logger.log('Nenhum campo disponível para completar.'); return; }

  // valores conhecidos por modelo
  const porModelo = {};
  valores.forEach(l => {
    const modelo = _normCab_(l[idx.modelo]);
    if (!modelo) return;
    const m = porModelo[modelo] || (porModelo[modelo] = {});
    alvos.forEach(f => {
      const v = String(l[idx[f.campo]] || '').trim();
      if (!v) return;
      (m[f.campo] = m[f.campo] || {})[v] = (m[f.campo][v] || 0) + 1;
    });
  });

  const aEscrever = [], conflitos = [], semReferencia = [];
  valores.forEach((l, i) => {
    const modelo = _normCab_(l[idx.modelo]);
    if (!modelo) return;
    const placa = String(l[idx.placa] || '').trim();
    alvos.forEach(f => {
      const atual = String(l[idx[f.campo]] || '').trim();
      if (atual) return;
      const opcoes = (porModelo[modelo] || {})[f.campo];
      if (!opcoes) { semReferencia.push(placa + ' · ' + f.rotulo + ' (modelo ' + l[idx.modelo] + ' não tem nenhum preenchido)'); return; }
      const distintos = Object.keys(opcoes);
      if (distintos.length > 1) {
        conflitos.push(placa + ' · ' + f.rotulo + ': o modelo ' + l[idx.modelo] + ' tem ' +
          distintos.map(d => d + ' (' + opcoes[d] + ')').join(' e '));
        return;
      }
      aEscrever.push({ linha: i + 2, col: idx[f.campo] + 1, placa: placa, modelo: String(l[idx.modelo]).trim(),
        campo: f.rotulo, valor: distintos[0] });
    });
  });

  Logger.log('=== COMPLETAR POR MODELO ' + (aplicar ? '(gravando)' : '(somente conferência)') + ' ===');
  Logger.log('Campos considerados: ' + alvos.map(f => f.rotulo).join(', '));
  Logger.log('Preenchimentos possíveis: ' + aEscrever.length);
  const porCampo = {};
  aEscrever.forEach(x => { porCampo[x.campo] = (porCampo[x.campo] || 0) + 1; });
  Object.keys(porCampo).forEach(c => Logger.log('   ' + c + ': ' + porCampo[c]));
  aEscrever.slice(0, 25).forEach(x => Logger.log('   ' + x.placa + ' (' + x.modelo + ') · ' + x.campo + ' ← ' + x.valor));
  if (aEscrever.length > 25) Logger.log('   … e mais ' + (aEscrever.length - 25));
  if (conflitos.length) {
    Logger.log('Divergências (não preenchidas): ' + conflitos.length);
    conflitos.slice(0, 15).forEach(c => Logger.log('   ' + c));
    if (conflitos.length > 15) Logger.log('   … e mais ' + (conflitos.length - 15));
  }
  if (semReferencia.length) Logger.log('Sem referência no modelo: ' + semReferencia.length + ' (nenhuma outra viatura do modelo tem o campo preenchido)');

  if (!aplicar) { Logger.log('Nada gravado. Rode completarPorModeloAplicar() para escrever.'); return aEscrever.length + ' possíveis'; }

  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { Logger.log('Planilha ocupada.'); return; }
  try {
    aEscrever.forEach(x => aba.getRange(x.linha, x.col).setValue(x.valor));
    SpreadsheetApp.flush();
    limparCache();
    Logger.log(aEscrever.length + ' célula(s) preenchida(s).');
    try {
      _logAcao_(SpreadsheetApp.openById(CONFIG.ID_BASE), Session.getEffectiveUser().getEmail(),
        'Completar por modelo', '', aEscrever.length + ' células', Object.keys(porCampo).map(c => c + ': ' + porCampo[c]).join(' | '));
    } catch (e) {}
    return aEscrever.length + ' gravadas';
  } finally { trava.releaseLock(); }
}


/* ============================================================
   LEITURA DO CRLV — validação e preenchimento de lacunas
   O CRLV-e traz, em texto, os dados oficiais do veículo. Aqui eles
   são extraídos, comparados com a ConsultaBD e usados para preencher
   o que estiver em branco. O que diverge é apenas apontado: o painel
   não sobrescreve dado já preenchido sem você mandar.
   ============================================================ */

/** Campo do painel ← rótulo no CRLV. A ordem importa: o primeiro que casar vence. */
/** Campos que o CRLV informa e que o painel sabe gravar na ConsultaBD. */
const CAMPOS_CRLV = [
  { campo: 'renavam',  rotulo: 'Renavam' },
  { campo: 'chassi',   rotulo: 'Chassi' },
  { campo: 'anoFab',   rotulo: 'Ano de fabricação' },
  { campo: 'anoMod',   rotulo: 'Ano do modelo' },
  { campo: 'modelo',   rotulo: 'Marca/Modelo/Versão' },
  { campo: 'especie',  rotulo: 'Espécie' },
  { campo: 'tipo',     rotulo: 'Tipo' },
  { campo: 'categoria', rotulo: 'Categoria' },
  { campo: 'cor',      rotulo: 'Cor' },
  { campo: 'comb',     rotulo: 'Combustível' },
  { campo: 'potencia', rotulo: 'Potência/Cilindrada' },
  { campo: 'motor',    rotulo: 'Motor' },
  { campo: 'crv',      rotulo: 'Nº do CRV' },
  { campo: 'codCla',   rotulo: 'Código de segurança do CLA' },
  { campo: 'anoEx',    rotulo: 'Exercício' },
  { campo: 'cpfCnpj',  rotulo: 'CPF/CNPJ' },
  { campo: 'obsCrlv',  rotulo: 'Observações do CRLV' }
];

/**
 * Leitor do CRLV-e — independente de posição.
 *
 * O texto extraído do PDF varia muito: rótulos e valores podem vir em blocos
 * separados, colados na mesma linha ou embaralhados com o quadro do DPVAT.
 * Por isso nada aqui depende de "linha X" ou "logo após o rótulo": cada campo
 * é reconhecido pelo seu FORMATO (placa, chassi, anos, potência, CNPJ...) ou
 * por um DICIONÁRIO de valores válidos (cores, combustíveis, espécies, tipos,
 * categorias). Só as observações usam o rótulo, porque texto livre não tem
 * formato — e mesmo assim com proteções.
 */
const CRLV_DIC = {
  cores: ['BRANCA', 'PRETA', 'PRATA', 'CINZA', 'VERMELHA', 'AZUL', 'VERDE', 'AMARELA', 'BEGE', 'MARROM',
          'DOURADA', 'LARANJA', 'ROSA', 'ROXA', 'FANTASIA', 'GRENA', 'VINHO'],
  combustiveis: ['ALCOOL/GASOLINA', 'GASOLINA/ALCOOL', 'GASOLINA/GAS NATURAL', 'ALCOOL/GAS NATURAL',
                 'ALCOOL/GASOLINA/GAS NATURAL', 'GASOLINA/ELETRICO', 'ALCOOL/GASOLINA/ELETRICO',
                 'ELETRICO/FONTE INTERNA', 'ELETRICO/FONTE EXTERNA', 'GAS NATURAL VEICULAR',
                 'GASOLINA', 'ALCOOL', 'ETANOL', 'DIESEL', 'ELETRICO', 'HIBRIDO', 'GNV'],
  especies: ['PASSAGEIRO', 'CARGA', 'MISTO', 'TRACAO', 'ESPECIAL', 'COLECAO'],
  tipos: ['CAMINHAO TRATOR', 'SEMI-REBOQUE', 'MOTOR-CASA', 'CHASSI PLATAFORMA', 'TRATOR RODAS', 'TRATOR ESTEIRAS',
          'TRATOR MISTO', 'AUTOMOVEL', 'CAMIONETA', 'CAMINHONETE', 'CAMINHAO', 'UTILITARIO', 'MOTOCICLETA',
          'MOTONETA', 'MICROONIBUS', 'ONIBUS', 'REBOQUE', 'CICLOMOTOR', 'TRICICLO', 'QUADRICICLO', 'SIDE-CAR'],
  categorias: ['OFICIAL', 'PARTICULAR', 'ALUGUEL', 'APRENDIZAGEM', 'DIPLOMATICO', 'EXPERIENCIA', 'COLECAO'],
  // valores de CARROCERIA — também têm barra e não podem ser confundidos com o modelo
  carrocerias: ['ABERTA/CABINE DUPLA', 'ABERTA/CABINE SIMPLES', 'FECHADA/BAU', 'FECHADA/FURGAO', 'ABERTA',
                'FECHADA', 'BASCULANTE', 'TANQUE', 'NAO APLICAVEL', 'CABINE DUPLA', 'CABINE SIMPLES',
                'CABINE ESTENDIDA', 'MISTO', 'PICK-UP', 'FURGAO', 'BAU', 'PLATAFORMA', 'SILO', 'CEGONHA']
};

function _camposCrlv_(texto) {
  const achados = {};
  const bruto = String(texto || '');
  // texto sem acentos, em maiúsculas, com espaços normalizados — mantém a ordem original
  const T = bruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
                 .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n');
  const linhas = T.split('\n').map(l => l.trim()).filter(l => l);
  const tudo = linhas.join('\n');
  const RE_PLACA = '[A-Z]{3}[ -]?\\d[A-Z0-9]\\d{2}';
  const g = (campo, v) => { const t = String(v || '').trim(); if (t && !/^\*+$/.test(t)) achados[campo] = t; };
  const primeiro = (re, grupo) => { const m = tudo.match(re); return m ? m[grupo || 1] : ''; };
  const escapar = s => s.replace(/[.*+?^${}()|[\]\\\/-]/g, '\\$&');

  /* ---------- formato ---------- */
  // placa + exercício ("JKP5287 2025"); guarda também a placa sozinha se preciso
  let m = tudo.match(new RegExp('(?:^|\\n)(' + RE_PLACA + ') ((?:19|20)\\d{2})(?=\\s|$)', 'm'));
  if (m) { g('placa', m[1].replace(/[ -]/g, '')); g('anoEx', m[2]); }

  // placa anterior/UF + chassi ("JKP5287/DF 8A1LZBW26EL692237")
  m = tudo.match(new RegExp('(' + RE_PLACA + ')\\/([A-Z]{2}) ([A-HJ-NPR-Z0-9]{17})\\b'));
  if (m) { g('chassi', m[3]); if (!achados.placa) g('placa', m[1].replace(/[ -]/g, '')); }
  if (!achados.chassi) g('chassi', primeiro(/\b([A-HJ-NPR-Z0-9]{17})\b/));

  // anos de fabricação e modelo: dois anos juntos, que não sejam a linha da placa
  m = tudo.match(/(?:^|\n)((?:19|20)\d{2}) ((?:19|20)\d{2})(?=\s|$)/m);
  if (m) { g('anoFab', m[1]); g('anoMod', m[2]); }

  // renavam: 9 a 11 dígitos sozinhos numa linha (vem antes do CRV, de 12)
  g('renavam', primeiro(/(?:^|\n)(\d{9,11})(?=\n|$)/m));
  // número do CRV: 12 a 14 dígitos sozinhos (quando o documento imprime)
  const crvs = tudo.match(/(?:^|\n)(\d{12,14})(?=\n|$)/gm) || [];
  if (crvs.length) g('crv', crvs[0].trim());
  // código de segurança do CLA: dígitos seguidos de asteriscos
  g('codCla', primeiro(/(\d{9,13}) \*+/));
  // potência/cilindrada
  g('potencia', primeiro(/(\d{1,4} ?CV ?\/ ?\d{2,5})\b/) || primeiro(/(?:^|\n|TOTAL )(\d{2,4}\/\d{3,5})(?= [\d.,]+(?:\s|$))/m));
  // motor: código seguido de CMT, eixos e lotação ("M4RR752N267968 3.06 2 05P")
  m = tudo.match(/([A-Z0-9*]{6,20}) \d+[.,]\d+ \d{1,2} \d{2}P\b/) || tudo.match(/([A-Z0-9*]{6,20}) [\d.,*]+ \*? ?\d{2}P\b/);
  if (m) { const cod = m[1].replace(/^\*+|\*+$/g, ''); if (/[A-Z]/.test(cod) && /\d/.test(cod) && cod !== achados.chassi) g('motor', cod); }
  // CPF/CNPJ do proprietário
  g('cpfCnpj', primeiro(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2})/));

  /* ---------- dicionário ---------- */
  const alternativas = lista => lista.map(escapar).join('|');
  m = tudo.match(new RegExp('\\b(' + alternativas(CRLV_DIC.categorias) + ')\\b'));
  if (m) g('categoria', m[1]);
  // cor + combustível costumam vir juntos ("PRATA ALCOOL/GASOLINA"); aceita separados
  m = tudo.match(new RegExp('\\b(' + alternativas(CRLV_DIC.cores) + ') (' + alternativas(CRLV_DIC.combustiveis) + ')\\b'));
  if (m) { g('cor', m[1]); g('comb', m[2]); }
  else {
    m = tudo.match(new RegExp('\\b(' + alternativas(CRLV_DIC.cores) + ')\\b')); if (m) g('cor', m[1]);
    m = tudo.match(new RegExp('\\b(' + alternativas(CRLV_DIC.combustiveis) + ')\\b')); if (m) g('comb', m[1]);
  }
  // espécie + tipo ("PASSAGEIRO AUTOMOVEL", "CARGA CAMINHONETE")
  m = tudo.match(new RegExp('\\b(' + alternativas(CRLV_DIC.especies) + ') (' + alternativas(CRLV_DIC.tipos) + ')\\b'));
  if (m) { g('especie', m[1]); g('tipo', m[2]); }

  // marca/modelo/versão: "MARCA/MODELO ..." com barra entre duas palavras, sem ser
  // placa/UF, CNPJ, combustível ou potência. Corta no próximo rótulo do documento.
  // o valor vem DEPOIS do rótulo "MARCA / MODELO" no texto; e nunca é carroceria
  const posRotuloModelo = tudo.search(/MARCA ?\/ ?MODELO/);
  const posDe = l => tudo.indexOf(l);
  const linhasModelo = linhas.filter(l => /\b[A-Z]{1,12}\/[A-Z0-9]/.test(l) &&
      !new RegExp(RE_PLACA + '\\/[A-Z]{2}').test(l) && !/\d{2}\.\d{3}\.\d{3}\//.test(l) &&
      !/\bCV ?\//.test(l) && !new RegExp('\\b(' + alternativas(CRLV_DIC.combustiveis) + ')\\b').test(l) &&
      !new RegExp('^(' + alternativas(CRLV_DIC.carrocerias) + ')\\b').test(l) &&
      !/(CARROCERIA|R\$|POTENCIA|CILINDRADA|CPF|VALIDE|HTTPS?:)/.test(l) &&
      (posRotuloModelo < 0 || posDe(l) > posRotuloModelo || /MARCA ?\/ ?MODELO/.test(l)));
  for (let i = 0; i < linhasModelo.length; i++) {
    let cand = linhasModelo[i];
    // remove rótulos colados antes e depois
    cand = cand.replace(/^.*?(\*{2,}\s*)?(MARCA ?\/ ?MODELO(?: ?\/ ?VERSAO)?)\s*/, '');
    cand = cand.split(/\b(ESPECIE|TIPO|PLACA|CHASSI|CATEGORIA|COR |COMBUSTIVEL|CARROCERIA|NOME|LOCAL|DATA|ASSINADO|DOCUMENTO|CAT\b|CPF|MOTOR|POTENCIA)\b/)[0].trim();
    cand = cand.replace(/^\*+\s*/, '').trim();
    if (/\b[A-Z]{1,12}\/[A-Z0-9]/.test(cand) && cand.length >= 5 && cand.length <= 45) { g('modelo', cand); break; }
  }

  /* ---------- observações (texto livre) ---------- */
  // só o que estiver na MESMA linha do rótulo (não atravessa a quebra de linha)
  m = tudo.match(/OBSERVACOES DO VEICULO(?: INFORMACOES DO SEGURO DPVAT)?[ \t]+([^\n]{3,120})/);
  if (m && !/^(INFORMACOES|MENSAGENS|DADOS|NOME|LOCAL)/.test(m[1].trim())) g('obsCrlv', m[1].trim());
  if (!achados.obsCrlv && /SEM OBSERVACOES/.test(tudo)) g('obsCrlv', 'SEM OBSERVAÇÕES');
  if (!achados.obsCrlv) {
    // linha depois de "cidade UF dd/mm/aaaa", quando for texto de verdade
    m = tudo.match(/[A-Z ]+ [A-Z]{2} \d{2}\/\d{2}\/\d{4}[^\n]*\n([^\n*]{3,120})/);
    if (m && !/(MENSAGENS|VOCE SABIA|DADOS DO SEGURO|DOCUMENTO EMITIDO|ESPECIE|MARCA)/.test(m[1])) g('obsCrlv', m[1].trim());
  }
  if (achados.obsCrlv) {
    achados.obsCrlv = achados.obsCrlv.replace(/\s*(DOCUMENTO EMITIDO.*|MENSAGENS.*)$/, '').trim();
    // o texto lido vem sem acentos; devolve a grafia correta do caso mais comum
    if (/^SEM OBSERVACOES$/i.test(achados.obsCrlv)) achados.obsCrlv = 'SEM OBSERVAÇÕES';
  }

  return achados;
}

/**
 * Mostra o texto que o Apps Script realmente extrai do CRLV de uma viatura.
 * É com esse texto que o leitor precisa ser escrito — o layout varia conforme
 * o PDF. Rode no editor e copie o log.
 *     verTextoCrlv('PNY1624')
 */
function verTextoCrlv(placa) {
  placa = String(placa || '').trim().toUpperCase();
  if (!placa) { Logger.log('Informe a placa: verTextoCrlv("PNY1624")'); return; }
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) { Logger.log('Placa não encontrada.'); return; }
  const link = String(aba.getRange(alvo.linha, alvo.idx.linkCrlv + 1).getValue() || '');
  const id = (link.match(/[-\w]{25,}/) || [])[0];
  if (!id) { Logger.log('Esta viatura não tem CRLV anexado.'); return; }

  const arquivo = DriveApp.getFileById(id);
  Logger.log('Arquivo: ' + arquivo.getName() + ' (' + Math.round(arquivo.getSize() / 1024) + ' KB)');
  const texto = _pdfTexto_(arquivo.getBlob().getBytes());
  if (!texto) { Logger.log('Não consegui extrair texto — provavelmente é um PDF digitalizado (imagem).'); return; }

  Logger.log('--- TEXTO EXTRAÍDO (' + texto.length + ' caracteres) ---');
  // em blocos, porque o log corta linhas longas
  const linhas = texto.split(/\r?\n/).filter(l => l.trim() !== '');
  linhas.forEach((l, i) => Logger.log(('  ' + (i + 1)).slice(-4) + ': ' + l.substring(0, 180)));
  Logger.log('--- FIM ---');
  Logger.log('O leitor entendeu assim:');
  const lidos = _camposCrlv_(texto);
  Object.keys(lidos).forEach(k => Logger.log('   ' + k + ' = ' + lidos[k]));
  return 'ok';
}

/** Coluna da ConsultaBD para cada campo do CRLV: primeiro o campo mapeado,
    depois o cabeçalho procurado pelo nome (para colunas novas como potência). */
const COLUNAS_CRLV = {
  potencia: ['POTENCIA/CILINDRADA', 'POTENCIA / CILINDRADA', 'POTENCIA CILINDRADA', 'POTENCIA'],
  motor: ['MOTOR', 'NUMERO DO MOTOR', 'N MOTOR'],
  codCla: ['CODIGO DE SEGURANCA DO CLA', 'CODIGO CLA', 'CLA'],
  cpfCnpj: ['CPF/CNPJ PROPRIETARIO', 'CPF / CNPJ PROPRIETARIO', 'CPF/CNPJ DO PROPRIETARIO', 'CPF/CNPJ', 'CPF / CNPJ', 'CNPJ PROPRIETARIO', 'CNPJ'],
  obsCrlv: ['OBSERVACOES DO CRLV', 'OBSERVACOES CRLV', 'OBSERVACOES'],
  crv: ['NUMERO DO CRV', 'N DO CRV', 'CRV']
};

/** Acha a coluna da planilha para um campo do CRLV. */
function _colunaDoCampoCrlv_(campo, idx, cab) {
  if (idx[campo] !== undefined) return idx[campo];
  const nomes = COLUNAS_CRLV[campo] || [];
  const normal = cab.map(c => _normCab_(c));
  // 1) nome exato
  for (let i = 0; i < nomes.length; i++) {
    const p = normal.indexOf(_normCab_(nomes[i]));
    if (p >= 0) return p;
  }
  // 2) cabeçalho que comece com o nome procurado ("CPF/CNPJ Proprietário")
  for (let i = 0; i < nomes.length; i++) {
    const alvo = _normCab_(nomes[i]);
    const p = normal.findIndex(c => c && (c.indexOf(alvo) === 0 || alvo.indexOf(c) === 0));
    if (p >= 0) return p;
  }
  // 3) cabeçalho que contenha o nome, em qualquer posição
  for (let i = 0; i < nomes.length; i++) {
    const alvo = _normCab_(nomes[i]);
    const p = normal.findIndex(c => c && c.indexOf(alvo) >= 0);
    if (p >= 0) return p;
  }
  return undefined;
}

/** Lê o CRLV de uma viatura e compara com a ConsultaBD. */
function _lerCrlvDaViatura_(aba, mapa, linha, idx) {
  const placa = String(aba.getRange(linha, idx.placa + 1).getValue() || '').trim().toUpperCase();
  const link = idx.linkCrlv !== undefined ? String(aba.getRange(linha, idx.linkCrlv + 1).getValue() || '') : '';
  const id = (link.match(/[-\w]{25,}/) || [])[0];
  if (!id) return { placa: placa, erro: 'sem CRLV anexado' };
  let texto = '';
  try {
    texto = _pdfTexto_(DriveApp.getFileById(id).getBlob().getBytes());
  } catch (e) { return { placa: placa, erro: 'falha ao ler o PDF: ' + String(e).substring(0, 60) }; }
  if (!texto || texto.replace(/\s/g, '').length < 40) return { placa: placa, erro: 'PDF sem texto legível' };

  const lidos = _camposCrlv_(texto);
  if (lidos.placa && placa && lidos.placa !== placa) {
    return { placa: placa, erro: 'o PDF é da placa ' + lidos.placa, lidos: lidos };
  }
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const preencher = [], divergencias = [], ignorados = [];
  CAMPOS_CRLV.forEach(def => {
    const lido = lidos[def.campo];
    if (!lido) { ignorados.push({ campo: def.campo, motivo: 'não veio no CRLV' }); return; }
    const col = _colunaDoCampoCrlv_(def.campo, idx, cab);
    if (col === undefined) { ignorados.push({ campo: def.campo, motivo: 'sem coluna na ConsultaBD', valor: lido }); return; }
    const atual = String(aba.getRange(linha, col + 1).getValue() || '').trim();
    const info = mapa.porCampo[def.campo];
    if (info && !info.editavel) {
      // a coluna existe mas está protegida: mostramos o que faríamos, sem gravar
      if (!atual) ignorados.push({ campo: def.campo, motivo: 'coluna bloqueada (' + info.motivo + ')', valor: lido });
      else if (_normCab_(atual) !== _normCab_(lido)) divergencias.push({ campo: def.campo, atual: atual, crlv: lido, bloqueada: true });
      return;
    }
    if (!atual) { preencher.push({ campo: def.campo, col: col + 1, valor: lido }); return; }
    if (_normCab_(atual) !== _normCab_(lido)) divergencias.push({ campo: def.campo, atual: atual, crlv: lido });
  });
  return { placa: placa, lidos: lidos, preencher: preencher, divergencias: divergencias, ignorados: ignorados };
}

/** Confere (sem gravar) o que o CRLV preencheria. Processa em lotes. */
function validarCrlvFrota() { return _percorrerCrlv_(false); }

/** Preenche as lacunas a partir do CRLV. Processa em lotes. */
function validarCrlvFrotaAplicar() { return _percorrerCrlv_(true); }

/** Recomeça a varredura do zero. */
function reiniciarLeituraCrlv() {
  PropertiesService.getScriptProperties().deleteProperty('CRLV_PROGRESSO');
  Logger.log('Progresso zerado: a próxima execução começa da primeira viatura.');
}

function _percorrerCrlv_(aplicar) {
  const LOTE = 25;                                    // cada PDF leva alguns segundos
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_BASE);
  const nLin = aba.getLastRow(), nCol = aba.getLastColumn();
  const cab = aba.getRange(1, 1, 1, nCol).getValues()[0].map(c => String(c || '').trim());
  const idx = _mapearCampos_(cab);
  const mapa = _mapaEdicao_(aba);

  const props = PropertiesService.getScriptProperties();
  let inicio = parseInt(props.getProperty('CRLV_PROGRESSO') || '2', 10);
  if (inicio < 2 || inicio > nLin) inicio = 2;
  const fim = Math.min(inicio + LOTE - 1, nLin);

  Logger.log('=== CRLV ' + (aplicar ? '(gravando)' : '(conferência)') + ' — linhas ' + inicio + ' a ' + fim + ' de ' + nLin + ' ===');
  let preenchidas = 0, comDivergencia = 0, semCrlv = 0, erros = 0;
  const resumoDiv = [];

  for (let linha = inicio; linha <= fim; linha++) {
    const r = _lerCrlvDaViatura_(aba, mapa, linha, idx);
    if (r.erro) {
      if (/sem CRLV/.test(r.erro)) semCrlv++; else { erros++; Logger.log('   ' + r.placa + ': ' + r.erro); }
      continue;
    }
    if (r.preencher.length) {
      Logger.log('   ' + r.placa + ': preencher ' + r.preencher.map(x => x.campo + '=' + x.valor).join(', '));
      if (aplicar) r.preencher.forEach(x => aba.getRange(linha, x.col).setValue(x.valor));
      preenchidas += r.preencher.length;
    }
    if (r.divergencias.length) {
      comDivergencia++;
      r.divergencias.forEach(d => resumoDiv.push(r.placa + ' · ' + d.campo + ': planilha "' + d.atual + '" × CRLV "' + d.crlv + '"'));
    }
  }

  if (aplicar) { SpreadsheetApp.flush(); limparCache(); }
  const proxima = fim + 1;
  if (proxima > nLin) { props.deleteProperty('CRLV_PROGRESSO'); Logger.log('Fim da frota. A próxima execução recomeça do início.'); }
  else { props.setProperty('CRLV_PROGRESSO', String(proxima)); Logger.log('Pare aqui. Rode de novo para continuar da linha ' + proxima + '.'); }

  Logger.log('--- lote: ' + preenchidas + ' campo(s) ' + (aplicar ? 'preenchido(s)' : 'a preencher') +
    ' | ' + comDivergencia + ' viatura(s) com divergência | ' + semCrlv + ' sem CRLV | ' + erros + ' com erro de leitura');
  if (resumoDiv.length) {
    Logger.log('Divergências (o painel não altera o que já está preenchido):');
    resumoDiv.slice(0, 30).forEach(d => Logger.log('   ' + d));
    if (resumoDiv.length > 30) Logger.log('   … e mais ' + (resumoDiv.length - 30));
  }
  return preenchidas + ' campo(s); próxima linha: ' + (proxima > nLin ? 'fim' : proxima);
}



/** Devolve ao painel o texto extraído do CRLV, para diagnóstico. */
function textoCrlvViatura(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, String(placa || '').trim().toUpperCase());
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const link = alvo.idx.linkCrlv !== undefined ? String(aba.getRange(alvo.linha, alvo.idx.linkCrlv + 1).getValue() || '') : '';
    const id = (link.match(/[-\w]{25,}/) || [])[0];
    if (!id) return { ok: false, erro: 'Sem CRLV anexado.' };
    const arquivo = DriveApp.getFileById(id);
    const texto = _pdfTexto_(arquivo.getBlob().getBytes());
    if (!texto) return { ok: false, erro: 'Não consegui extrair texto — o PDF pode ser digitalizado (imagem).' };
    return { ok: true, nome: arquivo.getName(), tamanho: texto.length,
      linhas: texto.split(/\r?\n/).filter(l => l.trim() !== '').slice(0, 120),
      lidos: _camposCrlv_(texto) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Grava, numa viatura, apenas os campos escolhidos na conferência do CRLV. */
function gravarCamposCrlv(token, placa, campos) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode gravar.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, String(placa || '').trim().toUpperCase());
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const mapa = _mapaEdicao_(aba);
    const gravados = [], recusados = [];
    Object.keys(campos || {}).forEach(campo => {
      const col = _colunaDoCampoCrlv_(campo, alvo.idx, cab);
      if (col === undefined) { recusados.push(campo + ' (sem coluna)'); return; }
      const info = mapa.porCampo[campo];
      if (info && !info.editavel) { recusados.push(campo + ' (' + info.motivo + ')'); return; }
      aba.getRange(alvo.linha, col + 1).setValue(campos[campo]);
      gravados.push(campo + '=' + campos[campo]);
    });
    SpreadsheetApp.flush();
    if (gravados.length) {
      limparCache();
      _logAcao_(p.ss, p.sessao.email, 'Gravar pelo CRLV', placa, gravados.length + ' campo(s)', gravados.join(', '));
    }
    return { ok: true, gravados: gravados, recusados: recusados,
      erro: (!gravados.length && recusados.length) ? 'nada gravado: ' + recusados.join(', ') : '' };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Leitura do CRLV de uma viatura, chamada pelo painel. */
function lerCrlvViatura(token, placa, aplicar) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (aplicar && !p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode preencher.' };
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, String(placa || '').trim().toUpperCase());
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const mapa = _mapaEdicao_(aba);
    const r = _lerCrlvDaViatura_(aba, mapa, alvo.linha, alvo.idx);
    if (r.erro) return { ok: false, erro: r.erro, lidos: r.lidos || null };
    if (aplicar && r.preencher.length) {
      r.preencher.forEach(x => aba.getRange(alvo.linha, x.col).setValue(x.valor));
      SpreadsheetApp.flush();
      limparCache();
      _logAcao_(p.ss, p.sessao.email, 'Preencher pelo CRLV', r.placa,
        r.preencher.length + ' campo(s)', r.preencher.map(x => x.campo + '=' + x.valor).join(', '));
    }
    return { ok: true, placa: r.placa, lidos: r.lidos, preencher: r.preencher, divergencias: r.divergencias, aplicado: !!aplicar };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/* ------------------------------------------------------------ */
/*  EDIÇÃO DA ConsultaBD (somente administrador)                 */
/* ------------------------------------------------------------ */

/**
 * Classifica cada coluna da ConsultaBD como editável ou bloqueada.
 * Bloqueada = fórmula em qualquer linha de verificação OU fundo azul/cinza
 * (cores em CONFIG). A verificação é feita na hora, direto na planilha —
 * colunas novas com fórmula já nascem protegidas.
 */
function _mapaEdicao_(aba) {
  const nCols = aba.getLastColumn();
  const cab = aba.getRange(1, 1, 1, nCols).getValues()[0].map(v => String(v || '').trim());
  const bloqueada = new Array(nCols).fill(''), cores = CONFIG.EDICAO_CORES_BLOQUEADAS.map(c => c.toLowerCase());
  CONFIG.EDICAO_LINHAS_VERIFICACAO.forEach(linha => {
    if (linha > aba.getLastRow()) return;
    const formulas = aba.getRange(linha, 1, 1, nCols).getFormulas()[0];
    const fundos = aba.getRange(linha, 1, 1, nCols).getBackgrounds()[0];
    for (let c = 0; c < nCols; c++) {
      if (bloqueada[c]) continue;
      if (formulas[c]) bloqueada[c] = 'fórmula (linha ' + linha + ')';
      else if (cores.indexOf(String(fundos[c]).toLowerCase()) >= 0) bloqueada[c] = 'cor ' + fundos[c] + ' (linha ' + linha + ')';
    }
  });
  // liga cada coluna ao campo curto do app (quando mapeado em CAMPOS)
  const idx = _mapearCampos_(cab);
  const campoPorCol = {};
  Object.keys(idx).forEach(k => { campoPorCol[idx[k]] = k; });
  const excecoes = CONFIG.EDICAO_EXCECOES || [];
  const lista = [];
  for (let c = 0; c < nCols; c++) {
    if (!cab[c]) continue;
    const campo = campoPorCol[c] || '';
    const motivo = bloqueada[c];
    // fórmula nunca é sobrescrita; cor é só marcação de "preenchido por script",
    // e o painel é um desses scripts — por isso os campos da lista de exceções passam.
    const liberado = motivo && motivo.indexOf('fórmula') < 0 && campo && excecoes.indexOf(campo) >= 0;
    lista.push({ col: c + 1, nome: cab[c], campo: campo,
      editavel: !motivo || liberado, motivo: liberado ? motivo + ' — liberado para o painel' : motivo });
  }
  return { lista: lista, porCampo: (function () { const m = {}; lista.forEach(x => { if (x.campo) m[x.campo] = x; }); return m; })() };
}

const CAMPOS_NUMERICOS_EDICAO = ['anoEx', 'anoFab', 'anoMod', 'odometro', 'qtdAbast'];

/** Grava alterações de UMA viatura. alteracoes = { campoCurto: novoValor }. */
function salvarViatura(token, placa, alteracoes) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };
  if (!sessao.admin) return { ok: false, erro: 'Apenas o administrador pode editar.' };
  placa = String(placa || '').trim().toUpperCase();
  if (!placa) return { ok: false, erro: 'Placa não informada.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha em uso por outra gravação. Tente de novo.' }; }
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
    const mapa = _mapaEdicao_(aba);
    const colPlaca = mapa.porCampo.placa ? mapa.porCampo.placa.col : 1;
    const placas = aba.getRange(2, colPlaca, Math.max(1, aba.getLastRow() - 1), 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());
    const posicao = placas.indexOf(placa);
    if (posicao < 0) return { ok: false, erro: 'Placa ' + placa + ' não encontrada na ConsultaBD.' };
    const linha = posicao + 2;

    const gravados = [], recusados = [];
    Object.keys(alteracoes || {}).forEach(campo => {
      const info = mapa.porCampo[campo];
      if (!info) { recusados.push(campo + ' (coluna não mapeada)'); return; }
      if (!info.editavel) { recusados.push(info.nome + ' (' + info.motivo + ')'); return; }
      if (campo === 'placa') { recusados.push('Placa (chave da linha — não é alterada por aqui)'); return; }
      let valor = alteracoes[campo];
      if (CAMPOS_NUMERICOS_EDICAO.indexOf(campo) >= 0) valor = (valor === '' || valor === null) ? '' : _num_(valor);
      else valor = valor === null || valor === undefined ? '' : String(valor);
      aba.getRange(linha, info.col).setValue(valor);
      gravados.push(info.nome);
    });
    SpreadsheetApp.flush();
    if (gravados.length) { limparCache(); Logger.log('EDIÇÃO por ' + sessao.email + ' — ' + placa + ': ' + gravados.join(', ')); }
    return { ok: true, gravados: gravados, recusados: recusados };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/** Cadastra uma viatura nova: replica as fórmulas da última linha e grava os campos editáveis. */
function criarViatura(token, dados) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };
  if (!sessao.admin) return { ok: false, erro: 'Apenas o administrador pode cadastrar.' };
  const placa = String((dados || {}).placa || '').trim().toUpperCase();
  if (!placa) return { ok: false, erro: 'Informe a placa.' };
  const faltando = CONFIG.EDICAO_OBRIGATORIOS.filter(c => c !== 'placa' && !String((dados || {})[c] || '').trim());
  if (faltando.length) return { ok: false, erro: 'Campos obrigatórios sem preenchimento: ' + faltando.join(', ') + '.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha em uso por outra gravação. Tente de novo.' }; }
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
    const mapa = _mapaEdicao_(aba);
    const nCols = aba.getLastColumn();
    const colPlaca = mapa.porCampo.placa ? mapa.porCampo.placa.col : 1;
    const ultima = aba.getLastRow();
    const placas = aba.getRange(2, colPlaca, Math.max(1, ultima - 1), 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());
    if (placas.indexOf(placa) >= 0) return { ok: false, erro: 'A placa ' + placa + ' já existe na ConsultaBD.' };

    const nova = ultima + 1;
    // replica as fórmulas da última linha de dados (referências relativas se ajustam sozinhas)
    const formulas = aba.getRange(ultima, 1, 1, nCols).getFormulasR1C1()[0];
    // valores editáveis
    const valores = new Array(nCols).fill('');
    const gravados = [], recusados = [];
    Object.keys(dados || {}).forEach(campo => {
      const info = mapa.porCampo[campo];
      if (!info) { if (dados[campo] !== '') recusados.push(campo); return; }
      if (!info.editavel && campo !== 'placa') { if (dados[campo] !== '') recusados.push(info.nome + ' (' + info.motivo + ')'); return; }
      let valor = dados[campo];
      if (CAMPOS_NUMERICOS_EDICAO.indexOf(campo) >= 0) valor = (valor === '' || valor === null) ? '' : _num_(valor);
      else valor = valor === null || valor === undefined ? '' : String(valor);
      valores[info.col - 1] = campo === 'placa' ? placa : valor;
      if (valor !== '' || campo === 'placa') gravados.push(info.nome);
    });
    valores[colPlaca - 1] = placa;
    aba.getRange(nova, 1, 1, nCols).setValues([valores]);
    for (let c = 0; c < nCols; c++) if (formulas[c]) aba.getRange(nova, c + 1).setFormulaR1C1(formulas[c]);
    SpreadsheetApp.flush();
    limparCache();
    Logger.log('CADASTRO por ' + sessao.email + ' — ' + placa + ' (linha ' + nova + '): ' + gravados.join(', '));
    return { ok: true, linha: nova, gravados: gravados, recusados: recusados };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/**
 * Recebe uma foto (base64) do painel, salva na pasta CONFIG.PASTA_FOTOS e grava
 * o link na coluna do ângulo (FD/LE/TR/LD) da viatura. Somente administrador.
 * O arquivo novo não apaga o antigo (histórico fica na pasta); o link da planilha
 * passa a apontar para o novo.
 */

/** Devolve a foto atual em base64, para o navegador poder girá-la. */
function obterFotoViatura(token, placa, angulo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, String(placa || '').trim().toUpperCase());
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const campo = 'foto' + String(angulo || '').toUpperCase();
    const idx = alvo.idx[campo];
    if (idx === undefined) return { ok: false, erro: 'Ângulo inválido.' };
    const url = String(aba.getRange(alvo.linha, idx + 1).getValue() || '');
    const id = (url.match(/[-\w]{25,}/) || [])[0];
    if (!id) return { ok: false, erro: 'Esta viatura não tem foto neste ângulo.' };
    const blob = DriveApp.getFileById(id).getBlob();
    const bytes = blob.getBytes();
    if (bytes.length > 9 * 1024 * 1024) return { ok: false, erro: 'Imagem muito grande para girar pelo painel.' };
    return { ok: true, base64: Utilities.base64Encode(bytes), tipoMime: blob.getContentType() || 'image/jpeg' };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

function salvarFotoViatura(token, placa, angulo, base64, tipoMime) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };
  if (!sessao.admin) return { ok: false, erro: 'Apenas o administrador pode enviar fotos.' };
  if (!CONFIG.PASTA_FOTOS) return { ok: false, erro: 'Defina CONFIG.PASTA_FOTOS (ID da pasta do Drive) para habilitar o envio.' };
  placa = String(placa || '').trim().toUpperCase();
  angulo = String(angulo || '').trim().toUpperCase();
  const campo = { FD: 'fotoFD', LE: 'fotoLE', TR: 'fotoTR', LD: 'fotoLD' }[angulo];
  if (!campo) return { ok: false, erro: 'Ângulo inválido: ' + angulo };
  if (!base64 || base64.length < 100) return { ok: false, erro: 'Arquivo vazio.' };
  if (base64.length > 8 * 1024 * 1024) return { ok: false, erro: 'Foto muito grande mesmo após compressão (limite ~6 MB).' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Outra gravação em andamento. Tente de novo.' }; }
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
    const mapa = _mapaEdicao_(aba);
    const info = mapa.porCampo[campo];
    if (!info) return { ok: false, erro: 'Coluna ' + angulo + ' não encontrada na ConsultaBD.' };
    if (!info.editavel) return { ok: false, erro: 'Coluna ' + angulo + ' está bloqueada (' + info.motivo + ').' };
    const colPlaca = mapa.porCampo.placa ? mapa.porCampo.placa.col : 1;
    const placas = aba.getRange(2, colPlaca, Math.max(1, aba.getLastRow() - 1), 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());
    const posicao = placas.indexOf(placa);
    if (posicao < 0) return { ok: false, erro: 'Placa ' + placa + ' não encontrada.' };

    const pasta = DriveApp.getFolderById(CONFIG.PASTA_FOTOS);
    const carimbo = Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyyyMMdd_HHmm');
    const nome = placa + '_' + angulo + '_' + carimbo + '.jpg';
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), tipoMime || 'image/jpeg', nome);
    const arquivo = pasta.createFile(blob);
    try { arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
    catch (e) { Logger.log('Compartilhamento do arquivo restrito pela política do Drive: ' + e); }
    const link = 'https://drive.google.com/uc?export=view&id=' + arquivo.getId();
    aba.getRange(posicao + 2, info.col).setValue(link);
    SpreadsheetApp.flush();
    limparCache();
    // limpa a data em cache da foto antiga desse ângulo
    Logger.log('FOTO por ' + sessao.email + ' — ' + placa + ' ' + angulo + ' → ' + nome);
    return { ok: true, link: link, id: arquivo.getId(), nome: nome };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}



/* ============================================================
   IMPORTAÇÃO E EXPORTAÇÃO (administrador)
   Traz para o painel o que era feito pelo menu da planilha:
   sobe o .xlsx do GoodManager e acrescenta em AbastBD / ManutBD,
   ignorando o que já existe (chave: CODIGO TRANSACAO, coluna A).
   Período livre — pode importar quinze dias, um mês ou dois.
   ============================================================ */

function importarBase(token, tipo, arquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const destino = tipo === 'abast' ? CONFIG.ABA_ABAST : tipo === 'manut' ? CONFIG.ABA_MANUT : '';
  if (!destino) return { ok: false, erro: 'Tipo inválido.' };
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o arquivo .xlsx.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento. Tente de novo.' }; }
  let temporario = null;
  try {
    const aba = p.ss.getSheetByName(destino);
    if (!aba) return { ok: false, erro: 'Aba ' + destino + ' não encontrada.' };

    // converte o .xlsx num arquivo temporário do Sheets e lê os valores exibidos
    const blob = Utilities.newBlob(Utilities.base64Decode(arquivo.base64), arquivo.mimeType || MimeType.MICROSOFT_EXCEL, arquivo.nome || 'importacao.xlsx');
    temporario = Drive.Files.create({ name: '[TEMP importação painel] ' + (arquivo.nome || ''), mimeType: MimeType.GOOGLE_SHEETS }, blob);
    const dados = SpreadsheetApp.openById(temporario.id).getSheets()[0].getDataRange().getDisplayValues();
    if (!dados || dados.length < 2) return { ok: false, erro: 'A planilha enviada está vazia.' };

    const r = tipo === 'abast' ? _importarAbast_(aba, dados) : _importarManut_(aba, dados);
    SpreadsheetApp.flush();
    limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Importar ' + (tipo === 'abast' ? 'abastecimento' : 'manutenção'), '',
      r.inseridos + ' inseridos', 'arquivo: ' + (arquivo.nome || '') + ' | lidos: ' + r.lidos + ' | duplicados: ' + r.duplicados + (r.periodo ? ' | período: ' + r.periodo : ''));
    return { ok: true, destino: destino, lidos: r.lidos, inseridos: r.inseridos, duplicados: r.duplicados, periodo: r.periodo || '' };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally {
    if (temporario && temporario.id) { try { Drive.Files.remove(temporario.id); } catch (e) {} }
    trava.releaseLock();
  }
}

/** Abastecimento: o arquivo já vem na ordem das colunas de destino. */
function _importarAbast_(destino, dados) {
  const existentes = _codigosExistentes_(destino);
  const novos = {}, inserir = [];
  let lidos = 0, duplicados = 0, menor = '', maior = '';
  for (let i = 1; i < dados.length; i++) {
    const linha = dados[i];
    const codigo = _codigoTransacao_(linha[0]);
    if (!codigo) continue;
    lidos++;
    if (existentes[codigo] || novos[codigo]) { duplicados++; continue; }
    const dia = _diaISO_(linha[4]);
    if (dia) { if (!menor || dia < menor) menor = dia; if (!maior || dia > maior) maior = dia; }
    inserir.push(_ajustarLinha_(linha, CONFIG.DEST_COLS));
    novos[codigo] = true;
  }
  if (inserir.length) destino.getRange(Math.max(destino.getLastRow() + 1, 2), 1, inserir.length, CONFIG.DEST_COLS).setValues(inserir);
  return { lidos: lidos, inseridos: inserir.length, duplicados: duplicados, periodo: menor ? _brDia_(menor) + ' a ' + _brDia_(maior) : '' };
}

/** Manutenção: a ordem das colunas varia; o arquivo é remapeado pelo nome do cabeçalho. */
function _importarManut_(destino, dados) {
  let linhaCab = -1;
  for (let r = 0; r < dados.length && linhaCab < 0; r++) {
    for (let c = 0; c < dados[r].length; c++) {
      if (_normCab_(dados[r][c]) === 'CODIGO TRANSACAO') { linhaCab = r; break; }
    }
  }
  if (linhaCab < 0) throw new Error('Não encontrei a linha de cabeçalho ("CODIGO TRANSACAO") no arquivo de manutenção.');
  const cab = dados[linhaCab], mapa = {};
  cab.forEach((h, i) => { const k = _normCab_(h); if (k && mapa[k] === undefined) mapa[k] = i; });
  const desejadas = _colunasManut_();
  const existentes = _codigosExistentes_(destino);
  const novos = {}, inserir = [];
  let lidos = 0, duplicados = 0, menor = '', maior = '';
  for (let i = linhaCab + 1; i < dados.length; i++) {
    const origem = dados[i];
    const linha = desejadas.map(h => { const c = _resolverColuna_(mapa, h); return c > -1 ? (origem[c] || '') : ''; });
    const codigo = _codigoTransacao_(linha[0]);
    if (!codigo) continue;
    lidos++;
    if (existentes[codigo] || novos[codigo]) { duplicados++; continue; }
    const dia = _diaISO_(linha[4]);
    if (dia) { if (!menor || dia < menor) menor = dia; if (!maior || dia > maior) maior = dia; }
    inserir.push(_ajustarLinha_(linha, CONFIG.DEST_COLS));
    novos[codigo] = true;
  }
  if (inserir.length) destino.getRange(Math.max(destino.getLastRow() + 1, 2), 1, inserir.length, CONFIG.DEST_COLS).setValues(inserir);
  return { lidos: lidos, inseridos: inserir.length, duplicados: duplicados, periodo: menor ? _brDia_(menor) + ' a ' + _brDia_(maior) : '' };
}

function _codigosExistentes_(aba) {
  const mapa = {};
  const n = aba.getLastRow();
  if (n < 2) return mapa;
  aba.getRange(2, 1, n - 1, 1).getDisplayValues().forEach(l => { const c = _codigoTransacao_(l[0]); if (c) mapa[c] = true; });
  return mapa;
}
function _codigoTransacao_(v) { return String(v === null || v === undefined ? '' : v).replace(/\s+/g, '').replace(/\.0$/, ''); }
function _ajustarLinha_(linha, n) { const saida = linha.slice(0, n); while (saida.length < n) saida.push(''); return saida; }
function _normCab_(s) {
  return String(s || '').trim().toUpperCase().replace(/[|_\t]/g, ' ')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function _colunasManut_() {
  return ['CODIGO TRANSACAO','FORMA DE PAGAMENTO','CODIGO CLIENTE','NOME REDUZIDO','DATA TRANSACAO',
    'PLACA','TIPO FROTA','MODELO VEICULO','NUMERO FROTA','ANO','MATRICULA','NOME MOTORISTA',
    'SERVICO','TIPO COMBUSTIVEL','LITROS','VL/LITRO','HODOMETRO OU HORIMETRO',
    'KM RODADOS OU HORAS TRABALHADAS','KM/LITRO OU LITROS/HORA','VALOR EMISSAO',
    'CODIGO ESTABELECIMENTO','NOME ESTABELECIMENTO','TIPO ESTABELECIMENTO','ENDERECO','BAIRRO',
    'CIDADE','UF','INFORMACAO ADIDIONAL 1','INFORMACAO ADIDIONAL 2','INFORMACAO ADIDIONAL 3',
    'INFORMACAO ADIDIONAL 4','INFORMACAO ADIDIONAL 5','FORMA TRANSACAO','CODIGO LIBERACAO RESTRICAO',
    'SERIE POS','NUMERO CARTAO','FAMILIA VEICULO','GRUPO RESTRICAO','CODIGO EMISSORA','RESPONSAVEL'];
}
/** Nomes alternativos aceitos para cada coluna (herdado do importador antigo). */
function _resolverColuna_(mapa, desejada) {
  const alt = {
    'CODIGO TRANSACAO': ['CODIGO TRANSACAO'],
    'DATA TRANSACAO': ['DATA TRANSACAO', 'DATA DA TRANSACAO', 'DATA'],
    'MODELO VEICULO': ['MODELO VEICULO', 'MODELO'],
    'NOME MOTORISTA': ['NOME MOTORISTA', 'MOTORISTA'],
    'TIPO COMBUSTIVEL': ['TIPO COMBUSTIVEL', 'COMBUSTIVEL'],
    'HODOMETRO OU HORIMETRO': ['HODOMETRO OU HORIMETRO', 'HODOMETRO', 'HODOMETRO/HORIMETRO'],
    'KM RODADOS OU HORAS TRABALHADAS': ['KM RODADOS OU HORAS TRABALHADAS', 'KM RODADOS'],
    'KM/LITRO OU LITROS/HORA': ['KM/LITRO OU LITROS/HORA', 'KM/LITRO'],
    'VALOR EMISSAO': ['VALOR EMISSAO', 'VALOR'],
    'NOME ESTABELECIMENTO': ['NOME ESTABELECIMENTO', 'ESTABELECIMENTO'],
    'TIPO ESTABELECIMENTO': ['TIPO ESTABELECIMENTO']
  };
  const nomes = alt[desejada] || [desejada];
  for (let i = 0; i < nomes.length; i++) { const k = _normCab_(nomes[i]); if (mapa[k] !== undefined) return mapa[k]; }
  return -1;
}


/**
 * Importa o relatório de Orçamentos colado como texto (separado por tabulação).
 * Colunas do relatório: Ordem Serviço | Placa | Data Conclusão | Código Estabelecimento |
 * Estabelecimento | Mão de Obra | NF Serviço | Peças | NF Peça | Total O.S.
 * Na planilha elas ocupam A:D e F:K (a coluna E fica vazia), a competência vai para L
 * (informada por você, porque o relatório não a traz) e M é a fórmula do tipo de aceite.
 */
function importarOrcamentos(token, texto, competencia) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const comp = _formatarCompetencia_(competencia || '', true);
  if (!texto || String(texto).trim().length < 20) return { ok: false, erro: 'Cole o relatório de orçamentos.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(45000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_ORCAMENTOS);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_ORCAMENTOS + '" não encontrada na planilha-mãe. Rode migrarDadosManutencao() antes.' };

    const existentes = {};
    if (aba.getLastRow() > 2) {
      aba.getRange(1, 1, aba.getLastRow(), 1).getDisplayValues().forEach(l => {
        const os = String(l[0] || '').replace(/\D/g, ''); if (os) existentes[os] = true;
      });
    }

    const linhas = [], repetidas = [];
    let lidas = 0, somaTotal = 0, somaPecas = 0, somaMo = 0;
    String(texto).split(/\r?\n/).forEach(linha => {
      if (!linha.trim()) return;
      const campos = linha.split('\t').map(c => c.trim());
      if (campos.length < 8) return;
      const os = campos[0].replace(/\D/g, '');
      if (!os || !/^\d{6,}$/.test(os)) return;            // pula cabeçalho e o rodapé "Qtde. de OS"
      lidas++;
      if (existentes[os]) { repetidas.push(campos[0].trim()); return; }
      const num = i => _num_(campos[i]) || 0;
      const mo = num(5), pecas = num(7), totalOs = num(9);
      somaMo += mo; somaPecas += pecas; somaTotal += totalOs;
      linhas.push({
        os: os, placa: campos[1].toUpperCase(), conclusao: campos[2], codEstab: campos[3],
        estab: campos[4], mo: mo, nfServico: campos[6], pecas: pecas, nfPeca: campos[8], total: totalOs
      });
      existentes[os] = true;
    });
    if (!linhas.length) return { ok: false, erro: lidas ? 'Todas as ' + lidas + ' ordens já estavam na base.' : 'Não reconheci nenhuma linha. Cole incluindo as colunas separadas por tabulação.' };

    const inicio = _proximaLinhaAppend_(aba, 1, 3);
    const bloco = linhas.map(l => [l.os, l.placa, l.conclusao, l.codEstab, '', l.estab, l.mo, l.nfServico, l.pecas, l.nfPeca, l.total, comp]);
    aba.getRange(inicio, 1, bloco.length, 12).setValues(bloco);
    const replicadas = _replicarFormulas_(aba, inicio, bloco.length, 12);   // M em diante = fórmula do tipo de aceite
    SpreadsheetApp.flush();
    limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Importar orçamentos', '', bloco.length + ' OS', 'competência ' + comp + ' | total ' + _moedaBR_(somaTotal) + ' | repetidas: ' + repetidas.length);
    return { ok: true, lidos: lidas, inseridos: bloco.length, duplicados: repetidas.length, competencia: comp,
             total: somaTotal, pecas: somaPecas, mo: somaMo, formulas: replicadas,
             aviso: replicadas ? '' : 'A coluna do tipo de aceite (M) não tinha fórmula para replicar — importe os aceites para preenchê-la.' };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/** Exporta AbastBD ou ManutBD como .xlsx e devolve o link do Drive. */
function exportarBase(token, tipo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const nomeAba = tipo === 'abast' ? CONFIG.ABA_ABAST : tipo === 'manut' ? CONFIG.ABA_MANUT : '';
  if (!nomeAba) return { ok: false, erro: 'Tipo inválido.' };
  let temp = null;
  try {
    const origem = p.ss.getSheetByName(nomeAba);
    if (!origem) return { ok: false, erro: 'Aba não encontrada.' };
    const nome = nomeAba + '_' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyyy-MM-dd_HHmm');
    const nova = SpreadsheetApp.create(nome);
    origem.copyTo(nova).setName(nomeAba);
    const padrao = nova.getSheetByName('Sheet1') || nova.getSheetByName('Página1');
    if (padrao) nova.deleteSheet(padrao);
    SpreadsheetApp.flush();
    temp = nova.getId();
    const url = 'https://docs.google.com/spreadsheets/d/' + temp + '/export?format=xlsx';
    const bytes = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }).getBlob().setName(nome + '.xlsx');
    const arq = DriveApp.createFile(bytes);
    try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    _logAcao_(p.ss, p.sessao.email, 'Exportar ' + nomeAba, '', 'OK', arq.getUrl());
    return { ok: true, nome: nome + '.xlsx', link: arq.getUrl(), linhas: origem.getLastRow() - 1 };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally {
    if (temp) { try { Drive.Files.remove(temp); } catch (e) {} }
  }
}



/* ------------------------------------------------------------ */
/*  Auxiliares herdados do importador da planilha                */

const MESES_PT = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};

function _limparCelulaHtml_(cellHtml) {
  let s = cellHtml.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/gi, ' ')
       .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
       .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
       .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
       .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&atilde;/gi, 'ã')
       .replace(/&otilde;/gi, 'õ').replace(/&ccedil;/gi, 'ç').replace(/&acirc;/gi, 'â')
       .replace(/&ecirc;/gi, 'ê').replace(/&ocirc;/gi, 'ô');
  return s.replace(/\s+/g, ' ').trim();
}

function _normalizarAno_(a) {
  a = String(a);
  return a.length === 2 ? 2000 + parseInt(a, 10) : parseInt(a, 10);
}
/* ------------------------------------------------------------ */

function _parseNumeroBR_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim().replace(/r\$/gi, '').replace(/\s/g, '');
  if (!s) return '';
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function _parseDataBR_(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  const d = new Date(_normalizarAno_(m[3]), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? s : d;
}

function _formatarCompetencia_(s, obrigatorio) {
  let t = (s === null || s === undefined) ? '' : String(s).trim();
  if (!t) { if (obrigatorio) throw new Error('Informe a competência no formato MM/YYYY (ex.: 05/2026).'); return ''; }
  const p = _parseCompetenciaCelula_(t);
  if (!p) throw new Error('Competência inválida: "' + t + '". Use MM/YYYY (ex.: 05/2026).');
  return String(p.mm).padStart(2, '0') + '/' + p.yyyy;
}

function _parseCompetenciaCelula_(v) {
  if (v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return { mm: v.getMonth() + 1, yyyy: v.getFullYear() };
  }
  let s = _removerAcentos_(String(v).trim().toLowerCase()).replace(/\s+/g, '');
  if (!s) return null;
  let m = s.match(/^([a-z]{3,})[\/\-.]?(\d{2,4})$/);            // mai/26
  if (m) { const mes = MESES_PT[m[1].substring(0, 3)]; return mes ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  m = s.match(/^\d{1,2}[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);     // dd/mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  m = s.match(/^(\d{1,2})[\/\-.](\d{2,4})$/);                   // mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  return null;
}

function _primeiraLinhaVaziaNaColuna_(aba, col, startRow) {
  const maxRows = aba.getMaxRows();
  if (startRow > maxRows) return startRow;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === '') return startRow + i;
  return maxRows + 1;
}

function _proximaLinhaAppend_(aba, col, floor) {
  const maxRows = aba.getMaxRows();
  const vals = aba.getRange(1, col, maxRows, 1).getDisplayValues();
  let last = 0;
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() !== '') last = i + 1;
  return Math.max(last + 1, floor);
}

function _obterValoresColuna_(aba, col, startRow) {
  const set = new Set();
  const maxRows = aba.getMaxRows();
  if (maxRows < startRow) return set;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  vals.forEach(r => { const v = _normalizarCodigo_(r[0]); if (v) set.add(v); });
  return set;
}

function _parseHtmlTable_(html) {
  const tabelas = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  if (!tabelas.length) return [];
  const tableHtml = tabelas.sort((a, b) => b.length - a.length)[0];
  const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const grid = [];
  const carry = {}; // col -> { value, remaining } (rowspan pendente)

  trs.forEach(tr => {
    const cells = tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    const rowOut = [];
    let col = 0;
    const aplicarCarry = () => {
      while (carry[col] && carry[col].remaining > 0) {
        rowOut[col] = carry[col].value;
        carry[col].remaining--;
        if (carry[col].remaining === 0) delete carry[col];
        col++;
      }
    };
    cells.forEach(cell => {
      aplicarCarry();
      const colspan = parseInt((cell.match(/colspan\s*=\s*"?(\d+)/i) || [])[1] || '1', 10);
      const rowspan = parseInt((cell.match(/rowspan\s*=\s*"?(\d+)/i) || [])[1] || '1', 10);
      const val = _limparCelulaHtml_(cell);
      for (let k = 0; k < colspan; k++) {
        rowOut[col] = val;
        if (rowspan > 1) carry[col] = { value: val, remaining: rowspan - 1 };
        col++;
      }
    });
    aplicarCarry();
    grid.push(rowOut);
  });

  const width = grid.reduce((m, r) => Math.max(m, r.length), 0);
  return grid.map(r => { const o = new Array(width).fill(''); for (let i = 0; i < width; i++) o[i] = (r[i] !== undefined ? r[i] : ''); return o; });
}

function _removerAcentos_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _normalizarCodigo_(v) { return String(v || '').trim(); }

/* ------------------------------------------------------------ */
/*  Importações de títulos, detalhamento, aceites e glosa ANP    */
/*  (portadas do importador que ficava no menu da planilha)      */
/* ------------------------------------------------------------ */

/**
 * Guarda o PDF da nota fiscal na pasta de notas, com nome padronizado
 * (NF Abastecimento 08-2026.pdf). Se já houver um da mesma competência,
 * ele é substituído — o antigo vai para a lixeira.
 */
function _guardarNotaFiscal_(arquivo, tipo, competencia, numeroNf) {
  if (!CONFIG.PASTA_NOTAS_FISCAIS) return '';
  try {
    const pasta = DriveApp.getFolderById(CONFIG.PASTA_NOTAS_FISCAIS);
    const comp = String(competencia || '').replace('/', '-') || 'sem-competencia';
    const nome = 'NF ' + tipo + ' ' + comp + (numeroNf ? ' - ' + numeroNf : '') + '.pdf';
    // remove versões anteriores da mesma competência, qualquer que seja o número da nota
    _descartarPorPrefixo_(pasta, 'NF ' + tipo + ' ' + comp);
    const blob = Utilities.newBlob(Utilities.base64Decode(arquivo.base64), 'application/pdf', nome);
    const arq = pasta.createFile(blob);
    try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return arq.getUrl();
  } catch (e) {
    Logger.log('Nota fiscal não guardada: ' + e);
    return '';
  }
}

/** Grava o link do PDF na coluna "Link NF" da aba de títulos, criando-a se faltar. */
function _gravarLinkNota_(aba, linha, link) {
  if (!link) return '';
  try {
    const nCols = Math.max(aba.getLastColumn(), 1);
    const cabLinha = 2;
    const cab = aba.getRange(cabLinha, 1, 1, nCols).getValues()[0].map(c => _normCab_(c));
    let col = cab.findIndex(c => c === 'LINK NF' || c === 'NF PDF' || c === 'ARQUIVO NF');
    if (col < 0) {
      col = nCols;                                   // primeira coluna livre à direita
      aba.getRange(cabLinha, col + 1).setValue('Link NF');
    }
    aba.getRange(linha, col + 1).setValue(link);
    return link;
  } catch (e) { Logger.log('Link da NF não gravado: ' + e); return ''; }
}

/**
 * Onde gravar o título: se a competência (ou o número do título) já existir,
 * devolve a linha dela para ser atualizada; caso contrário, a primeira livre.
 */
function _linhaDoTitulo_(aba, tipo, competencia, numeroTitulo) {
  const def = PROC[tipo];
  const cab = _cabTitulos_(aba, def);
  const nLin = aba.getLastRow();
  if (nLin > cab.linha) {
    const nCols = Math.max(_colunasTitulos_(def), aba.getLastColumn());
    const valores = aba.getRange(cab.linha + 1, 1, nLin - cab.linha, nCols).getValues();
    const comp = _formatarCompetencia_(competencia || '', false);
    const titulo = String(numeroTitulo || '').replace(/\D/g, '');
    for (let i = 0; i < valores.length; i++) {
      const linhaComp = _compSegura_(valores[i][cab.col.competencia]);
      const linhaTit = String(valores[i][cab.col.titulo] || '').replace(/\D/g, '');
      if ((comp && linhaComp === comp) || (titulo && linhaTit && linhaTit === titulo)) {
        return { linha: cab.linha + 1 + i, existente: true, porTitulo: !!(titulo && linhaTit === titulo) };
      }
    }
  }
  return { linha: _primeiraLinhaVaziaNaColuna_(aba, 1, 3), existente: false };
}

/** PDF da NF de abastecimento → aba "Títulos Abast." (A:G + R). */
function importarTituloAbast(token, arquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o PDF da NF.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  try {
    const texto = _textoDoPdf_(arquivo);
    if (!texto || texto.replace(/\s/g, '').length < 30) return { ok: false, erro: 'Não consegui ler o texto do PDF.' };
    const c = _camposNf_(texto);
    if (!c.titulo) return { ok: false, erro: 'Não localizei o Nº do Título (TITULO NRO.) no PDF.' };
    const aba = SpreadsheetApp.openById(CONFIG.ID_TITULOS).getSheetByName(CONFIG.ABA_TIT_ABAST);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_TIT_ABAST + '" não encontrada.' };
    const destinoLinha = _linhaDoTitulo_(aba, 'Abastecimento', c.competencia, c.titulo);
    const linha = destinoLinha.linha;
    aba.getRange(linha, 1, 1, 7).setValues([[c.titulo, c.numeroNfse, _parseNumeroBR_(c.valorTotal), '',
      _parseDataBR_(c.dataEmissao), _parseDataBR_(c.vencimento), _formatarCompetencia_(c.competencia, false)]]);
    aba.getRange(linha, 18).setValue(String(c.chave || ''));
    const linkNota = _guardarNotaFiscal_(arquivo, 'Abastecimento', c.competencia, c.numeroNfse);
    _gravarLinkNota_(aba, linha, linkNota);
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, (destinoLinha.existente ? 'Atualizar' : 'Importar') + ' título abastecimento', '', 'Título ' + c.titulo, 'NF ' + c.numeroNfse + ' | ' + c.valorTotal + ' | comp. ' + c.competencia);
    return { ok: true, linha: linha, campos: c, linkNota: linkNota, atualizou: destinoLinha.existente };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** PDF da NF de manutenção → aba "Títulos Manut." (A:E, H:K + S). */
function importarTituloManut(token, arquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o PDF da NF.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  try {
    const texto = _textoDoPdf_(arquivo);
    if (!texto || texto.replace(/\s/g, '').length < 30) return { ok: false, erro: 'Não consegui ler o texto do PDF.' };
    const c = _camposNf_(texto);
    if (!c.titulo) return { ok: false, erro: 'Não localizei o Nº do Título (TITULO NRO.) no PDF.' };
    const aba = SpreadsheetApp.openById(CONFIG.ID_TITULOS).getSheetByName(CONFIG.ABA_TIT_MANUT);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_TIT_MANUT + '" não encontrada.' };
    const destinoLinha = _linhaDoTitulo_(aba, 'Manutenção', c.competencia, c.titulo);
    const linha = destinoLinha.linha;
    aba.getRange(linha, 1, 1, 5).setValues([[c.titulo, c.numeroNfse, _parseNumeroBR_(c.valorTotal),
      _parseNumeroBR_(c.reembolsoPecas), _parseNumeroBR_(c.reembolsoMaoObra)]]);   // F e G são fórmulas
    // terceiro item da nota (juros/acerto) vai para Outros Descontos
    if (c.outrosValor) {
      const cabManut = _cabTitulos_(aba, PROC['Manutenção']);
      const colOutros = cabManut.col.outrosDescontos;
      if (colOutros !== undefined && colOutros >= 0) aba.getRange(linha, colOutros + 1).setValue(c.outrosValor);
    }
    aba.getRange(linha, 8, 1, 4).setValues([['', _parseDataBR_(c.dataEmissao), _parseDataBR_(c.vencimento), _formatarCompetencia_(c.competencia, false)]]);
    aba.getRange(linha, 19).setValue(String(c.chave || ''));
    const linkNota = _guardarNotaFiscal_(arquivo, 'Manutenção', c.competencia, c.numeroNfse);
    _gravarLinkNota_(aba, linha, linkNota);
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, (destinoLinha.existente ? 'Atualizar' : 'Importar') + ' título manutenção', '', 'Título ' + c.titulo, 'NF ' + c.numeroNfse + ' | peças ' + c.reembolsoPecas + ' | MO ' + c.reembolsoMaoObra);
    return { ok: true, linha: linha, campos: c, linkNota: linkNota, conferencia: _conferirNf_(c), atualizou: destinoLinha.existente };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Confere se peças + mão de obra + demais itens fecham com o total da nota. */
function _conferirNf_(c) {
  const n = v => _parseNumeroBR_(v) || 0;
  const soma = Math.round((n(c.reembolsoPecas) + n(c.reembolsoMaoObra) + (c.outrosValor || 0)) * 100) / 100;
  const total = Math.round(n(c.valorTotal) * 100) / 100;
  return { soma: soma, total: total, confere: Math.abs(soma - total) < 0.01,
           itens: (c.outrosItens || []).map(o => o.rotulo + ': ' + o.valor) };
}

/** Lê o PDF sem gravar nada — confere o que seria importado. */
function conferirNf(token, arquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o PDF.' };
  try {
    const texto = _textoDoPdf_(arquivo);
    return { ok: true, campos: _camposNf_(texto), trecho: String(texto).substring(0, 1500) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Detalhamento de itens (HTML ou Excel) → DetalhamentoDB F:AB, título em AC e competência em AD. */
function importarDetalhamento(token, arquivo, titulo, competencia) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o arquivo de detalhamento.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_DETALHE);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_DETALHE + '" não encontrada.' };
    const grid = _lerTabelaArquivo_(arquivo);
    if (!grid || grid.length <= 2) return { ok: false, erro: 'Não encontrei linhas de dados no arquivo.' };
    const comp = _formatarCompetencia_(competencia || '', false);
    const tit = String(titulo || '').trim();
    const linhas = [];
    grid.slice(2).forEach(linha => {
      if (!linha.some(c => String(c).trim() !== '')) return;
      const saida = new Array(23).fill('');
      for (let i = 0; i < 23; i++) saida[i] = linha[i] !== undefined ? linha[i] : '';
      linhas.push(saida);
    });
    if (!linhas.length) return { ok: false, erro: 'Nenhuma linha aproveitável.' };
    const inicio = _proximaLinhaAppend_(aba, 6, 3);
    aba.getRange(inicio, 6, linhas.length, 23).setValues(linhas);
    if (tit) aba.getRange(inicio, 29, linhas.length, 1).setValues(linhas.map(() => [tit]));
    if (comp) aba.getRange(inicio, 30, linhas.length, 1).setValues(linhas.map(() => [comp]));
    // colunas A:E são calculadas por fórmula na planilha — replica da linha anterior
    _replicarColunasIniciais_(aba, inicio, linhas.length, 5);
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Importar detalhamento', '', linhas.length + ' linhas', 'título ' + tit + ' | comp. ' + comp);
    return { ok: true, inseridos: linhas.length, titulo: tit, competencia: comp };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Aceites (HTML ou Excel) → AceitesDB A:G, tipo em H. Duplicidade pela OS na coluna A. */
function importarAceites(token, arquivo, tipo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o arquivo de aceites.' };
  if (tipo !== 'Gestor' && tipo !== 'Automático') return { ok: false, erro: 'Tipo de aceite inválido.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_ACEITES);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_ACEITES + '" não encontrada.' };
    const grid = _lerTabelaArquivo_(arquivo);
    if (!grid || grid.length <= 8) return { ok: false, erro: 'Não encontrei linhas de dados (o arquivo tem cabeçalho de 8 linhas).' };
    const existentes = _obterValoresColuna_(aba, 1, 2);
    const novos = {}, linhas = [];
    let lidos = 0, duplicados = 0;
    grid.slice(8).forEach(linha => {
      const texto = _removerAcentos_(linha.map(c => String(c)).join(' ').toUpperCase());
      if (/QTDE\.?\s*DE\s*OS/.test(texto) || /TOTAL\s+GERAL/.test(texto) || /TOTAL\s+ACEITE/.test(texto)) return;
      if (!linha.some(c => String(c).trim() !== '')) return;
      const os = _normalizarCodigo_(linha[0]);
      if (!os) return;
      lidos++;
      if (existentes.has(os) || novos[os]) { duplicados++; return; }
      const saida = new Array(7).fill('');
      for (let i = 0; i < 7; i++) saida[i] = linha[i] !== undefined ? linha[i] : '';
      linhas.push(saida); novos[os] = true;
    });
    if (linhas.length) {
      const inicio = _proximaLinhaAppend_(aba, 1, 2);
      aba.getRange(inicio, 1, linhas.length, 7).setValues(linhas);
      aba.getRange(inicio, 8, linhas.length, 1).setValues(linhas.map(() => [tipo]));
      const replicadas = _replicarFormulas_(aba, inicio, linhas.length, 8);   // I em diante são calculadas
      if (replicadas) Logger.log('AceitesDB: ' + replicadas + ' coluna(s) de fórmula replicada(s) nas linhas novas.');
    }
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Importar aceites (' + tipo + ')', '', linhas.length + ' inseridos', 'lidos: ' + lidos + ' | duplicados: ' + duplicados);
    return { ok: true, lidos: lidos, inseridos: linhas.length, duplicados: duplicados };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Glosa ANP: arquivo enviado (origem='arquivo') ou baixado do site da ANP (origem='site'). */
function importarGlosaAnp(token, competencia, origem, arquivo) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const comp = _formatarCompetencia_(competencia || '', true);
  if (!comp) return { ok: false, erro: 'Informe a competência (MM/AAAA).' };
  const partes = comp.split('/'), mm = parseInt(partes[0], 10), yyyy = parseInt(partes[1], 10);
  const trava = LockService.getScriptLock();
  try { trava.waitLock(120000); } catch (e) { return { ok: false, erro: 'Outra importação em andamento.' }; }
  let temporario = null;
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_ANP);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_ANP + '" não existe na planilha-mãe. Rode migrarDadosGlosa() uma vez no editor.' };
    const jaTem = _contarCompetenciaAnp_(aba, mm, yyyy);
    if (jaTem > 0) return { ok: false, erro: 'A competência ' + comp + ' já tem ' + jaTem + ' linha(s) no Histórico ANP. Remova antes de reimportar.' };

    let blob;
    if (origem === 'site') {
      const r = UrlFetchApp.fetch(CONFIG.URL_GLOSA_ANP, { muteHttpExceptions: true, followRedirects: true,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppsScript' } });
      if (r.getResponseCode() !== 200) return { ok: false, erro: 'O site da ANP respondeu HTTP ' + r.getResponseCode() + '.' };
      blob = r.getBlob().setName('glosa-anp.xlsx').setContentType(MimeType.MICROSOFT_EXCEL);
      if (blob.getBytes().length < 1000) return { ok: false, erro: 'O arquivo baixado da ANP veio vazio.' };
    } else {
      if (!arquivo || !arquivo.base64) return { ok: false, erro: 'Selecione o arquivo da ANP.' };
      blob = Utilities.newBlob(Utilities.base64Decode(arquivo.base64), arquivo.mimeType || MimeType.MICROSOFT_EXCEL, arquivo.nome || 'anp.xlsx');
    }
    temporario = Drive.Files.create({ name: '[TEMP ANP painel]', mimeType: MimeType.GOOGLE_SHEETS }, blob);
    const dados = SpreadsheetApp.openById(temporario.id).getSheets()[0].getDataRange().getValues();   // tipado: datas reais
    const dataComp = new Date(yyyy, mm - 1, 1);
    const linhas = [];
    dados.forEach(linha => {
      const c = _parseCompetenciaCelula_(linha[0]);
      if (!c || c.mm !== mm || c.yyyy !== yyyy) return;
      const saida = new Array(10).fill('');
      saida[0] = dataComp;
      for (let i = 1; i < 10; i++) saida[i] = (linha[i] !== undefined && linha[i] !== null) ? linha[i] : '';
      linhas.push(saida);
    });
    if (!linhas.length) return { ok: false, erro: 'Nenhuma linha da competência ' + comp + ' foi encontrada no arquivo.' };
    const inicio = _proximaLinhaAppend_(aba, 1, 2);
    aba.getRange(inicio, 1, linhas.length, 10).setValues(linhas);
    aba.getRange(inicio, 1, linhas.length, 1).setNumberFormat('MM/yyyy');
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Importar glosa ANP', '', linhas.length + ' linhas', 'competência ' + comp + ' | origem: ' + (origem === 'site' ? 'site da ANP' : 'arquivo'));
    return { ok: true, inseridos: linhas.length, competencia: comp };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally {
    if (temporario && temporario.id) { try { Drive.Files.remove(temporario.id); } catch (e) {} }
    trava.releaseLock();
  }
}




/* ============================================================
   HISTÓRICO DE IMPORTAÇÕES
   Responde "já importei este mês?" olhando o que existe de fato
   em cada base, e não um registro do que foi anotado. O log de
   ações entra só para dizer quando e por quem.
   ============================================================ */

/** Competências presentes numa aba, pela coluna indicada. */
function _competenciasDaAba_(aba, nomesColuna, linhaCabMax) {
  const saida = {};
  if (!aba || aba.getLastRow() < 2) return saida;
  const largura = aba.getLastColumn();
  const topo = aba.getRange(1, 1, Math.min(linhaCabMax || 6, aba.getLastRow()), largura).getValues();
  let linhaCab = -1, iCol = -1;
  for (let i = 0; i < topo.length && linhaCab < 0; i++) {
    const nomes = topo[i].map(c => _normCab_(c));
    for (let j = 0; j < nomesColuna.length && iCol < 0; j++) {
      const p = nomes.indexOf(_normCab_(nomesColuna[j]));
      if (p >= 0) { linhaCab = i + 1; iCol = p; }
    }
  }
  if (iCol < 0) return saida;
  const n = aba.getLastRow() - linhaCab;
  if (n < 1) return saida;
  aba.getRange(linhaCab + 1, iCol + 1, n, 1).getValues().forEach(l => {
    const c = _parseCompetenciaCelula_(l[0]);
    if (!c) return;
    const k = ('0' + c.mm).slice(-2) + '/' + c.yyyy;
    saida[k] = (saida[k] || 0) + 1;
  });
  return saida;
}

/**
 * Quadro das importações por competência. Cada fonte vira uma coluna e cada
 * competência uma linha, com a quantidade de registros encontrada.
 */
function historicoImportacoes(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const fontes = [];

    const juntar = (chave, rotulo, nota, aba, colunas) => {
      fontes.push({ chave: chave, rotulo: rotulo, nota: nota,
        existe: !!aba, comps: aba ? _competenciasDaAba_(aba, colunas) : {} });
    };

    juntar('abastBD', 'Transações de abastecimento', 'aba ' + CONFIG.ABA_ABAST,
      ss.getSheetByName(CONFIG.ABA_ABAST), ['COMPETÊNCIA', 'COMPETENCIA']);
    juntar('manutBD', 'Transações de manutenção', 'aba ' + CONFIG.ABA_MANUT,
      ss.getSheetByName(CONFIG.ABA_MANUT), ['COMPETÊNCIA', 'COMPETENCIA']);
    juntar('anp', 'Série de preços da ANP', 'aba ' + CONFIG.ABA_ANP,
      ss.getSheetByName(CONFIG.ABA_ANP), ['MÊS', 'MES', 'Competência']);

    // títulos ficam na planilha de pagamentos
    try {
      const ssT = CONFIG.ID_TITULOS ? SpreadsheetApp.openById(CONFIG.ID_TITULOS) : null;
      juntar('titAbast', 'Nota fiscal — abastecimento', 'aba ' + CONFIG.ABA_TIT_ABAST,
        ssT ? ssT.getSheetByName(CONFIG.ABA_TIT_ABAST) : null, ['Competência', 'Competencia']);
      juntar('titManut', 'Nota fiscal — manutenção', 'aba ' + CONFIG.ABA_TIT_MANUT,
        ssT ? ssT.getSheetByName(CONFIG.ABA_TIT_MANUT) : null, ['Competência', 'Competencia']);
    } catch (e) { Logger.log('Títulos no histórico: ' + e); }

    // orçamentos ficam na planilha de manutenção
    try {
      const ssM = _ssManut_();
      juntar('orcamentos', 'Orçamentos das OS', 'aba ' + CONFIG.ABA_ORCAMENTOS,
        ssM ? ssM.getSheetByName(CONFIG.ABA_ORCAMENTOS) : null, ['Competência', 'Competencia']);
    } catch (e) { Logger.log('Orçamentos no histórico: ' + e); }

    // todas as competências encontradas, da mais recente para a mais antiga
    const todas = {};
    fontes.forEach(f => Object.keys(f.comps).forEach(k => { todas[k] = true; }));
    const ordem = c => c.substring(3) + c.substring(0, 2);
    const competencias = Object.keys(todas).sort((a, b) => ordem(b).localeCompare(ordem(a)));

    // quando e por quem, do registro de ações
    const registros = {};
    try {
      const log = ss.getSheetByName(CONFIG.ABA_LOG);
      if (log && log.getLastRow() > 1) {
        const n = log.getLastRow() - 1;
        const linhas = log.getRange(2, 1, n, 6).getValues();
        linhas.forEach(l => {
          const acao = String(l[2] || '');
          if (!/^Importar/i.test(acao)) return;
          const detalhe = String(l[5] || '');
          const m = detalhe.match(/(\d{2})\/(\d{4})/);
          if (!m) return;
          const comp = m[1] + '/' + m[2];
          const quando = String(l[0] || '');
          const atual = registros[comp];
          if (!atual || quando > atual.quando) {
            registros[comp] = { quando: quando, quem: String(l[1] || ''), acao: acao, resultado: String(l[4] || '') };
          }
        });
      }
    } catch (e) { Logger.log('Log no histórico: ' + e); }

    // a competência do mês anterior é a que normalmente deve estar completa
    const hoje = new Date();
    const ant = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const esperada = ('0' + (ant.getMonth() + 1)).slice(-2) + '/' + ant.getFullYear();

    return { ok: true,
      fontes: fontes.map(f => ({ chave: f.chave, rotulo: f.rotulo, nota: f.nota, existe: f.existe })),
      linhas: competencias.map(c => {
        const linha = { competencia: c, valores: {}, registro: registros[c] || null };
        fontes.forEach(f => { linha.valores[f.chave] = f.comps[c] || 0; });
        linha.faltando = fontes.filter(f => f.existe && !f.comps[c]).map(f => f.rotulo);
        return linha;
      }),
      esperada: esperada,
      geradoEm: Utilities.formatDate(hoje, CONFIG.FUSO, 'dd/MM/yyyy HH:mm') };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/**
 * Testa o cálculo do teto da ANP de ponta a ponta: confere o cabeçalho da aba,
 * mostra quantos tetos foram carregados por competência e simula a consulta
 * para cada combustível. Se a glosa parar de sair, é aqui que aparece.
 *     conferirTetosAnp('09/2026')
 */
function conferirTetosAnp(competencia) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_ANP);
  if (!aba) { Logger.log('Aba "' + CONFIG.ABA_ANP + '" não encontrada.'); return; }

  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
  Logger.log('Cabeçalho da linha 1 (é dele que o painel depende):');
  cab.forEach((c, i) => { if (String(c || '').trim()) Logger.log('   ' + _letraColuna_(i + 1) + ': ' + c); });
  const norm = cab.map(c => _normCab_(c));
  const exigidas = [['MES', 'MÊS'], ['PRODUTO', 'PRODUTO'], ['UF', 'UF'],
                    ['PRECO MAXIMO REVENDA', 'PREÇO MÁXIMO REVENDA (ou VALOR)']];
  let faltou = false;
  Logger.log('');
  exigidas.forEach(([chave, rotulo]) => {
    let i = norm.indexOf(chave);
    if (i < 0 && chave === 'PRECO MAXIMO REVENDA') i = norm.indexOf('VALOR');
    if (i < 0) { faltou = true; Logger.log('   FALTA: ' + rotulo); }
    else Logger.log('   ok: ' + rotulo + ' na coluna ' + _letraColuna_(i + 1));
  });
  if (faltou) {
    Logger.log('');
    Logger.log('Sem essas colunas o painel não calcula teto nenhum e a glosa da ANP sai zerada.');
    return;
  }

  let tetos;
  try { tetos = _tetosAnp_(ss); }
  catch (e) { Logger.log('ERRO ao montar os tetos: ' + e); return; }

  const porComp = {};
  Object.keys(tetos).forEach(k => {
    const comp = k.split('|')[0];
    porComp[comp] = (porComp[comp] || 0) + 1;
  });
  Logger.log('');
  Logger.log('--- tetos carregados por competência ---');
  Object.keys(porComp).sort((a, b) => (a.substring(3) + a.substring(0, 2)).localeCompare(b.substring(3) + b.substring(0, 2)))
    .forEach(c => Logger.log('   ' + c + ': ' + porComp[c] + ' combinação(ões) UF+produto'));

  const alvo = competencia ? _formatarCompetencia_(competencia, true) : '';
  if (!alvo) return 'ok';

  Logger.log('');
  Logger.log('=== simulação para ' + alvo + ', no Ceará ===');
  if (!porComp[alvo]) {
    Logger.log('   Nenhum teto nesta competência. Importe a série da ANP de ' + alvo + '.');
    return;
  }
  // os mesmos combustíveis que o painel reconhece nas transações
  ['GASOLINA COMUM', 'GASOLINA ADITIVADA', 'OLEO DIESEL S10', 'DIESEL', 'ETANOL'].forEach(comb => {
    const prod = _produtoAnp_(comb);
    if (!prod) { Logger.log('   ' + comb.padEnd(20) + ' → combustível não reconhecido pelo painel'); return; }
    const chave = alvo + '|CE|' + _normCab_(prod.anp);
    const teto = tetos[chave];
    Logger.log('   ' + comb.padEnd(20) + ' → produto ANP "' + prod.anp + '" | teto ' +
      (teto ? 'R$ ' + teto : 'NÃO ENCONTRADO (confira o nome do produto na planilha)'));
  });
  Logger.log('');
  Logger.log('Produtos que a ANP trouxe nesta competência, para o CE:');
  Object.keys(tetos).filter(k => k.indexOf(alvo + '|CE|') === 0)
    .forEach(k => Logger.log('   ' + k.split('|')[2] + ': R$ ' + tetos[k]));
  return 'ok';
}

/**
 * Mostra onde a série da ANP está guardada e o que há em cada competência.
 * Serve para o caso "diz que já importei, mas não encontro na planilha".
 *     conferirAnp()            — panorama de todas as competências
 *     conferirAnp('09/2026')   — detalha uma, com as linhas exatas
 */
function conferirAnp(competencia) {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_ANP);
  if (!aba) { Logger.log('A aba "' + CONFIG.ABA_ANP + '" não existe na planilha-mãe.'); return; }
  Logger.log('Planilha: ' + ss.getName());
  Logger.log('Aba: ' + aba.getName() + ' | linhas usadas: ' + aba.getLastRow() +
    ' | linhas na grade: ' + aba.getMaxRows() + ' | colunas: ' + aba.getLastColumn());
  Logger.log('Link direto: ' + ss.getUrl() + '#gid=' + aba.getSheetId());

  const n = aba.getLastRow();
  if (n < 1) { Logger.log('A aba está vazia.'); return; }
  const colA = aba.getRange(1, 1, n, 1).getValues();
  const exib = aba.getRange(1, 1, n, 1).getDisplayValues();

  const porComp = {};
  const soltas = [];
  colA.forEach((l, i) => {
    const c = _parseCompetenciaCelula_(l[0]);
    const linha = i + 1;
    if (!c) { if (String(exib[i][0]).trim()) soltas.push(linha + ': "' + exib[i][0] + '"'); return; }
    const k = ('0' + c.mm).slice(-2) + '/' + c.yyyy;
    if (!porComp[k]) porComp[k] = { qtd: 0, primeira: linha, ultima: linha };
    porComp[k].qtd++;
    porComp[k].ultima = linha;
  });

  const alvo = competencia ? _formatarCompetencia_(competencia, true) : '';
  Logger.log('');
  Logger.log('--- competências na aba ---');
  Object.keys(porComp).sort((a, b) => (a.substring(3) + a.substring(0, 2)).localeCompare(b.substring(3) + b.substring(0, 2)))
    .forEach(k => {
      const c = porComp[k];
      Logger.log('   ' + k + ': ' + c.qtd + ' linha(s), da linha ' + c.primeira + ' à ' + c.ultima +
        (alvo === k ? '   <<< a que você procura' : ''));
    });
  if (soltas.length) {
    Logger.log('');
    Logger.log('--- conteúdo na coluna A que NÃO é competência (empurra as próximas importações para baixo) ---');
    soltas.slice(0, 20).forEach(x => Logger.log('   linha ' + x));
    if (soltas.length > 20) Logger.log('   … e mais ' + (soltas.length - 20));
  }

  if (alvo) {
    Logger.log('');
    if (!porComp[alvo]) {
      Logger.log('A competência ' + alvo + ' NÃO está na aba. Se o painel disse que já existe, me avise.');
    } else {
      const c = porComp[alvo];
      Logger.log('=== ' + alvo + ': ' + c.qtd + ' linha(s), entre as linhas ' + c.primeira + ' e ' + c.ultima + ' ===');
      Logger.log('Para ver na planilha, vá até a linha ' + c.primeira + ' da aba ' + aba.getName() + '.');
      const quantas = Math.min(5, c.qtd);
      const amostra = aba.getRange(c.primeira, 1, quantas, Math.min(10, aba.getLastColumn())).getDisplayValues();
      Logger.log('Amostra:');
      amostra.forEach((l, i) => Logger.log('   linha ' + (c.primeira + i) + ': ' + l.join(' | ')));
      Logger.log('');
      Logger.log('Para reimportar, rode primeiro: removerCompetenciaAnp("' + alvo + '")');
    }
  }
  return 'ok';
}

/**
 * Apaga as linhas de uma competência da série da ANP, para permitir reimportar.
 * A mensagem de erro da importação pede isso, mas não havia como fazer pelo painel.
 *     removerCompetenciaAnp('09/2026')
 */
function removerCompetenciaAnp(competencia) {
  const comp = _formatarCompetencia_(competencia || '', true);
  if (!comp) { Logger.log('Informe a competência no formato MM/AAAA.'); return; }
  const partes = comp.split('/'), mm = parseInt(partes[0], 10), yyyy = parseInt(partes[1], 10);
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_ANP);
  if (!aba) { Logger.log('Aba "' + CONFIG.ABA_ANP + '" não encontrada.'); return; }
  const n = aba.getLastRow();
  if (n < 1) { Logger.log('A aba está vazia.'); return; }

  const colA = aba.getRange(1, 1, n, 1).getValues();
  const apagar = [];
  colA.forEach((l, i) => {
    const c = _parseCompetenciaCelula_(l[0]);
    if (c && c.mm === mm && c.yyyy === yyyy) apagar.push(i + 1);
  });
  if (!apagar.length) { Logger.log('Nenhuma linha de ' + comp + ' encontrada — nada a remover.'); return; }

  // de baixo para cima, senão os índices mudam a cada remoção
  apagar.sort((a, b) => b - a).forEach(linha => aba.deleteRow(linha));
  SpreadsheetApp.flush();
  limparCache();
  Logger.log(apagar.length + ' linha(s) de ' + comp + ' removida(s). Agora dá para importar de novo.');
  return apagar.length;
}

function _contarCompetenciaAnp_(aba, mm, yyyy) {
  const n = aba.getLastRow(); if (n < 1) return 0;
  let total = 0;
  aba.getRange(1, 1, n, 1).getValues().forEach(l => { const c = _parseCompetenciaCelula_(l[0]); if (c && c.mm === mm && c.yyyy === yyyy) total++; });
  return total;
}

/** Texto do PDF: usa a camada de texto e, se não houver, cai para OCR em português. */
function _textoDoPdf_(arquivo) {
  const blob = Utilities.newBlob(Utilities.base64Decode(arquivo.base64), arquivo.mimeType || 'application/pdf', arquivo.nome || 'nf.pdf');
  let texto = _pdfComoTexto_(blob, null);
  if (texto && texto.replace(/\s/g, '').length > 50) return texto;
  return _pdfComoTexto_(blob, 'pt-BR');
}
function _pdfComoTexto_(blob, ocr) {
  let doc = null;
  try {
    doc = Drive.Files.create({ name: '[TEMP NF painel] ' + Date.now(), mimeType: MimeType.GOOGLE_DOCS }, blob, ocr ? { ocrLanguage: ocr } : {});
    return DocumentApp.openById(doc.id).getBody().getText();
  } catch (e) {
    return '';
  } finally {
    if (doc && doc.id) { try { Drive.Files.remove(doc.id); } catch (e) {} }
  }
}

/** Campos da NFS-e (Ticket Log). Mesma extração do importador antigo. */
function _camposNf_(texto) {
  const T = _removerAcentos_(String(texto || '')).replace(/\s+/g, ' ').trim().toUpperCase();
  const g = re => { const x = T.match(re); return x ? x[1].trim() : ''; };
  const compRaw = g(/DATA COMPETENCIA:?\s*(\d{2}\/\d{2}\/\d{4})/);
  let competencia = '';
  if (compRaw) { const c = _parseCompetenciaCelula_(compRaw); if (c) competencia = ('0' + c.mm).slice(-2) + '/' + c.yyyy; }
  const venc = T.match(/\d{7,}\s+(\d{2}\/\d{2}\/\d{4})/) || T.match(/VENCIMENTO[\s\S]{0,40}?(\d{2}\/\d{2}\/\d{4})/);
  const chaveNacional = g(/CHAVE DE ACESSO NFS-?E NACIONAL:?\s*([0-9]+)/);
  const chaveMunicipal = g(/CHAVE DE ACESSO:?\s*([0-9][0-9\-\/]+)/);
  const valorTotal = g(/VALOR TOTAL DA NOTA FISCAL:?\s*R?\$?\s*([\d.]+,\d{2})/);
  const valorLiquido = g(/VALOR LIQUIDO DA NOTA FISCAL:?\s*R?\$?\s*([\d.]+,\d{2})/);
  const desconto = g(/DESCONTO CONDICIONAL\s*:?\s*([\d.]+,\d{2})/);
  const itens = _itensNf_(T);
  return {
    titulo: g(/TITULO NRO\.?\s*:?\s*(\d+)/),
    numeroNfse: g(/NUMERO NFS-?E NACIONAL\s*:?\s*(\d+)/),
    valorTotal: valorTotal, valorLiquido: valorLiquido, desconto: desconto,
    reembolsoPecas: itens.pecas, reembolsoMaoObra: itens.mao,
    outrosItens: itens.outros,
    outrosValor: itens.outros.reduce((soma, o) => soma + (_parseNumeroBR_(o.valor) || 0), 0),
    outrosRotulo: itens.outros.map(o => o.rotulo).join(' + '),
    dataEmissao: g(/DATA DE EMISSAO:?\s*(\d{2}\/\d{2}\/\d{4})/),
    vencimento: venc ? venc[1] : '', competencia: competencia,
    chave: (CONFIG.CHAVE_NF === 'municipal' && chaveMunicipal) ? chaveMunicipal : (chaveNacional || chaveMunicipal)
  };
}

/**
 * Itens não tributáveis da NFS-e, lidos pelo rótulo de cada linha.
 * A Ticket Log emite "REEMBOLSO EM PECAS", "REEMBOLSO DE MAO DE OBRA" e,
 * eventualmente, uma terceira linha (juros/acerto). Ler por rótulo evita o
 * problema de somar pares quando há mais de dois itens.
 */
function _itensNf_(T) {
  const valor = re => { const m = T.match(re); return m ? m[1] : ''; };
  const pecas = valor(/REEMBOLSO EM PECAS[\s\S]{0,80}?(\d[\d.]*,\d{2})/);
  const mao = valor(/REEMBOLSO DE MAO DE OBRA[\s\S]{0,80}?(\d[\d.]*,\d{2})/);
  const outros = [];
  // qualquer outro item da seção, com o rótulo que a nota usou
  const re = /(?:CONTA E ORDEM DE TERCEIRO\.\s*)([A-Z0-9ÇÃÕÁÉÍÓÚ\.\s\/-]{4,60}?)\s+\d{2}\/\d{2}\/\d{4}\s+(\d[\d.]*,\d{2})/g;
  let m;
  while ((m = re.exec(T)) !== null) {
    const rotulo = m[1].replace(/\s+/g, ' ').trim();
    if (/REEMBOLSO EM PECAS|REEMBOLSO DE MAO DE OBRA/.test(rotulo)) continue;
    outros.push({ rotulo: rotulo, valor: m[2] });
  }
  return { pecas: pecas, mao: mao, outros: outros };
}

/** Arquivo enviado: tabela HTML (com rowspan) ou Excel convertido pelo Drive. */
function _lerTabelaArquivo_(arquivo) {
  const bytes = Utilities.base64Decode(arquivo.base64);
  const ehZip = bytes.length > 1 && bytes[0] === 80 && bytes[1] === 75;   // "PK" = xlsx
  if (!ehZip) {
    const txt = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    if (/<table[\s>]/i.test(txt) || /<tr[\s>]/i.test(txt)) return _parseHtmlTable_(txt);
  }
  let temporario = null;
  try {
    const blob = Utilities.newBlob(bytes, arquivo.mimeType || MimeType.MICROSOFT_EXCEL, arquivo.nome || 'arquivo.xlsx');
    temporario = Drive.Files.create({ name: '[TEMP tabela painel]', mimeType: MimeType.GOOGLE_SHEETS }, blob);
    return SpreadsheetApp.openById(temporario.id).getSheets()[0].getDataRange().getDisplayValues();
  } finally {
    if (temporario && temporario.id) { try { Drive.Files.remove(temporario.id); } catch (e) {} }
  }
}

function _parseNumeroBR_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim().replace(/r\$/gi, '').replace(/\s/g, '');
  if (!s) return '';
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function _parseDataBR_(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  const d = new Date(_normalizarAno_(m[3]), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? s : d;
}

function _formatarCompetencia_(s, obrigatorio) {
  let t = (s === null || s === undefined) ? '' : String(s).trim();
  if (!t) { if (obrigatorio) throw new Error('Informe a competência no formato MM/YYYY (ex.: 05/2026).'); return ''; }
  const p = _parseCompetenciaCelula_(t);
  if (!p) throw new Error('Competência inválida: "' + t + '". Use MM/YYYY (ex.: 05/2026).');
  return String(p.mm).padStart(2, '0') + '/' + p.yyyy;
}

function _parseCompetenciaCelula_(v) {
  if (v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return { mm: v.getMonth() + 1, yyyy: v.getFullYear() };
  }
  let s = _removerAcentos_(String(v).trim().toLowerCase()).replace(/\s+/g, '');
  if (!s) return null;
  let m = s.match(/^([a-z]{3,})[\/\-.]?(\d{2,4})$/);            // mai/26
  if (m) { const mes = MESES_PT[m[1].substring(0, 3)]; return mes ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  m = s.match(/^\d{1,2}[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);     // dd/mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  m = s.match(/^(\d{1,2})[\/\-.](\d{2,4})$/);                   // mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: _normalizarAno_(m[2]) } : null; }
  return null;
}

function _primeiraLinhaVaziaNaColuna_(aba, col, startRow) {
  const maxRows = aba.getMaxRows();
  if (startRow > maxRows) return startRow;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === '') return startRow + i;
  return maxRows + 1;
}

function _proximaLinhaAppend_(aba, col, floor) {
  const maxRows = aba.getMaxRows();
  const vals = aba.getRange(1, col, maxRows, 1).getDisplayValues();
  let last = 0;
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() !== '') last = i + 1;
  return Math.max(last + 1, floor);
}

function _obterValoresColuna_(aba, col, startRow) {
  const set = new Set();
  const maxRows = aba.getMaxRows();
  if (maxRows < startRow) return set;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  vals.forEach(r => { const v = _normalizarCodigo_(r[0]); if (v) set.add(v); });
  return set;
}

function _parseHtmlTable_(html) {
  const tabelas = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  if (!tabelas.length) return [];
  const tableHtml = tabelas.sort((a, b) => b.length - a.length)[0];
  const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const grid = [];
  const carry = {}; // col -> { value, remaining } (rowspan pendente)

  trs.forEach(tr => {
    const cells = tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [];
    const rowOut = [];
    let col = 0;
    const aplicarCarry = () => {
      while (carry[col] && carry[col].remaining > 0) {
        rowOut[col] = carry[col].value;
        carry[col].remaining--;
        if (carry[col].remaining === 0) delete carry[col];
        col++;
      }
    };
    cells.forEach(cell => {
      aplicarCarry();
      const colspan = parseInt((cell.match(/colspan\s*=\s*"?(\d+)/i) || [])[1] || '1', 10);
      const rowspan = parseInt((cell.match(/rowspan\s*=\s*"?(\d+)/i) || [])[1] || '1', 10);
      const val = _limparCelulaHtml_(cell);
      for (let k = 0; k < colspan; k++) {
        rowOut[col] = val;
        if (rowspan > 1) carry[col] = { value: val, remaining: rowspan - 1 };
        col++;
      }
    });
    aplicarCarry();
    grid.push(rowOut);
  });

  const width = grid.reduce((m, r) => Math.max(m, r.length), 0);
  return grid.map(r => { const o = new Array(width).fill(''); for (let i = 0; i < width; i++) o[i] = (r[i] !== undefined ? r[i] : ''); return o; });
}

function _removerAcentos_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _normalizarCodigo_(v) { return String(v || '').trim(); }



/* ============================================================
   EXECUÇÃO CONTRATUAL — Contrato nº 08/2021 (Ticket Soluções)
   Acompanha quanto já foi faturado por competência e projeta se o
   saldo chega ao fim da vigência. Os limites ficam no CONFIG, com
   as três projeções: média do exercício, média dos três últimos
   meses e o ritmo que ainda caberia no saldo.
   ============================================================ */

const CONTRATO = {
  vigenciaInicio: '01/03/2026',       // primeira competência da vigência atual: 03/2026
  vigenciaFim: '01/03/2027',          // última competência faturada: 02/2027
  limites: {
    abastecimento: 2200055.11,
    pecas: 983278.07,
    servicos: 498162.48
  },
  // nomes reais das colunas nas abas de títulos
  colunas: {
    abast: ['Valor Bruto'],
    pecas: ['Valor em Peças'],
    servicos: ['Valor Mão de Obra'],
    // acidentes são reembolsados à parte: entram no acompanhamento, mas separados
    pecasAcidente: ['Valor em Peças (Acidente)'],
    servicosAcidente: ['Valor Mão de Obra (Acidente)']
  }
};

/** Competências entre duas datas, em ordem. */
function _competenciasAte_(inicioMes, inicioAno, fimMes, fimAno) {
  const lista = [];
  let m = inicioMes, a = inicioAno;
  while (a < fimAno || (a === fimAno && m <= fimMes)) {
    lista.push(('0' + m).slice(-2) + '/' + a);
    m++; if (m > 12) { m = 1; a++; }
  }
  return lista;
}

/** Soma por competência de uma aba de títulos. */
function _executadoPorCompetencia_(tabela, nomesValor) {
  const mapa = {};
  if (!tabela || !tabela.cab || !tabela.linhas) return mapa;
  const cab = tabela.cab.map(c => _normCab_(c));
  const achar = nomes => {
    for (let i = 0; i < nomes.length; i++) {
      const alvo = _normCab_(nomes[i]);
      const exato = cab.indexOf(alvo);
      if (exato >= 0) return exato;
    }
    // o prefixo só vale quando não houver risco de pegar a coluna de acidente
    for (let i = 0; i < nomes.length; i++) {
      const alvo = _normCab_(nomes[i]);
      const p = cab.findIndex(c => c && c.indexOf(alvo) === 0 && c.indexOf('ACIDENTE') < 0);
      if (p >= 0) return p;
    }
    return -1;
  };
  const iComp = achar(['Competência', 'Competencia', 'Mês', 'Mes']);
  if (iComp < 0) return mapa;
  const indices = {};
  Object.keys(nomesValor).forEach(k => { indices[k] = achar(nomesValor[k]); });

  tabela.linhas.forEach(l => {
    const comp = _competenciaDaCelula_(l[iComp]) || String(l[iComp] || '').trim();
    if (!/\d{2}\/\d{4}/.test(comp)) return;
    const reg = mapa[comp] || (mapa[comp] = {});
    Object.keys(indices).forEach(k => {
      if (indices[k] < 0) return;
      reg[k] = (reg[k] || 0) + (_num_(l[indices[k]]) || 0);
    });
  });
  return mapa;
}


/** Mostra os cabeçalhos das abas de títulos e o que o contrato conseguiu somar. */
function conferirContrato() {
  const t = _lerTitulos_();
  [['Títulos Abast.', t.abast], ['Títulos Manut.', t.manut]].forEach(([nome, tab]) => {
    Logger.log('=== ' + nome + ' ===');
    if (!tab) { Logger.log('   aba não lida'); return; }
    Logger.log('   linhas: ' + (tab.linhas ? tab.linhas.length : 0));
    (tab.cab || []).forEach((c, i) => { if (String(c || '').trim()) Logger.log('   ' + _letraColuna_(i + 1) + ': ' + c); });
  });
  Logger.log('');
  const r = execucaoContrato('');
  if (!r.ok) { Logger.log('Falha: ' + r.erro); return; }
  ['abastecimento', 'manutencao'].forEach(k => {
    const b = r[k];
    Logger.log('--- ' + k + ' | limite ' + _moedaBR_(b.limite) + ' | executado ' + _moedaBR_(b.executado) +
      ' (' + b.percentual + '%) | competências com valor: ' + b.realizadas);
    b.serie.filter(x => x.total > 0).forEach(x => Logger.log('   ' + x.comp + ': ' + _moedaBR_(x.total)));
  });
  return 'ok';
}

/**
 * Execução do contrato: realizado por competência e as quatro linhas do
 * acompanhamento — realizado, média do exercício, média dos três últimos
 * meses e o ritmo que ainda cabe no saldo até o fim da vigência.
 */
function execucaoContrato(token) {
  if (token) { const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao; }
  try {
    const titulos = _lerTitulos_();
    if (titulos.erro) return { ok: false, erro: 'Planilha de títulos: ' + titulos.erro };

    const abast = _executadoPorCompetencia_(titulos.abast, { valor: CONTRATO.colunas.abast });
    const manut = _executadoPorCompetencia_(titulos.manut, {
      pecas: CONTRATO.colunas.pecas, servicos: CONTRATO.colunas.servicos,
      pecasAcidente: CONTRATO.colunas.pecasAcidente, servicosAcidente: CONTRATO.colunas.servicosAcidente
    });

    // apenas a vigência atual: competências anteriores pertencem a outro período
    const mIni = CONTRATO.vigenciaInicio.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const mFim = CONTRATO.vigenciaFim.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    // a vigência termina em 01/03/2027, então a última competência faturada é 02/2027
    let fimMes = Number(mFim[2]) - 1, fimAno = Number(mFim[3]);
    if (fimMes < 1) { fimMes = 12; fimAno--; }
    const linha = _competenciasAte_(Number(mIni[2]), Number(mIni[3]), fimMes, fimAno);
    if (!Object.keys(manut).length && !Object.keys(abast).length) {
      return { ok: false, erro: 'Nenhuma competência encontrada nas abas de títulos. Rode conferirContrato() no editor para ver os cabeçalhos lidos.' };
    }

    const montar = (mapa, campos, limite) => {
      const serie = linha.map(c => {
        const reg = mapa[c] || {};
        const item = { comp: c, total: 0 };
        campos.forEach(k => { item[k] = reg[k] || 0; item.total += item[k]; });
        return item;
      });
      const realizadas = serie.filter(x => x.total > 0);
      const executado = realizadas.reduce((t, x) => t + x.total, 0);
      const saldo = limite - executado;
      const restantes = serie.length - realizadas.length;
      const anoAtual = new Date().getFullYear();
      const doAno = realizadas.filter(x => Number(x.comp.substring(3)) === anoAtual);
      const mediaAno = doAno.length ? executadoDe(doAno) / doAno.length : 0;
      const ultimas3 = realizadas.slice(-3);
      const media3 = ultimas3.length ? executadoDe(ultimas3) / ultimas3.length : 0;
      const sustentavel = restantes > 0 ? saldo / restantes : 0;
      // quando o saldo se esgota, mantido cada ritmo
      const esgota = ritmo => {
        if (ritmo <= 0) return '';
        let acumulado = executado, i = realizadas.length;
        while (i < serie.length) {
          acumulado += ritmo;
          if (acumulado > limite) return serie[i].comp;
          i++;
        }
        return '';                       // não esgota dentro da vigência
      };
      return { serie: serie, realizadas: realizadas.length, restantes: restantes,
        limite: limite, executado: Math.round(executado * 100) / 100,
        saldo: Math.round(saldo * 100) / 100,
        percentual: limite ? Math.round(executado / limite * 1000) / 10 : 0,
        mediaAno: Math.round(mediaAno * 100) / 100, media3: Math.round(media3 * 100) / 100,
        sustentavel: Math.round(sustentavel * 100) / 100,
        esgotaMediaAno: esgota(mediaAno), esgotaMedia3: esgota(media3),
        ultimaComp: realizadas.length ? realizadas[realizadas.length - 1].comp : '' };
    };
    function executadoDe(lista) { return lista.reduce((t, x) => t + x.total, 0); }

    const limiteManut = CONTRATO.limites.pecas + CONTRATO.limites.servicos;
    const saida = { ok: true, vigenciaInicio: CONTRATO.vigenciaInicio, vigenciaFim: CONTRATO.vigenciaFim,
      ultimaCompetencia: linha[linha.length - 1], primeiraCompetencia: linha[0],
      competencias: linha,
      abastecimento: montar(abast, ['valor'], CONTRATO.limites.abastecimento),
      manutencao: montar(manut, ['pecas', 'servicos'], limiteManut),
      acidentes: montar(manut, ['pecasAcidente', 'servicosAcidente'], 0),
      limites: CONTRATO.limites,
      geradoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm') };

    // peças e serviços têm limites próprios: cada um tem o seu saldo
    saida.manutencao.pecas = montar(manut, ['pecas'], CONTRATO.limites.pecas);
    saida.manutencao.servicos = montar(manut, ['servicos'], CONTRATO.limites.servicos);
    return saida;
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/* ============================================================
   RELATÓRIO DA FROTA (PDF, paisagem)
   Retrato do estado da frota por unidade: o que está disponível,
   o que está parado, como está o conceito do PGF e como o uso
   SIPAC se distribui — separando policiamento ostensivo,
   motopoliciamento e o restante.
   ============================================================ */

/** Agrupa os usos SIPAC em famílias, para a leitura não virar uma lista longa. */
function _familiaUso_(uso) {
  const t = _normCab_(uso);
  if (!t) return 'Não informado';
  if (/MOTOPOLICIAMENTO|MOTOCICLETA/.test(t)) return 'Motopoliciamento ostensivo';
  if (/POLICIAMENTO OSTENSIVO/.test(t)) return 'Policiamento ostensivo';
  if (/COMANDO|REPRESENTACAO|AUTORIDADE/.test(t)) return 'Comando e representação';
  if (/APOIO|ADMINISTRATIV|TRANSPORTE|SERVICO/.test(t)) return 'Apoio e administrativo';
  if (/OPERACION|ESPECIAL|CANIL|K9|TATICO|ROTA/.test(t)) return 'Operações especiais';
  return 'Outros usos';
}

/** Disponibilidade a partir do status da viatura. */
function _disponibilidade_(status) {
  const t = _normCab_(status);
  if (/DISPON|ATIVA|EM USO|OPERAC/.test(t)) return 'Disponível';
  if (/MANUTENCAO|OFICINA|REPARO/.test(t)) return 'Em manutenção';
  if (/DESFAZ|ALIENAD|BAIXAD|LEILAO/.test(t)) return 'Em desfazimento';
  if (/CAUTELA|CEDID|EMPREST/.test(t)) return 'Cedida ou cautelada';
  if (/SINISTR|ACIDENT/.test(t)) return 'Sinistrada';
  if (!t) return 'Sem status';
  return 'Outras situações';
}

function gerarRelatorioFrota(token, filtros) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const todos = _lerVeiculos_(ss);
    const placasFiltro = (filtros && filtros.placas && filtros.placas.length) ? {} : null;
    if (placasFiltro) filtros.placas.forEach(pl => { placasFiltro[String(pl).toUpperCase()] = true; });
    const veiculos = todos.filter(v => !placasFiltro || placasFiltro[v.placa]);
    if (!veiculos.length) return { ok: false, erro: 'Nenhuma viatura na seleção.' };

    // uso recente: abastecimento nos últimos dois meses indica viatura rodando
    const dados = veiculos.map(v => ({
      placa: v.placa, modelo: v.modelo || '', unidade: v.unidade || 'Sem unidade',
      uso: v.uso || '', familia: _familiaUso_(v.uso), disponibilidade: _disponibilidade_(v.status),
      status: v.status || '', conceito: v.conceito || v.notaFinal || '', nota: _num_(v.notaFinal) || 0,
      anoFab: v.anoFab || '', anoMod: v.anoMod || '', odometro: _num_(v.odometro) || 0,
      kmAno: _num_(v.kmR) || 0, custoManut: _num_(v.manutR) || 0, custoAbast: _num_(v.abastR) || 0,
      custoKm: _num_(v.manutRsKm) || 0, abastRecente: /SIM|^S$|\d/i.test(String(v.abast2m || '').trim()),
      prop: v.prop || '', anoEx: v.anoEx || '', emDesf: v.emDesf || '',
      tipo: v.tipo || 'Não informado', especie: v.especie || '', categoria: v.categoria || '',
      blindada: /SIM|BLINDAD/i.test(String(v.blind || '')) ? 'Blindada' : 'Não blindada',
      carac: v.carac || '', comb: v.comb || '', marca: String(v.modelo || '').split(/[\/ ]/)[0] || '—',
      faixaIdade: (() => {
        const a = parseInt(String(v.anoFab).replace(/\D/g, ''), 10);
        if (!a || a < 1980) return 'Sem ano';
        const idade = new Date().getFullYear() - a;
        return idade <= 2 ? 'Até 2 anos' : idade <= 5 ? '3 a 5 anos' : idade <= 8 ? '6 a 8 anos' : 'Mais de 8 anos';
      })(),
      faixaOdo: (() => {
        const o = _num_(v.odometro) || 0;
        if (!o) return 'Sem odômetro';
        return o < 50000 ? 'Até 50 mil' : o < 100000 ? '50 a 100 mil' : o < 150000 ? '100 a 150 mil' : 'Acima de 150 mil';
      })()
    }));

    const contar = (lista, chave) => {
      const mapa = {};
      lista.forEach(x => { const k = x[chave] || '—'; mapa[k] = (mapa[k] || 0) + 1; });
      return Object.keys(mapa).map(k => ({ chave: k, qtd: mapa[k] })).sort((a, b) => b.qtd - a.qtd);
    };

    // quadro por unidade: o que é, o que roda, como está o conceito
    const unidades = {};
    dados.forEach(v => {
      const u = unidades[v.unidade] || (unidades[v.unidade] = { unidade: v.unidade, total: 0, disponiveis: 0,
        manutencao: 0, desfazimento: 0, outras: 0, rodando: 0, paradas: 0, somaNota: 0, comNota: 0,
        conceitoD: 0, familias: {}, idadeSoma: 0, idadeN: 0 });
      u.total++;
      if (v.disponibilidade === 'Disponível') u.disponiveis++;
      else if (v.disponibilidade === 'Em manutenção') u.manutencao++;
      else if (v.disponibilidade === 'Em desfazimento') u.desfazimento++;
      else u.outras++;
      if (v.abastRecente) u.rodando++; else u.paradas++;
      if (v.nota) { u.somaNota += v.nota; u.comNota++; }
      if (/^D/i.test(String(v.conceito).trim())) u.conceitoD++;
      u.familias[v.familia] = (u.familias[v.familia] || 0) + 1;
      u.km = (u.km || 0) + v.kmAno;
      u.custoManut = (u.custoManut || 0) + v.custoManut;
      u.custoAbast = (u.custoAbast || 0) + v.custoAbast;
      u.odoSoma = (u.odoSoma || 0) + v.odometro;
      const ano = parseInt(String(v.anoFab).replace(/\D/g, ''), 10);
      if (ano > 1980) { u.idadeSoma += (new Date().getFullYear() - ano); u.idadeN++; }
    });
    const listaUnidades = Object.keys(unidades).map(k => {
      const u = unidades[k];
      u.notaMedia = u.comNota ? Math.round(u.somaNota / u.comNota * 10) / 10 : 0;
      u.idadeMedia = u.idadeN ? Math.round(u.idadeSoma / u.idadeN * 10) / 10 : 0;
      u.aproveitamento = u.total ? Math.round(u.rodando / u.total * 100) : 0;
      u.kmPorVtr = u.total ? Math.round(u.km / u.total) : 0;
      u.odoMedio = u.total ? Math.round(u.odoSoma / u.total) : 0;
      u.custoPorVtr = u.total ? Math.round(u.custoManut / u.total) : 0;
      u.custoPorKm = u.km ? Math.round(u.custoManut / u.km * 100) / 100 : 0;
      u.ociosas = u.disponiveis - u.rodando > 0 ? u.disponiveis - u.rodando : 0;
      return u;
    }).sort((a, b) => b.total - a.total);

    // matriz uso × disponibilidade
    const familias = {};
    dados.forEach(v => {
      const f = familias[v.familia] || (familias[v.familia] = { familia: v.familia, total: 0, disponiveis: 0,
        rodando: 0, paradas: 0, somaNota: 0, comNota: 0, usos: {} });
      f.total++;
      if (v.disponibilidade === 'Disponível') f.disponiveis++;
      if (v.abastRecente) f.rodando++; else f.paradas++;
      if (v.nota) { f.somaNota += v.nota; f.comNota++; }
      if (v.uso) f.usos[v.uso] = (f.usos[v.uso] || 0) + 1;
    });
    const listaFamilias = Object.keys(familias).map(k => {
      const f = familias[k];
      f.notaMedia = f.comNota ? Math.round(f.somaNota / f.comNota * 10) / 10 : 0;
      f.aproveitamento = f.total ? Math.round(f.rodando / f.total * 100) : 0;
      return f;
    }).sort((a, b) => b.total - a.total);

    const paradas = dados.filter(v => !v.abastRecente && v.disponibilidade === 'Disponível')
      .sort((a, b) => a.unidade.localeCompare(b.unidade) || a.placa.localeCompare(b.placa));
    const conceitoBaixo = dados.filter(v => /^D/i.test(String(v.conceito).trim()) || (v.nota && v.nota < 5))
      .sort((a, b) => (a.nota || 99) - (b.nota || 99));

    const resumo = {
      total: dados.length,
      disponiveis: dados.filter(v => v.disponibilidade === 'Disponível').length,
      manutencao: dados.filter(v => v.disponibilidade === 'Em manutenção').length,
      desfazimento: dados.filter(v => v.disponibilidade === 'Em desfazimento').length,
      rodando: dados.filter(v => v.abastRecente).length,
      unidades: listaUnidades.length,
      notaMedia: (() => { const c = dados.filter(v => v.nota); return c.length ? Math.round(c.reduce((s, v) => s + v.nota, 0) / c.length * 10) / 10 : 0; })(),
      idadeMedia: (() => {
        const anos = dados.map(v => parseInt(String(v.anoFab).replace(/\D/g, ''), 10)).filter(a => a > 1980);
        return anos.length ? Math.round(anos.reduce((s, a) => s + (new Date().getFullYear() - a), 0) / anos.length * 10) / 10 : 0;
      })()
    };

    const html = _htmlRelatorioFrota_({ resumo: resumo, unidades: listaUnidades, familias: listaFamilias,
      porDisponibilidade: contar(dados, 'disponibilidade'), porConceito: contar(dados.filter(v => v.conceito), 'conceito'),
      paradas: paradas, conceitoBaixo: conceitoBaixo, dados: dados }, p.sessao, !!placasFiltro);

    const nome = 'Relatorio_Frota_' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyyyMMdd') + '.pdf';
    const pdf = _entregarPdf_(Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(nome), nome);
    _logAcao_(p.ss, p.sessao.email, 'Relatório da frota', '', dados.length + ' viatura(s)', pdf.link || 'download direto');
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '', resumo: resumo };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  }
}


/** Linhas do comparativo entre unidades, com realce do que foge da média. */
function _linhasComparativo_(r) {
  const u = r.unidades.slice().sort((a, b) => b.ociosas - a.ociosas || b.total - a.total);
  const medio = campo => {
    const vals = u.map(x => x[campo]).filter(v => v > 0);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };
  const mIdade = medio('idadeMedia'), mKm = medio('kmPorVtr'), mCusto = medio('custoPorKm');
  const marca = (valor, media, maiorEhPior) => {
    if (!valor || !media) return '';
    const d = (valor / media - 1) * 100;
    if (Math.abs(d) < 25) return '';
    const ruim = maiorEhPior ? d > 0 : d < 0;
    return '<small class="' + (ruim ? 'alerta' : '') + '">' + (d > 0 ? '+' : '') + Math.round(d) + '% vs média</small>';
  };
  return u.map(x =>
    '<tr>' +
    '<td class="forte">' + x.unidade + '</td>' +
    '<td class="num">' + x.total + '</td>' +
    '<td class="num ' + (x.ociosas >= 3 ? 'destaque' : '') + '">' + x.ociosas +
      (x.total ? '<small>' + Math.round(x.ociosas / x.total * 100) + '% da unidade</small>' : '') + '</td>' +
    '<td class="num">' + (x.idadeMedia || '—') + marca(x.idadeMedia, mIdade, true) + '</td>' +
    '<td class="num">' + (x.odoMedio ? fmtIntServidor(x.odoMedio) : '—') + '</td>' +
    '<td class="num">' + (x.kmPorVtr ? fmtIntServidor(x.kmPorVtr) : '—') + marca(x.kmPorVtr, mKm, false) + '</td>' +
    '<td class="num">' + (x.custoManut ? _moedaBR_(x.custoManut) : '—') + '</td>' +
    '<td class="num">' + (x.custoPorVtr ? _moedaBR_(x.custoPorVtr) : '—') + '</td>' +
    '<td class="num">' + (x.custoPorKm ? _moedaBR_(x.custoPorKm) : '—') + marca(x.custoPorKm, mCusto, true) + '</td>' +
    '<td class="num">' + (x.notaMedia || '—') + '</td>' +
    '</tr>').join('');
}

/** Extremos que orientam a decisão: frota mais velha, mais rodada, mais cara. */
function _destaquesComparativo_(r) {
  const u = r.unidades.filter(x => x.total >= 2);
  if (u.length < 2) return '';
  const extremo = (campo, maior) => {
    const lista = u.filter(x => x[campo] > 0).sort((a, b) => maior ? b[campo] - a[campo] : a[campo] - b[campo]);
    return lista.length ? lista[0] : null;
  };
  const cartao = (titulo, unidade, valor, nota) => {
    if (!unidade) return '';
    return '<div class="cartao"><div class="rotulo">' + titulo + '</div>' +
      '<div class="valor" style="font-size:12px">' + unidade.unidade + '</div>' +
      '<div class="sub">' + valor + (nota ? ' • ' + nota : '') + '</div></div>';
  };
  const velha = extremo('idadeMedia', true), nova = extremo('idadeMedia', false);
  const rodada = extremo('kmPorVtr', true), parada = extremo('kmPorVtr', false);
  const cara = extremo('custoPorKm', true), ociosa = extremo('ociosas', true);
  return '<div class="cartoes" style="margin-top:8px">' +
    cartao('Frota mais antiga', velha, velha ? velha.idadeMedia + ' anos em média' : '', '') +
    cartao('Frota mais recente', nova, nova ? nova.idadeMedia + ' anos em média' : '', '') +
    cartao('Mais rodada', rodada, rodada ? fmtIntServidor(rodada.kmPorVtr) + ' km/ano por viatura' : '', '') +
    cartao('Menos rodada', parada, parada ? fmtIntServidor(parada.kmPorVtr) + ' km/ano por viatura' : '', '') +
    cartao('Maior custo por km', cara, cara ? _moedaBR_(cara.custoPorKm) + ' por km' : '', '') +
    cartao('Mais viaturas ociosas', ociosa, ociosa ? ociosa.ociosas + ' disponíveis sem uso' : '', '') +
    '</div>';
}


/** Quadro analítico de um agrupamento qualquer: conta, disponibilidade, uso e custo. */
function _quadroAnalitico_(lista, chave, titulo, nota) {
  const grupos = {};
  lista.forEach(v => {
    const k = v[chave] || 'Não informado';
    const g = grupos[k] || (grupos[k] = { chave: k, total: 0, disponiveis: 0, manutencao: 0, desfazimento: 0,
      rodando: 0, km: 0, custo: 0, somaNota: 0, comNota: 0, idadeSoma: 0, idadeN: 0, odoSoma: 0, odoN: 0 });
    g.total++;
    if (v.disponibilidade === 'Disponível') g.disponiveis++;
    else if (v.disponibilidade === 'Em manutenção') g.manutencao++;
    else if (v.disponibilidade === 'Em desfazimento') g.desfazimento++;
    if (v.abastRecente) g.rodando++;
    g.km += v.kmAno; g.custo += v.custoManut;
    if (v.nota) { g.somaNota += v.nota; g.comNota++; }
    if (v.odometro) { g.odoSoma += v.odometro; g.odoN++; }
    const ano = parseInt(String(v.anoFab).replace(/\D/g, ''), 10);
    if (ano > 1980) { g.idadeSoma += (new Date().getFullYear() - ano); g.idadeN++; }
  });
  const linhas = Object.keys(grupos).map(k => grupos[k]).sort((a, b) => b.total - a.total);
  if (!linhas.length) return '';
  const total = lista.length;
  const corpo = linhas.map(g => {
    const aprov = g.total ? Math.round(g.rodando / g.total * 100) : 0;
    return '<tr>' +
      '<td class="forte">' + g.chave + '</td>' +
      '<td class="num">' + g.total + '<small>' + (total ? Math.round(g.total / total * 100) : 0) + '%</small></td>' +
      '<td class="num">' + g.disponiveis + '</td>' +
      '<td class="num">' + g.manutencao + '</td>' +
      '<td class="num">' + g.desfazimento + '</td>' +
      '<td class="num">' + g.rodando +
        '<div class="barra"><div class="preenche" style="width:' + aprov + '%; background:' +
        (aprov >= 70 ? '#1E7A4D' : aprov >= 40 ? '#C58B00' : '#9A2F24') + '"></div></div><small>' + aprov + '% em uso</small></td>' +
      '<td class="num">' + (g.idadeN ? Math.round(g.idadeSoma / g.idadeN * 10) / 10 : '—') + '</td>' +
      '<td class="num">' + (g.odoN ? fmtIntServidor(Math.round(g.odoSoma / g.odoN)) : '—') + '</td>' +
      '<td class="num">' + (g.km ? fmtIntServidor(Math.round(g.km / g.total)) : '—') + '</td>' +
      '<td class="num">' + (g.custo ? _moedaBR_(g.custo) : '—') + '</td>' +
      '<td class="num">' + (g.km && g.custo ? _moedaBR_(Math.round(g.custo / g.km * 100) / 100) : '—') + '</td>' +
      '<td class="num">' + (g.comNota ? Math.round(g.somaNota / g.comNota * 10) / 10 : '—') + '</td>' +
      '</tr>';
  }).join('');
  return '<h2>' + titulo + '</h2>' +
    (nota ? '<p style="font-size:9px; color:#5A6376; margin:2px 0 4px">' + nota + '</p>' : '') +
    '<table><thead><tr><th>' + titulo.replace(/^Por /, '') + '</th><th class="num">Viaturas</th><th class="num">Disp.</th>' +
    '<th class="num">Manut.</th><th class="num">Desfaz.</th><th class="num">Em uso</th><th class="num">Idade</th>' +
    '<th class="num">Odômetro médio</th><th class="num">Km/ano médio</th><th class="num">Manutenção 12m</th>' +
    '<th class="num">Custo/km</th><th class="num">Conceito</th></tr></thead><tbody>' + corpo + '</tbody></table>';
}

/** Detalhamento analítico de cada unidade, com os cortes que a gestão usa. */
function _analiticoPorUnidade_(dados, unidades) {
  return unidades.map(u => {
    const lista = dados.filter(v => v.unidade === u.unidade);
    if (!lista.length) return '';
    const blindadas = lista.filter(v => v.blindada === 'Blindada').length;
    return '<div class="quebra"></div>' +
      '<h2>' + u.unidade + ' — análise detalhada</h2>' +
      '<div class="cartoes">' +
        '<div class="cartao"><div class="rotulo">Viaturas</div><div class="valor">' + u.total + '</div><div class="sub">' + u.disponiveis + ' disponíveis</div></div>' +
        '<div class="cartao"><div class="rotulo">Em uso recente</div><div class="valor">' + u.rodando + '</div><div class="sub">' + u.aproveitamento + '% da unidade</div></div>' +
        '<div class="cartao"><div class="rotulo">Ociosas</div><div class="valor">' + u.ociosas + '</div><div class="sub">disponíveis sem uso</div></div>' +
        '<div class="cartao"><div class="rotulo">Blindadas</div><div class="valor">' + blindadas + '</div><div class="sub">de ' + u.total + '</div></div>' +
        '<div class="cartao"><div class="rotulo">Idade média</div><div class="valor">' + (u.idadeMedia || '—') + '</div><div class="sub">anos</div></div>' +
        '<div class="cartao"><div class="rotulo">Custo por km</div><div class="valor" style="font-size:13px">' + (u.custoPorKm ? _moedaBR_(u.custoPorKm) : '—') + '</div><div class="sub">manutenção 12m</div></div>' +
      '</div>' +
      _quadroAnalitico_(lista, 'tipo', 'Por tipo de viatura', '') +
      _quadroAnalitico_(lista, 'familia', 'Por família de uso SIPAC', '') +
      _quadroAnalitico_(lista, 'blindada', 'Por blindagem', '') +
      _quadroAnalitico_(lista, 'faixaIdade', 'Por faixa de idade', '') +
      '<h2>Viaturas da unidade</h2>' +
      '<table><thead><tr><th>Placa</th><th>Modelo</th><th>Tipo</th><th>Uso SIPAC</th><th>Blindagem</th>' +
      '<th>Situação</th><th class="num">Ano</th><th class="num">Odômetro</th><th class="num">Km/ano</th>' +
      '<th class="num">Manut. 12m</th><th class="num">Conceito</th><th>Uso recente</th></tr></thead><tbody>' +
      lista.sort((a, b) => a.placa.localeCompare(b.placa)).map(v =>
        '<tr><td class="mono">' + v.placa + '</td><td>' + v.modelo + '</td><td>' + v.tipo + '</td>' +
        '<td>' + (v.uso || '—') + '</td><td>' + (v.blindada === 'Blindada' ? '<b>Blindada</b>' : '—') + '</td>' +
        '<td>' + v.disponibilidade + '</td><td class="num">' + (v.anoFab || '—') + '</td>' +
        '<td class="num">' + (v.odometro ? fmtIntServidor(v.odometro) : '—') + '</td>' +
        '<td class="num">' + (v.kmAno ? fmtIntServidor(v.kmAno) : '—') + '</td>' +
        '<td class="num">' + (v.custoManut ? _moedaBR_(v.custoManut) : '—') + '</td>' +
        '<td class="num">' + (v.conceito || '—') + '</td>' +
        '<td>' + (v.abastRecente ? 'sim' : '<b class="nao-usa">não</b>') + '</td></tr>').join('') +
      '</tbody></table>';
  }).join('');
}

function _htmlRelatorioFrota_(r, sessao, filtrado) {
  const n = v => fmtIntServidor(v);
  const pct = (parte, total) => total ? Math.round(parte / total * 100) : 0;
  const barra = (parte, total, cor) => {
    const p = pct(parte, total);
    return '<div class="barra"><div class="preenche" style="width:' + p + '%; background:' + (cor || '#0B2C5C') + '"></div></div>';
  };
  const hoje = Utilities.formatDate(new Date(), CONFIG.FUSO, "dd/MM/yyyy 'às' HH:mm");

  const linhasUnidades = r.unidades.map(u => {
    const fam = Object.keys(u.familias).sort((a, b) => u.familias[b] - u.familias[a])
      .map(f => '<span class="tag">' + f + ' <b>' + u.familias[f] + '</b></span>').join(' ');
    return '<tr>' +
      '<td class="forte">' + u.unidade + '</td>' +
      '<td class="num">' + u.total + '</td>' +
      '<td class="num">' + u.disponiveis + '<small>' + pct(u.disponiveis, u.total) + '%</small></td>' +
      '<td class="num">' + u.manutencao + '</td>' +
      '<td class="num">' + u.desfazimento + '</td>' +
      '<td class="num">' + u.rodando + barra(u.rodando, u.total, u.aproveitamento >= 70 ? '#1E7A4D' : u.aproveitamento >= 40 ? '#C58B00' : '#9A2F24') +
        '<small>' + u.aproveitamento + '% em uso</small></td>' +
      '<td class="num">' + (u.notaMedia || '—') + (u.conceitoD ? '<small class="alerta">' + u.conceitoD + ' em conceito D</small>' : '') + '</td>' +
      '<td class="num">' + (u.idadeMedia || '—') + '</td>' +
      '<td class="familias">' + fam + '</td>' +
      '</tr>';
  }).join('');

  const linhasFamilias = r.familias.map(f => {
    const usos = Object.keys(f.usos).sort((a, b) => f.usos[b] - f.usos[a]).slice(0, 6)
      .map(u => u + ' (' + f.usos[u] + ')').join(' • ');
    return '<tr>' +
      '<td class="forte">' + f.familia + '</td>' +
      '<td class="num">' + f.total + '<small>' + pct(f.total, r.resumo.total) + '% da frota</small></td>' +
      '<td class="num">' + f.disponiveis + '</td>' +
      '<td class="num">' + f.rodando + barra(f.rodando, f.total, '#0B2C5C') + '<small>' + f.aproveitamento + '%</small></td>' +
      '<td class="num">' + f.paradas + '</td>' +
      '<td class="num">' + (f.notaMedia || '—') + '</td>' +
      '<td class="familias">' + usos + '</td>' +
      '</tr>';
  }).join('');

  const linhasParadas = r.paradas.slice(0, 60).map(v =>
    '<tr><td class="mono">' + v.placa + '</td><td>' + v.modelo + '</td><td>' + v.unidade + '</td>' +
    '<td>' + (v.uso || '—') + '</td><td>' + (v.conceito || '—') + '</td>' +
    '<td class="num">' + (v.odometro ? n(v.odometro) : '—') + '</td><td>' + (v.anoEx || '—') + '</td></tr>').join('');

  const linhasConceito = r.conceitoBaixo.slice(0, 40).map(v =>
    '<tr><td class="mono">' + v.placa + '</td><td>' + v.modelo + '</td><td>' + v.unidade + '</td>' +
    '<td class="forte">' + (v.conceito || '—') + '</td><td class="num">' + (v.nota || '—') + '</td>' +
    '<td>' + (v.anoFab || '—') + '</td><td class="num">' + (v.odometro ? n(v.odometro) : '—') + '</td></tr>').join('');

  const cartoes = [
    ['Viaturas', r.resumo.total, r.resumo.unidades + ' unidade(s)'],
    ['Disponíveis', r.resumo.disponiveis, pct(r.resumo.disponiveis, r.resumo.total) + '% da frota'],
    ['Em uso recente', r.resumo.rodando, pct(r.resumo.rodando, r.resumo.total) + '% rodando'],
    ['Em manutenção', r.resumo.manutencao, ''],
    ['Em desfazimento', r.resumo.desfazimento, ''],
    ['Conceito médio', r.resumo.notaMedia || '—', 'PGF'],
    ['Idade média', r.resumo.idadeMedia || '—', 'anos']
  ].map(c => '<div class="cartao"><div class="rotulo">' + c[0] + '</div><div class="valor">' + c[1] + '</div><div class="sub">' + c[2] + '</div></div>').join('');

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 12mm 10mm; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #14181F; font-size: 10px; margin: 0; }' +
    'h1 { font-size: 16px; color: #0B2C5C; margin: 0 0 2px; }' +
    'h2 { font-size: 12px; color: #0B2C5C; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 2px solid #F2B705; }' +
    '.cab { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #0B2C5C; padding-bottom: 6px; }' +
    '.cab .sub { color: #5A6376; font-size: 10px; }' +
    '.cartoes { display: flex; gap: 6px; margin: 10px 0 4px; }' +
    '.cartao { flex: 1; border: 1px solid #E3E8F0; border-radius: 5px; padding: 6px 8px; background: #F6F8FC; }' +
    '.cartao .rotulo { font-size: 8.5px; color: #5A6376; text-transform: uppercase; letter-spacing: .04em; }' +
    '.cartao .valor { font-size: 17px; font-weight: bold; color: #0B2C5C; }' +
    '.cartao .sub { font-size: 8.5px; color: #5A6376; }' +
    'table { width: 100%; border-collapse: collapse; margin-top: 4px; }' +
    'th { background: #0B2C5C; color: #fff; text-align: left; padding: 4px 6px; font-size: 9px; }' +
    'td { padding: 4px 6px; border-bottom: 1px solid #E3E8F0; vertical-align: top; }' +
    'tr:nth-child(even) td { background: #FAFBFD; }' +
    '.num { text-align: right; white-space: nowrap; }' +
    '.forte { font-weight: bold; }' +
    '.mono { font-family: "Courier New", monospace; font-weight: bold; }' +
    'small { display: block; color: #5A6376; font-size: 8px; font-weight: normal; }' +
    'small.alerta { color: #9A2F24; font-weight: bold; }' +
    '.barra { height: 4px; background: #E3E8F0; border-radius: 2px; margin-top: 2px; overflow: hidden; }' +
    '.preenche { height: 100%; }' +
    '.tag { display: inline-block; background: #E8EEFA; color: #0B2C5C; border-radius: 3px; padding: 1px 4px; font-size: 8px; margin: 1px 1px 0 0; }' +
    '.familias { font-size: 8.5px; color: #5A6376; }' +
    '.destaque { background: #FFF6E5 !important; font-weight: bold; }' +
    '.nao-usa { color: #9A2F24; }' +
    '.rodape { margin-top: 10px; border-top: 1px solid #E3E8F0; padding-top: 5px; font-size: 8px; color: #5A6376; }' +
    '.quebra { page-break-before: always; }' +
    '</style></head><body>' +
    '<div class="cab"><div><h1>Relatório da Frota — 16ª SPRF/CE</h1>' +
    '<div class="sub">Situação em ' + hoje + (filtrado ? ' • seleção filtrada no painel' : ' • frota completa') + '</div></div>' +
    '<div class="sub">Emitido por ' + (sessao.nome || sessao.email) + '</div></div>' +
    '<div class="cartoes">' + cartoes + '</div>' +

    '<h2>Por unidade</h2>' +
    '<table><thead><tr><th>Unidade</th><th class="num">Viaturas</th><th class="num">Disponíveis</th>' +
    '<th class="num">Manutenção</th><th class="num">Desfazimento</th><th class="num">Em uso recente</th>' +
    '<th class="num">Conceito</th><th class="num">Idade</th><th>Composição por uso</th></tr></thead>' +
    '<tbody>' + linhasUnidades + '</tbody></table>' +

    '<div class="quebra"></div><h2>Visão analítica da frota</h2>' +
    _quadroAnalitico_(r.dados, 'tipo', 'Por tipo de viatura', 'Tipo registrado no cadastro — distingue automóvel, camionete, motocicleta, caminhão e demais.') +
    _quadroAnalitico_(r.dados, 'blindada', 'Por blindagem', 'Viaturas blindadas exigem tratamento próprio de manutenção e têm custo e peso diferentes.') +
    _quadroAnalitico_(r.dados, 'faixaIdade', 'Por faixa de idade', 'Os limites de 6 anos para leves e 3 anos para motocicletas constam do art. 17 da IN PRF 40/2021.') +
    _quadroAnalitico_(r.dados, 'faixaOdo', 'Por faixa de quilometragem', 'O art. 17 fixa 150 mil km para passeio, 210 mil para utilitários e 20 mil para motocicletas.') +
    _quadroAnalitico_(r.dados, 'marca', 'Por marca', '') +

    '<h2>Por família de uso SIPAC</h2>' +
    '<table><thead><tr><th>Família</th><th class="num">Viaturas</th><th class="num">Disponíveis</th>' +
    '<th class="num">Em uso</th><th class="num">Paradas</th><th class="num">Conceito</th><th>Usos que a compõem</th></tr></thead>' +
    '<tbody>' + linhasFamilias + '</tbody></table>' +

    '<div class="quebra"></div><h2>Comparativo entre unidades — base para redistribuição</h2>' +
    '<p style="font-size:9px; color:#5A6376; margin:2px 0 4px">Ordenado pelo número de viaturas ociosas: disponíveis que não registram uso recente. ' +
    'Unidade com muitas ociosas e outra com poucas viaturas disponíveis são o par natural de remanejamento.</p>' +
    '<table><thead><tr><th>Unidade</th><th class="num">Viaturas</th><th class="num">Ociosas</th>' +
    '<th class="num">Idade média</th><th class="num">Odômetro médio</th><th class="num">Km/ano por viatura</th>' +
    '<th class="num">Manutenção 12m</th><th class="num">Por viatura</th><th class="num">Custo por km</th>' +
    '<th class="num">Conceito</th></tr></thead><tbody>' + _linhasComparativo_(r) + '</tbody></table>' +
    _destaquesComparativo_(r) +

    (r.paradas.length ? '<div class="quebra"></div><h2>Disponíveis sem uso recente (' + r.paradas.length + ')</h2>' +
      '<p style="font-size:9px; color:#5A6376; margin:2px 0 4px">Viaturas em condição de uso que não registram abastecimento nos últimos dois meses — candidatas a remanejamento.</p>' +
      '<table><thead><tr><th>Placa</th><th>Modelo</th><th>Unidade</th><th>Uso SIPAC</th><th>Conceito</th>' +
      '<th class="num">Odômetro</th><th>Exercício</th></tr></thead><tbody>' + linhasParadas + '</tbody></table>' : '') +

    (r.conceitoBaixo.length ? '<h2>Conceito baixo no PGF (' + r.conceitoBaixo.length + ')</h2>' +
      '<p style="font-size:9px; color:#5A6376; margin:2px 0 4px">Conceito D ou nota abaixo de 5 — a IN PRF 40/2021 trata o conceito D como indicativo de desfazimento.</p>' +
      '<table><thead><tr><th>Placa</th><th>Modelo</th><th>Unidade</th><th>Conceito</th><th class="num">Nota</th>' +
      '<th>Ano</th><th class="num">Odômetro</th></tr></thead><tbody>' + linhasConceito + '</tbody></table>' : '') +

    _analiticoPorUnidade_(r.dados, r.unidades) +

    '<div class="rodape">Fonte: ConsultaBD (cadastro, status e uso SIPAC), aba PGF (conceito e nota), AbastBD (uso recente) e ManutBD (custo de manutenção dos últimos 12 meses). ' +
    'Disponibilidade e família de uso são agrupamentos do painel a partir do status e do uso SIPAC registrados.</div>' +
    '</body></html>';
}

/** Inteiro com separador de milhar, no servidor. */
function fmtIntServidor(v) {
  return String(Math.round(_num_(v) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ============================================================
   RELATÓRIO DE ABASTECIMENTO (PDF, paisagem)
   Monta o documento em HTML com a identidade PRF e converte em PDF.
   Não cria abas na planilha — o antigo espalhava quatro.
   ============================================================ */

function gerarRelatorioAbastecimento(token, de, ate) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const ini = String(de || '').substring(0, 7), fim = String(ate || '').substring(0, 7);
  if (!/^\d{4}-\d{2}$/.test(ini) || !/^\d{4}-\d{2}$/.test(fim)) return { ok: false, erro: 'Informe a competência inicial e final.' };
  if (ini > fim) return { ok: false, erro: 'A competência inicial não pode ser maior que a final.' };

  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const veiculos = _lerVeiculos_(ss);
    const cadastro = {};
    veiculos.forEach(v => { cadastro[v.placa] = v; if (v.placaMerc && v.placaMerc !== v.placa) cadastro[v.placaMerc] = v; });
    let tetos = null;
    try { tetos = _tetosAnp_(ss); } catch (e) { Logger.log('Tetos da ANP indisponíveis: ' + e); }
    const dados = _dadosRelatorioAbast_(ss, ini, fim, cadastro, tetos);
    if (!dados.registros) return { ok: false, erro: 'Nenhum abastecimento no período ' + _rotMes_(ini) + ' a ' + _rotMes_(fim) + '.' };

    // mesmo número de meses imediatamente anterior, para comparação
    const nMeses = _mesesNoIntervalo_(ini, fim).length;
    const iniAnt = _mesAnterior_(ini, nMeses), fimAnt = _mesAnterior_(ini, 1);
    let anterior = null;
    try { const a = _dadosRelatorioAbast_(ss, iniAnt, fimAnt, cadastro, null); if (a.registros) anterior = { ini: iniAnt, fim: fimAnt, dados: a }; } catch (e) {}

    const frotaAtiva = veiculos.filter(v => String(v.status || '').toUpperCase() !== 'ALIENADO');
    const html = _htmlRelatorioAbast_(dados, ini, fim, p.sessao, anterior, frotaAtiva);
    const nome = 'Relatorio_Abastecimento_' + ini.replace('-', '') + (ini === fim ? '' : '_a_' + fim.replace('-', '')) + '.pdf';
    const pdf = _entregarPdf_(Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(nome), nome);
    _logAcao_(p.ss, p.sessao.email, 'Relatório de abastecimento', '', _rotMes_(ini) + ' a ' + _rotMes_(fim), pdf.link || 'download direto');
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '', resumo: { registros: dados.registros, valor: dados.valor, litros: dados.litros, km: dados.km, viaturas: Object.keys(dados.porPlaca).length, alertas: dados.totalAlertas, glosaPotencial: dados.glosaPotencial } };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  }
}

function _dadosRelatorioAbast_(ss, ini, fim, cadastro, tetos) {
  const tab = _abaTransacoes_(ss, CONFIG.ABA_ABAST, ['PLACA', 'LITROS', 'VALOR EMISSAO']);
  const vazio = () => ({ registros: 0, valor: 0, litros: 0, km: 0, porPlaca: {}, porUnidade: {}, porUso: {}, porTipo: {}, porComb: {},
    porPosto: {}, porCidade: {}, porMes: {}, porModelo: {}, porDiaSemana: {}, porFaixaHora: {}, foraUf: { qtd: 0, valor: 0 },
    glosaPotencial: 0, itensGlosa: 0, precoPorComb: {}, tetoPorComb: {}, intervalos: [],
    alertas: { semCadastro: [], kmNegativo: [], kmZero: [], consumoAlto: [], consumoBaixo: [], divergencia: [], precoAcima: [], duplicidade: [], foraExpediente: [], acimaTetoAnp: [] }, totalAlertas: 0 });
  const d = vazio();
  if (!tab) return d;
  const { valores, cab } = tab;
  const c = n => cab.indexOf(n);
  const iData = c('DATA TRANSACAO'), iPlaca = c('PLACA'), iLit = c('LITROS'), iVlL = c('VL/LITRO'),
        iKm = c('KM RODADOS OU HORAS TRABALHADAS'), iKmL = c('KM/LITRO OU LITROS/HORA'), iVal = c('VALOR EMISSAO'),
        iComb = c('TIPO COMBUSTIVEL'), iEst = c('NOME ESTABELECIMENTO'), iCid = c('CIDADE'), iUf = c('UF'),
        iMot = c('NOME MOTORISTA'), iOdo = c('HODOMETRO OU HORIMETRO');
  const somaPreco = {}, contaPreco = {}, porDia = {}, ultimoAbast = {};
  const soma = (obj, chave, r) => {
    const a = obj[chave] || (obj[chave] = { valor: 0, litros: 0, km: 0, qtd: 0, placas: {} });
    a.valor += r.valor; a.litros += r.litros; a.km += Math.max(0, r.km); a.qtd++; a.placas[r.placa] = true;
  };
  const semanas = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  for (let r = tab.inicio; r < valores.length; r++) {
    const l = valores[r];
    const placa = String(l[iPlaca] || '').trim().toUpperCase();
    if (!placa) continue;
    const bruto = l[iData];
    const dia = _diaISO_(bruto); if (!dia) continue;
    const mes = dia.substring(0, 7);
    if (mes < ini || mes > fim) continue;
    const hora = _horaDaCelula_(bruto);
    const reg = { placa: placa, dia: dia, mes: mes, hora: hora, valor: _num_(l[iVal]) || 0, litros: _num_(l[iLit]) || 0,
      km: _num_(l[iKm]) || 0, kmL: _num_(l[iKmL]) || 0, vlL: _num_(l[iVlL]) || 0, odo: _num_(l[iOdo]) || 0,
      comb: String(l[iComb] || '').trim().toUpperCase() || 'SEM COMBUSTÍVEL',
      posto: String(l[iEst] || '').trim() || 'SEM POSTO', cidade: String(l[iCid] || '').trim() || 'SEM CIDADE',
      uf: String(l[iUf] || '').trim().toUpperCase(), motorista: String(l[iMot] || '').trim() };
    const v = cadastro[placa];
    d.registros++; d.valor += reg.valor; d.litros += reg.litros; d.km += Math.max(0, reg.km);

    soma(d.porPlaca, placa, reg);
    soma(d.porUnidade, v ? (v.unidadeCurta || v.unidade || 'SEM CADASTRO') : 'SEM CADASTRO', reg);
    soma(d.porUso, v ? (v.uso || 'SEM USO') : 'SEM USO', reg);
    soma(d.porTipo, v ? (v.tipo || 'SEM TIPO') : 'SEM TIPO', reg);
    soma(d.porModelo, v ? (v.modeloCurto || 'SEM CADASTRO') : 'SEM CADASTRO', reg);
    soma(d.porComb, reg.comb, reg);
    soma(d.porPosto, reg.posto + (reg.cidade !== 'SEM CIDADE' ? ' — ' + reg.cidade : ''), reg);
    soma(d.porCidade, reg.cidade + (reg.uf ? '/' + reg.uf : ''), reg);
    soma(d.porMes, reg.mes, reg);
    const dataObj = new Date(reg.dia + 'T12:00:00');
    soma(d.porDiaSemana, semanas[dataObj.getDay()], reg);
    soma(d.porFaixaHora, _faixaHora_(hora), reg);
    if (reg.uf && reg.uf !== 'CE') { d.foraUf.qtd++; d.foraUf.valor += reg.valor; }

    const pp = d.porPlaca[placa];
    if (v) { pp.modelo = v.modeloCurto; pp.unidade = v.unidadeCurta || v.unidade; pp.tipo = v.tipo; pp.uso = v.uso; pp.comb = v.comb; }
    if (reg.odo > 0) { pp.odoMin = pp.odoMin === undefined ? reg.odo : Math.min(pp.odoMin, reg.odo); pp.odoMax = Math.max(pp.odoMax || 0, reg.odo); }
    if (ultimoAbast[placa]) {
      const dias = Math.round((new Date(reg.dia) - new Date(ultimoAbast[placa])) / 86400000);
      if (dias > 0 && dias < 120) d.intervalos.push(dias);
    }
    if (!ultimoAbast[placa] || reg.dia > ultimoAbast[placa]) ultimoAbast[placa] = reg.dia;

    if (reg.vlL > 0) {
      somaPreco[reg.comb] = (somaPreco[reg.comb] || 0) + reg.vlL * reg.litros;
      contaPreco[reg.comb] = (contaPreco[reg.comb] || 0) + reg.litros;
      // comparação com o teto da ANP (mesmo mês e UF) — glosa potencial
      const prodAnp = _produtoAnp_(reg.comb);
      if (tetos && prodAnp && reg.uf) {
        const teto = tetos[(reg.mes.substring(5, 7) + '/' + reg.mes.substring(0, 4)) + '|' + reg.uf + '|' + _normCab_(prodAnp.anp)];
        if (teto !== undefined) {
          const t = d.tetoPorComb[reg.comb] || (d.tetoPorComb[reg.comb] = { soma: 0, litros: 0 });
          t.soma += teto * reg.litros; t.litros += reg.litros;
          if (reg.vlL > teto) {
            const g = Math.round(reg.vlL * reg.litros * 100) / 100 - Math.round(teto * reg.litros * 100) / 100;
            if (g > 0) {
              d.glosaPotencial += g; d.itensGlosa++;
              d.alertas.acimaTetoAnp.push([placa, _brDia_(dia), reg.comb + '/' + reg.uf, 'pago R$ ' + _decBR3_(reg.vlL) + ' • teto R$ ' + _decBR3_(teto) + ' • glosa ' + _moedaBR_(g)]);
            }
          }
        }
      }
    }
    const chaveDia = placa + '|' + dia;
    porDia[chaveDia] = (porDia[chaveDia] || 0) + 1;

    if (!v) d.alertas.semCadastro.push([placa, _brDia_(dia), reg.posto, _moedaBR_(reg.valor)]);
    if (reg.km < 0) d.alertas.kmNegativo.push([placa, _brDia_(dia), String(reg.km), _moedaBR_(reg.valor)]);
    else if (reg.km === 0) d.alertas.kmZero.push([placa, _brDia_(dia), _decBR_(reg.litros) + ' l', _moedaBR_(reg.valor)]);
    const consumo = reg.kmL || (reg.litros > 0 && reg.km > 0 ? reg.km / reg.litros : 0);
    if (consumo > 25) d.alertas.consumoAlto.push([placa, _brDia_(dia), _decBR_(consumo) + ' km/l', _decBR_(reg.litros) + ' l']);
    else if (consumo > 0 && consumo < 3) d.alertas.consumoBaixo.push([placa, _brDia_(dia), _decBR_(consumo) + ' km/l', _decBR_(reg.litros) + ' l']);
    if (v && v.comb && reg.comb !== 'SEM COMBUSTÍVEL') {
      const cadComb = String(v.comb).toUpperCase();
      const compativel = cadComb.indexOf(reg.comb.split(' ')[0]) >= 0 || reg.comb.indexOf(cadComb.split(' ')[0]) >= 0 ||
        (/FLEX|ALCOOL|GASOLINA|ETANOL/.test(cadComb) && /GASOLINA|ALCOOL|ETANOL/.test(reg.comb));
      if (!compativel) d.alertas.divergencia.push([placa, _brDia_(dia), 'cadastro: ' + v.comb, 'abastecido: ' + reg.comb]);
    }
    if (hora !== null && (hora < 5 || hora >= 22)) d.alertas.foraExpediente.push([placa, _brDia_(dia), ('0' + hora).slice(-2) + 'h', reg.posto + ' — ' + _moedaBR_(reg.valor)]);
    reg._chaveDia = chaveDia;
    (d._regs = d._regs || []).push(reg);
  }

  (d._regs || []).forEach(reg => {
    const media = contaPreco[reg.comb] ? somaPreco[reg.comb] / contaPreco[reg.comb] : 0;
    if (media > 0 && reg.vlL > media * 1.15) d.alertas.precoAcima.push([reg.placa, _brDia_(reg.dia), reg.comb, 'R$ ' + _decBR3_(reg.vlL) + ' (média R$ ' + _decBR3_(media) + ')']);
  });
  const vistos = {};
  (d._regs || []).forEach(reg => {
    if (porDia[reg._chaveDia] > 2 && !vistos[reg._chaveDia]) {
      vistos[reg._chaveDia] = true;
      d.alertas.duplicidade.push([reg.placa, _brDia_(reg.dia), porDia[reg._chaveDia] + ' abastecimentos no mesmo dia', '']);
    }
  });
  delete d._regs;
  Object.keys(somaPreco).forEach(k => { d.precoPorComb[k] = contaPreco[k] ? somaPreco[k] / contaPreco[k] : 0; });
  d.glosaPotencial = Math.round(d.glosaPotencial * 100) / 100;
  Object.keys(d.alertas).forEach(k => { d.totalAlertas += d.alertas[k].length; });
  return d;
}

function _horaDaCelula_(v) {
  if (v instanceof Date && !isNaN(v)) return v.getHours();
  const m = String(v || '').match(/\d{1,2}\/\d{1,2}\/\d{4}[\sT]+(\d{1,2}):(\d{2})/);
  return m ? parseInt(m[1], 10) : null;
}
function _faixaHora_(h) {
  if (h === null) return 'Sem horário';
  if (h < 6) return 'Madrugada (0h–6h)';
  if (h < 12) return 'Manhã (6h–12h)';
  if (h < 18) return 'Tarde (12h–18h)';
  return 'Noite (18h–24h)';
}
function _mesAnterior_(mes, n) {
  const y = parseInt(mes.substring(0, 4), 10), m = parseInt(mes.substring(5, 7), 10);
  const d = new Date(y, m - 1 - n, 1);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}
function _mesesNoIntervalo_(ini, fim) {
  const out = []; let [y, m] = ini.split('-').map(Number); const [fy, fm] = fim.split('-').map(Number);
  while (y < fy || (y === fy && m <= fm)) { out.push(y + '-' + ('0' + m).slice(-2)); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

function _htmlRelatorioAbast_(d, ini, fim, sessao, anterior, frotaAtiva) {
  const lista = (obj, n) => Object.keys(obj).map(k => Object.assign({ chave: k }, obj[k])).sort((a, b) => b.valor - a.valor).slice(0, n || 9999);
  const consumo = (km, litros) => litros > 0 ? _decBR_(km / litros) + ' km/l' : '—';
  const porKm = (valor, km) => km > 0 ? 'R$ ' + _decBR_(valor / km) : '—';
  const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : 0;
  const meses = _mesesNoIntervalo_(ini, fim);
  const nMeses = meses.length;
  const viaturas = Object.keys(d.porPlaca).length;
  const a = anterior ? anterior.dados : null;

  /* gráficos desenhados com tabelas — o conversor de PDF do Apps Script não processa SVG */
  const barrasH = (itens, cor) => {
    if (!itens.length) return '<p class="nota">Sem dados.</p>';
    const maximo = Math.max(1, ...itens.map(i => i.valor));
    return '<table class="graf">' + itens.map(i =>
      '<tr><td class="rot">' + _esc_(i.rotulo) + '</td>' +
      '<td class="bar"><div class="preench" style="width:' + Math.max(1, Math.round(i.valor / maximo * 100)) + '%; background:' + (cor || '#2E6FD9') + '"></div></td>' +
      '<td class="val">' + _esc_(i.texto) + '</td></tr>').join('') + '</table>';
  };
  const colunas = (chaves, serieA, serieB, fmtA, rotA, rotB) => {
    const maximo = Math.max(1, ...chaves.map(k => Math.max(serieA[k] || 0, serieB ? (serieB[k] || 0) : 0)));
    const alt = v => Math.max(2, Math.round((v || 0) / maximo * 78));
    return '<table class="colunas"><tr>' + chaves.map(k =>
      '<td><div class="pilha">' +
      '<div class="col a" style="height:' + alt(serieA[k]) + 'px"></div>' +
      (serieB ? '<div class="col b" style="height:' + alt(serieB[k]) + 'px"></div>' : '') +
      '</div><div class="vlr">' + _esc_(fmtA(serieA[k] || 0)) + '</div><div class="lbl">' + _esc_(_rotMes_(k)) + '</div></td>').join('') +
      '</tr></table><div class="legenda"><span class="a"></span>' + _esc_(rotA) + (serieB ? '<span class="b"></span>' + _esc_(rotB) : '') + '</div>';
  };
  const faixa100 = itens => {
    const total = itens.reduce((s, i) => s + i.valor, 0) || 1;
    const cores = ['#0B2C5C', '#2E6FD9', '#F2B705', '#2F9E6B', '#B23A2E', '#7D5BA6', '#00A3B5'];
    return '<table class="faixa"><tr>' + itens.map((i, n) =>
      '<td style="width:' + (i.valor / total * 100) + '%; background:' + cores[n % cores.length] + '"></td>').join('') + '</tr></table>' +
      '<div class="legenda">' + itens.map((i, n) => '<span style="background:' + cores[n % cores.length] + '"></span>' +
      _esc_(i.rotulo) + ' ' + _decBR_(i.valor / total * 100) + '%').join('') + '</div>';
  };

  const precoMedio = d.litros > 0 ? d.valor / d.litros : 0;
  const kpi = (r, v, s, destaque) => '<div class="kpi' + (destaque ? ' ' + destaque : '') + '"><div class="r">' + r + '</div><div class="v">' + v + '</div>' + (s ? '<div class="s">' + s + '</div>' : '') + '</div>';
  const variacao = (atual, ant) => {
    if (!ant) return '';
    const p = (atual - ant) / ant * 100;
    return '<span class="var ' + (p > 0 ? 'sobe' : p < 0 ? 'desce' : '') + '">' + (p > 0 ? '▲' : p < 0 ? '▼' : '=') + ' ' + _decBR_(Math.abs(p)) + '% vs. anterior</span>';
  };

  const unidades = lista(d.porUnidade).map(u => ({
    chave: u.chave, valor: u.valor, litros: u.litros, km: u.km, qtd: u.qtd, viaturas: Object.keys(u.placas).length,
    rsKm: u.km > 0 ? u.valor / u.km : 0, kmL: u.litros > 0 ? u.km / u.litros : 0,
    porViatura: u.valor / Math.max(1, Object.keys(u.placas).length)
  }));

  const placas = Object.keys(d.porPlaca).map(k => {
    const p = d.porPlaca[k];
    return { placa: k, modelo: p.modelo || '—', unidade: p.unidade || 'SEM CADASTRO', valor: p.valor, litros: p.litros,
      km: p.km, qtd: p.qtd, rsKm: p.km > 0 ? p.valor / p.km : 0, kmL: p.litros > 0 ? p.km / p.litros : 0 };
  });
  const porGasto = placas.slice().sort((x, y) => y.valor - x.valor);
  const top10 = porGasto.slice(0, 10).reduce((s, p) => s + p.valor, 0);
  const eficientes = placas.filter(p => p.km >= 500 && p.kmL > 0).sort((x, y) => y.kmL - x.kmL);
  const custosos = placas.filter(p => p.km >= 500 && p.rsKm > 0).sort((x, y) => y.rsKm - x.rsKm);
  const modelos = lista(d.porModelo).filter(m => m.litros > 0 && m.km > 0).map(m => ({ chave: m.chave, kmL: m.km / m.litros, valor: m.valor, placas: Object.keys(m.placas).length }));

  const ativas = {}; Object.keys(d.porPlaca).forEach(p => { ativas[p] = true; });
  const semAbastecer = (frotaAtiva || []).filter(v => !ativas[v.placa] && !ativas[v.placaMerc] && String(v.status || '').toUpperCase() === 'DISPONÍVEL');

  const tabela = (cabs, linhas) => '<table><thead><tr>' + cabs.map(c => '<th' + (c.n ? ' class="num"' : '') + '>' + c.t + '</th>').join('') + '</tr></thead><tbody>' + linhas + '</tbody></table>';

  const linhasUnidade = unidades.map(u => '<tr><td>' + _esc_(u.chave) + '</td><td class="num">' + u.viaturas + '</td><td class="num">' + u.qtd +
    '</td><td class="num">' + _decBR_(u.litros) + '</td><td class="num">' + _fmtInt_(u.km) + '</td><td class="num forte">' + _moedaBR_(u.valor) +
    '</td><td class="num">' + _decBR_(pct(u.valor, d.valor)) + '%</td><td class="num">' + (u.kmL ? _decBR_(u.kmL) : '—') +
    '</td><td class="num">' + (u.rsKm ? 'R$ ' + _decBR_(u.rsKm) : '—') + '</td><td class="num">' + _moedaBR_(u.porViatura) + '</td></tr>').join('');

  const linhasViatura = porGasto.slice(0, 25).map((p, i) => '<tr><td class="num">' + (i + 1) + '</td><td class="mono">' + _esc_(p.placa) +
    '</td><td>' + _esc_(p.modelo) + '</td><td>' + _esc_(p.unidade) + '</td><td class="num">' + p.qtd + '</td><td class="num">' + _decBR_(p.litros) +
    '</td><td class="num">' + _fmtInt_(p.km) + '</td><td class="num forte">' + _moedaBR_(p.valor) + '</td><td class="num">' + (p.kmL ? _decBR_(p.kmL) : '—') +
    '</td><td class="num">' + (p.rsKm ? 'R$ ' + _decBR_(p.rsKm) : '—') + '</td></tr>').join('');

  const comparativo = a ? tabela(
    [{ t: 'Indicador' }, { t: _rotMes_(anterior.ini) + ' a ' + _rotMes_(anterior.fim), n: true }, { t: _rotMes_(ini) + ' a ' + _rotMes_(fim), n: true }, { t: 'Variação', n: true }],
    [['Gasto', a.valor, d.valor, 'moeda'], ['Litros', a.litros, d.litros, 'dec'], ['Km rodados', a.km, d.km, 'int'],
     ['Abastecimentos', a.registros, d.registros, 'int'], ['Viaturas abastecidas', Object.keys(a.porPlaca).length, viaturas, 'int'],
     ['Preço médio por litro', a.litros ? a.valor / a.litros : 0, precoMedio, 'moeda3'],
     ['Custo por km', a.km ? a.valor / a.km : 0, d.km ? d.valor / d.km : 0, 'moeda2'],
     ['Consumo médio (km/l)', a.litros ? a.km / a.litros : 0, d.litros ? d.km / d.litros : 0, 'dec'],
     ['Volume médio por abastecimento', a.registros ? a.litros / a.registros : 0, d.registros ? d.litros / d.registros : 0, 'dec']
    ].map(item => {
      const rot = item[0], ant = item[1], atual = item[2], tipo = item[3];
      const f = x => tipo === 'moeda' ? _moedaBR_(x) : tipo === 'moeda2' ? 'R$ ' + _decBR_(x) : tipo === 'moeda3' ? 'R$ ' + _decBR3_(x) : tipo === 'int' ? _fmtInt_(x) : _decBR_(x);
      const p = ant > 0 ? (atual - ant) / ant * 100 : 0;
      return '<tr><td>' + rot + '</td><td class="num">' + f(ant) + '</td><td class="num forte">' + f(atual) +
        '</td><td class="num ' + (Math.abs(p) < 0.05 ? '' : (p > 0 ? 'sobe' : 'desce')) + '">' + (ant > 0 ? (p > 0 ? '+' : '') + _decBR_(p) + '%' : '—') + '</td></tr>';
    }).join('')) : '<p class="nota">Sem dados no período anterior para comparação.</p>';

  const alertas = [
    ['Abastecimento acima do preço máximo da ANP (glosa potencial)', ['Placa', 'Data', 'Combustível/UF', 'Detalhe'], d.alertas.acimaTetoAnp],
    ['Placas sem cadastro na ConsultaBD', ['Placa', 'Data', 'Posto', 'Valor'], d.alertas.semCadastro],
    ['Abastecimento em horário atípico (antes das 5h ou após as 22h)', ['Placa', 'Data', 'Hora', 'Local e valor'], d.alertas.foraExpediente],
    ['Quilometragem negativa', ['Placa', 'Data', 'Km informado', 'Valor'], d.alertas.kmNegativo],
    ['Quilometragem zerada', ['Placa', 'Data', 'Litros', 'Valor'], d.alertas.kmZero],
    ['Consumo acima de 25 km/l', ['Placa', 'Data', 'Consumo', 'Litros'], d.alertas.consumoAlto],
    ['Consumo abaixo de 3 km/l', ['Placa', 'Data', 'Consumo', 'Litros'], d.alertas.consumoBaixo],
    ['Divergência entre combustível cadastrado e abastecido', ['Placa', 'Data', 'Cadastro', 'Abastecido'], d.alertas.divergencia],
    ['Preço por litro acima de 15% da média do combustível', ['Placa', 'Data', 'Combustível', 'Preço'], d.alertas.precoAcima],
    ['Mais de dois abastecimentos no mesmo dia', ['Placa', 'Data', 'Ocorrência', ''], d.alertas.duplicidade]
  ].map(item => {
    const titulo = item[0], cabs = item[1], itens = item[2];
    if (!itens.length) return '';
    return '<h3>' + titulo + ' <span class="conta">' + itens.length + '</span></h3><table><thead><tr>' + cabs.map(h => '<th>' + h + '</th>').join('') +
      '</tr></thead><tbody>' + itens.slice(0, 40).map(l => '<tr>' + l.map(c => '<td>' + _esc_(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' +
      (itens.length > 40 ? '<p class="nota">Exibindo 40 de ' + itens.length + ' ocorrências.</p>' : '');
  }).join('');

  const periodo = ini === fim ? _rotMesExtenso_(ini) : _rotMesExtenso_(ini) + ' a ' + _rotMesExtenso_(fim);
  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, "dd/MM/yyyy 'às' HH:mm");
  const intervaloMedio = d.intervalos.length ? d.intervalos.reduce((s, x) => s + x, 0) / d.intervalos.length : 0;
  const sMes = {}, sKm = {};
  meses.forEach(m => { sMes[m] = (d.porMes[m] || {}).valor || 0; sKm[m] = (d.porMes[m] || {}).km || 0; });

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 11mm 9mm; }' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #14181F; font-size: 9pt; margin: 0; }' +
    '.cab { display: table; width: 100%; border-bottom: 4px solid #F2B705; padding-bottom: 8px; margin-bottom: 10px; }' +
    '.cab > div { display: table-cell; vertical-align: middle; } .cab .marca { width: 70px; }' +
    '.cab h1 { margin: 0; font-size: 16pt; color: #0B2C5C; } .cab .org { font-size: 9.5pt; color: #5A6576; }' +
    '.cab .per { text-align: right; font-size: 10.5pt; font-weight: bold; color: #0B2C5C; }' +
    'h2 { color: #0B2C5C; font-size: 12pt; margin: 14px 0 6px; border-bottom: 2px solid #F2B705; padding-bottom: 3px; }' +
    'h3 { color: #0B2C5C; font-size: 10pt; margin: 10px 0 4px; }' +
    '.conta { background: #F2B705; color: #14181F; border-radius: 8px; padding: 1px 7px; font-size: 8pt; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }' +
    'th { background: #0B2C5C; color: #fff; text-align: left; padding: 4px 6px; font-size: 8pt; }' +
    'td { padding: 3px 6px; border-bottom: 1px solid #E3E8F0; font-size: 8pt; }' +
    'tbody tr:nth-child(even) td { background: #F6F8FC; }' +
    '.num { text-align: right; } .forte { font-weight: bold; } .mono { font-family: "Courier New", monospace; font-weight: bold; }' +
    '.sobe { color: #B23A2E; font-weight: bold; } .desce { color: #2F9E6B; font-weight: bold; }' +
    '.kpis { display: table; width: 100%; table-layout: fixed; border-spacing: 5px 0; margin-bottom: 6px; }' +
    '.kpi { display: table-cell; background: #F6F8FC; border-left: 3px solid #0B2C5C; padding: 6px 8px; }' +
    '.kpi.alerta { border-left-color: #B23A2E; } .kpi.bom { border-left-color: #2F9E6B; }' +
    '.kpi .r { font-size: 7pt; text-transform: uppercase; letter-spacing: .05em; color: #5A6576; }' +
    '.kpi .v { font-size: 12.5pt; font-weight: bold; color: #0B2C5C; white-space: nowrap; }' +
    '.kpi .s { font-size: 7pt; color: #5A6576; }' +
    '.var { font-size: 7pt; } .var.sobe { color: #B23A2E; } .var.desce { color: #2F9E6B; }' +
    'table.graf td { border: 0; padding: 2px 4px; } table.graf .rot { width: 34%; font-size: 8pt; }' +
    'table.graf .bar { width: 46%; } table.graf .bar .preench { height: 11px; border-radius: 2px; }' +
    'table.graf .val { width: 20%; text-align: right; font-size: 8pt; font-weight: bold; white-space: nowrap; }' +
    'table.colunas { table-layout: fixed; } table.colunas td { border: 0; text-align: center; vertical-align: bottom; padding: 0 2px; }' +
    '.pilha { height: 80px; }' +
    '.col { display: inline-block; width: 11px; vertical-align: bottom; border-radius: 2px 2px 0 0; }' +
    '.col.a { background: #0B2C5C; } .col.b { background: #F2B705; }' +
    '.vlr { font-size: 6.5pt; margin-top: 2px; } .lbl { font-size: 6.5pt; color: #5A6576; }' +
    'table.faixa { table-layout: fixed; margin-bottom: 3px; } table.faixa td { height: 14px; border: 0; padding: 0; }' +
    '.legenda { font-size: 7.5pt; color: #5A6576; margin-bottom: 8px; }' +
    '.legenda span { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin: 0 3px 0 8px; }' +
    '.legenda span.a { background: #0B2C5C; } .legenda span.b { background: #F2B705; }' +
    '.col2 { display: table; width: 100%; border-spacing: 8px 0; } .col2 > div { display: table-cell; width: 50%; vertical-align: top; }' +
    '.nota { font-size: 7.5pt; color: #5A6576; margin: 2px 0 8px; }' +
    '.rodape { margin-top: 12px; border-top: 1px solid #E3E8F0; padding-top: 5px; font-size: 7pt; color: #5A6576; }' +
    '.quebra { page-break-before: always; }' +
    '</style></head><body>' +

    '<div class="cab"><div class="marca">' + _brasaoHtml_() + '</div>' +
    '<div><h1>Relatório de Abastecimento</h1><div class="org">16ª Superintendência da Polícia Rodoviária Federal — Ceará</div></div>' +
    '<div class="per">' + periodo + '<br><span style="font-weight:normal; font-size:8pt; color:#5A6576">' + nMeses + ' competência(s)</span></div></div>' +

    '<h2>Panorama</h2>' +
    '<div class="kpis">' +
    kpi('Gasto total', _moedaBR_(d.valor), a ? variacao(d.valor, a.valor) : _moedaBR_(d.valor / nMeses) + ' por mês') +
    kpi('Litros', _decBR_(d.litros), _decBR_(d.litros / nMeses) + ' por mês') +
    kpi('Km rodados', _fmtInt_(d.km), _fmtInt_(d.km / nMeses) + ' por mês') +
    kpi('Consumo médio', consumo(d.km, d.litros), 'km ÷ litros') +
    kpi('Custo por km', porKm(d.valor, d.km), 'no período') +
    kpi('Preço médio por litro', 'R$ ' + _decBR3_(precoMedio), 'ponderado por litro') +
    '</div><div class="kpis">' +
    kpi('Abastecimentos', _fmtInt_(d.registros), _decBR_(d.registros / Math.max(1, viaturas)) + ' por viatura') +
    kpi('Viaturas abastecidas', _fmtInt_(viaturas), _moedaBR_(d.valor / Math.max(1, viaturas)) + ' por viatura') +
    kpi('Volume médio', _decBR_(d.litros / Math.max(1, d.registros)) + ' l', 'por abastecimento') +
    kpi('Intervalo médio', intervaloMedio ? _decBR_(intervaloMedio) + ' dias' : '—', 'entre abastecimentos da viatura') +
    kpi('Fora do Ceará', _fmtInt_(d.foraUf.qtd), _moedaBR_(d.foraUf.valor) + ' · ' + _decBR_(pct(d.foraUf.valor, d.valor)) + '%', d.foraUf.qtd ? 'alerta' : 'bom') +
    kpi('Glosa potencial (ANP)', _moedaBR_(d.glosaPotencial), d.itensGlosa + ' acima do teto', d.glosaPotencial ? 'alerta' : 'bom') +
    '</div>' +

    '<h2>Evolução mensal</h2>' + colunas(meses, sMes, sKm, _moedaBR_, 'Gasto (R$)', 'Km rodados') +

    '<div class="col2"><div><h3>Participação por combustível</h3>' +
    faixa100(lista(d.porComb).map(x => ({ rotulo: x.chave, valor: x.valor }))) +
    '<h3>Gasto por uso SIPAC</h3>' +
    barrasH(lista(d.porUso, 6).map(x => ({ rotulo: x.chave, valor: x.valor, texto: _moedaBR_(x.valor) })), '#2E6FD9') +
    '</div><div><h3>Gasto por unidade</h3>' +
    barrasH(unidades.slice(0, 8).map(x => ({ rotulo: x.chave, valor: x.valor, texto: _moedaBR_(x.valor) })), '#0B2C5C') +
    '<h3>Gasto por tipo de veículo</h3>' +
    barrasH(lista(d.porTipo, 6).map(x => ({ rotulo: x.chave, valor: x.valor, texto: _moedaBR_(x.valor) })), '#F2B705') +
    '</div></div>' +

    '<div class="quebra"></div><h2>Comparativo com o período anterior</h2>' + comparativo +

    '<h2>Eficiência por unidade</h2>' +
    tabela([{ t: 'Unidade' }, { t: 'Viaturas', n: true }, { t: 'Abast.', n: true }, { t: 'Litros', n: true }, { t: 'Km', n: true },
            { t: 'Gasto', n: true }, { t: '% do total', n: true }, { t: 'km/l', n: true }, { t: 'R$/km', n: true }, { t: 'Gasto por viatura', n: true }], linhasUnidade) +

    '<div class="col2"><div><h3>Melhor consumo — viaturas (mín. 500 km)</h3>' +
    barrasH(eficientes.slice(0, 8).map(p => ({ rotulo: p.placa + ' · ' + p.modelo, valor: p.kmL, texto: _decBR_(p.kmL) + ' km/l' })), '#2F9E6B') +
    '<h3>Consumo médio por modelo</h3>' +
    barrasH(modelos.sort((x, y) => y.kmL - x.kmL).slice(0, 8).map(m => ({ rotulo: m.chave + ' (' + m.placas + ')', valor: m.kmL, texto: _decBR_(m.kmL) + ' km/l' })), '#00A3B5') +
    '</div><div><h3>Maior custo por km — viaturas (mín. 500 km)</h3>' +
    barrasH(custosos.slice(0, 8).map(p => ({ rotulo: p.placa + ' · ' + p.modelo, valor: p.rsKm, texto: 'R$ ' + _decBR_(p.rsKm) })), '#B23A2E') +
    '<h3>Maior gasto por viatura</h3>' +
    barrasH(porGasto.slice(0, 8).map(p => ({ rotulo: p.placa + ' · ' + p.unidade, valor: p.valor, texto: _moedaBR_(p.valor) })), '#7D5BA6') +
    '</div></div>' +

    '<div class="quebra"></div><h2>Viaturas — 25 maiores gastos</h2>' +
    '<p class="nota">As dez viaturas de maior gasto concentram ' + _moedaBR_(top10) + ', ' + _decBR_(pct(top10, d.valor)) + '% do total do período.</p>' +
    tabela([{ t: '#', n: true }, { t: 'Placa' }, { t: 'Modelo' }, { t: 'Unidade' }, { t: 'Abast.', n: true }, { t: 'Litros', n: true },
            { t: 'Km', n: true }, { t: 'Gasto', n: true }, { t: 'km/l', n: true }, { t: 'R$/km', n: true }], linhasViatura) +

    (semAbastecer.length ? '<h3>Viaturas disponíveis sem abastecimento no período <span class="conta">' + semAbastecer.length + '</span></h3>' +
      '<p class="nota">' + _esc_(semAbastecer.slice(0, 60).map(v => v.placa + ' (' + (v.unidadeCurta || '—') + ')').join(' · ')) +
      (semAbastecer.length > 60 ? ' …' : '') + '</p>' : '') +

    '<div class="quebra"></div><h2>Onde e quando se abastece</h2>' +
    '<div class="col2"><div><h3>Postos com maior faturamento</h3>' +
    barrasH(lista(d.porPosto, 10).map(x => ({ rotulo: x.chave, valor: x.valor, texto: _moedaBR_(x.valor) })), '#2E6FD9') +
    '</div><div><h3>Cidades</h3>' +
    barrasH(lista(d.porCidade, 10).map(x => ({ rotulo: x.chave, valor: x.valor, texto: _moedaBR_(x.valor) })), '#7D5BA6') +
    '</div></div>' +
    '<div class="col2"><div><h3>Abastecimentos por dia da semana</h3>' +
    barrasH(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].filter(k => d.porDiaSemana[k])
      .map(k => ({ rotulo: k, valor: d.porDiaSemana[k].qtd, texto: _fmtInt_(d.porDiaSemana[k].qtd) })), '#0B2C5C') +
    '</div><div><h3>Abastecimentos por faixa de horário</h3>' +
    barrasH(['Madrugada (0h–6h)', 'Manhã (6h–12h)', 'Tarde (12h–18h)', 'Noite (18h–24h)', 'Sem horário'].filter(k => d.porFaixaHora[k])
      .map(k => ({ rotulo: k, valor: d.porFaixaHora[k].qtd, texto: _fmtInt_(d.porFaixaHora[k].qtd) })), '#F2B705') +
    '</div></div>' +

    '<h3>Preço médio pago por combustível' + (Object.keys(d.tetoPorComb).length ? ' × teto da ANP' : '') + '</h3>' +
    tabela([{ t: 'Combustível' }, { t: 'Litros', n: true }, { t: 'Preço médio pago', n: true }, { t: 'Teto médio ANP', n: true }, { t: 'Diferença', n: true }, { t: 'Gasto', n: true }],
      lista(d.porComb).map(x => {
        const preco = d.precoPorComb[x.chave] || 0;
        const t = d.tetoPorComb[x.chave];
        const teto = t && t.litros ? t.soma / t.litros : 0;
        const dif = teto ? (preco - teto) / teto * 100 : 0;
        return '<tr><td>' + _esc_(x.chave) + '</td><td class="num">' + _decBR_(x.litros) + '</td><td class="num forte">R$ ' + _decBR3_(preco) +
          '</td><td class="num">' + (teto ? 'R$ ' + _decBR3_(teto) : '—') + '</td><td class="num ' + (dif > 0 ? 'sobe' : dif < 0 ? 'desce' : '') + '">' +
          (teto ? (dif > 0 ? '+' : '') + _decBR_(dif) + '%' : '—') + '</td><td class="num">' + _moedaBR_(x.valor) + '</td></tr>';
      }).join('')) +

    (d.totalAlertas ? '<div class="quebra"></div><h2>Alertas e inconsistências <span class="conta">' + d.totalAlertas + '</span></h2>' +
      '<p class="nota">Conferências automáticas aplicadas a todos os registros do período. Servem como roteiro de apuração, não como conclusão.</p>' + alertas : '') +

    '<div class="rodape">Gerado pelo Painel da Frota — 16ª SPRF/CE em ' + agora + ' por ' + _esc_(sessao.email) +
    '. Fontes: AbastBD (GoodManager/Ticket Log), ConsultaBD' + (Object.keys(d.tetoPorComb).length ? ' e série histórica de preços da ANP' : '') + '.</div>' +
    '</body></html>';
}

function _esc_(t) { return String(t === null || t === undefined ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function _fmtInt_(n) { return Math.round(n || 0).toLocaleString('pt-BR'); }
function _decBR_(n) { return (Math.round((n || 0) * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function _moedaBR_(n) { return 'R$ ' + _decBR_(n); }
function _rotMes_(m) { return m.substring(5, 7) + '/' + m.substring(0, 4); }
function _rotMesExtenso_(m) {
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return nomes[parseInt(m.substring(5, 7), 10) - 1] + ' de ' + m.substring(0, 4);
}


/* ============================================================
   GLOSA DE PREÇOS (ANP) — dados e relatório
   Substitui a planilha "Frota 16ª SPRF - Glosa Abastecimento":
   o histórico da ANP passa a viver na planilha-mãe e o cruzamento
   é feito aqui, sem IMPORTRANGE nem PROCV para esticar.
   ============================================================ */

/** Combustível da Ticket → produto na série da ANP + letra do identificador. */
const MAPA_COMBUSTIVEL_ANP = [
  { re: /GASOLINA\s+ADITIVADA/i,      anp: 'GASOLINA ADITIVADA', letra: 'G' },
  { re: /GASOLINA/i,                  anp: 'GASOLINA COMUM',     letra: 'G' },
  { re: /DIESEL\s*S-?\s*10/i,         anp: 'OLEO DIESEL S10',    letra: 'D' },
  { re: /DIESEL/i,                    anp: 'OLEO DIESEL',        letra: 'D' },
  { re: /ETANOL|ALCOOL/i,             anp: 'ETANOL HIDRATADO',   letra: 'E' },
  { re: /GNV|GAS\s*NATURAL/i,         anp: 'GNV',                letra: 'N' },
  { re: /GLP/i,                       anp: 'GLP',                letra: 'L' }
];
function _produtoAnp_(combustivel) {
  const c = String(combustivel || '');
  for (let i = 0; i < MAPA_COMBUSTIVEL_ANP.length; i++) if (MAPA_COMBUSTIVEL_ANP[i].re.test(c)) return MAPA_COMBUSTIVEL_ANP[i];
  return null;
}

/**
 * MIGRAÇÃO (rodar uma vez no editor): traz "Histórico ANP" e "Resumo Glosa"
 * da planilha antiga para a planilha-mãe. Depois disso aquela planilha pode
 * ser arquivada — nada mais depende dela.
 */
function migrarDadosGlosa() {
  const destino = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const origem = SpreadsheetApp.openById(CONFIG.ID_GLOSA_ANTIGA);

  // ---- Histórico ANP
  const abaOrigemAnp = origem.getSheetByName('Histórico ANP');
  if (!abaOrigemAnp) throw new Error('Aba "Histórico ANP" não encontrada na planilha antiga.');
  const valoresAnp = abaOrigemAnp.getDataRange().getValues();
  let cabAnp = -1;
  for (let i = 0; i < Math.min(5, valoresAnp.length); i++) {
    if (valoresAnp[i].some(c => String(c).trim().toUpperCase() === 'PRODUTO')) { cabAnp = i; break; }
  }
  if (cabAnp < 0) throw new Error('Não encontrei o cabeçalho do Histórico ANP.');
  const linhasAnp = valoresAnp.slice(cabAnp).filter(l => String(l[0]).trim() !== '');
  let abaAnp = destino.getSheetByName(CONFIG.ABA_ANP);
  if (abaAnp) destino.deleteSheet(abaAnp);
  abaAnp = destino.insertSheet(CONFIG.ABA_ANP);
  abaAnp.getRange(1, 1, linhasAnp.length, linhasAnp[0].length).setValues(linhasAnp);
  abaAnp.setFrozenRows(1);
  abaAnp.getRange(2, 1, Math.max(1, linhasAnp.length - 1), 1).setNumberFormat('MM/yyyy');

  // ---- Resumo Glosa
  const abaOrigemResumo = origem.getSheetByName('Resumo Glosa');
  let nResumo = 0;
  if (abaOrigemResumo) {
    const v = abaOrigemResumo.getDataRange().getValues();
    let cab = -1;
    for (let i = 0; i < Math.min(5, v.length); i++) {
      if (v[i].some(c => /COMPET/i.test(String(c)))) { cab = i; break; }
    }
    const linhas = (cab < 0 ? v : v.slice(cab)).filter(l => String(l[0]).trim() !== '');
    let abaResumo = destino.getSheetByName(CONFIG.ABA_RESUMO_GLOSA);
    if (abaResumo) destino.deleteSheet(abaResumo);
    abaResumo = destino.insertSheet(CONFIG.ABA_RESUMO_GLOSA);
    abaResumo.getRange(1, 1, linhas.length, 2).setValues(linhas.map(l => [l[0], l[1]]));
    abaResumo.setFrozenRows(1);
    nResumo = linhas.length - 1;
  }
  limparCache();
  Logger.log('Migração concluída: ' + (linhasAnp.length - 1) + ' linhas no ' + CONFIG.ABA_ANP +
             ' e ' + nResumo + ' competências no ' + CONFIG.ABA_RESUMO_GLOSA + '. A planilha antiga pode ser arquivada.');
  return 'Migrado.';
}


/**
 * Refaz a migração do histórico de glosa da planilha antiga para o ResumoGlosa
 * da planilha-mãe. Rode sem argumento para apenas conferir o que seria trazido:
 *     migrarResumoGlosa()        → só mostra
 *     migrarResumoGlosa(true)    → grava
 * Aceita a competência como data ou texto e o valor em qualquer coluna à direita.
 */
function migrarResumoGlosa(aplicar) {
  const origem = SpreadsheetApp.openById(CONFIG.ID_GLOSA_ANTIGA);
  const abas = origem.getSheets();
  Logger.log('Abas da planilha antiga: ' + abas.map(a => a.getName()).join(' | '));
  // procura pelo nome e, se não achar, pelo conteúdo ("Valor da Glosa")
  let aba = abas.find(a => /RESUMO.*GLOSA/.test(_normCab_(a.getName())));
  if (!aba) {
    aba = abas.find(a => {
      try {
        if (a.getLastRow() < 2) return false;
        const topo = a.getRange(1, 1, Math.min(5, a.getLastRow()), Math.min(4, a.getLastColumn())).getValues();
        return topo.some(l => l.some(c => /VALOR DA GLOSA|RESUMO GLOSA/.test(_normCab_(c))));
      } catch (e) { return false; }
    });
  }
  if (!aba) { Logger.log('Não encontrei a aba do resumo da glosa — veja os nomes acima e me diga qual é.'); return; }
  Logger.log('Aba usada: "' + aba.getName() + '"');
  const valores = aba.getDataRange().getValues();
  Logger.log('Aba lida: ' + valores.length + ' linha(s), ' + (valores[0] ? valores[0].length : 0) + ' coluna(s).');

  const pares = [];
  valores.forEach((l, i) => {
    // procura, em qualquer coluna, algo que seja competência; o valor é o
    // primeiro número à direita dela
    for (let c = 0; c < l.length; c++) {
      const comp = _compSegura_(l[c]);
      if (!comp) continue;
      let valor = 0;
      for (let d = c + 1; d < l.length; d++) {
        const n = _num_(l[d]);
        if (n !== null && n !== '' && !isNaN(n) && String(l[d]).trim() !== '') { valor = n; break; }
      }
      pares.push({ comp: comp, valor: valor || 0, linha: i + 1 });
      break;
    }
  });

  const vistos = {}, limpos = [];
  pares.forEach(p => { if (!vistos[p.comp]) { vistos[p.comp] = true; limpos.push(p); } });
  limpos.sort((a, b) => (a.comp.substring(3) + a.comp.substring(0, 2)).localeCompare(b.comp.substring(3) + b.comp.substring(0, 2)));

  Logger.log('Competências reconhecidas: ' + limpos.length);
  limpos.slice(0, 8).forEach(p => Logger.log('   ' + p.comp + ' → ' + _moedaBR_(p.valor) + ' (linha ' + p.linha + ')'));
  if (limpos.length > 8) Logger.log('   … e mais ' + (limpos.length - 8));
  const total = limpos.reduce((s, p) => s + p.valor, 0);
  Logger.log('Soma do histórico: ' + _moedaBR_(total));

  if (!aplicar) { Logger.log('Nada gravado. Rode migrarResumoGlosa(true) para escrever na planilha-mãe.'); return; }
  const destino = SpreadsheetApp.openById(CONFIG.ID_BASE);
  let alvo = destino.getSheetByName(CONFIG.ABA_RESUMO_GLOSA);
  if (alvo) destino.deleteSheet(alvo);
  alvo = destino.insertSheet(CONFIG.ABA_RESUMO_GLOSA);
  alvo.getRange(1, 1, 1, 2).setValues([['Competência', 'Valor da Glosa']]);
  if (limpos.length) alvo.getRange(2, 1, limpos.length, 2).setValues(limpos.map(p => [p.comp, p.valor]));
  alvo.setFrozenRows(1);
  SpreadsheetApp.flush();
  limparCache();
  Logger.log(limpos.length + ' competência(s) gravada(s) em ' + CONFIG.ABA_RESUMO_GLOSA + '.');
  return limpos.length + ' competências';
}

/** Tetos da ANP no formato { 'MM/AAAA|UF|PRODUTO': preçoMáximo }. */
function _tetosAnp_(ss) {
  const aba = ss.getSheetByName(CONFIG.ABA_ANP);
  if (!aba) return null;
  const valores = aba.getDataRange().getValues();
  if (valores.length < 2) return {};
  const cab = valores[0].map(c => _normCab_(c));
  const iMes = cab.indexOf('MES'), iProd = cab.indexOf('PRODUTO'), iUf = cab.indexOf('UF');
  let iMax = cab.indexOf('PRECO MAXIMO REVENDA');
  if (iMax < 0) iMax = cab.indexOf('VALOR');
  if (iMes < 0 || iProd < 0 || iUf < 0 || iMax < 0) throw new Error('Cabeçalho do ' + CONFIG.ABA_ANP + ' não reconhecido (esperado MÊS, PRODUTO, UF e PREÇO MÁXIMO REVENDA).');
  const mapa = {};
  for (let r = 1; r < valores.length; r++) {
    const l = valores[r];
    const comp = _competenciaDaCelula_(l[iMes]);
    const uf = String(l[iUf] || '').trim().toUpperCase();
    const produto = _normCab_(l[iProd]);
    const teto = _num_(l[iMax]);
    if (!comp || !uf || !produto || !teto) continue;
    mapa[comp + '|' + uf + '|' + produto] = Math.round(teto * 100) / 100;
  }
  return mapa;
}
/** Competência de qualquer célula, sem lançar erro: Date, "7/2024", "07/2024", "2024-07". */
function _compSegura_(v) {
  if (v instanceof Date && !isNaN(v)) return ('0' + (v.getMonth() + 1)).slice(-2) + '/' + v.getFullYear();
  const t = String(v === null || v === undefined ? '' : v).trim();
  let m = t.match(/^(\d{1,2})[\/\-](\d{4})/);
  if (m) return ('0' + m[1]).slice(-2) + '/' + m[2];
  m = t.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (m) return ('0' + m[2]).slice(-2) + '/' + m[1];
  m = t.match(/(\d{2})\/(\d{2})\/(\d{4})/);          // data completa → mês/ano
  if (m) return m[2] + '/' + m[3];
  return '';
}

function _competenciaDaCelula_(v) {
  if (v instanceof Date && !isNaN(v)) return ('0' + (v.getMonth() + 1)).slice(-2) + '/' + v.getFullYear();
  const m = String(v || '').match(/(\d{1,2})[\/\-](\d{4})/);
  return m ? ('0' + m[1]).slice(-2) + '/' + m[2] : '';
}

/** Calcula a glosa de uma competência. combustiveis = lista opcional de nomes da Ticket. */
function _calcularGlosa_(ss, competencia, combustiveis) {
  const tetos = _tetosAnp_(ss);
  if (tetos === null) throw new Error('Aba "' + CONFIG.ABA_ANP + '" não existe. Rode migrarDadosGlosa() uma vez.');
  const tab = _abaTransacoes_(ss, CONFIG.ABA_ABAST, ['PLACA', 'LITROS', 'VALOR EMISSAO']);
  if (!tab) throw new Error('AbastBD não encontrada.');
  const { valores, cab } = tab;
  const c = n => cab.indexOf(n);
  const iCod = c('CODIGO TRANSACAO'), iData = c('DATA TRANSACAO'), iPlaca = c('PLACA'), iLit = c('LITROS'),
        iVlL = c('VL/LITRO'), iComb = c('TIPO COMBUSTIVEL'), iUf = c('UF'), iEst = c('NOME ESTABELECIMENTO'),
        iCid = c('CIDADE'), iServ = c('SERVICO');
  const filtro = (combustiveis && combustiveis.length) ? combustiveis.map(x => String(x).toUpperCase()) : null;

  const grupos = {}, semTeto = {};
  let total = 0, avaliados = 0, comGlosa = 0;
  const mesAlvo = competencia;
  for (let r = tab.inicio; r < valores.length; r++) {
    const l = valores[r];
    const dia = _diaISO_(l[iData]); if (!dia) continue;
    const comp = dia.substring(5, 7) + '/' + dia.substring(0, 4);
    if (comp !== mesAlvo) continue;
    if (iServ >= 0 && String(l[iServ] || '').trim() && !/abastec/i.test(String(l[iServ]))) continue;
    const combustivel = String(l[iComb] || '').trim().toUpperCase();
    if (!combustivel) continue;
    if (filtro && filtro.indexOf(combustivel) < 0) continue;
    const produto = _produtoAnp_(combustivel);
    if (!produto) continue;
    const uf = String(l[iUf] || '').trim().toUpperCase();
    const litros = _num_(l[iLit]) || 0;
    const preco = _num_(l[iVlL]) || 0;
    if (!uf || litros <= 0 || preco <= 0) continue;
    avaliados++;
    const chave = comp + '|' + uf + '|' + _normCab_(produto.anp);
    const teto = tetos[chave];
    if (teto === undefined) {
      const k = produto.anp + ' / ' + uf;
      semTeto[k] = (semTeto[k] || 0) + 1;
      continue;
    }
    if (preco <= teto) continue;
    // arredonda cada produto antes de subtrair — é assim que a planilha calcula
    const glosa = Math.round(preco * litros * 100) / 100 - Math.round(teto * litros * 100) / 100;
    if (glosa <= 0) continue;
    comGlosa++; total += glosa;
    const g = grupos[combustivel] || (grupos[combustivel] = { combustivel: combustivel, anp: produto.anp, itens: [], subtotal: 0 });
    g.itens.push({ combustivel: combustivel, uf: uf, placa: String(l[iPlaca] || '').trim().toUpperCase(),
      transacao: String(l[iCod] || '').trim(), data: _brDia_(dia), preco: preco, teto: teto, litros: litros,
      glosa: Math.round(glosa * 100) / 100, posto: String(l[iEst] || '').trim(), cidade: String(l[iCid] || '').trim() });
    g.subtotal = Math.round((g.subtotal + glosa) * 100) / 100;
  }
  const lista = Object.keys(grupos).sort().map(k => grupos[k]);
  lista.forEach(g => g.itens.sort((a, b) => b.glosa - a.glosa));
  return { competencia: competencia, grupos: lista, total: Math.round(total * 100) / 100,
           avaliados: avaliados, comGlosa: comGlosa, semTeto: semTeto };
}

/** Combustíveis disponíveis na competência (para o painel montar as opções). */
function combustiveisDaCompetencia(token, competencia) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const tab = _abaTransacoes_(p.ss, CONFIG.ABA_ABAST, ['PLACA', 'LITROS', 'VALOR EMISSAO']);
    if (!tab) return { ok: false, erro: 'AbastBD não encontrada.' };
    const iData = tab.cab.indexOf('DATA TRANSACAO'), iComb = tab.cab.indexOf('TIPO COMBUSTIVEL');
    const contagem = {};
    for (let r = tab.inicio; r < tab.valores.length; r++) {
      const dia = _diaISO_(tab.valores[r][iData]); if (!dia) continue;
      if (dia.substring(5, 7) + '/' + dia.substring(0, 4) !== competencia) continue;
      const comb = String(tab.valores[r][iComb] || '').trim().toUpperCase();
      if (comb) contagem[comb] = (contagem[comb] || 0) + 1;
    }
    return { ok: true, combustiveis: Object.keys(contagem).sort().map(k => ({ nome: k, qtd: contagem[k], anp: (_produtoAnp_(k) || {}).anp || '' })) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Gera o Relatório de Glosa em PDF e atualiza o ResumoGlosa da competência. */
function gerarRelatorioGlosa(token, competencia, combustiveis) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!/^\d{2}\/\d{4}$/.test(String(competencia || ''))) return { ok: false, erro: 'Informe a competência no formato MM/AAAA.' };
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const dados = _calcularGlosa_(ss, competencia, combustiveis);
    const html = _htmlRelatorioGlosa_(dados, p.sessao);
    const nome = 'Relatorio_Glosa_Abastecimento_' + competencia.replace('/', '-') + '.pdf';
    const pdf = _entregarPdf_(Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(nome), nome);
    _gravarResumoGlosa_(ss, competencia, dados.total);
    _logAcao_(p.ss, p.sessao.email, 'Relatório de glosa', '', competencia, 'total ' + _moedaBR_(dados.total) + ' | ' + dados.comGlosa + ' de ' + dados.avaliados + ' abastecimentos');
    const semTetoQtd = Object.keys(dados.semTeto).reduce((t, k) => t + dados.semTeto[k], 0);
    const anp = _panoramaAnp_(ss, competencia);
    const tetosDaComp = anp.tetos;
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '', total: dados.total, comGlosa: dados.comGlosa,
             avaliados: dados.avaliados, grupos: dados.grupos.map(g => ({ combustivel: g.combustivel, subtotal: g.subtotal, itens: g.itens.length })),
             semTeto: Object.keys(dados.semTeto).map(k => k + ' (' + dados.semTeto[k] + ')'),
             // para a tela poder dizer POR QUE o total é zero
             semTetoQtd: semTetoQtd, tetosDaCompetencia: tetosDaComp, anp: anp };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/**
 * Panorama da série da ANP numa competência. Existe porque "não está na planilha"
 * e "está na planilha mas o painel não consegue ler" produzem o mesmo zero, e são
 * problemas diferentes: o primeiro se resolve importando, o segundo não.
 * Linhas é o que a coluna do mês mostra; tetos é o que sobra depois de exigir
 * também UF, produto e preço máximo — se um dos três estiver fora de lugar, as
 * linhas aparecem e os tetos não.
 */
function _panoramaAnp_(ss, competencia) {
  const out = { aba: CONFIG.ABA_ANP, existeAba: false, linhas: 0, tetos: 0, colunas: {},
                cabecalho: [], produtosCE: [], amostra: null, erro: '' };
  try {
    const aba = ss.getSheetByName(CONFIG.ABA_ANP);
    if (!aba) return out;
    out.existeAba = true;
    const valores = aba.getDataRange().getValues();
    if (!valores.length) return out;
    out.cabecalho = valores[0].map(c => String(c || '').trim());
    const norm = out.cabecalho.map(c => _normCab_(c));
    const achar = nomes => { for (let i = 0; i < nomes.length; i++) { const p = norm.indexOf(nomes[i]); if (p >= 0) return p; } return -1; };
    const iMes = achar(['MES']), iProd = achar(['PRODUTO']), iUf = achar(['UF']), iMax = achar(['PRECO MAXIMO REVENDA', 'VALOR']);
    out.colunas = {
      mes: iMes < 0 ? '' : _letraColuna_(iMes + 1), produto: iProd < 0 ? '' : _letraColuna_(iProd + 1),
      uf: iUf < 0 ? '' : _letraColuna_(iUf + 1), precoMaximo: iMax < 0 ? '' : _letraColuna_(iMax + 1)
    };
    if (iMes >= 0) {
      for (let r = 1; r < valores.length; r++) {
        if (_competenciaDaCelula_(valores[r][iMes]) !== competencia) continue;
        out.linhas++;
        if (!out.amostra) {
          out.amostra = { mes: String(valores[r][iMes]), produto: iProd < 0 ? '(coluna ausente)' : String(valores[r][iProd] || '(vazio)'),
            uf: iUf < 0 ? '(coluna ausente)' : String(valores[r][iUf] || '(vazio)'),
            precoMaximo: iMax < 0 ? '(coluna ausente)' : String(valores[r][iMax] || '(vazio)') };
        }
      }
    }
    let tetos = {};
    try { tetos = _tetosAnp_(ss) || {}; } catch (e) { out.erro = String(e.message || e); }
    Object.keys(tetos).forEach(k => {
      if (k.indexOf(competencia + '|') !== 0) return;
      out.tetos++;
      if (k.indexOf(competencia + '|CE|') === 0) out.produtosCE.push(k.split('|')[2] + ': ' + _decBR_(tetos[k]));
    });
  } catch (e) { out.erro = String(e.message || e); }
  return out;
}

function _gravarResumoGlosa_(ss, competencia, total) {
  let aba = ss.getSheetByName(CONFIG.ABA_RESUMO_GLOSA);
  if (!aba) { aba = ss.insertSheet(CONFIG.ABA_RESUMO_GLOSA); aba.appendRow(['Competência', 'Valor da Glosa']); aba.setFrozenRows(1); }
  const n = aba.getLastRow();
  const comps = n > 1 ? aba.getRange(2, 1, n - 1, 1).getValues().map(l => _competenciaDaCelula_(l[0]) || String(l[0]).trim()) : [];
  const pos = comps.indexOf(competencia);
  if (pos >= 0) aba.getRange(pos + 2, 2).setValue(total);
  else aba.appendRow([competencia, total]);
  SpreadsheetApp.flush();
}

/** Brasão: imagem do Drive (CONFIG.LOGO_DRIVE_ID) ou emblema desenhado. */
function _brasaoHtml_() {
  if (CONFIG.LOGO_DRIVE_ID) {
    try {
      const blob = DriveApp.getFileById(CONFIG.LOGO_DRIVE_ID).getBlob();
      return '<img src="data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) + '" style="height:58px">';
    } catch (e) { Logger.log('Brasão não carregado: ' + e); }
  }
  return '<div style="width:56px; height:56px; border-radius:10px; background:#F2B705; color:#0B2C5C; font-weight:bold; font-size:17pt; text-align:center; line-height:56px; letter-spacing:.04em">PRF</div>';
}

/**
 * Entrega um PDF: tenta salvar no Drive e devolver o link; se o projeto não
 * tiver permissão de escrita no Drive, devolve o próprio arquivo para o
 * navegador baixar. Assim o relatório sai de qualquer jeito.
 */
function _entregarPdf_(blob, nome) {
  Logger.log('Entregando PDF: ' + nome + ' (' + Math.round(blob.getBytes().length / 1024) + ' KB)');
  try {
    const arq = CONFIG.PASTA_RELATORIOS
      ? DriveApp.getFolderById(CONFIG.PASTA_RELATORIOS).createFile(blob)
      : DriveApp.createFile(blob);
    try { arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    return { nome: nome, link: arq.getUrl() };
  } catch (e) {
    Logger.log('Drive indisponível (' + e + ') — devolvendo o PDF para download direto.');
    return { nome: nome, base64: Utilities.base64Encode(blob.getBytes()), aviso: 'salvo apenas neste download (sem permissão de gravar no Drive)' };
  }
}

function _htmlRelatorioGlosa_(d, sessao) {
  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, "dd/MM/yyyy 'às' HH:mm");
  const bloco = g => {
    const linhas = g.itens.map(i => '<tr><td>' + _esc_(i.combustivel) + '</td><td class="c">' + _esc_(i.uf) + '</td>' +
      '<td class="c mono">' + _esc_(i.placa) + '</td><td class="c mono">' + _esc_(i.transacao) + '</td>' +
      '<td class="c">' + _esc_(i.data) + '</td>' +
      '<td class="num">' + _decBR3_(i.preco) + '</td><td class="num">' + _decBR3_(i.teto) + '</td>' +
      '<td class="num">' + _decBR_(i.litros) + '</td><td class="num forte">' + _decBR_(i.glosa) + '</td></tr>').join('');
    return '<table><thead><tr>' +
      '<th>Combustível</th><th class="c">UF</th><th class="c">Placa</th><th class="c">Transação</th><th class="c">Data</th>' +
      '<th class="num">Preço Pago<br>por Litro (A)</th><th class="num">Preço Máximo<br>por Litro ANP (B)</th>' +
      '<th class="num">Quantidade<br>em Litros (L)</th><th class="num">Glosa<br>(A×L) − (B×L)</th></tr></thead>' +
      '<tbody>' + linhas + '</tbody>' +
      '<tfoot><tr><td colspan="8">Subtotal Glosa ' + _esc_(_tituloCombustivel_(g.combustivel)) + '</td>' +
      '<td class="num forte">' + _decBR_(g.subtotal) + '</td></tr></tfoot></table>';
  };

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 12mm 10mm; }' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #14181F; font-size: 9.5pt; margin: 0; }' +
    '.cab { display: table; width: 100%; border-bottom: 4px solid #F2B705; padding-bottom: 8px; margin-bottom: 10px; }' +
    '.cab > div { display: table-cell; vertical-align: middle; }' +
    '.cab .marca { width: 70px; }' +
    '.cab h1 { margin: 0; font-size: 16pt; color: #0B2C5C; }' +
    '.cab .org { font-size: 10pt; color: #5A6576; }' +
    '.cab .comp { text-align: right; font-size: 11pt; font-weight: bold; color: #0B2C5C; }' +
    '.metodo { background: #F6F8FC; border-left: 3px solid #0B2C5C; padding: 8px 10px; font-size: 8.5pt; text-align: justify; margin-bottom: 12px; }' +
    '.metodo b { color: #0B2C5C; }' +
    'h2 { color: #0B2C5C; font-size: 12pt; margin: 14px 0 5px; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }' +
    'th { background: #0B2C5C; color: #fff; padding: 5px 6px; font-size: 8pt; text-align: left; }' +
    'td { padding: 3px 6px; border-bottom: 1px solid #E3E8F0; font-size: 8.5pt; }' +
    'tr:nth-child(even) td { background: #F6F8FC; }' +
    'tfoot td { background: #E8EEFA !important; font-weight: bold; border-top: 2px solid #0B2C5C; }' +
    '.num { text-align: right; font-variant-numeric: tabular-nums; } .c { text-align: center; }' +
    '.mono { font-family: "Courier New", monospace; } .forte { font-weight: bold; }' +
    'table.total { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }' +
    'table.total td { background: #0B2C5C; color: #fff; padding: 9px 14px; font-size: 12pt; font-weight: bold; border: 0; }' +
    'table.total td.r { text-align: right; white-space: nowrap; }' +
    '.rodape { margin-top: 14px; border-top: 1px solid #E3E8F0; padding-top: 5px; font-size: 7.5pt; color: #5A6576; }' +
    '.vazio { padding: 20px; text-align: center; color: #5A6576; background: #F6F8FC; }' +
    '</style></head><body>' +

    '<div class="cab"><div class="marca">' + _brasaoHtml_() + '</div>' +
    '<div><h1>Relatório Glosa de Abastecimento</h1>' +
    '<div class="org">16ª Superintendência da Polícia Rodoviária Federal — Ceará</div></div>' +
    '<div class="comp">Mês de Referência<br>' + _esc_(d.competencia) + '</div></div>' +

    '<div class="metodo">' +
    'Comparativo de preços de abastecimentos realizados pela Frota da SPRF/CE através da Plataforma TicketCar × Preços Máximos de Revenda para combustíveis conforme série histórica do Relatório de Defesa da Concorrência da <b>Agência Nacional do Petróleo, Gás Natural e Biocombustíveis — ANP</b>, disponibilizada no sítio eletrônico: https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/serie-historica-do-levantamento-de-precos<br><br>' +
    '<b>Método:</b> o relatório compara o preço por litro pago no ato do abastecimento com o preço máximo de revenda por litro do relatório da ANP, no mesmo mês e na mesma unidade da federação, e calcula o valor do abastecimento pago que excedeu, para que seja aplicada glosa ao pagamento da fatura do mês de referência, utilizando-se arredondamento para duas casas decimais.' +
    '</div>' +

    (d.grupos.length
      ? d.grupos.map(g => '<h2>' + _esc_(_tituloCombustivel_(g.combustivel)) + ' <span style="font-weight:normal; font-size:9pt; color:#5A6576">(' + g.itens.length + ' abastecimento(s) acima do teto)</span></h2>' + bloco(g)).join('')
      : '<div class="vazio">Nenhum abastecimento excedeu o preço máximo de revenda da ANP nesta competência.</div>') +

    '<table class="total"><tr><td>Total Glosa Abastecimento</td><td class="r">' + _moedaBR_(d.total) + '</td></tr></table>' +

    '<div class="rodape">' + d.comGlosa + ' de ' + d.avaliados + ' abastecimentos da competência excederam o teto da ANP. ' +
    (Object.keys(d.semTeto).length ? 'Sem teto publicado na série da ANP: ' + _esc_(Object.keys(d.semTeto).map(k => k + ' — ' + d.semTeto[k] + ' registro(s)').join('; ')) + '. ' : '') +
    'Gerado pelo Painel da Frota — 16ª SPRF/CE em ' + agora + ' por ' + _esc_(sessao.email) + '.</div>' +
    '</body></html>';
}

function _tituloCombustivel_(c) {
  const t = String(c || '').toUpperCase();
  if (/GASOLINA\s+ADITIVADA/.test(t)) return 'Gasolina Aditivada';
  if (/GASOLINA/.test(t)) return 'Gasolina Comum';
  if (/DIESEL\s*S-?\s*10/.test(t)) return 'Óleo Diesel S-10';
  if (/DIESEL/.test(t)) return 'Óleo Diesel';
  if (/ETANOL|ALCOOL/.test(t)) return 'Etanol Hidratado';
  return c.charAt(0) + c.slice(1).toLowerCase();
}
function _decBR3_(n) { return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }


/** As bases de manutenção agora vivem na planilha-mãe. */
function _ssManut_() { return SpreadsheetApp.openById(CONFIG.ID_BASE); }



/**
 * Mapeia todas as abas da planilha-mãe: tamanho, se o painel usa, quem depende
 * de quem (pelas fórmulas) e o que parece órfão. Não altera nada.
 * Rode no editor e leia o log.
 */
function mapearAbasDaPlanilhaMae() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const usadasPeloPainel = {};
  [['ABA_BASE', 'frota, filtros, ficha, edição'], ['ABA_ABAST', 'abastecimento e relatórios'], ['ABA_MANUT', 'manutenção'],
   ['ABA_GESTORES', 'contatos por unidade'], ['ABA_OS_PENDENTES', 'aba Ordens de serviço'], ['ABA_OS_ACEITES', 'aba Ordens de serviço'],
   ['ABA_SOLICITACOES', 'solicitações de prefeituras'], ['ABA_ACIDENTES', 'alerta de acidente nos relatórios'],
   ['ABA_ANP', 'relatório de glosa'], ['ABA_RESUMO_GLOSA', 'histórico de glosa em Pagamentos'],
   ['ABA_LOG', 'registro de ações'], ['ABA_FILA', 'fila do DETRAN'],
   ['ABA_DETALHE', 'relatório analítico'], ['ABA_ACEITES', 'resumo de OS'], ['ABA_ORCAMENTOS', 'resumo de OS']
  ].forEach(par => { const nome = CONFIG[par[0]]; if (nome) usadasPeloPainel[nome] = par[1]; });
  (CONFIG.ABAS_AUX_MANUT || []).forEach(n => { usadasPeloPainel[n] = 'sustenta fórmula do DetalhamentoDB'; });

  const abas = ss.getSheets();
  const nomes = abas.map(a => a.getName());
  const info = {}, usadaPor = {};
  nomes.forEach(n => { usadaPor[n] = []; });

  abas.forEach(aba => {
    const nome = aba.getName();
    const nLin = aba.getLastRow(), nCol = aba.getLastColumn();
    let formulas = [];
    try { formulas = aba.getRange(1, 1, Math.min(Math.max(nLin, 1), 300), Math.max(nCol, 1)).getFormulas(); } catch (e) {}
    let qtdFormulas = 0, importrange = 0;
    const cita = {};
    formulas.forEach(l => l.forEach(f => {
      if (!f) return;
      qtdFormulas++;
      if (/IMPORTRANGE/i.test(f)) importrange++;
      nomes.forEach(outro => {
        if (outro === nome) return;
        if (new RegExp("'?" + outro.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'?!").test(f)) cita[outro] = true;
      });
    }));
    Object.keys(cita).forEach(alvo => { usadaPor[alvo].push(nome); });
    info[nome] = { linhas: nLin, colunas: nCol, formulas: qtdFormulas, importrange: importrange, cita: Object.keys(cita) };
  });

  const emUso = [], apoio = [], candidatas = [];
  nomes.forEach(n => {
    const i = info[n];
    const usoPainel = usadasPeloPainel[n];
    const dependentes = usadaPor[n];
    const linha = n + ' (' + i.linhas + ' linhas, ' + i.colunas + ' col' + (i.formulas ? ', ' + i.formulas + ' fórmulas' : '') +
      (i.importrange ? ', ' + i.importrange + ' IMPORTRANGE' : '') + ')' +
      (i.cita.length ? ' → usa: ' + i.cita.join(', ') : '') +
      (dependentes.length ? ' | usada por: ' + dependentes.join(', ') : '');
    if (usoPainel) emUso.push(linha + ' | PAINEL: ' + usoPainel);
    else if (dependentes.length) apoio.push(linha);
    else candidatas.push(linha);
  });

  Logger.log('===== ABAS USADAS PELO PAINEL (' + emUso.length + ') =====');
  emUso.forEach(l => Logger.log('  ' + l));
  Logger.log('===== ABAS DE APOIO — outra aba depende delas (' + apoio.length + ') =====');
  apoio.forEach(l => Logger.log('  ' + l));
  Logger.log('===== SEM USO APARENTE — nem o painel nem outra aba usa (' + candidatas.length + ') =====');
  candidatas.forEach(l => Logger.log('  ' + l));
  Logger.log('Observação: abas com IMPORTRANGE podem ser espelhos de outras planilhas, e abas podem ser lidas por scripts ou planilhas externas que este mapa não alcança.');
}

/**
 * Verifica se a planilha de aceites pode ser aposentada: procura quem ainda
 * depende dela, nos dois sentidos.
 *  1) abas da própria planilha antiga que usam as bases migradas (param de
 *     receber dados novos, mas continuam com o histórico);
 *  2) fórmulas na planilha-mãe que ainda apontam para o ID da planilha antiga.
 * Não altera nada.
 */
function verificarDependenciasAceites() {
  const idAntigo = CONFIG.ID_MANUT_ANTIGA;
  const migradas = [CONFIG.ABA_DETALHE, CONFIG.ABA_ACEITES, CONFIG.ABA_ORCAMENTOS].concat(CONFIG.ABAS_AUX_MANUT || []);

  Logger.log('=== 1) Abas da planilha de aceites que usam as bases migradas');
  const antiga = SpreadsheetApp.openById(idAntigo);
  let achou1 = false;
  antiga.getSheets().forEach(aba => {
    const nome = aba.getName();
    if (migradas.indexOf(nome) >= 0) return;
    if (aba.getLastRow() < 1) return;
    let formulas;
    try { formulas = aba.getRange(1, 1, Math.min(aba.getLastRow(), 200), Math.max(1, aba.getLastColumn())).getFormulas(); }
    catch (e) { return; }
    const usa = {};
    formulas.forEach(l => l.forEach(f => {
      if (!f) return;
      migradas.forEach(b => { if (new RegExp("'?" + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "'?!").test(f)) usa[b] = true; });
    }));
    if (Object.keys(usa).length) { achou1 = true; Logger.log('   ' + nome + ' usa: ' + Object.keys(usa).join(', ')); }
  });
  if (!achou1) Logger.log('   nenhuma — só as bases migradas tinham fórmulas relevantes.');

  Logger.log('=== 2) Fórmulas na planilha-mãe que apontam para a planilha de aceites');
  const mae = SpreadsheetApp.openById(CONFIG.ID_BASE);
  let achou2 = false;
  mae.getSheets().forEach(aba => {
    if (aba.getLastRow() < 1) return;
    let formulas;
    try { formulas = aba.getRange(1, 1, Math.min(aba.getLastRow(), 200), Math.max(1, aba.getLastColumn())).getFormulas(); }
    catch (e) { return; }
    const refs = [];
    formulas.forEach((l, i) => l.forEach((f, j) => {
      if (f && f.indexOf(idAntigo) >= 0) refs.push({ cel: aba.getName() + '!' + String.fromCharCode(65 + j) + (i + 1), f: f });
    }));
    if (refs.length) {
      achou2 = true;
      refs.slice(0, 5).forEach(r => Logger.log('   ' + r.cel + ' → ' + r.f.substring(0, 300)));
      if (refs.length > 5) Logger.log('   (+' + (refs.length - 5) + ' outras)');
    }
  });
  if (!achou2) Logger.log('   nenhuma.');

  Logger.log('=== 3) Abas da planilha antiga que NÃO migram (viram histórico parado)');
  const naoMigram = antiga.getSheets().map(a => a.getName()).filter(n => migradas.indexOf(n) < 0);
  Logger.log('   ' + (naoMigram.length ? naoMigram.join(' | ') : 'nenhuma'));

  Logger.log('=== 4) O painel');
  Logger.log('   lê as bases de: ' + CONFIG.ID_BASE + ' (planilha-mãe)');
  Logger.log('   usa a planilha antiga apenas em migrarDadosManutencao().');
  Logger.log('Conclusão: se 1 e 2 vieram vazios, a planilha de aceites pode ser aposentada depois da migração.');
}

/** Abas da planilha de origem que são espelhos de outra planilha (IMPORTRANGE). */
function _espelhosImportrange_(ss) {
  const mapa = {};
  ss.getSheets().forEach(aba => {
    try {
      if (aba.getLastRow() < 1) return;
      const f = aba.getRange(1, 1, Math.min(3, aba.getLastRow()), 1).getFormulas()
        .map(l => l[0]).find(x => x && /IMPORTRANGE/i.test(x));
      if (!f) return;
      const m = f.match(/IMPORTRANGE\s*\(\s*"([^"]+)"\s*[;,]\s*"([^"]+)"/i);
      if (!m) { mapa[aba.getName()] = { id: '', faixa: '', aba: '' }; return; }
      const id = (m[1].match(/[-\w]{25,}/) || [m[1]])[0];
      const faixa = m[2];
      mapa[aba.getName()] = { id: id, faixa: faixa, aba: faixa.split('!')[0].replace(/'/g, '').trim() };
    } catch (e) {}
  });
  return mapa;
}

/** Analisa a migração SEM alterar nada: o que vem, o que é fórmula, o que aponta para fora. */
function analisarMigracaoManutencao() {
  const origem = SpreadsheetApp.openById(CONFIG.ID_MANUT_ANTIGA);
  const destino = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const espelhos = _espelhosImportrange_(origem);
  const nomesDestino = destino.getSheets().map(a => a.getName());
  Logger.log('Abas espelho (IMPORTRANGE) na planilha de aceites: ' +
    (Object.keys(espelhos).length ? Object.keys(espelhos).map(k => k + ' → ' + (espelhos[k].id === CONFIG.ID_BASE ? 'planilha-mãe/' + espelhos[k].aba : espelhos[k].id.substring(0, 12) + '…/' + espelhos[k].aba)).join(' | ') : 'nenhuma'));

  [CONFIG.ABA_DETALHE, CONFIG.ABA_ACEITES, CONFIG.ABA_ORCAMENTOS].concat(CONFIG.ABAS_AUX_MANUT || []).forEach(nome => {
    const de = origem.getSheetByName(nome);
    if (!de) { Logger.log(nome + ': não existe'); return; }
    const nLin = de.getLastRow(), nCol = de.getLastColumn();
    const formulas = de.getRange(1, 1, nLin, nCol).getFormulas();
    const total = formulas.reduce((t, l) => t + l.filter(f => f).length, 0);
    const refs = {};
    formulas.forEach(l => l.forEach(f => {
      if (!f) return;
      (f.match(/'[^']+'!|[A-Za-zÀ-ÿ0-9_.çÇ]+!/g) || []).forEach(r => { refs[r.replace(/['!]/g, '').trim()] = true; });
    }));
    const proprias = [CONFIG.ABA_DETALHE, CONFIG.ABA_ACEITES, CONFIG.ABA_ORCAMENTOS].concat(CONFIG.ABAS_AUX_MANUT || []);
    const externas = Object.keys(refs).filter(r => proprias.indexOf(r) < 0);
    Logger.log(nome + ': ' + (nLin - 1) + ' linhas, ' + nCol + ' colunas, ' + total + ' células com fórmula.');
    Logger.log('   abas citadas pelas fórmulas: ' + (externas.length ? externas.map(r => {
      const esp = espelhos[r];
      if (esp && esp.id === CONFIG.ID_BASE) return r + ' (espelho da planilha-mãe → será reapontado para "' + esp.aba + '")';
      if (esp) return r + ' (espelho de OUTRA planilha ' + esp.id.substring(0, 12) + '… → precisa vir junto)';
      if (nomesDestino.indexOf(r) >= 0) return r + ' (já existe na planilha-mãe)';
      return r + ' (NÃO existe na planilha-mãe — precisa vir junto)';
    }).join(' | ') : 'nenhuma além das próprias bases'));
  });
  Logger.log('Nada foi alterado. Rode migrarDadosManutencao() quando quiser executar.');
}

/**
 * MIGRAÇÃO (rodar uma vez no editor): traz DetalhamentoDB, AceitesDB e
 * OrçamentosDB da planilha de aceites para a planilha-mãe.
 *
 * Preserva fórmulas, formatos e larguras. Quando uma fórmula aponta para uma
 * aba que na origem é espelho (IMPORTRANGE) da própria planilha-mãe, a
 * referência é reescrita para a aba nativa correspondente.
 * Rode antes analisarMigracaoManutencao() para ver o que vai acontecer.
 */
function migrarDadosManutencao() {
  const origem = SpreadsheetApp.openById(CONFIG.ID_MANUT_ANTIGA);
  const destino = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const bases = [CONFIG.ABA_DETALHE, CONFIG.ABA_ACEITES, CONFIG.ABA_ORCAMENTOS].concat(CONFIG.ABAS_AUX_MANUT || []);
  const espelhos = _espelhosImportrange_(origem);
  const nomesDestino = destino.getSheets().map(a => a.getName());

  // de qual nome de aba para qual, nas fórmulas
  const reescrever = {};
  Object.keys(espelhos).forEach(nome => {
    const e = espelhos[nome];
    if (e.id === CONFIG.ID_BASE && e.aba && nomesDestino.indexOf(e.aba) >= 0 && e.aba !== nome) reescrever[nome] = e.aba;
  });

  const resumo = [], pendencias = [];
  bases.forEach(nome => {
    const de = origem.getSheetByName(nome);
    if (!de) { resumo.push(nome + ': não existe na origem'); return; }
    const nLin = de.getLastRow(), nCol = de.getLastColumn();
    if (!nLin) { resumo.push(nome + ': vazia'); return; }

    const faixa = de.getRange(1, 1, nLin, nCol);
    const valores = faixa.getValues(), formulas = faixa.getFormulas(), formatos = faixa.getNumberFormats();
    let reescritas = 0;
    const conteudo = valores.map((linha, i) => linha.map((v, j) => {
      let f = formulas[i][j];
      if (!f) return v;
      Object.keys(reescrever).forEach(velho => {
        const re = new RegExp("('?)" + velho.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\1!", 'g');
        if (re.test(f)) { f = f.replace(re, "'" + reescrever[velho] + "'!"); reescritas++; }
      });
      return f;
    }));

    // o que ainda aponta para fora
    const refs = {};
    conteudo.forEach(l => l.forEach(c => {
      if (typeof c !== 'string' || c.charAt(0) !== '=') return;
      (c.match(/'[^']+'!|[A-Za-zÀ-ÿ0-9_.çÇ]+!/g) || []).forEach(r => { refs[r.replace(/['!]/g, '').trim()] = true; });
    }));
    Object.keys(refs).forEach(r => {
      if (bases.indexOf(r) < 0 && nomesDestino.indexOf(r) < 0) pendencias.push(nome + ' → aba "' + r + '"');
    });

    let para = destino.getSheetByName(nome);
    if (para) destino.deleteSheet(para);
    para = destino.insertSheet(nome);
    const alvo = para.getRange(1, 1, nLin, nCol);
    alvo.setValues(conteudo);
    alvo.setNumberFormats(formatos);
    para.setFrozenRows(Math.min(3, nLin));
    for (let c = 1; c <= nCol; c++) { try { para.setColumnWidth(c, de.getColumnWidth(c)); } catch (e) {} }

    const comFormula = formulas.reduce((t, l) => t + l.filter(f => f).length, 0);
    const arrays = formulas.reduce((t, l) => t + l.filter(f => f && /ARRAYFORMULA/i.test(f)).length, 0);
    resumo.push(nome + ': ' + (nLin - 1) + ' linhas, ' + comFormula + ' fórmulas preservadas' + (arrays ? ' (' + arrays + ' ARRAYFORMULA, que se estendem sozinhas)' : '') + (reescritas ? ', ' + reescritas + ' referências reapontadas' : ''));
  });

  limparCache();
  Logger.log('MIGRAÇÃO → ' + resumo.join(' | '));
  if (Object.keys(reescrever).length) Logger.log('Referências reapontadas: ' + Object.keys(reescrever).map(k => k + ' → ' + reescrever[k]).join(', '));
  if (pendencias.length) Logger.log('ATENÇÃO — ainda apontam para abas que não existem na planilha-mãe: ' + pendencias.join(' | ') + '. Me avise para trazermos essas abas.');
  else Logger.log('Nenhuma pendência: todas as fórmulas resolvem dentro da planilha-mãe.');
  return resumo.join(' | ');
}

/** Igual à réplica acima, mas para colunas calculadas ANTES da área escrita (ex.: A:E do detalhamento). */
function _replicarColunasIniciais_(aba, primeiraLinhaNova, qtdLinhas, ateColuna) {
  try {
    const modeloLinha = primeiraLinhaNova - 1;
    if (modeloLinha < 2 || qtdLinhas < 1) return 0;
    const modelo = aba.getRange(modeloLinha, 1, 1, ateColuna).getFormulasR1C1()[0];
    if (!modelo.some(f => f)) return 0;
    const bloco = [];
    for (let i = 0; i < qtdLinhas; i++) bloco.push(modelo.slice());
    aba.getRange(primeiraLinhaNova, 1, qtdLinhas, ateColuna).setFormulasR1C1(bloco);
    return modelo.filter(f => f).length;
  } catch (e) { Logger.log('Réplica de colunas iniciais: ' + e); return 0; }
}

function _replicarFormulas_(aba, primeiraLinhaNova, qtdLinhas, colunasEscritas) {
  try {
    const nCol = aba.getLastColumn();
    if (nCol <= colunasEscritas || qtdLinhas < 1) return 0;
    const modeloLinha = primeiraLinhaNova - 1;
    if (modeloLinha < 2) return 0;
    const largura = nCol - colunasEscritas;
    const modelo = aba.getRange(modeloLinha, colunasEscritas + 1, 1, largura).getFormulasR1C1()[0];
    if (!modelo.some(f => f)) return 0;
    const bloco = [];
    for (let i = 0; i < qtdLinhas; i++) bloco.push(modelo.slice());
    aba.getRange(primeiraLinhaNova, colunasEscritas + 1, qtdLinhas, largura).setFormulasR1C1(bloco);
    return modelo.filter(f => f).length;
  } catch (e) { Logger.log('Réplica de fórmulas: ' + e); return 0; }
}

/* ============================================================
   RELATÓRIO DE ORDENS DE SERVIÇO — ANALÍTICO (peças)
   Porte do "Gerar Relatório de Peças" que ficava no menu da
   planilha de aceites: lê o DetalhamentoDB, agrupa por veículo
   e família de peça, e sai em PDF em vez de escrever numa aba.
   ============================================================ */

/**
 * Placas com sinistro ainda em aberto: status "Em Processo" na aba Acidentes.
 * É o que alerta no processo de pagamento da manutenção, porque o reparo pode
 * vir a ser ressarcido por terceiro (IN PRF 40/2021, arts. 46 a 51).
 */
function _placasComAcidenteAberto_() {
  const mapa = {};
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_ACIDENTES);
    if (!aba || aba.getLastRow() < 2) return mapa;
    const info = _colunasSinistro_(aba);
    const valores = aba.getRange(2, 1, aba.getLastRow() - 1, info.largura).getValues();
    valores.forEach(l => {
      const placa = String(l[info.col.placa] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!placa) return;
      const status = _normCab_(l[info.col.status]);
      // sem status preenchido, mantém o comportamento antigo: considera em aberto
      const emAberto = status ? status.indexOf('EM PROCESSO') === 0 : true;
      if (emAberto) mapa[placa] = String(l[info.col.processo] || '').trim();
    });
  } catch (e) { Logger.log('Aba Acidentes: ' + e); }
  return mapa;
}

function gerarRelatorioPecas(token, competencia, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const comp = _formatarCompetencia_(competencia || '', true);
  if (!comp) return { ok: false, erro: 'Informe a competência no formato MM/AAAA.' };
  const filtroPlaca = String(placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_DETALHE);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_DETALHE + '" não encontrada. Importe o detalhamento primeiro.' };
    const dados = aba.getDataRange().getValues();
    if (dados.length < 3) return { ok: false, erro: 'O DetalhamentoDB está vazio.' };

    // a primeira linha traz instruções de colagem; o cabeçalho real é a linha com "Competência"
    let linhaCab = 0;
    for (let i = 0; i < Math.min(6, dados.length); i++) {
      if (dados[i].some(c => /COMPET/i.test(String(c)))) { linhaCab = i; break; }
    }
    // índices herdados do relatório antigo (0-based)
    const C_GESTOR = 0, C_PLACA = 5, C_FAMILIA = 10, C_INI_DADOS = 11, C_FIM_DADOS = 29, C_TOTAL = 27, C_COMP = 29;
    const registros = dados.slice(linhaCab + 1).filter(l => {
      if (_compSegura_(l[C_COMP]) !== comp) return false;
      if (filtroPlaca && String(l[C_PLACA] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() !== filtroPlaca) return false;
      return true;
    });
    if (!registros.length) return { ok: false, erro: 'Nenhum item no detalhamento para ' + comp + (filtroPlaca ? ' / ' + filtroPlaca : '') + '.' };

    const acidentes = _placasComAcidenteAberto_();
    const veiculos = [];
    let atual = null, familia = null, totalGeral = 0, itens = 0;
    const alertasAcidente = {};

    registros.forEach(l => {
      const chave = [l[5], l[6], l[7], l[8], l[9]].map(x => String(x || '').trim()).join(' - ');
      if (!atual || atual.chave !== chave) {
        atual = { chave: chave, placa: String(l[C_PLACA] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
                  gestor: String(l[C_GESTOR] || '').trim(), familias: [], total: 0 };
        veiculos.push(atual); familia = null;
        if (acidentes[atual.placa] !== undefined) alertasAcidente[atual.placa] = acidentes[atual.placa];
      }
      const nomeFamilia = String(l[C_FAMILIA] || '').trim() || '(sem família)';
      if (!familia || familia.nome !== nomeFamilia) { familia = { nome: nomeFamilia, linhas: [], total: 0 }; atual.familias.push(familia); }
      const valor = _num_(l[C_TOTAL]) || 0;
      familia.linhas.push(l.slice(C_INI_DADOS, C_FIM_DADOS).map(x => (x instanceof Date) ? _brDia_(_diaISO_(x)) : (x === null || x === undefined ? '' : x)));
      familia.total += valor; atual.total += valor; totalGeral += valor; itens++;
    });

    Logger.log('Relatório analítico ' + comp + ': ' + veiculos.length + ' veículos, ' + itens + ' itens, total ' + totalGeral);
    const html = _htmlRelatorioPecas_({ comp: comp, placa: filtroPlaca, veiculos: veiculos, totalGeral: totalGeral, itens: itens, acidentes: alertasAcidente }, p.sessao);
    const nome = 'Relatorio_OS_Analitico_' + comp.replace('/', '-') + (filtroPlaca ? '_' + filtroPlaca : '') + '.pdf';
    const pdf = _entregarPdf_(Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(nome), nome);
    _logAcao_(p.ss, p.sessao.email, 'Relatório de OS (analítico)', filtroPlaca, comp, _moedaBR_(totalGeral) + ' | ' + itens + ' itens | ' + veiculos.length + ' veículos');
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '',
             total: totalGeral, itens: itens, veiculos: veiculos.length,
             acidentes: Object.keys(alertasAcidente).map(k => ({ placa: k, processo: alertasAcidente[k] })) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

function _htmlRelatorioPecas_(d, sessao) {
  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, "dd/MM/yyyy 'às' HH:mm");
  const cab1 = ['Ordem de Serviço', 'Conclusão', 'Grupo de Peça', 'Peça', 'Unidade', 'Tipo de Peça', 'Mão de Obra', 'Tipo de Manutenção', 'Garantia', 'Garantia'];
  const cab2 = ['Peça — MO', 'Peça — Qtd.', 'Peça — Valor unit.', 'MO — Total', 'MO — Qtd.', 'MO — Valor unit.', 'Total'];
  const numericas = [10, 11, 12, 13, 14, 15, 16];

  const blocos = d.veiculos.map(v => {
    const marcado = d.acidentes[v.placa] !== undefined;
    return '<div class="veiculo"><div class="titulo-veiculo' + (marcado ? ' acidente' : '') + '">' + _esc_(v.chave) +
      (marcado ? '<span class="tag">processo de acidente em aberto</span>' : '') +
      (v.gestor ? '<span class="gestor">' + _esc_(v.gestor) + '</span>' : '') + '</div>' +
      v.familias.map(f => '<div class="familia">Família: ' + _esc_(f.nome) + '</div>' +
        '<table><thead><tr>' + cab1.map(h => '<th>' + h + '</th>').join('') + cab2.map(h => '<th class="num">' + h + '</th>').join('') + '</tr></thead><tbody>' +
        f.linhas.map(l => '<tr>' + l.map((c, i) => '<td' + (numericas.indexOf(i) >= 0 ? ' class="num"' : '') + '>' +
          (numericas.indexOf(i) >= 0 && _num_(c) !== null && String(c).trim() !== '' ? (i === 16 || i === 12 || i === 15 ? _moedaBR_(_num_(c)) : _decBR_(_num_(c))) : _esc_(c)) + '</td>').join('') + '</tr>').join('') +
        '<tr class="subtotal"><td colspan="16">Subtotal ' + _esc_(f.nome) + '</td><td class="num">' + _moedaBR_(f.total) + '</td></tr>' +
        '</tbody></table>').join('') +
      '<table class="total-veiculo"><tr><td>TOTAL DO VEÍCULO</td><td class="num">' + _moedaBR_(v.total) + '</td></tr></table></div>';
  }).join('');

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 10mm 8mm; }' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #14181F; font-size: 8pt; margin: 0; }' +
    '.cab { display: table; width: 100%; border-bottom: 4px solid #F2B705; padding-bottom: 8px; margin-bottom: 10px; }' +
    '.cab > div { display: table-cell; vertical-align: middle; } .cab .marca { width: 70px; }' +
    '.cab h1 { margin: 0; font-size: 15pt; color: #0B2C5C; } .cab .org { font-size: 9pt; color: #5A6576; }' +
    '.cab .per { text-align: right; font-size: 10pt; font-weight: bold; color: #0B2C5C; }' +
    '.resumo { display: table; width: 100%; table-layout: fixed; border-spacing: 5px 0; margin-bottom: 10px; }' +
    '.resumo > div { display: table-cell; background: #F6F8FC; border-left: 3px solid #0B2C5C; padding: 6px 8px; }' +
    '.resumo .r { font-size: 7pt; text-transform: uppercase; color: #5A6576; } .resumo .v { font-size: 12pt; font-weight: bold; color: #0B2C5C; }' +
    '.aviso { background: #FDF3E7; border-left: 3px solid #B23A2E; padding: 8px 10px; font-size: 8.5pt; margin-bottom: 10px; }' +
    '.aviso b { color: #B23A2E; }' +
    '.veiculo { margin-bottom: 12px; page-break-inside: avoid; }' +
    '.titulo-veiculo { background: #0B2C5C; color: #fff; padding: 5px 8px; font-weight: bold; font-size: 9pt; }' +
    '.titulo-veiculo.acidente { background: #B23A2E; }' +
    '.titulo-veiculo .tag { background: #F2B705; color: #14181F; border-radius: 8px; padding: 1px 7px; font-size: 7pt; margin-left: 8px; }' +
    '.titulo-veiculo .gestor { float: right; font-weight: normal; font-size: 7.5pt; opacity: .85; }' +
    '.familia { background: #E8EEFA; padding: 3px 8px; font-weight: bold; font-size: 8pt; color: #0B2C5C; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }' +
    'th { background: #3A4A63; color: #fff; text-align: left; padding: 3px 4px; font-size: 6.5pt; }' +
    'td { padding: 2px 4px; border-bottom: 1px solid #E3E8F0; font-size: 7pt; }' +
    'tbody tr:nth-child(even) td { background: #F9FAFD; }' +
    '.num { text-align: right; }' +
    'tr.subtotal td { background: #EFF2F7 !important; font-weight: bold; }' +
    'table.total-veiculo td { background: #CCCCCC; font-weight: bold; font-size: 9pt; padding: 4px 8px; border: 0; }' +
    '.total-geral { background: #0B2C5C; color: #fff; }' +
    '.total-geral td { background: #0B2C5C; color: #fff; font-size: 12pt; font-weight: bold; padding: 9px 12px; border: 0; }' +
    '.rodape { margin-top: 10px; border-top: 1px solid #E3E8F0; padding-top: 5px; font-size: 7pt; color: #5A6576; }' +
    '</style></head><body>' +
    '<div class="cab"><div class="marca">' + _brasaoHtml_() + '</div>' +
    '<div><h1>Relatório de Ordens de Serviço — Analítico</h1><div class="org">16ª Superintendência da Polícia Rodoviária Federal — Ceará</div></div>' +
    '<div class="per">Competência<br>' + _esc_(d.comp) + (d.placa ? '<br><span style="font-weight:normal; font-size:8pt">Placa ' + _esc_(d.placa) + '</span>' : '') + '</div></div>' +

    '<div class="resumo">' +
    '<div><div class="r">Total das peças e serviços</div><div class="v">' + _moedaBR_(d.totalGeral) + '</div></div>' +
    '<div><div class="r">Veículos</div><div class="v">' + d.veiculos.length + '</div></div>' +
    '<div><div class="r">Itens detalhados</div><div class="v">' + _fmtInt_(d.itens) + '</div></div>' +
    '<div><div class="r">Gasto médio por veículo</div><div class="v">' + _moedaBR_(d.totalGeral / Math.max(1, d.veiculos.length)) + '</div></div>' +
    '</div>' +

    (Object.keys(d.acidentes).length ? '<div class="aviso"><b>Atenção — processo de acidente em aberto:</b> ' +
      _esc_(Object.keys(d.acidentes).map(k => k + (d.acidentes[k] ? ' (' + d.acidentes[k] + ')' : '')).join(' · ')) +
      '. O pagamento dessas ordens de serviço recebe tratamento distinto; confira antes de encaminhar.</div>' : '') +

    blocos +
    '<table class="total-geral"><tr><td>TOTAL GERAL</td><td class="num">' + _moedaBR_(d.totalGeral) + '</td></tr></table>' +
    '<div class="rodape">Gerado pelo Painel da Frota — 16ª SPRF/CE em ' + agora + ' por ' + _esc_(sessao.email) +
    '. Fonte: DetalhamentoDB (importação do detalhamento de itens) e aba Acidentes da planilha de gestão.</div>' +
    '</body></html>';
}


/* ============================================================
   RELATÓRIO DE ORDENS DE SERVIÇO — RESUMO
   Equivalente à aba "Aceites Mensal": lista as OS da competência
   com o tipo de aceite (gestor ou automático), totais e gráficos.
   ============================================================ */

/** Localiza as colunas do AceitesDB pelo nome do cabeçalho, com reserva por posição. */
function _mapaAceitesDb_(valores) {
  const achar = (linha, regs) => {
    const cab = linha.map(c => _normCab_(c));
    const idx = {};
    Object.keys(regs).forEach(k => { idx[k] = cab.findIndex(x => regs[k].test(x)); });
    return idx;
  };
  const regs = {
    os: /^(OS|ORDEM DE SERVICO|N OS)$/, placa: /PLACA/, modelo: /MODELO/, unidade: /UNIDADE/,
    estabelecimento: /ESTABELEC|OFICINA|FORNECEDOR/, aprovacao: /APROVA/, inicio: /INICIO/,
    conclusao: /CONCLUS/, valor: /VALOR/, tipo: /TIPO/, competencia: /COMPET/
  };
  for (let i = 0; i < Math.min(12, valores.length); i++) {
    const idx = achar(valores[i], regs);
    if (idx.os >= 0 && idx.placa >= 0 && idx.valor >= 0) return { linhaCab: i, idx: idx, porNome: true };
  }
  // reserva: ordem em que o importador grava (A:G do arquivo + H = tipo)
  return { linhaCab: 0, porNome: false,
           idx: { os: 0, placa: 1, modelo: 2, unidade: 3, estabelecimento: 4, aprovacao: 5, conclusao: 6, tipo: 7, inicio: -1, valor: -1 } };
}

/** OrçamentosDB → { numeroDaOS: {pecas, mo, total, estabelecimento} }. */
function _orcamentosPorOs_(ss) {
  const mapa = {};
  try {
    const aba = ss.getSheetByName(CONFIG.ABA_ORCAMENTOS);
    if (!aba || aba.getLastRow() < 3) return mapa;
    const valores = aba.getDataRange().getValues();
    let cab = -1;
    for (let i = 0; i < Math.min(6, valores.length); i++) {
      if (valores[i].some(c => /ORDEM\s*SERVI|^OS$/i.test(String(c).trim()))) { cab = i; break; }
    }
    if (cab < 0) return mapa;
    const nomes = valores[cab].map(c => _normCab_(c));
    const col = re => nomes.findIndex(x => re.test(x));
    const iOs = col(/ORDEM SERVICO|^OS$/), iMo = col(/MAO DE OBRA/), iPec = col(/^PECAS$/),
          iTot = col(/TOTAL O S|TOTAL OS|^TOTAL/), iEst = col(/^ESTABELECIMENTO$/);
    if (iOs < 0) return mapa;
    for (let r = cab + 1; r < valores.length; r++) {
      const os = String(valores[r][iOs] || '').replace(/\D/g, '');
      if (!os) continue;
      mapa[os] = { pecas: iPec >= 0 ? (_num_(valores[r][iPec]) || 0) : 0,
                   mo: iMo >= 0 ? (_num_(valores[r][iMo]) || 0) : 0,
                   total: iTot >= 0 ? (_num_(valores[r][iTot]) || 0) : 0,
                   estabelecimento: iEst >= 0 ? String(valores[r][iEst] || '').trim() : '' };
    }
  } catch (e) { Logger.log('OrçamentosDB: ' + e); }
  return mapa;
}

function gerarRelatorioAceites(token, competencia) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const comp = _formatarCompetencia_(competencia || '', true);
  try {
    const ss = _ssManut_();
    const aba = ss.getSheetByName(CONFIG.ABA_ORCAMENTOS);
    if (!aba) return { ok: false, erro: 'Aba "' + CONFIG.ABA_ORCAMENTOS + '" não encontrada. Rode migrarDadosManutencao() e importe os orçamentos.' };
    const valores = aba.getDataRange().getValues();
    if (valores.length < 3) return { ok: false, erro: 'O OrçamentosDB está vazio.' };

    // cabeçalho real (a primeira linha traz instruções de colagem)
    let cab = 0;
    for (let i = 0; i < Math.min(6, valores.length); i++) {
      if (valores[i].some(c => /ORDEM\s*SERVI/i.test(String(c)))) { cab = i; break; }
    }
    const nomes = valores[cab].map(c => _normCab_(c));
    const col = re => nomes.findIndex(x => re.test(x));
    const iOs = col(/ORDEM SERVICO|^OS$/), iPlaca = col(/PLACA/), iConc = col(/DATA CONCLUS/),
          iEstab = col(/^ESTABELECIMENTO$/), iMo = col(/MAO DE OBRA/), iPec = col(/^PECAS$/),
          iTotal = col(/TOTAL O ?S|TOTAL OS|^TOTAL/), iComp = col(/COMPET/);
    let iTipo = col(/^GESTOR$|TIPO|ACEITE/);
    if (iTipo < 0) iTipo = nomes.length - 1;
    if (iOs < 0 || iTotal < 0 || iComp < 0) return { ok: false, erro: 'Não reconheci as colunas do OrçamentosDB (esperado Ordem Serviço, Total O.S. e Competência).' };

    // aceites: complementa unidade e modelo pela OS
    const porOs = {};
    try {
      const abaAce = ss.getSheetByName(CONFIG.ABA_ACEITES);
      if (abaAce && abaAce.getLastRow() > 2) {
        const va = abaAce.getDataRange().getValues();
        const m = _mapaAceitesDb_(va);
        for (let r = m.linhaCab + 1; r < va.length; r++) {
          const os = String(m.idx.os >= 0 ? va[r][m.idx.os] : '').replace(/\D/g, '');
          if (!os) continue;
          porOs[os] = { unidade: m.idx.unidade >= 0 ? String(va[r][m.idx.unidade] || '').trim() : '',
                        modelo: m.idx.modelo >= 0 ? String(va[r][m.idx.modelo] || '').trim() : '',
                        tipo: m.idx.tipo >= 0 ? String(va[r][m.idx.tipo] || '').trim() : '',
                        aprovacao: m.idx.aprovacao >= 0 ? _dataTxt_(va[r][m.idx.aprovacao]) : '' };
        }
      }
    } catch (e) { Logger.log('AceitesDB (complemento): ' + e); }

    const acidentes = _placasComAcidenteAberto_();
    const itens = [], porTipo = {}, porUnidade = {}, porOficina = {}, alerta = {}, vistos = {};
    let total = 0, totalPecas = 0, totalMo = 0, semTipo = 0;
    for (let r = cab + 1; r < valores.length; r++) {
      const l = valores[r];
      const os = String(l[iOs] || '').replace(/\D/g, '');
      if (!os) continue;
      if (_compSegura_(l[iComp]) !== comp) continue;
      if (vistos[os]) continue;
      vistos[os] = true;
      const placa = String(l[iPlaca] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const compl = porOs[os] || {};
      const tipo = String(l[iTipo] || '').trim() || compl.tipo || '';
      if (!tipo) semTipo++;
      const valor = _num_(l[iTotal]) || 0, pecas = _num_(l[iPec]) || 0, mo = _num_(l[iMo]) || 0;
      const unidade = compl.unidade || 'Sem unidade';
      const oficina = String(l[iEstab] || '').trim() || 'Sem estabelecimento';
      const acidente = acidentes[placa] !== undefined;
      if (acidente) alerta[placa] = acidentes[placa];
      itens.push({ unidade: unidade, os: String(l[iOs] || '').trim(), placa: placa, modelo: compl.modelo || '',
        oficina: oficina, aprovacao: compl.aprovacao || '', conclusao: _dataTxt_(l[iConc]),
        pecas: pecas, mo: mo, valor: valor, tipo: tipo || 'Não informado', acidente: acidente });
      total += valor; totalPecas += pecas; totalMo += mo;
      const soma = (obj, chave) => { const a = obj[chave] || (obj[chave] = { valor: 0, qtd: 0 }); a.valor += valor; a.qtd++; };
      soma(porTipo, tipo || 'Não informado'); soma(porUnidade, unidade); soma(porOficina, oficina);
    }
    if (!itens.length) return { ok: false, erro: 'Nenhuma ordem de serviço no OrçamentosDB para a competência ' + comp + '. Importe o relatório de orçamentos dessa competência.' };

    itens.sort((a, b) => a.unidade.localeCompare(b.unidade) || b.valor - a.valor);
    const dados = { comp: comp, itens: itens, total: total, totalPecas: totalPecas, totalMo: totalMo,
      semEstabelecimento: itens.filter(i => i.oficina === 'Sem estabelecimento').length, semTipo: semTipo,
      porTipo: porTipo, porUnidade: porUnidade, porOficina: porOficina, acidentes: alerta, duplicadas: [] };
    const html = _htmlRelatorioAceites_(dados, p.sessao);
    const nome = 'Relatorio_OS_Resumo_' + comp.replace('/', '-') + '.pdf';
    const pdf = _entregarPdf_(Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf').setName(nome), nome);
    _logAcao_(p.ss, p.sessao.email, 'Relatório de OS (resumo)', '', comp, _moedaBR_(total) + ' | ' + itens.length + ' OS');
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '',
      total: total, ordens: itens.length, pecas: totalPecas, mo: totalMo, semTipo: semTipo,
      semEstabelecimento: dados.semEstabelecimento, competenciaPor: 'coluna Competência do OrçamentosDB',
      tipos: Object.keys(porTipo).map(k => ({ tipo: k, valor: porTipo[k].valor, qtd: porTipo[k].qtd })),
      acidentes: Object.keys(alerta).map(k => ({ placa: k, processo: alerta[k] })) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

function _htmlRelatorioAceites_(d, sessao) {
  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, "dd/MM/yyyy 'às' HH:mm");
  const ordenar = obj => Object.keys(obj).map(k => ({ chave: k, valor: obj[k].valor, qtd: obj[k].qtd })).sort((a, b) => b.valor - a.valor);
  const barras = (itens, cor) => {
    const maximo = Math.max(1, ...itens.map(i => i.valor));
    return '<table class="graf">' + itens.map(i => '<tr><td class="rot">' + _esc_(i.chave) + '</td>' +
      '<td class="bar"><div class="preench" style="width:' + Math.max(1, Math.round(i.valor / maximo * 100)) + '%; background:' + cor + '"></div></td>' +
      '<td class="val">' + _moedaBR_(i.valor) + ' <small>(' + i.qtd + ')</small></td></tr>').join('') + '</table>';
  };
  const tipos = ordenar(d.porTipo);
  const faixa = (() => {
    const cores = { 'Gestor': '#0B2C5C', 'Automático': '#F2B705', 'Não informado': '#8A94A6' };
    return '<table class="faixa"><tr>' + tipos.map(t => '<td style="width:' + (t.valor / Math.max(1, d.total) * 100) +
      '%; background:' + (cores[t.chave] || '#2E6FD9') + '"></td>').join('') + '</tr></table><div class="legenda">' +
      tipos.map(t => '<span style="background:' + (cores[t.chave] || '#2E6FD9') + '"></span>' + _esc_(t.chave) + ' — ' +
      _moedaBR_(t.valor) + ' (' + _decBR_(t.valor / Math.max(1, d.total) * 100) + '% · ' + t.qtd + ' OS)').join('') + '</div>';
  })();

  let unidadeAtual = '', corpo = '', subtotal = 0, qtdUnidade = 0;
  const fechaUnidade = () => unidadeAtual ? '<tr class="subtotal"><td colspan="8">Subtotal ' + _esc_(unidadeAtual) + ' — ' + qtdUnidade + ' OS</td><td class="num">' + _moedaBR_(subtotal) + '</td><td></td></tr>' : '';
  d.itens.forEach(i => {
    if (i.unidade !== unidadeAtual) {
      corpo += fechaUnidade();
      unidadeAtual = i.unidade; subtotal = 0; qtdUnidade = 0;
      corpo += '<tr class="unidade"><td colspan="10">' + _esc_(unidadeAtual) + '</td></tr>';
    }
    subtotal += i.valor; qtdUnidade++;
    corpo += '<tr' + (i.acidente ? ' class="acidente"' : '') + '><td class="mono">' + _esc_(i.os) + '</td><td class="mono">' + _esc_(i.placa) +
      (i.acidente ? ' <span class="tag">acidente</span>' : '') + '</td><td>' + _esc_(i.modelo) + '</td><td>' + _esc_(i.oficina) +
      '</td><td class="c">' + _esc_(i.aprovacao) + '</td><td class="c">' + _esc_(i.conclusao) +
      '</td><td class="num">' + (i.pecas === null ? '—' : _moedaBR_(i.pecas)) + '</td><td class="num">' + (i.mo === null ? '—' : _moedaBR_(i.mo)) +
      '</td><td class="num forte">' + _moedaBR_(i.valor) + '</td><td class="c">' + _esc_(i.tipo) + '</td></tr>';
  });
  corpo += fechaUnidade();

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>' +
    '@page { size: A4 landscape; margin: 11mm 9mm; }' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #14181F; font-size: 8.5pt; margin: 0; }' +
    '.cab { display: table; width: 100%; border-bottom: 4px solid #F2B705; padding-bottom: 8px; margin-bottom: 10px; }' +
    '.cab > div { display: table-cell; vertical-align: middle; } .cab .marca { width: 70px; }' +
    '.cab h1 { margin: 0; font-size: 15pt; color: #0B2C5C; } .cab .org { font-size: 9pt; color: #5A6576; }' +
    '.cab .per { text-align: right; font-size: 10pt; font-weight: bold; color: #0B2C5C; }' +
    '.kpis { display: table; width: 100%; table-layout: fixed; border-spacing: 5px 0; margin-bottom: 8px; }' +
    '.kpi { display: table-cell; background: #F6F8FC; border-left: 3px solid #0B2C5C; padding: 6px 8px; }' +
    '.kpi .r { font-size: 7pt; text-transform: uppercase; color: #5A6576; } .kpi .v { font-size: 12pt; font-weight: bold; color: #0B2C5C; }' +
    '.aviso { background: #FDF3E7; border-left: 3px solid #B23A2E; padding: 8px 10px; font-size: 8.5pt; margin-bottom: 10px; }' +
    '.aviso b { color: #B23A2E; }' +
    'h2 { color: #0B2C5C; font-size: 11pt; margin: 12px 0 5px; border-bottom: 2px solid #F2B705; padding-bottom: 3px; }' +
    'h3 { color: #0B2C5C; font-size: 9.5pt; margin: 8px 0 4px; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }' +
    'th { background: #0B2C5C; color: #fff; text-align: left; padding: 4px 5px; font-size: 7.5pt; }' +
    'td { padding: 3px 5px; border-bottom: 1px solid #E3E8F0; font-size: 7.5pt; }' +
    'tr.unidade td { background: #E8EEFA; font-weight: bold; color: #0B2C5C; font-size: 8.5pt; }' +
    'tr.subtotal td { background: #EFF2F7; font-weight: bold; }' +
    'tr.acidente td { background: #FDECEA; }' +
    '.tag { background: #B23A2E; color: #fff; border-radius: 7px; padding: 0 5px; font-size: 6.5pt; }' +
    '.num { text-align: right; } .c { text-align: center; } .forte { font-weight: bold; } .mono { font-family: "Courier New", monospace; font-weight: bold; }' +
    'table.graf td { border: 0; padding: 2px 4px; } table.graf .rot { width: 38%; }' +
    'table.graf .bar { width: 42%; } table.graf .bar .preench { height: 11px; border-radius: 2px; }' +
    'table.graf .val { width: 20%; text-align: right; font-weight: bold; white-space: nowrap; }' +
    'table.faixa { table-layout: fixed; margin-bottom: 3px; } table.faixa td { height: 16px; border: 0; padding: 0; }' +
    '.legenda { font-size: 7.5pt; color: #5A6576; margin-bottom: 8px; }' +
    '.legenda span { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin: 0 3px 0 10px; }' +
    '.col2 { display: table; width: 100%; border-spacing: 8px 0; } .col2 > div { display: table-cell; width: 50%; vertical-align: top; }' +
    '.total { background: #0B2C5C; } .total td { background: #0B2C5C; color: #fff; font-size: 11pt; font-weight: bold; padding: 8px 12px; border: 0; }' +
    '.rodape { margin-top: 10px; border-top: 1px solid #E3E8F0; padding-top: 5px; font-size: 7pt; color: #5A6576; }' +
    '</style></head><body>' +
    '<div class="cab"><div class="marca">' + _brasaoHtml_() + '</div>' +
    '<div><h1>Relatório de Ordens de Serviço — Resumo</h1><div class="org">16ª Superintendência da Polícia Rodoviária Federal — Ceará</div></div>' +
    '<div class="per">Mês de Referência<br>' + _esc_(d.comp) + '</div></div>' +

    '<div class="kpis">' +
    '<div class="kpi"><div class="r">Valor total</div><div class="v">' + _moedaBR_(d.total) + '</div></div>' +
    '<div class="kpi"><div class="r">Ordens de serviço</div><div class="v">' + d.itens.length + '</div></div>' +
    '<div class="kpi"><div class="r">Viaturas</div><div class="v">' + Object.keys(d.itens.reduce((o, i) => { o[i.placa] = 1; return o; }, {})).length + '</div></div>' +
    '<div class="kpi"><div class="r">Valor médio por OS</div><div class="v">' + _moedaBR_(d.total / Math.max(1, d.itens.length)) + '</div></div>' +
    '<div class="kpi"><div class="r">Unidades</div><div class="v">' + Object.keys(d.porUnidade).length + '</div></div>' +
    (d.totalPecas || d.totalMo ? '<div class="kpi"><div class="r">Peças × mão de obra</div><div class="v" style="font-size:9.5pt">' +
      _moedaBR_(d.totalPecas) + ' · ' + _moedaBR_(d.totalMo) + '</div></div>' : '') +
    '</div>' +

    (Object.keys(d.acidentes).length ? '<div class="aviso"><b>Atenção — processo de acidente em aberto:</b> ' +
      _esc_(Object.keys(d.acidentes).map(k => k + (d.acidentes[k] ? ' (' + d.acidentes[k] + ')' : '')).join(' · ')) +
      '. O pagamento dessas ordens de serviço recebe tratamento distinto; confira antes de encaminhar.</div>' : '') +

    '<h2>Composição por tipo de aceite</h2>' + faixa +
    '<div class="col2"><div><h3>Por unidade</h3>' + barras(ordenar(d.porUnidade), '#0B2C5C') +
    '</div><div><h3>Por estabelecimento</h3>' + barras(ordenar(d.porOficina).slice(0, 10), '#2E6FD9') + '</div></div>' +

    '<h2>Ordens de serviço da competência</h2>' +
    '<table><thead><tr><th>OS</th><th>Placa</th><th>Modelo</th><th>Estabelecimento</th><th class="c">Aprovação</th><th class="c">Conclusão</th><th class="num">Peças</th><th class="num">Mão de obra</th><th class="num">Valor</th><th class="c">Aceite</th></tr></thead><tbody>' +
    corpo + '</tbody></table>' +
    '<table class="total"><tr><td>TOTAL GERAL</td><td class="num" style="text-align:right">' + _moedaBR_(d.total) + '</td></tr></table>' +
    '<div class="rodape">Gerado pelo Painel da Frota — 16ª SPRF/CE em ' + agora + ' por ' + _esc_(sessao.email) +
    '. Fontes: OrçamentosDB (peças, mão de obra e total), AceitesDB (unidade, modelo e tipo de aceite) e aba Acidentes.' +
    (d.duplicadas && d.duplicadas.length ? ' ' + d.duplicadas.length + ' ordem(ns) repetida(s) na base foram contadas uma única vez: ' + _esc_(d.duplicadas.slice(0, 12).join(', ')) + '.' : '') +
    (d.semEstabelecimento ? ' ' + d.semEstabelecimento + ' ordem(ns) sem estabelecimento.' : '') +
    (d.semTipo ? ' ' + d.semTipo + ' ordem(ns) sem tipo de aceite (importe os aceites da competência).' : '') + '</div>' +
    '</body></html>';
}


/** O que este servidor tem instalado — usado pelo painel para avisar quando o Codigo.gs está atrasado. */
function infoServidor(token) {
  const sessao = _sessao_(token);
  if (!sessao) return { expirado: true };
  const esperadas = ['gerarRelatorioAbastecimento', 'gerarRelatorioGlosa', 'gerarRelatorioPecas', 'gerarRelatorioAceites',
                     'importarBase', 'importarTituloAbast', 'importarDetalhamento', 'importarAceites', 'importarGlosaAnp',
                     'enfileirarAcoes', 'obterFila', 'salvarViatura', 'criarViatura'];
  const faltando = esperadas.filter(n => typeof globalThis[n] !== 'function');
  const abas = {}, erros = [];
  try {
    const ss = _ssManut_();
    [CONFIG.ABA_DETALHE, CONFIG.ABA_ACEITES, CONFIG.ABA_ORCAMENTOS].forEach(n => {
      const a = ss.getSheetByName(n); abas[n] = a ? a.getLastRow() : 0;
    });
  } catch (e) { erros.push('bases de manutenção na planilha-mãe: ' + String(e.message || e)); }
  try {
    const b = SpreadsheetApp.openById(CONFIG.ID_BASE);
    [CONFIG.ABA_ANP, CONFIG.ABA_RESUMO_GLOSA, CONFIG.ABA_ACIDENTES].forEach(n => {
      const a = b.getSheetByName(n); abas[n] = a ? a.getLastRow() : 0;
    });
  } catch (e) { erros.push('planilha de gestão: ' + String(e.message || e)); }
  return { ok: true, versao: CODIGO_VERSAO, faltando: faltando, abas: abas, erros: erros,
           conta: Session.getEffectiveUser().getEmail() };
}

/** Competências disponíveis em cada base — o painel usa para oferecer só o que existe. */
function competenciasDisponiveis(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const saida = { detalhamento: [], aceites: [], erro: '' };
  try {
    const ss = _ssManut_();
    const det = ss.getSheetByName(CONFIG.ABA_DETALHE);
    if (det && det.getLastRow() > 2) {
      const c = {};
      det.getRange(1, 30, det.getLastRow(), 1).getValues().forEach(l => { const k = _compSegura_(l[0]); if (k) c[k] = (c[k] || 0) + 1; });
      saida.detalhamento = Object.keys(c).sort().reverse().map(k => ({ comp: k, qtd: c[k] }));
    }
    const ace = ss.getSheetByName(CONFIG.ABA_ACEITES);
    if (ace && ace.getLastRow() > 2) {
      const valores = ace.getDataRange().getValues();
      const mapa = _mapaAceitesDb_(valores);
      const c = {};
      for (let r = mapa.linhaCab + 1; r < valores.length; r++) {
        const l = valores[r];
        const k = _compSegura_(mapa.idx.competencia >= 0 ? l[mapa.idx.competencia] : '') ||
                  _compSegura_(mapa.idx.conclusao >= 0 ? l[mapa.idx.conclusao] : '');
        if (k) c[k] = (c[k] || 0) + 1;
      }
      saida.aceites = Object.keys(c).sort().reverse().map(k => ({ comp: k, qtd: c[k] }));
    }
  } catch (e) { saida.erro = String(e.message || e); }
  return { ok: true, competencias: saida };
}

/** Diagnóstico das bases dos relatórios de OS — rode no editor. */
function diagnosticarRelatorios() {
  const ss = _ssManut_();
  ['ABA_DETALHE', 'ABA_ACEITES', 'ABA_ORCAMENTOS'].forEach(k => {
    const nome = CONFIG[k];
    const aba = ss.getSheetByName(nome);
    if (!aba) { Logger.log(nome + ': ABA NÃO ENCONTRADA'); return; }
    const linhas = aba.getLastRow(), cols = aba.getLastColumn();
    Logger.log('--- ' + nome + ': ' + linhas + ' linhas, ' + cols + ' colunas');
    if (linhas < 1) return;
    const amostra = aba.getRange(1, 1, Math.min(4, linhas), Math.min(cols, 35)).getDisplayValues();
    amostra.forEach((l, n) => Logger.log('   linha ' + (n + 1) + ': ' + l.map((c, i) => (i + 1) + '=' + String(c).substring(0, 16)).filter(x => !/=$/.test(x)).join(' | ')));
  });
  // competências disponíveis no detalhamento
  const det = ss.getSheetByName(CONFIG.ABA_DETALHE);
  if (det && det.getLastRow() > 1) {
    const comp = {};
    det.getRange(2, 30, det.getLastRow() - 1, 1).getValues().forEach(l => {
      const c = _compSegura_(l[0]);
      if (c) comp[c] = (comp[c] || 0) + 1;
    });
    Logger.log('Competências no DetalhamentoDB (coluna AD): ' + (Object.keys(comp).length ? Object.keys(comp).sort().map(k => k + ' (' + comp[k] + ')').join(', ') : 'NENHUMA reconhecida'));
  }
  const ace = ss.getSheetByName(CONFIG.ABA_ACEITES);
  if (ace && ace.getLastRow() > 1) {
    const mapa = _mapaAceitesDb_(ace.getDataRange().getValues());
    Logger.log('AceitesDB: colunas reconhecidas ' + (mapa.porNome ? 'pelo cabeçalho' : 'por posição (reserva)') + ' → ' + JSON.stringify(mapa.idx));
  }
  const acid = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_ACIDENTES);
  Logger.log('Acidentes: ' + (acid ? acid.getLastRow() + ' linhas | placas em aberto: ' + Object.keys(_placasComAcidenteAberto_()).join(', ') : 'aba não encontrada'));
}

/* ============================================================
   PROCESSO DE PAGAMENTO (Ticket Log)
   Traz para o painel o que era feito na planilha "Frota 16ª SPRF -
   Pagamentos": os dados do título da competência, o roteiro de
   providências, o controle do que já foi feito e a geração do
   despacho, do relatório e do termo de atesto a partir dos modelos.
   ============================================================ */

const PROC = {
  Abastecimento: {
    aba: 'Títulos Abast.', cols: 18,
    // campo curto → rótulo da coluna
    campos: {
      titulo: 'Título', nf: 'Nota Fiscal', bruto: 'Valor Bruto', juros: 'Juros',
      emissao: 'Data de Emissão', vencimento: 'Data de Vencimento', competencia: 'Competência',
      notaPagamento: 'Nota de Pagamento', sei: 'Processo SEI', desconto: 'Desconto Contratual 4,67%',
      glosaIMR: 'Glosa IMR', glosaPrecos: 'Glosa Preços Abusivos',
      seiAtesto: 'SEI Atesto Abastecimento', seiRelatorio: 'SEI Relatório Abastecimento',
      seiNF: 'SEI NF', seiRelGlosa: 'SEI Relatório Glosa', seiIMR: 'SEI IMR Abastecimento',
      chave: 'Chave de Acesso'
    },
    // colunas com fórmula na planilha — o painel nunca grava nelas
    somenteLeitura: ['desconto', 'glosaPrecos'],
    roteiroCols: { numero: 25, rotulo: 26, valor: 27 },   // Z, AA, AB (1-based)
    grupos: [
      ['Identificação', ['titulo', 'nf', 'competencia', 'chave']],
      ['Valores', ['bruto', 'desconto', 'glosaIMR', 'glosaPrecos', 'outrosDescontos', 'juros']],
      ['Datas', ['emissao', 'vencimento']],
      ['Processo', ['sei', 'notaPagamento', 'seiNF', 'seiAtesto', 'seiRelatorio', 'seiRelGlosa', 'seiIMR']]
    ],
    dinheiro: ['bruto', 'desconto', 'glosaIMR', 'glosaPrecos', 'outrosDescontos', 'juros'],
    opcionais: { outrosDescontos: 'Outros Descontos' },
    colunaReserva: {}
  },
  'Manutenção': {
    aba: 'Títulos Manut.', cols: 19,
    campos: {
      titulo: 'Título', nf: 'Nota Fiscal', bruto: 'Valor Bruto', pecas: 'Valor em Peças',
      mo: 'Valor Mão de Obra', pecasAcid: 'Valor em Peças (Acidente)', moAcid: 'Valor Mão de Obra (Acidente)',
      juros: 'Juros', emissao: 'Data de Emissão', vencimento: 'Data de Vencimento',
      competencia: 'Competência', notaPagamento: 'Nota de Pagamento', glosaIMR: 'Glosa IMR',
      sei: 'Processo SEI', seiNF: 'SEI NF', seiIMR: 'SEI IMR Manutenção',
      seiAtesto: 'SEI Atesto Manutenção', seiRelatorio: 'SEI Relatório Manutenção', chave: 'Chave de Acesso'
    },
    somenteLeitura: [],
    roteiroCols: { numero: 27, rotulo: 28, valor: 29 },   // AA, AB, AC
    grupos: [
      ['Identificação', ['titulo', 'nf', 'competencia', 'chave']],
      ['Valores', ['bruto', 'pecas', 'mo', 'pecasAcid', 'moAcid', 'glosaIMR', 'outrosDescontos', 'juros']],
      ['Datas', ['emissao', 'vencimento']],
      ['Processo', ['sei', 'notaPagamento', 'seiNF', 'seiAtesto', 'seiRelatorio', 'seiIMR']]
    ],
    dinheiro: ['bruto', 'pecas', 'mo', 'pecasAcid', 'moAcid', 'glosaIMR', 'outrosDescontos', 'juros'],
    opcionais: { outrosDescontos: 'Outros Descontos' },
    colunaReserva: { outrosDescontos: 20 }   // coluna T da aba Títulos Manut.
  }
};

function _colunasTitulos_(def) {
  let n = def.cols;
  Object.keys(def.colunaReserva || {}).forEach(k => { n = Math.max(n, def.colunaReserva[k]); });
  return n;
}

function _abaTitulos_(tipo) {
  const def = PROC[tipo];
  if (!def) throw new Error('Tipo inválido: ' + tipo);
  const aba = SpreadsheetApp.openById(CONFIG.ID_TITULOS).getSheetByName(def.aba);
  if (!aba) throw new Error('Aba "' + def.aba + '" não encontrada na planilha de pagamentos.');
  return { def: def, aba: aba };
}

/** Linha de cabeçalho (é a 2 nas duas abas, mas procuramos por segurança). */
function _cabTitulos_(aba, def) {
  const valores = aba.getRange(1, 1, Math.min(6, aba.getLastRow()), Math.max(_colunasTitulos_(def), aba.getLastColumn())).getValues();
  for (let i = 0; i < valores.length; i++) {
    if (valores[i].some(c => String(c).trim() === 'Título')) {
      const cab = valores[i].map(c => String(c || '').trim());
      const chave = t => _normCab_(t);
      const normalizado = cab.map(chave);
      const achar = rotulo => {
        const exato = cab.indexOf(rotulo);
        if (exato >= 0) return exato;
        return normalizado.indexOf(chave(rotulo));    // ignora maiúsculas e acentos
      };
      const col = {};
      Object.keys(def.campos).forEach(k => { col[k] = achar(def.campos[k]); });
      Object.keys(def.opcionais || {}).forEach(k => {
        let c = achar(def.opcionais[k]);
        // reserva: coluna conhecida, usada quando o cabeçalho estiver escrito de outro jeito
        if (c < 0 && def.colunaReserva && def.colunaReserva[k]) {
          const fixa = def.colunaReserva[k] - 1;
          if (fixa < cab.length && (!cab[fixa] || /desconto/i.test(cab[fixa]))) c = fixa;
        }
        if (c >= 0) col[k] = c;
      });
      return { linha: i + 1, cab: cab, col: col };
    }
  }
  throw new Error('Cabeçalho não encontrado na aba ' + aba.getName());
}

/** Lê o roteiro que fica nas colunas laterais da aba (Ação / Método / Nome do arquivo / links). */
function _lerRoteiro_(aba, def) {
  const c = def.roteiroCols;
  const nLin = aba.getLastRow();
  if (nLin < 2) return [];
  const bloco = aba.getRange(1, c.numero, nLin, 3).getValues();
  const etapas = [];
  let atual = null;
  bloco.forEach(linha => {
    const numero = String(linha[0] || '').trim();
    const rotulo = String(linha[1] || '').trim();
    const valor = String(linha[2] || '').trim();
    if (/^\d+$/.test(numero)) { atual = { numero: parseInt(numero, 10), acao: '', itens: [] }; etapas.push(atual); }
    if (!atual) return;
    if (/^A[çc][ãa]o/i.test(rotulo)) atual.acao = valor;
    else if (rotulo || valor) atual.itens.push({ rotulo: rotulo.replace(/:$/, ''), valor: valor, link: /^https?:\/\//i.test(valor) });
  });
  return etapas.filter(e => e.acao || e.itens.length);
}

/** Dados do título de uma competência + roteiro + tabelas + controle. */
function lerProcessoPagamento(token, tipo, competencia) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const { def, aba } = _abaTitulos_(tipo);
    const cab = _cabTitulos_(aba, def);
    const nLin = aba.getLastRow();
    const nCols = Math.max(_colunasTitulos_(def), aba.getLastColumn());
    const valores = aba.getRange(cab.linha + 1, 1, Math.max(1, nLin - cab.linha), nCols).getValues();
    const comps = [];
    let linhaAlvo = -1, dados = null;

    valores.forEach((l, i) => {
      const comp = _compSegura_(l[cab.col.competencia]);
      if (!comp) return;
      comps.push(comp);
      if (competencia && comp === competencia) { linhaAlvo = cab.linha + 1 + i; dados = l; }
    });
    const chave = c => c.substring(3) + c.substring(0, 2);   // AAAAMM, para ordenar de verdade
    const disponiveis = comps.filter((c, i) => comps.indexOf(c) === i).sort((a, b) => chave(b).localeCompare(chave(a)));
    const hoje = new Date();
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const sugerida = ('0' + (anterior.getMonth() + 1)).slice(-2) + '/' + anterior.getFullYear();
    const padrao = disponiveis.indexOf(sugerida) >= 0 ? sugerida : (disponiveis[0] || '');
    if (!competencia) return { ok: true, competencias: disponiveis, sugerida: padrao, roteiro: _lerRoteiro_(aba, def) };
    if (!dados) return { ok: false, erro: 'Competência ' + competencia + ' não encontrada em ' + def.aba + '.', competencias: disponiveis, sugerida: padrao };

    const linkNota = _linkNotaDaLinha_(aba, cab, dados, tipo, competencia);
    const titulo = {}, rotulos = {};
    const todos = Object.keys(def.campos).concat(Object.keys(def.opcionais || {}).filter(k => cab.col[k] >= 0));
    todos.forEach(k => {
      rotulos[k] = def.campos[k] || def.opcionais[k];
      const c = cab.col[k];
      if (c === undefined || c < 0) { titulo[k] = ''; return; }
      const v = dados[c];
      titulo[k] = (v instanceof Date) ? _dataTxt_(v) : (typeof v === 'number' ? v : String(v === null || v === undefined ? '' : v).trim());
    });
    titulo._linha = linhaAlvo;
    // grupos, sem os campos que não existem nesta planilha
    const grupos = (def.grupos || []).map(g => [g[0], g[1].filter(k => todos.indexOf(k) >= 0)]).filter(g => g[1].length);

    return { ok: true, tipo: tipo, competencia: competencia, competencias: disponiveis,
      sugerida: padrao, linkNota: linkNota, titulo: titulo, somenteLeitura: def.somenteLeitura, rotulos: rotulos, grupos: grupos, dinheiro: def.dinheiro,
      modelos: Object.keys((_modelosPagamento_() || {})[tipo] || {}).map(n => ({ nome: n, url: 'https://docs.google.com/document/d/' + _modelosPagamento_()[tipo][n] + '/edit' })),
      pastaModelos: CONFIG.PASTA_MODELOS_PAGAMENTO ? 'https://drive.google.com/drive/folders/' + CONFIG.PASTA_MODELOS_PAGAMENTO : '',
      pastaSaida: CONFIG.PASTA_DOCS_PAGAMENTO ? 'https://drive.google.com/drive/folders/' + CONFIG.PASTA_DOCS_PAGAMENTO : '',
      roteiro: _lerRoteiro_(aba, def), etapasFeitas: _etapasFeitas_(tipo, competencia),
      resumo: _resumoProcesso_(tipo, titulo), serie: _serieContratual_(tipo, cab, valores) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Link do PDF da nota: o gravado na planilha ou, na falta, o arquivo na pasta. */
function _linkNotaDaLinha_(aba, cab, dados, tipo, competencia) {
  const col = cab.cab.map(c => _normCab_(c)).findIndex(c => c === 'LINK NF' || c === 'NF PDF' || c === 'ARQUIVO NF');
  if (col >= 0 && dados[col] && /^https?:\/\//i.test(String(dados[col]))) return String(dados[col]);
  if (!CONFIG.PASTA_NOTAS_FISCAIS) return '';
  try {
    const prefixo = 'NF ' + tipo + ' ' + String(competencia || '').replace('/', '-');
    const arquivos = DriveApp.getFolderById(CONFIG.PASTA_NOTAS_FISCAIS).getFiles();
    while (arquivos.hasNext()) {
      const f = arquivos.next();
      if (f.getName().indexOf(prefixo) === 0) return f.getUrl();
    }
  } catch (e) { Logger.log('Busca da NF: ' + e); }
  return '';
}

/** Composição do valor e os textos por extenso, como no termo de atesto. */
function _resumoProcesso_(tipo, t) {
  const n = x => _num_(x) || 0;
  if (tipo === 'Abastecimento') {
    const bruto = n(t.bruto), desconto = n(t.desconto), imr = n(t.glosaIMR), precos = n(t.glosaPrecos), outros = n(t.outrosDescontos);
    const liquido = Math.round((bruto - desconto - imr - precos - outros) * 100) / 100;
    const linhas = [['(+) Valor bruto da Nota Fiscal', bruto], ['(-) Desconto contratual (4,67%)', desconto],
                    ['(-) Glosa do IMR', imr], ['(-) Glosa de preços abusivos', precos],
                    ['(-) Outros descontos', outros],
                    ['(=) Valor líquido após desconto e glosas', liquido]];
    return { bruto: bruto, desconto: desconto, glosaIMR: imr, glosaPrecos: precos, outros: outros, liquido: liquido, linhas: linhas };
  }
  const pecas = n(t.pecas), mo = n(t.mo), pecasAcid = n(t.pecasAcid), moAcid = n(t.moAcid);
  const bruto = n(t.bruto) || Math.round((pecas + mo + pecasAcid + moAcid) * 100) / 100;
  const imr = n(t.glosaIMR), outros = n(t.outrosDescontos);
  const liquido = Math.round((bruto - imr - outros) * 100) / 100;
  const linhas = [['(+) Peças (Manutenção)', pecas], ['(+) Mão de obra/Serviços (Manutenção)', mo],
                  ['(+) Peças (Acidente)', pecasAcid], ['(+) Mão de obra/Serviços (Acidente)', moAcid],
                  ['(=) Valor bruto da NF', bruto], ['(-) Glosa (IMR)', imr],
                  ['(-) Outros descontos', outros],
                  ['(=) Valor líquido após glosa', liquido]];
  return { bruto: bruto, pecas: pecas, mo: mo, pecasAcid: pecasAcid, moAcid: moAcid, glosaIMR: imr, outros: outros, liquido: liquido, linhas: linhas };
}

/** Série usada na tabela de execução contratual do relatório (12 competências). */
function _serieContratual_(tipo, cab, valores) {
  const linhas = [];
  valores.forEach(l => {
    const comp = _compSegura_(l[cab.col.competencia]);
    if (!comp) return;
    linhas.push({ comp: comp, nf: String(l[cab.col.nf] || '').trim(),
      notaPagamento: String(l[cab.col.notaPagamento] || '').trim(), bruto: _num_(l[cab.col.bruto]) || 0 });
  });
  linhas.sort((a, b) => (a.comp.substring(3) + a.comp.substring(0, 2)).localeCompare(b.comp.substring(3) + b.comp.substring(0, 2)));
  const total = linhas.reduce((s, x) => s + x.bruto, 0);
  return { linhas: linhas.slice(-12), totalAcumulado: Math.round(total * 100) / 100 };
}

/** Grava alterações no título. Colunas com fórmula são recusadas. */
function salvarTituloPagamento(token, tipo, competencia, campos) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const { def, aba } = _abaTitulos_(tipo);
    const cab = _cabTitulos_(aba, def);
    const nLin = aba.getLastRow();
    const valores = aba.getRange(cab.linha + 1, 1, Math.max(1, nLin - cab.linha), Math.max(_colunasTitulos_(def), aba.getLastColumn())).getValues();
    let linha = -1;
    valores.forEach((l, i) => { if (_compSegura_(l[cab.col.competencia]) === competencia) linha = cab.linha + 1 + i; });
    if (linha < 0) return { ok: false, erro: 'Competência não encontrada.' };

    const gravados = [], recusados = [];
    Object.keys(campos || {}).forEach(k => {
      const col = cab.col[k];
      if (col === undefined || col < 0) { recusados.push(k); return; }
      if (def.somenteLeitura.indexOf(k) >= 0) { recusados.push(def.campos[k] + ' (fórmula)'); return; }
      const celula = aba.getRange(linha, col + 1);
      if (celula.getFormula()) { recusados.push(def.campos[k] + ' (fórmula)'); return; }
      const bruto = campos[k];
      const numerico = (def.dinheiro || []).indexOf(k) >= 0;
      celula.setValue(numerico ? (bruto === '' ? '' : _num_(bruto)) : String(bruto === null || bruto === undefined ? '' : bruto));
      gravados.push(def.campos[k]);
    });
    SpreadsheetApp.flush();
    if (gravados.length) { limparCache(); _logAcao_(p.ss, p.sessao.email, 'Editar título ' + tipo, competencia, gravados.join(', '), ''); }
    return { ok: true, gravados: gravados, recusados: recusados };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/* ---------------- controle das etapas ---------------- */
function _abaControle_() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_TITULOS);
  let aba = ss.getSheetByName(CONFIG.ABA_CONTROLE_PROC);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_CONTROLE_PROC);
    aba.appendRow(['Tipo', 'Competência', 'Etapa', 'Concluída em', 'Por']);
    aba.setFrozenRows(1);
  }
  return aba;
}
function _etapasFeitas_(tipo, competencia) {
  const aba = _abaControle_();
  if (aba.getLastRow() < 2) return {};
  const mapa = {};
  aba.getRange(2, 1, aba.getLastRow() - 1, 5).getValues().forEach(l => {
    if (String(l[0]) === tipo && _compSegura_(l[1]) === competencia) mapa[String(l[2])] = { em: _dataTxt_(l[3]), por: String(l[4]) };
  });
  return mapa;
}
function marcarEtapaProcesso(token, tipo, competencia, etapa, feito) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Controle ocupado.' }; }
  try {
    const aba = _abaControle_();
    const n = aba.getLastRow();
    let linha = -1;
    if (n > 1) {
      const v = aba.getRange(2, 1, n - 1, 3).getValues();
      v.forEach((l, i) => { if (String(l[0]) === tipo && _compSegura_(l[1]) === competencia && String(l[2]) === String(etapa)) linha = i + 2; });
    }
    if (feito) {
      const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
      if (linha > 0) aba.getRange(linha, 4, 1, 2).setValues([[agora, p.sessao.email]]);
      else aba.appendRow([tipo, competencia, String(etapa), agora, p.sessao.email]);
    } else if (linha > 0) aba.deleteRow(linha);
    SpreadsheetApp.flush();
    return { ok: true, etapasFeitas: _etapasFeitas_(tipo, competencia) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/* ---------------- geração dos documentos ---------------- */

/** Parâmetros {{chave}} calculados a partir do título — substituem a aba Parâmetros. */
function _parametrosPagamento_(tipo, t, resumo, competencia) {
  const moeda = v => _decBR_(v);
  const extenso = v => reaisPorExtenso(Number(v) || 0);
  const par = { '{{competencia}}': competencia };
  if (tipo === 'Abastecimento') {
    Object.assign(par, {
      '{{notafiscalabastecimento}}': String(t.nf || ''),
      '{{datadaemissaoabastecimento}}': String(t.emissao || ''),
      '{{valodanotaabastecimento}}': moeda(resumo.bruto),
      '{{valordanotaextensoabastecimento}}': extenso(resumo.bruto),
      '{{vencimentoabastecimento}}': String(t.vencimento || ''),
      '{{notadepagamentoabastecimento}}': String(t.notaPagamento || ''),
      '{{valorglosaabastecimento}}': moeda(resumo.glosaPrecos),
      '{{valorextensoglosaabastecimento}}': extenso(resumo.glosaPrecos),
      '{{valorglosaimrabastecimento}}': moeda(resumo.glosaIMR),
      '{{valorglosaprecoabusivoabastecimento}}': moeda(resumo.glosaPrecos),
      '{{percentualdescontoabastecimento}}': '4,67%',
      '{{valordescontoabastecimento}}': moeda(resumo.desconto),
      '{{outrosdescontosabastecimento}}': moeda(resumo.outros || 0),
      '{{valorliquidoabastecimento}}': moeda(resumo.liquido),
      '{{valorextensoliquidoabastecimento}}': extenso(resumo.liquido),
      '{{houveglosaabastecimento}}': resumo.glosaPrecos > 0 ? 'Sim' : 'Não',
      '{{seiatestoabastecimento}}': String(t.seiAtesto || ''),
      '{{seirelatorioabastecimento}}': String(t.seiRelatorio || ''),
      '{{seinotafiscalabastecimentol}}': String(t.seiNF || ''),
      '{{seinotafiscalabastecimento}}': String(t.seiNF || ''),
      '{{seirelatorioglosaabastecimento}}': String(t.seiRelGlosa || ''),
      '{{seiticketimrabastecimento}}': String(t.seiIMR || '')
    });
  } else {
    Object.assign(par, {
      '{{notafiscalmanutencao}}': String(t.nf || ''),
      '{{datadaemissaomanutencao}}': String(t.emissao || ''),
      '{{valodanotamanutencao}}': moeda(resumo.bruto),
      '{{valordanotaextensomanutencao}}': extenso(resumo.bruto),
      '{{notadepagamentomanutencao}}': String(t.notaPagamento || ''),
      '{{vencimentomanutencao}}': String(t.vencimento || ''),
      '{{valorpecasmanutencao}}': moeda(resumo.pecas),
      '{{valormaodeobramanutencao}}': moeda(resumo.mo),
      '{{valorglosaimrmanutencao}}': moeda(resumo.glosaIMR),
      '{{outrosdescontosmanutencao}}': moeda(resumo.outros || 0),
      '{{valorliquidomanutencao}}': moeda(resumo.liquido),
      '{{valorextensoliquidomanutencao}}': extenso(resumo.liquido),
      '{{seiatestomanutencao}}': String(t.seiAtesto || ''),
      '{{seirelatoriomanutencao}}': String(t.seiRelatorio || ''),
      '{{seinotafiscalmanutencao}}': String(t.seiNF || ''),
      '{{seiticketimrmanutencao}}': String(t.seiIMR || '')
    });
  }
  return par;
}

/** Preenche as tabelas do documento casando pelo rótulo da primeira coluna. */
function _preencherTabelas_(corpo, resumo, serie) {
  let ajustadas = 0;
  const naoCasaram = [];
  const normaliza = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const porRotulo = {};
  resumo.linhas.forEach(l => { porRotulo[normaliza(l[0])] = l[1]; });
  // o modelo pode escrever o rótulo de outra forma; aceitamos variações
  const sinonimos = {
    'outros descontos': ['(-) outros descontos', 'outros descontos', 'outras deducoes', '(-) outras deducoes'],
    'glosa (imr)': ['(-) glosa (imr)', 'glosa imr', '(-) glosa do imr', 'glosa do imr', '(-) glosa imr'],
    'glosa do imr': ['(-) glosa do imr', 'glosa imr', 'glosa (imr)', '(-) glosa (imr)'],
    // faltava: o modelo escreve este rótulo de várias formas e a célula ficava com o valor do modelo
    'glosa de precos abusivos': ['(-) glosa de precos abusivos', 'glosa de precos abusivos',
      'glosa precos abusivos', '(-) glosa precos abusivos', 'glosa de preco abusivo',
      'glosa por precos abusivos', '(-) glosa por precos abusivos', 'glosa de precos',
      'glosa de abastecimento', '(-) glosa de abastecimento'],
    'desconto contratual': ['(-) desconto contratual', 'desconto contratual', 'desconto contratual (4,67%)',
      '(-) desconto contratual (4,67%)', 'desconto 4,67%'],
    'valor bruto da nota fiscal': ['(+) valor bruto da nota fiscal', 'valor bruto da nota fiscal',
      'valor bruto da nf', '(+) valor bruto da nf', 'valor bruto'],
    'valor liquido apos glosa': ['(=) valor liquido apos glosa', 'valor liquido'],
    'valor liquido apos desconto e glosas': ['(=) valor liquido apos desconto e glosas', 'valor liquido']
  };
  Object.keys(sinonimos).forEach(base => {
    const achado = Object.keys(porRotulo).find(k => k.indexOf(base) >= 0);
    if (achado === undefined) return;
    sinonimos[base].forEach(alt => { if (porRotulo[alt] === undefined) porRotulo[alt] = porRotulo[achado]; });
  });

  /** Último recurso: casa pelas palavras marcantes do rótulo. */
  const porAproximacao = rotulo => {
    const palavras = rotulo.replace(/[()+=-]/g, ' ').split(/\s+/).filter(x => x.length > 3);
    if (!palavras.length) return undefined;
    const candidatos = Object.keys(porRotulo).filter(k => {
      const kp = k.replace(/[()+=-]/g, ' ');
      return palavras.every(w => kp.indexOf(w) >= 0);
    });
    return candidatos.length === 1 ? porRotulo[candidatos[0]] : undefined;   // só quando não houver dúvida
  };

  const tabelas = corpo.getTables();
  for (let t = 0; t < tabelas.length; t++) {
    const tab = tabelas[t];
    for (let r = 0; r < tab.getNumRows(); r++) {
      const linha = tab.getRow(r);
      if (linha.getNumCells() < 2) continue;
      const rotulo = normaliza(linha.getCell(0).getText());
      let valor = porRotulo[rotulo];
      if (valor === undefined) valor = porAproximacao(rotulo);
      if (valor === undefined) {
        // registra só as linhas que parecem de valor — as demais são texto do documento
        const ultima = linha.getCell(linha.getNumCells() - 1).getText();
        if (rotulo && /r\$|\d+[.,]\d{2}/i.test(ultima)) {
          naoCasaram.push(linha.getCell(0).getText().trim() + ' → ' + ultima.trim());
        }
        continue;
      }
      const celula = linha.getCell(linha.getNumCells() - 1);
      const texto = celula.getText();
      const formatado = (texto.indexOf('R$') >= 0 ? 'R$ ' : '') + _decBR_(valor);
      celula.editAsText().setText(formatado);
      ajustadas++;
    }
    // tabela de execução contratual: cabeçalho com "MÊS DE REFERÊNCIA"
    const cabecalho = normaliza(tab.getRow(0).getCell(0).getText());
    if (serie && serie.linhas.length && /mes de referencia/.test(cabecalho) && tab.getNumRows() > 2) {
      const total = serie.linhas.reduce((s, x) => s + x.bruto, 0) || 1;
      for (let r = 1; r < tab.getNumRows(); r++) {
        const linha = tab.getRow(r);
        const item = serie.linhas[r - 1];
        if (!item || linha.getNumCells() < 4) continue;
        const primeiro = normaliza(linha.getCell(0).getText());
        if (/saldo|valor do contrato/.test(primeiro)) continue;
        linha.getCell(0).editAsText().setText(item.comp);
        linha.getCell(1).editAsText().setText(item.nf);
        linha.getCell(2).editAsText().setText(item.notaPagamento);
        linha.getCell(3).editAsText().setText('R$ ' + _decBR_(item.bruto));
        if (linha.getNumCells() > 4) linha.getCell(4).editAsText().setText(_decBR_(item.bruto / total * 100) + '%');
        ajustadas++;
      }
    }
  }
  if (naoCasaram.length) Logger.log('Rótulos sem correspondência: ' + naoCasaram.join(' | '));
  return { ajustadas: ajustadas, naoCasaram: naoCasaram,
           disponiveis: resumo.linhas.map(l => String(l[0]) + ' = ' + _decBR_(l[1])) };
}



/**
 * PREPARA TUDO do processo de pagamento, numa única execução:
 *   1. copia os seis modelos para a pasta de modelos e passa a usar as cópias;
 *   2. atualiza na planilha os links dos modelos e da pasta;
 *   3. garante a linha "Outros descontos" nas tabelas dos termos de atesto;
 *   4. confere se a coluna "Outros Descontos" existe nas abas de títulos.
 * Pode rodar quantas vezes quiser: cada passo verifica antes de agir.
 */
function prepararProcessoPagamento() {
  Logger.log('===== 1. MODELOS =====');
  migrarModelosPagamento();

  Logger.log('===== 2. LINKS NA PLANILHA =====');
  atualizarLinksModelosPagamento();

  Logger.log('===== 3. TABELAS DOS MODELOS (somente conferência) =====');
  ajustarTabelasModelosPagamento(false);

  Logger.log('===== 4. COLUNA "OUTROS DESCONTOS" =====');
  conferirColunaOutrosDescontos();

  Logger.log('===== FIM — confira os avisos acima =====');
  return 'Preparação concluída.';
}

/**
 * Confere a tabela dos termos de atesto e lista as linhas que ela tem hoje.
 * Só altera o documento se você chamar com aplicar = true:
 *     ajustarTabelasModelosPagamento(true)
 * Assim não há risco de duplicar uma linha que já exista com outro nome.
 */
function ajustarTabelasModelosPagamento(aplicar) {
  const modelos = _modelosPagamento_();
  const normaliza = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  Object.keys(modelos).forEach(tipo => {
    Object.keys(modelos[tipo]).forEach(nome => {
      if (!/atesto/i.test(nome)) return;
      try {
        const doc = DocumentApp.openById(modelos[tipo][nome]);
        const corpo = doc.getBody();
        const tabelas = corpo.getTables();
        let mexeu = false;
        for (let t = 0; t < tabelas.length; t++) {
          const tab = tabelas[t];
          let temOutros = false, linhaLiquido = -1;
          for (let r = 0; r < tab.getNumRows(); r++) {
            const rotulo = normaliza(tab.getRow(r).getCell(0).getText());
            if (rotulo.indexOf('outros descontos') >= 0) temOutros = true;
            if (rotulo.indexOf('valor liquido') >= 0 && linhaLiquido < 0) linhaLiquido = r;
          }
          // relatório do que foi encontrado, para você decidir
          const rotulos = [];
          for (let r = 0; r < tab.getNumRows(); r++) rotulos.push(tab.getRow(r).getCell(0).getText().trim());
          Logger.log('   ' + nome + ' — linhas da tabela: ' + rotulos.filter(Boolean).join(' | '));
          if (temOutros) { Logger.log('     já contém "Outros descontos".'); continue; }
          if (linhaLiquido < 1) { Logger.log('     não achei a linha de valor líquido; nada a fazer.'); continue; }
          if (!aplicar) { Logger.log('     FALTA a linha "Outros descontos". Para inserir, rode ajustarTabelasModelosPagamento(true).'); continue; }
          // copia a linha anterior para manter a formatação e troca o conteúdo
          const modeloLinha = tab.getRow(linhaLiquido - 1).copy();
          const nova = tab.insertTableRow(linhaLiquido, modeloLinha);
          nova.getCell(0).editAsText().setText('(-) Outros descontos');
          for (let cl = 1; cl < nova.getNumCells(); cl++) {
            const atual = nova.getCell(cl).getText();
            nova.getCell(cl).editAsText().setText(atual.indexOf('R$') >= 0 ? 'R$ 0,00' : (cl === nova.getNumCells() - 1 ? '0,00' : ''));
          }
          mexeu = true;
          Logger.log('   ' + nome + ': linha "Outros descontos" inserida antes do valor líquido.');
        }
        doc.saveAndClose();
        if (mexeu) Logger.log('   ' + nome + ': documento salvo com a linha nova.');
      } catch (e) {
        Logger.log('   ' + nome + ': FALHOU — ' + String(e).substring(0, 140));
      }
    });
  });
}

/**
 * Confere se existe a coluna "Outros Descontos" nas abas de títulos.
 * Nunca cria nem move nada: as tabelas do relatório e do atesto e os roteiros
 * ficam à direita, e inserir coluna deslocaria tudo.
 */
function conferirColunaOutrosDescontos() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_TITULOS);
  Object.keys(PROC).forEach(tipo => {
    const def = PROC[tipo];
    const aba = ss.getSheetByName(def.aba);
    if (!aba) { Logger.log('   ' + def.aba + ': aba não encontrada'); return; }
    const cab = _cabTitulos_(aba, def);
    const existe = cab.cab.indexOf('Outros Descontos') >= 0;
    if (existe) { Logger.log('   ' + def.aba + ': coluna presente — o painel já usa.'); return; }
    const ultima = def.cols;   // A:R no abastecimento, A:S na manutenção
    Logger.log('   ' + def.aba + ': sem a coluna. Para usar, escreva "Outros Descontos" no cabeçalho (linha ' +
      cab.linha + ') de uma coluna livre — sugestão: a primeira à direita da coluna ' +
      _letraColuna_(ultima) + ' que não pertença às tabelas do relatório ou do atesto.');
  });
}

function _letraColuna_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/**
 * Copia os seis modelos do processo de pagamento para a pasta de modelos e
 * passa a usar as cópias. Rode uma vez no editor; se já houver cópia com o
 * mesmo nome na pasta, ela é reaproveitada.
 *
 * Os novos IDs ficam guardados em PropertiesService (MODELOS_PAGAMENTO), então
 * não é preciso editar o Codigo.gs depois.
 */
function migrarModelosPagamento() {
  const destino = DriveApp.getFolderById(CONFIG.PASTA_MODELOS_PAGAMENTO);
  const atuais = _modelosPagamento_();
  const novos = {};
  Object.keys(atuais).forEach(tipo => {
    novos[tipo] = {};
    Object.keys(atuais[tipo]).forEach(nome => {
      const id = atuais[tipo][nome];
      try {
        const original = DriveApp.getFileById(id);
        let copia = null;
        const iguais = destino.getFilesByName(original.getName());
        if (iguais.hasNext()) { copia = iguais.next(); Logger.log(nome + ': já existia na pasta'); }
        else { copia = original.makeCopy(original.getName(), destino); Logger.log(nome + ': copiado'); }
        try { copia.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
        novos[tipo][nome] = copia.getId();
        Logger.log('   ' + id + ' → ' + copia.getId());
      } catch (e) {
        novos[tipo][nome] = id;
        Logger.log(nome + ': FALHOU — ' + String(e).substring(0, 120));
      }
    });
  });
  PropertiesService.getScriptProperties().setProperty('MODELOS_PAGAMENTO', JSON.stringify(novos));
  Logger.log('Modelos do pagamento agora vêm da pasta ' + destino.getName() + '.');
  Logger.log('Os originais continuam onde estavam; para voltar atrás, apague a propriedade MODELOS_PAGAMENTO.');
  return 'OK';
}


/**
 * Atualiza, na planilha de pagamentos, os links dos modelos e da pasta para
 * apontarem para as cópias migradas.
 *   Títulos Manut.: AC52:AC55   |   Títulos Abast.: AA63:AA66
 * Troca o ID dentro do link (valor ou fórmula HIPERLINK), preservando o texto.
 * Rode depois de migrarModelosPagamento().
 */
function atualizarLinksModelosPagamento() {
  const antigos = CONFIG.MODELOS_PAGAMENTO, novos = _modelosPagamento_();
  const mapa = {};
  Object.keys(antigos).forEach(tipo => {
    Object.keys(antigos[tipo]).forEach(nome => {
      const de = antigos[tipo][nome], para = (novos[tipo] || {})[nome];
      if (para && para !== de) mapa[de] = para;
    });
  });
  if (CONFIG.PASTA_DOCS_PAGAMENTO && CONFIG.PASTA_MODELOS_PAGAMENTO) {
    mapa['1eyLGfer7R58-Usw54gTUTWyvoE8WCtiQ'] = CONFIG.PASTA_MODELOS_PAGAMENTO;   // pasta antiga dos modelos
  }
  if (!Object.keys(mapa).length) {
    Logger.log('Nenhuma troca a fazer — rode migrarModelosPagamento() antes.');
    return;
  }
  Logger.log('Trocas previstas:');
  Object.keys(mapa).forEach(k => Logger.log('   ' + k + ' → ' + mapa[k]));

  const ss = SpreadsheetApp.openById(CONFIG.ID_TITULOS);
  const alvos = [
    { aba: 'Títulos Manut.', faixa: 'AC52:AC55' },
    { aba: 'Títulos Abast.', faixa: 'AA63:AA66' }
  ];
  let trocadas = 0;
  alvos.forEach(alvo => {
    const aba = ss.getSheetByName(alvo.aba);
    if (!aba) { Logger.log(alvo.aba + ': aba não encontrada'); return; }
    const faixa = aba.getRange(alvo.faixa);
    const valores = faixa.getValues();
    const formulas = faixa.getFormulas();
    const saida = valores.map((linha, i) => linha.map((v, j) => {
      let conteudo = formulas[i][j] || String(v === null || v === undefined ? '' : v);
      const original = conteudo;
      Object.keys(mapa).forEach(velho => {
        if (conteudo.indexOf(velho) >= 0) conteudo = conteudo.split(velho).join(mapa[velho]);
      });
      if (conteudo !== original) {
        trocadas++;
        Logger.log('   ' + alvo.aba + ' ' + alvo.faixa.split(':')[0].replace(/\d+/, '') + (parseInt(alvo.faixa.match(/\d+/)[0], 10) + i) +
                   ': atualizado');
      }
      return conteudo;
    }));
    faixa.setValues(saida);
  });
  SpreadsheetApp.flush();
  limparCache();
  Logger.log(trocadas + ' célula(s) atualizada(s). Confira os links nas duas abas.');
  return trocadas + ' célula(s) atualizada(s)';
}

/** Mostra o que há nessas células hoje, sem alterar nada. */
function verLinksModelosPagamento() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_TITULOS);
  [['Títulos Manut.', 'AC52:AC55'], ['Títulos Abast.', 'AA63:AA66']].forEach(par => {
    const aba = ss.getSheetByName(par[0]);
    if (!aba) { Logger.log(par[0] + ': não encontrada'); return; }
    const faixa = aba.getRange(par[1]);
    const valores = faixa.getDisplayValues(), formulas = faixa.getFormulas();
    Logger.log('--- ' + par[0] + ' ' + par[1]);
    valores.forEach((l, i) => Logger.log('   ' + (formulas[i][0] || l[0]).substring(0, 160)));
  });
}

/** Modelos em uso: os copiados (PropertiesService) ou, se não houver, os originais do CONFIG. */
function _modelosPagamento_() {
  try {
    const guardado = PropertiesService.getScriptProperties().getProperty('MODELOS_PAGAMENTO');
    if (guardado) {
      const obj = JSON.parse(guardado);
      if (obj && Object.keys(obj).length) return obj;
    }
  } catch (e) { Logger.log('MODELOS_PAGAMENTO inválido: ' + e); }
  return CONFIG.MODELOS_PAGAMENTO;
}

function gerarDocumentosPagamento(token, tipo, competencia, quais) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const leitura = lerProcessoPagamento(token, tipo, competencia);
    if (!leitura.ok) return leitura;
    const modelos = _modelosPagamento_()[tipo];
    if (!modelos) return { ok: false, erro: 'Modelos não configurados para ' + tipo + '.' };
    const escolhidos = Object.keys(modelos).filter(n => !quais || !quais.length || quais.indexOf(n) >= 0);
    if (!escolhidos.length) return { ok: false, erro: 'Escolha ao menos um documento.' };

    const parametros = _parametrosPagamento_(tipo, leitura.titulo, leitura.resumo, competencia);
    const pasta = DriveApp.getFolderById(CONFIG.PASTA_DOCS_PAGAMENTO);
    const gerados = [];

    escolhidos.forEach(nomeModelo => {
      const novoNome = nomeModelo + ' - ' + competencia;
      // substitui qualquer versão anterior da mesma competência
      const substituidos = _descartarPorPrefixo_(pasta, nomeModelo + ' - ' + competencia);
      const copia = DriveApp.getFileById(modelos[nomeModelo]).makeCopy(novoNome, pasta);
      const doc = DocumentApp.openById(copia.getId());
      const corpo = doc.getBody();
      Object.keys(parametros).forEach(chave => { corpo.replaceText(chave.replace(/[{}]/g, '\\$&'), parametros[chave]); });
      const tab = _preencherTabelas_(corpo, leitura.resumo, leitura.serie);
      doc.saveAndClose();
      try { copia.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      gerados.push({ nome: novoNome, url: copia.getUrl(), celulas: tab.ajustadas,
                     naoCasaram: tab.naoCasaram, substituidos: substituidos });
    });

    const pendentes = [];
    gerados.forEach(g => (g.naoCasaram || []).forEach(x => { if (pendentes.indexOf(x) < 0) pendentes.push(x); }));
    _logAcao_(p.ss, p.sessao.email, 'Gerar documentos ' + tipo, '', competencia,
      gerados.map(g => g.nome).join(' | ') + (pendentes.length ? ' || sem correspondência: ' + pendentes.join(' ; ') : ''));
    return { ok: true, gerados: gerados, parametros: Object.keys(parametros).length,
      naoCasaram: pendentes,
      disponiveis: leitura.resumo.linhas.map(l => String(l[0]) + ' = ' + _decBR_(l[1])) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/**
 * Manda para a lixeira os arquivos da pasta cujo nome começa com o prefixo.
 * getFilesByName exige nome exato; como os nomes trazem data ou número da NF,
 * a varredura por prefixo é o que realmente substitui a versão anterior.
 */
function _descartarPorPrefixo_(pasta, prefixo, manterId) {
  let descartados = 0;
  try {
    const arquivos = pasta.getFiles();
    while (arquivos.hasNext()) {
      const f = arquivos.next();
      if (manterId && f.getId() === manterId) continue;
      if (f.getName().indexOf(prefixo) === 0) { try { f.setTrashed(true); descartados++; } catch (e) {} }
    }
  } catch (e) { Logger.log('Descarte por prefixo: ' + e); }
  return descartados;
}

/** Valor por extenso em reais (portado da planilha de pagamentos). */
function reaisPorExtenso(valor) {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const partes = (Number(valor) || 0).toFixed(2).split('.');
  const reais = parseInt(partes[0], 10), centavos = parseInt(partes[1], 10);
  function porExtenso(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    if (n < 10) return unidades[n];
    if (n < 20) return especiais[n - 10];
    if (n < 100) return dezenas[Math.floor(n / 10)] + (n % 10 !== 0 ? ' e ' + unidades[n % 10] : '');
    if (n < 1000) return centenas[Math.floor(n / 100)] + (n % 100 !== 0 ? ' e ' + porExtenso(n % 100) : '');
    if (n < 1000000) {
      const milhar = Math.floor(n / 1000), resto = n % 1000;
      return (milhar > 1 ? porExtenso(milhar) + ' mil' : 'mil') + (resto !== 0 ? ' e ' + porExtenso(resto) : '');
    }
    const milhao = Math.floor(n / 1000000), resto = n % 1000000;
    return (milhao > 1 ? porExtenso(milhao) + ' milhões' : 'um milhão') + (resto !== 0 ? ' e ' + porExtenso(resto) : '');
  }
  const r = reais === 0 ? '' : porExtenso(reais) + (reais === 1 ? ' real' : ' reais');
  const c = centavos === 0 ? '' : porExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return r + (c ? (r ? ' e ' : '') + c : '');
}


/* ============================================================
   PGF — Programa de Gerenciamento da Frota (dados de Brasília)
   ============================================================ */

/** Nomes que a planilha de Brasília usa para as mesmas colunas da aba PGF. */
const EQUIV_PGF = {
  'PLACA': ['PLACA SIPAC', 'PLACA DO VEICULO', 'PLACA VEICULO'],
  'UNIDADE': ['UNIDADE SIPAC', 'UNIDADE GESTORA', 'LOTACAO'],
  'UG': ['UNIDADE GESTORA', 'COD UG', 'CODIGO UG'],
  'NOTA FINAL': ['NOTA', 'NOTA GERAL', 'PONTUACAO FINAL'],
  'CONCEITO': ['CONCEITO FINAL', 'CLASSIFICACAO']
};

/**
 * Atualiza a aba PGF da planilha-mãe a partir de outra planilha.
 * Uso no editor:
 *     atualizarPGF('https://docs.google.com/spreadsheets/d/XXXX/edit')
 *     atualizarPGF('XXXX', 'Nome da aba')      // se houver mais de uma aba
 *
 * Como funciona: lê o cabeçalho da aba PGF (linha 2, colunas B a P), procura
 * na planilha de origem colunas com o mesmo nome (ignorando maiúsculas e
 * acentos), limpa B3:P e grava os dados na ordem daqui. Coluna sem
 * correspondência fica vazia. A coluna A não é tocada, por ser fórmula.
 */
function atualizarPGF(urlOuId, nomeAba) {
  const id = _idDePlanilha_(urlOuId);
  if (!id) throw new Error('Informe o link ou o ID da planilha de origem.');
  const origem = SpreadsheetApp.openById(id);
  const abaOrigem = nomeAba ? origem.getSheetByName(nomeAba) : origem.getSheets()[0];
  if (!abaOrigem) throw new Error('Aba "' + nomeAba + '" não encontrada na origem.');

  const destino = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName('PGF');
  if (!destino) throw new Error('Aba PGF não encontrada na planilha-mãe.');

  const PRIMEIRA_COL = 2, ULTIMA_COL = 16, LINHA_CAB = 2, PRIMEIRA_LINHA = 3;   // B..P
  const largura = ULTIMA_COL - PRIMEIRA_COL + 1;
  const cabDestino = destino.getRange(LINHA_CAB, PRIMEIRA_COL, 1, largura).getValues()[0].map(c => String(c || '').trim());

  // cabeçalho da origem: primeira linha (até a 6ª) que tenha PLACA
  const varredura = abaOrigem.getRange(1, 1, Math.min(6, abaOrigem.getLastRow()), abaOrigem.getLastColumn()).getValues();
  let linhaCabOrigem = -1;
  for (let i = 0; i < varredura.length; i++) {
    if (varredura[i].some(c => _normCab_(c) === 'PLACA')) { linhaCabOrigem = i; break; }
  }
  if (linhaCabOrigem < 0) throw new Error('Não encontrei a linha de cabeçalho (uma coluna começando por "PLACA") na planilha de origem.');
  const cabOrigem = varredura[linhaCabOrigem].map(c => _normCab_(c));

  // de qual coluna da origem vem cada coluna do destino
  const mapa = cabDestino.map(nome => {
    if (!nome) return -1;
    const alvo = _normCab_(nome);
    let i = cabOrigem.indexOf(alvo);
    if (i < 0) i = cabOrigem.findIndex(c => c && (c.indexOf(alvo) === 0 || alvo.indexOf(c) === 0));
    return i;
  });

  const nLinhas = abaOrigem.getLastRow() - (linhaCabOrigem + 1);
  if (nLinhas < 1) throw new Error('A planilha de origem não tem dados abaixo do cabeçalho.');
  const dadosOrigem = abaOrigem.getRange(linhaCabOrigem + 2, 1, nLinhas, abaOrigem.getLastColumn()).getValues();

  const linhas = [];
  dadosOrigem.forEach(l => {
    const saida = mapa.map(i => (i >= 0 ? l[i] : ''));
    if (saida.some(v => String(v).trim() !== '')) linhas.push(saida);
  });

  // limpa B3:P e grava
  const ultimaAtual = Math.max(destino.getLastRow(), PRIMEIRA_LINHA);
  destino.getRange(PRIMEIRA_LINHA, PRIMEIRA_COL, ultimaAtual - PRIMEIRA_LINHA + 1, largura).clearContent();
  if (linhas.length) destino.getRange(PRIMEIRA_LINHA, PRIMEIRA_COL, linhas.length, largura).setValues(linhas);
  SpreadsheetApp.flush();

  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy');
  PropertiesService.getScriptProperties().setProperty('PGF_ATUALIZADO', agora);
  limparCache();

  Logger.log('Origem: ' + origem.getName() + ' / ' + abaOrigem.getName() + ' (cabeçalho na linha ' + (linhaCabOrigem + 1) + ')');
  cabDestino.forEach((nome, i) => {
    if (!nome) return;
    Logger.log('   ' + _letraColuna_(PRIMEIRA_COL + i) + ' ' + nome + ' ← ' +
      (mapa[i] >= 0 ? 'coluna ' + _letraColuna_(mapa[i] + 1) + ' da origem' : 'SEM CORRESPONDÊNCIA (ficou vazia)'));
  });
  Logger.log(linhas.length + ' linha(s) gravada(s). Atualização registrada em ' + agora + '.');
  return linhas.length + ' linha(s) atualizada(s) em ' + agora;
}


/** Atualização do PGF pelo painel (aba Dados → Importações). */
function importarPGF(token, urlOuId, nomeAba) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(60000); } catch (e) { return { ok: false, erro: 'Planilha ocupada. Tente de novo.' }; }
  try {
    const id = _idDePlanilha_(urlOuId);
    if (!id) return { ok: false, erro: 'Cole o link (ou o ID) da planilha do PGF.' };
    const origem = SpreadsheetApp.openById(id);
    const abaOrigem = nomeAba ? origem.getSheetByName(nomeAba) : origem.getSheets()[0];
    if (!abaOrigem) return { ok: false, erro: 'Aba "' + nomeAba + '" não encontrada na planilha de origem.' };
    const destino = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName('PGF');
    if (!destino) return { ok: false, erro: 'Aba PGF não encontrada na planilha-mãe.' };

    const PRIMEIRA_COL = 2, ULTIMA_COL = 16, LINHA_CAB = 2, PRIMEIRA_LINHA = 3;
    const largura = ULTIMA_COL - PRIMEIRA_COL + 1;
    const cabDestino = destino.getRange(LINHA_CAB, PRIMEIRA_COL, 1, largura).getValues()[0].map(c => String(c || '').trim());

    const varredura = abaOrigem.getRange(1, 1, Math.min(6, abaOrigem.getLastRow()), abaOrigem.getLastColumn()).getValues();
    let linhaCabOrigem = -1;
    for (let i = 0; i < varredura.length; i++) {
      if (varredura[i].some(c => /^PLACA\b/.test(_normCab_(c)))) { linhaCabOrigem = i; break; }
    }
    if (linhaCabOrigem < 0) return { ok: false, erro: 'Não encontrei a linha de cabeçalho (uma coluna começando por "PLACA") na planilha de origem.' };
    const cabOrigem = varredura[linhaCabOrigem].map(c => _normCab_(c));

    const mapa = cabDestino.map(nome => {
      if (!nome) return -1;
      const alvo = _normCab_(nome);
      let i = cabOrigem.indexOf(alvo);
      if (i < 0) i = cabOrigem.findIndex(c => c && (c.indexOf(alvo) === 0 || alvo.indexOf(c) === 0));
      if (i < 0) {
        const equivalentes = (EQUIV_PGF[alvo] || []).map(_normCab_);
        i = cabOrigem.findIndex(c => equivalentes.indexOf(c) >= 0);
      }
      return i;
    });

    const nLinhas = abaOrigem.getLastRow() - (linhaCabOrigem + 1);
    if (nLinhas < 1) return { ok: false, erro: 'A planilha de origem não tem dados abaixo do cabeçalho.' };
    const dadosOrigem = abaOrigem.getRange(linhaCabOrigem + 2, 1, nLinhas, abaOrigem.getLastColumn()).getValues();

    const linhas = [];
    dadosOrigem.forEach(l => {
      const saida = mapa.map(i => (i >= 0 ? l[i] : ''));
      if (saida.some(v => String(v).trim() !== '')) linhas.push(saida);
    });

    const ultimaAtual = Math.max(destino.getLastRow(), PRIMEIRA_LINHA);
    const apagadas = ultimaAtual - PRIMEIRA_LINHA + 1;
    destino.getRange(PRIMEIRA_LINHA, PRIMEIRA_COL, apagadas, largura).clearContent();
    if (linhas.length) destino.getRange(PRIMEIRA_LINHA, PRIMEIRA_COL, linhas.length, largura).setValues(linhas);
    SpreadsheetApp.flush();

    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy');
    PropertiesService.getScriptProperties().setProperty('PGF_ATUALIZADO', agora);
    limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Importar PGF', '', linhas.length + ' linhas', origem.getName() + ' / ' + abaOrigem.getName());

    return { ok: true, inseridos: linhas.length, apagados: Math.max(0, apagadas), atualizadoEm: agora,
      origem: origem.getName() + ' / ' + abaOrigem.getName(),
      colunas: cabDestino.map((nome, i) => ({ destino: nome, achou: mapa[i] >= 0 })).filter(x => x.destino),
      semCorrespondencia: cabDestino.filter((nome, i) => nome && mapa[i] < 0) };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/** Aceita link completo ou só o ID da planilha. */
function _idDePlanilha_(t) {
  const s = String(t || '').trim();
  const m = s.match(/\/d\/([\w-]{20,})/);
  if (m) return m[1];
  return /^[\w-]{20,}$/.test(s) ? s : '';
}

/** Data da última atualização do PGF, para o painel exibir. */
function _pgfAtualizado_() {
  try { return PropertiesService.getScriptProperties().getProperty('PGF_ATUALIZADO') || ''; } catch (e) { return ''; }
}


/* ------------------------------------------------------------ */
/*  Atalhos sem argumento — para aparecerem na lista do editor    */
/* ------------------------------------------------------------ */

/** Grava o histórico da glosa na planilha-mãe (equivale a migrarResumoGlosa(true)). */
function migrarResumoGlosaGravar() { return migrarResumoGlosa(true); }

/** Insere a linha "Outros descontos" nas tabelas dos termos de atesto. */
function ajustarTabelasModelosPagamentoAplicar() { return ajustarTabelasModelosPagamento(true); }




/* ============================================================
   TABELA FIPE — valor venal das viaturas
   A ConsultaBD já traz o código FIPE (coluna BL). A partir dele o
   painel consulta o valor mensalmente pela API pública e guarda o
   histórico, porque a IN PRF 40/2021 (art. 32) exige a consulta no
   mesmo período da manutenção — não vale o valor de hoje para
   justificar uma decisão de meses atrás.
   ============================================================ */

const FIPE = {
  base: 'https://parallelum.com.br/fipe/api/v2',     // API pública, sem chave
  abaHistorico: 'HistoricoFIPE',
  colunas: { valor: 'Valor FIPE', consultaEm: 'FIPE em', refMes: 'FIPE referência' },
  limiteReparo: 0.5                                   // art. 32 e art. 49
};

/** Colunas de apoio da FIPE na ConsultaBD, criadas à direita se faltarem. */
function prepararColunasFipe() {
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => _normCab_(c));
  let prox = aba.getLastColumn() + 1;
  const criadas = [];
  Object.keys(FIPE.colunas).forEach(k => {
    if (cab.indexOf(_normCab_(FIPE.colunas[k])) >= 0) return;
    aba.getRange(1, prox).setValue(FIPE.colunas[k]).setFontWeight('bold');
    criadas.push(FIPE.colunas[k]); prox++;
  });
  SpreadsheetApp.flush(); limparCache();
  Logger.log(criadas.length ? 'Colunas criadas: ' + criadas.join(', ') : 'As colunas da FIPE já existiam.');
  return criadas.join(', ');
}

function _colunaPorNome_(cab, nome) { return cab.map(c => _normCab_(c)).indexOf(_normCab_(nome)); }

/** Consulta um código FIPE. Devolve valor, mês de referência e o nome do modelo. */
function _consultarFipe_(codigo, ano) {
  const cod = String(codigo || '').replace(/[^\d-]/g, '');
  if (!cod) return { ok: false, erro: 'sem código' };
  const tentativas = [];
  // o ano do modelo entra como "ano-combustível"; tentamos os combustíveis usuais
  (ano ? [ano] : []).forEach(a => { [1, 2, 3].forEach(comb => tentativas.push(a + '-' + comb)); });
  const url = FIPE.base + '/cars/' + cod;             // sem ano: devolve a lista de anos

  try {
    if (!tentativas.length) return { ok: false, erro: 'sem ano do modelo' };
    for (let i = 0; i < tentativas.length; i++) {
      const alvo = FIPE.base + '/cars/' + cod + '/years/' + tentativas[i];
      const r = UrlFetchApp.fetch(alvo, { muteHttpExceptions: true, followRedirects: true });
      const cod2 = r.getResponseCode();
      if (cod2 === 404) continue;                     // combustível errado, tenta o próximo
      if (cod2 !== 200) return { ok: false, erro: 'HTTP ' + cod2 };
      const j = JSON.parse(r.getContentText());
      const valor = _parseNumeroBR_(String(j.price || '').replace(/[R$\s]/g, ''));
      if (!valor) return { ok: false, erro: 'resposta sem preço' };
      return { ok: true, valor: valor, referencia: String(j.referenceMonth || '').trim(),
               modelo: String(j.model || '').trim(), marca: String(j.brand || '').trim() };
    }
    return { ok: false, erro: 'ano/combustível não encontrado na FIPE' };
  } catch (e) { return { ok: false, erro: String(e).substring(0, 120) }; }
}

/** Grava o valor do mês no histórico (uma linha por placa e competência). */
function _gravarHistoricoFipe_(ss, registros, competencia) {
  let aba = ss.getSheetByName(FIPE.abaHistorico);
  if (!aba) {
    aba = ss.insertSheet(FIPE.abaHistorico);
    aba.getRange(1, 1, 1, 5).setValues([['Competência', 'Placa', 'Código FIPE', 'Valor', 'Consultado em']]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
  }
  // remove o que já houver desta competência, para a execução ser repetível
  const n = aba.getLastRow();
  if (n > 1) {
    const valores = aba.getRange(2, 1, n - 1, 2).getValues();
    for (let i = valores.length - 1; i >= 0; i--) {
      if (String(valores[i][0]).trim() === competencia) aba.deleteRow(i + 2);
    }
  }
  if (registros.length) aba.getRange(aba.getLastRow() + 1, 1, registros.length, 5).setValues(registros);
}

/**
 * Atualiza o valor FIPE de toda a frota. Roda pelo gatilho mensal ou à mão.
 * Consulta apenas viaturas com código FIPE preenchido; as demais são listadas
 * no log para você completar o código na coluna BL.
 */
function atualizarFipe() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_BASE);
  const nLin = aba.getLastRow(), nCol = aba.getLastColumn();
  const cab = aba.getRange(1, 1, 1, nCol).getValues()[0];
  const idx = _mapearCampos_(cab.map(c => String(c || '').trim()));
  const cValor = _colunaPorNome_(cab, FIPE.colunas.valor);
  const cData = _colunaPorNome_(cab, FIPE.colunas.consultaEm);
  const cRef = _colunaPorNome_(cab, FIPE.colunas.refMes);
  if (cValor < 0) { Logger.log('Rode prepararColunasFipe() antes: faltam as colunas de valor e data.'); return; }

  const valores = aba.getRange(2, 1, nLin - 1, nCol).getValues();
  const hoje = new Date();
  const competencia = ('0' + (hoje.getMonth() + 1)).slice(-2) + '/' + hoje.getFullYear();
  const dataTxt = Utilities.formatDate(hoje, CONFIG.FUSO, 'dd/MM/yyyy');

  let ok = 0, semCodigo = 0, falhas = 0;
  const historico = [], semCodigoLista = [], erros = [];
  const cache = {};                                  // mesmo código e ano: uma consulta só

  valores.forEach((l, i) => {
    const placa = String(l[idx.placa] || '').trim().toUpperCase();
    if (!placa) return;
    const codigo = idx.fipe !== undefined ? String(l[idx.fipe] || '').trim() : '';
    if (!codigo) { semCodigo++; if (semCodigoLista.length < 40) semCodigoLista.push(placa + ' ' + String(l[idx.modelo] || '')); return; }
    const ano = String(l[idx.anoMod] || l[idx.anoFab] || '').replace(/\D/g, '').substring(0, 4);
    const chave = codigo + '|' + ano;
    const r = cache[chave] || (cache[chave] = _consultarFipe_(codigo, ano));
    if (!r.ok) { falhas++; if (erros.length < 25) erros.push(placa + ' (' + codigo + '/' + ano + '): ' + r.erro); return; }
    aba.getRange(i + 2, cValor + 1).setValue(r.valor);
    if (cData >= 0) aba.getRange(i + 2, cData + 1).setValue(dataTxt);
    if (cRef >= 0) aba.getRange(i + 2, cRef + 1).setValue(r.referencia);
    historico.push([competencia, placa, codigo, r.valor, dataTxt]);
    ok++;
    Utilities.sleep(120);                            // respeita o ritmo da API pública
  });

  _gravarHistoricoFipe_(ss, historico, competencia);
  SpreadsheetApp.flush();
  limparCache();
  PropertiesService.getScriptProperties().setProperty('FIPE_ATUALIZADO', dataTxt);

  Logger.log('=== FIPE — competência ' + competencia + ' ===');
  Logger.log('Atualizadas: ' + ok + ' | sem código na coluna BL: ' + semCodigo + ' | falhas: ' + falhas);
  if (semCodigoLista.length) { Logger.log('Sem código FIPE (primeiras):'); semCodigoLista.forEach(x => Logger.log('   ' + x)); }
  if (erros.length) { Logger.log('Falhas de consulta:'); erros.forEach(x => Logger.log('   ' + x)); }
  Logger.log('Histórico gravado na aba ' + FIPE.abaHistorico + '.');
  return ok + ' viatura(s) atualizada(s)';
}

/** Cria o gatilho mensal (dia 10, de manhã), quando ainda não existir. */
function instalarGatilhoFipe() {
  const existentes = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'atualizarFipe');
  existentes.forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('atualizarFipe').timeBased().onMonthDay(10).atHour(6).create();
  Logger.log('Gatilho mensal criado: atualizarFipe, todo dia 10 às 6h. A tabela do mês já está publicada nessa data.');
}

/** Data da última atualização, para o painel mostrar. */
function _fipeAtualizado_() {
  try { return PropertiesService.getScriptProperties().getProperty('FIPE_ATUALIZADO') || ''; } catch (e) { return ''; }
}

/**
 * Quanto já foi gasto com a viatura nos últimos 12 meses e como isso se compara
 * ao valor venal (IN art. 32). Acidentes não entram no percentual (art. 32, II).
 */
function _situacaoReparo_(placa, valorFipe) {
  const saida = { gasto12m: 0, percentual: 0, limite: 0, estourou: false, temFipe: !!valorFipe };
  if (!valorFipe) return saida;
  try {
    const ss = _ssManut_();
    const aba = ss.getSheetByName(CONFIG.ABA_ORCAMENTOS);
    if (!aba || aba.getLastRow() < 3) return saida;
    const valores = aba.getDataRange().getValues();
    let cab = 0;
    for (let i = 0; i < Math.min(6, valores.length); i++) {
      if (valores[i].some(c => /ORDEM\s*SERVI/i.test(String(c)))) { cab = i; break; }
    }
    const nomes = valores[cab].map(c => _normCab_(c));
    const iPlaca = nomes.findIndex(c => /^PLACA$/.test(c));
    const iTot = nomes.findIndex(c => /TOTAL O ?S|TOTAL OS|^TOTAL/.test(c));
    const iData = nomes.findIndex(c => /DATA CONCLUS/.test(c));
    if (iPlaca < 0 || iTot < 0) return saida;
    const limiteData = new Date(); limiteData.setMonth(limiteData.getMonth() - 12);
    for (let r = cab + 1; r < valores.length; r++) {
      if (String(valores[r][iPlaca] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() !== placa) continue;
      if (iData >= 0) {
        const t = _dataTxt_(valores[r][iData]);
        const m = String(t).match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (m && new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) < limiteData) continue;
      }
      saida.gasto12m += _num_(valores[r][iTot]) || 0;
    }
  } catch (e) { Logger.log('Situação de reparo: ' + e); }
  saida.gasto12m = Math.round(saida.gasto12m * 100) / 100;
  saida.limite = Math.round(valorFipe * FIPE.limiteReparo * 100) / 100;
  saida.percentual = valorFipe ? Math.round(saida.gasto12m / valorFipe * 1000) / 10 : 0;
  saida.estourou = saida.gasto12m > saida.limite;
  return saida;
}

/** Situação do limite de reparo de uma viatura, para o painel. */
function situacaoReparoViatura(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const alvo = _linhaDaPlaca_(aba, String(placa || '').trim().toUpperCase());
    if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0];
    const cValor = _colunaPorNome_(cab, FIPE.colunas.valor);
    const valorFipe = cValor >= 0 ? (_num_(aba.getRange(alvo.linha, cValor + 1).getValue()) || 0) : 0;
    const cData = _colunaPorNome_(cab, FIPE.colunas.consultaEm);
    const situacao = _situacaoReparo_(String(placa).toUpperCase(), valorFipe);
    situacao.valorFipe = valorFipe;
    situacao.consultaEm = cData >= 0 ? _dataTxt_(aba.getRange(alvo.linha, cData + 1).getValue()) : '';
    return { ok: true, situacao: situacao };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/* ============================================================
   SINISTROS — acompanhamento dos processos de dano a viatura
   Aba "Acidentes" na planilha-mãe. A coluna Status define o que
   ainda pesa na manutenção: "Em Processo" é o que alerta no
   processo de pagamento (IN PRF 40/2021, arts. 43 a 54).
   ============================================================ */

const SINISTROS = {
  status: ['Em Processo', 'Pago por Terceiro', 'Pago via PRF'],
  // nome na planilha → campo usado pelo painel
  campos: {
    processo: 'Processo', placa: 'Placa', observacao: 'Observação', total: 'Total',
    pecas: 'Valor em Peças', mo: 'Valor e Mão de Obra', status: 'Status', data: 'Data do Sinistro'
  },
  // colunas úteis que o painel usa se existirem (criadas por prepararColunasSinistro)
  extras: {
    tipo: 'Tipo', condutor: 'Condutor', unidade: 'Unidade', terceiro: 'Terceiro/Seguradora',
    comunicacao: 'Data da Comunicação', fipe: 'Valor FIPE', ressarcimento: 'Ressarcimento',
    conclusao: 'Data de Conclusão'
  },
  tipos: ['Acidente', 'Incidente', 'Avaria', 'Furto/Roubo', 'Fenômeno natural']
};

function _abaSinistros_() {
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_ACIDENTES);
  if (!aba) throw new Error('Aba "' + CONFIG.ABA_ACIDENTES + '" não encontrada.');
  return aba;
}

/**
 * Onde está cada campo na aba. O cabeçalho é procurado nas primeiras linhas,
 * os nomes casam por aproximação (acento, caixa e variações de escrita) e,
 * se nada casar, vale a ordem original das colunas A a H.
 */
const SINISTROS_ALT = {
  processo: ['Processo', 'Processo SEI', 'Nº do Processo'],
  placa: ['Placa'],
  observacao: ['Observação', 'Observacoes', 'Observações', 'Obs'],
  total: ['Total', 'Valor Total'],
  pecas: ['Valor em Peças', 'Valor Peças', 'Peças'],
  mo: ['Valor e Mão de Obra', 'Valor em Mão de Obra', 'Valor Mão de Obra', 'Mão de Obra', 'Serviços'],
  status: ['Status', 'Situação'],
  data: ['Data do Sinistro', 'Data do Acidente', 'Data']
};
const SINISTROS_POSICAO = { processo: 0, placa: 1, observacao: 2, total: 3, pecas: 4, mo: 5, status: 6, data: 7 };

function _colunasSinistro_(aba) {
  const nLin = Math.min(6, Math.max(aba.getLastRow(), 1));
  const largura = Math.max(aba.getLastColumn(), 8);
  const topo = aba.getRange(1, 1, nLin, largura).getValues();
  let linhaCab = 0;
  for (let i = 0; i < topo.length; i++) {
    if (topo[i].some(c => _normCab_(c) === 'PLACA')) { linhaCab = i; break; }
  }
  const cab = topo[linhaCab].map(c => _normCab_(c));
  const achar = nomes => {
    for (let i = 0; i < nomes.length; i++) {
      const alvo = _normCab_(nomes[i]);
      const exato = cab.indexOf(alvo);
      if (exato >= 0) return exato;
    }
    for (let i = 0; i < nomes.length; i++) {          // por aproximação
      const alvo = _normCab_(nomes[i]);
      const p = cab.findIndex(c => c && (c.indexOf(alvo) === 0 || alvo.indexOf(c) === 0));
      if (p >= 0) return p;
    }
    return -1;
  };
  const col = {};
  Object.keys(SINISTROS.campos).forEach(k => {
    let i = achar(SINISTROS_ALT[k] || [SINISTROS.campos[k]]);
    if (i < 0 && SINISTROS_POSICAO[k] !== undefined) i = SINISTROS_POSICAO[k];   // reserva pela posição
    col[k] = i;
  });
  Object.keys(SINISTROS.extras).forEach(k => { const i = achar([SINISTROS.extras[k]]); if (i >= 0) col[k] = i; });
  return { col: col, largura: largura, linhaCab: linhaCab + 1, cabecalho: topo[linhaCab].map(c => String(c || '').trim()) };
}

/** Acrescenta as colunas extras à direita, sem mexer nas existentes. */
function prepararColunasSinistro() {
  const aba = _abaSinistros_();
  const c = _colunasSinistro_(aba);
  let prox = aba.getLastColumn() + 1;
  const criadas = [];
  Object.keys(SINISTROS.extras).forEach(k => {
    if (c.col[k] !== undefined && c.col[k] >= 0) return;
    aba.getRange(1, prox).setValue(SINISTROS.extras[k]).setFontWeight('bold');
    criadas.push(SINISTROS.extras[k]);
    prox++;
  });
  SpreadsheetApp.flush();
  Logger.log(criadas.length ? 'Colunas criadas: ' + criadas.join(', ') : 'Todas as colunas extras já existiam.');
  limparCache();
  return criadas.join(', ');
}

/** Lista os sinistros com o cruzamento da viatura. */
function lerSinistros(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = _abaSinistros_();
    const info = _colunasSinistro_(aba);
    const n = aba.getLastRow();
    const lista = [];
    if (n > info.linhaCab) {
      const valores = aba.getRange(info.linhaCab + 1, 1, n - info.linhaCab, info.largura).getValues();
      valores.forEach((l, i) => {
        const placa = String(l[info.col.placa] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const processo = String(l[info.col.processo] || '').trim();
        if (!placa && !processo) return;
        const item = { linha: info.linhaCab + 1 + i, placa: placa, processo: processo,
          observacao: String(l[info.col.observacao] || '').trim(),
          total: _num_(l[info.col.total]) || 0,
          pecas: _num_(l[info.col.pecas]) || 0,
          mo: _num_(l[info.col.mo]) || 0,
          status: String(l[info.col.status] || '').trim(),
          data: _dataBR_(l[info.col.data]) };
        Object.keys(SINISTROS.extras).forEach(k => {
          if (info.col[k] === undefined || info.col[k] < 0) return;
          const v = l[info.col[k]];
          item[k] = /^data|conclusao|comunicacao/i.test(k) ? _dataBR_(v) : String(v === null || v === undefined ? '' : v).trim();
        });
        lista.push(item);
      });
    }
    return { ok: true, sinistros: lista, status: SINISTROS.status, tipos: SINISTROS.tipos,
      extras: Object.keys(SINISTROS.extras).filter(k => info.col[k] !== undefined && info.col[k] >= 0),
      rotulosExtras: SINISTROS.extras,
      diagnostico: { linhaCabecalho: info.linhaCab, cabecalho: info.cabecalho,
        colunas: Object.keys(SINISTROS.campos).map(k => k + '=' + (info.col[k] >= 0 ? _letraColuna_(info.col[k] + 1) : 'não achou')).join(' '),
        linhasNaAba: n } };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Cria ou edita um registro de sinistro. */
function salvarSinistro(token, linha, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode registrar sinistros.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const aba = _abaSinistros_();
    const info = _colunasSinistro_(aba);
    const placa = String((dados || {}).placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!placa) return { ok: false, erro: 'Informe a placa.' };
    let alvo = parseInt(linha, 10) || 0;
    const novo = !alvo;
    if (novo) alvo = Math.max(aba.getLastRow() + 1, info.linhaCab + 1);

    const gravar = (campo, valor) => {
      const c = info.col[campo];
      if (c === undefined || c < 0) return;
      if (aba.getRange(alvo, c + 1).getFormula()) return;      // respeita fórmula
      aba.getRange(alvo, c + 1).setValue(valor);
    };
    gravar('processo', String(dados.processo || '').trim());
    gravar('placa', placa);
    gravar('observacao', String(dados.observacao || '').trim());
    gravar('pecas', _parseNumeroBR_(dados.pecas) || 0);
    gravar('mo', _parseNumeroBR_(dados.mo) || 0);
    // o total é somado aqui quando a coluna não for fórmula
    gravar('total', (_parseNumeroBR_(dados.pecas) || 0) + (_parseNumeroBR_(dados.mo) || 0));
    gravar('status', String(dados.status || SINISTROS.status[0]).trim());
    gravar('data', _dataBR_(dados.data));
    Object.keys(SINISTROS.extras).forEach(k => {
      if (dados[k] === undefined) return;
      gravar(k, /^data|conclusao|comunicacao/i.test(k) ? _dataBR_(dados[k]) : String(dados[k] || '').trim());
    });

    SpreadsheetApp.flush();
    limparCache();
    _logAcao_(p.ss, p.sessao.email, novo ? 'Registrar sinistro' : 'Editar sinistro', placa,
      String(dados.processo || ''), String(dados.status || '') + ' • ' + _moedaBR_((_parseNumeroBR_(dados.pecas) || 0) + (_parseNumeroBR_(dados.mo) || 0)));
    return { ok: true, linha: alvo, novo: novo };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}


/* ============================================================
   MANUTENÇÃO PREVENTIVA — base de referência
   Duas abas na planilha-mãe:
     PreventivaPadrao   — intervalos por categoria de veículo e item
     PreventivaViatura  — exceções por placa (o que o fabricante ou o uso
                          daquela viatura exige diferente do padrão)
   Os valores são referência de mercado. O manual do fabricante e as
   condições de uso prevalecem — por isso a aba de exceções existe.
   ============================================================ */

const PREVENTIVA = {
  abaPadrao: 'PreventivaPadrao',
  abaViatura: 'PreventivaViatura',
  categorias: ['Automóvel', 'Camionete/SUV', 'Caminhonete diesel 4x4', 'Motocicleta', 'Van/Micro-ônibus', 'Caminhão'],
  grupos: ['Fluidos', 'Filtros', 'Freios', 'Pneus', 'Suspensão e direção', 'Motor', 'Elétrica', 'Segurança'],
  cabPadrao: ['Categoria', 'Grupo', 'Item', 'Intervalo (km)', 'Intervalo (meses)', 'Tipo', 'Crítico', 'Palavras-chave', 'Observação'],
  cabViatura: ['Placa', 'Item', 'Intervalo (km)', 'Intervalo (meses)', 'Motivo', 'Definido em', 'Por']
};

/**
 * Tabela de referência. Cada linha:
 * [grupo, item, km, meses, tipo, crítico, palavras-chave no detalhamento, observação]
 * "Tipo" separa o que se troca do que se inspeciona: inspeção vencida não
 * significa peça ruim, significa que ninguém olhou.
 */
function _tabelaPreventiva_() {
  const comum = [
    ['Fluidos', 'Óleo do motor', 10000, 12, 'Troca', 'Sim', 'OLEO MOTOR|OLEO LUBRIFICANTE|TROCA DE OLEO', 'O que vier primeiro. Uso severo (patrulhamento urbano, marcha lenta prolongada) encurta o intervalo.'],
    ['Filtros', 'Filtro de óleo', 10000, 12, 'Troca', 'Sim', 'FILTRO DE OLEO|FILTRO OLEO', 'Sempre junto com o óleo do motor.'],
    ['Filtros', 'Filtro de ar do motor', 20000, 24, 'Troca', 'Não', 'FILTRO DE AR|FILTRO AR MOTOR', 'Metade do intervalo em via de terra ou poeira.'],
    ['Filtros', 'Filtro de combustível', 20000, 24, 'Troca', 'Sim', 'FILTRO DE COMBUSTIVEL|FILTRO COMBUSTIVEL|FILTRO DE GASOLINA', 'No diesel, pode exigir troca antes por qualidade do combustível.'],
    ['Filtros', 'Filtro do ar-condicionado', 20000, 12, 'Troca', 'Não', 'FILTRO DE CABINE|FILTRO AR CONDICIONADO|FILTRO ANTIPOLEN', 'Afeta desembaçamento e visibilidade.'],
    ['Freios', 'Pastilhas de freio', 30000, 24, 'Troca', 'Sim', 'PASTILHA|PASTILHAS DE FREIO', 'Inspecionar a cada 10.000 km. Viatura em ronda urbana gasta bem antes.'],
    ['Freios', 'Discos de freio', 60000, 48, 'Troca', 'Sim', 'DISCO DE FREIO|DISCOS', 'Trocar quando atingir a espessura mínima, normalmente a cada duas trocas de pastilha.'],
    ['Freios', 'Fluido de freio', 40000, 24, 'Troca', 'Sim', 'FLUIDO DE FREIO|DOT 4|DOT4', 'Absorve umidade e perde ponto de ebulição: falha em frenagem prolongada, mesmo com pastilha boa.'],
    ['Freios', 'Lonas e tambores', 40000, 48, 'Inspeção', 'Sim', 'LONA DE FREIO|TAMBOR', 'Onde houver freio traseiro a tambor.'],
    ['Pneus', 'Rodízio de pneus', 10000, 12, 'Serviço', 'Não', 'RODIZIO|RODIZIO DE PNEUS', 'Iguala o desgaste e estende a vida do jogo.'],
    ['Pneus', 'Troca de pneus', 50000, 60, 'Troca', 'Sim', 'PNEU|PNEUS', 'Limite legal de sulco é 1,6 mm; o prudente é trocar em 3 mm. Cinco anos de fabricação é limite por idade, mesmo com sulco bom.'],
    ['Pneus', 'Alinhamento e balanceamento', 10000, 12, 'Serviço', 'Não', 'ALINHAMENTO|BALANCEAMENTO|CAMBAGEM', 'Refazer sempre que trocar pneu ou peça de suspensão.'],
    ['Suspensão e direção', 'Amortecedores', 70000, 60, 'Troca', 'Sim', 'AMORTECEDOR|KIT AMORTECEDOR', 'Inspecionar a cada 20.000 km: amortecedor ruim aumenta a distância de frenagem.'],
    ['Suspensão e direção', 'Pivôs, terminais e bieletas', 20000, 12, 'Inspeção', 'Sim', 'PIVO|TERMINAL DE DIRECAO|BIELETA|BANDEJA', 'Folga em direção é causa direta de perda de controle.'],
    ['Suspensão e direção', 'Coifas e juntas homocinéticas', 20000, 12, 'Inspeção', 'Não', 'COIFA|HOMOCINETICA|TRIZETA', 'Coifa rasgada leva a junta a durar poucos meses.'],
    ['Motor', 'Correia dentada e tensor', 60000, 48, 'Troca', 'Sim', 'CORREIA DENTADA|KIT CORREIA|TENSOR', 'Onde o motor usa corrente, seguir o manual. O rompimento destrói o motor.'],
    ['Motor', 'Correia de acessórios', 60000, 48, 'Troca', 'Não', 'CORREIA ALTERNADOR|CORREIA ACESSORIOS|CORREIA POLY V', 'Rompimento para alternador, direção e ar-condicionado.'],
    ['Motor', 'Velas de ignição', 40000, 36, 'Troca', 'Não', 'VELA DE IGNICAO|VELAS', 'Convencionais aos 30.000 km; irídio ou platina chegam a 80.000.'],
    ['Fluidos', 'Fluido de arrefecimento', 50000, 36, 'Troca', 'Sim', 'ADITIVO|LIQUIDO DE ARREFECIMENTO|FLUIDO RADIADOR', 'Perde proteção anticorrosão e superaquece o motor.'],
    ['Fluidos', 'Óleo do câmbio', 80000, 60, 'Troca', 'Não', 'OLEO CAMBIO|FLUIDO TRANSMISSAO|ATF', 'Automáticos costumam exigir antes dos manuais.'],
    ['Elétrica', 'Bateria', 0, 36, 'Troca', 'Sim', 'BATERIA', 'Testar a cada 6 meses. Viatura com giroflex, rádio e computador em marcha lenta reduz a vida da bateria.'],
    ['Segurança', 'Palhetas do limpador', 0, 12, 'Troca', 'Não', 'PALHETA|LIMPADOR', 'Item de visibilidade, barato e frequentemente esquecido.'],
    ['Segurança', 'Extintor de incêndio', 0, 60, 'Inspeção', 'Sim', 'EXTINTOR', 'Conferir validade e carga; obrigatório em veículo oficial.'],
    ['Segurança', 'Estepe, macaco e chave de roda', 0, 6, 'Inspeção', 'Sim', 'ESTEPE|MACACO|CHAVE DE RODA', 'Estepe calibrado e ferramenta completa — verificar na revisão.'],
    ['Segurança', 'Iluminação e sinalização', 0, 6, 'Inspeção', 'Sim', 'LAMPADA|FAROL|LANTERNA|GIROFLEX|SIRENE', 'Inclui o sinalizador de emergência, que é equipamento operacional.'],
    ['Elétrica', 'Ar-condicionado (carga e higienização)', 0, 24, 'Serviço', 'Não', 'AR CONDICIONADO|HIGIENIZACAO|GAS REFRIGERANTE', 'Afeta desembaçamento, e portanto a visibilidade.']
  ];

  const porCategoria = {};
  PREVENTIVA.categorias.forEach(cat => { porCategoria[cat] = comum.map(l => l.slice()); });

  // ajustes por categoria: uso severo encurta, diesel pesado alonga
  const ajustar = (cat, item, km, meses, obs) => {
    const linha = porCategoria[cat].find(l => l[1] === item);
    if (!linha) return;
    if (km !== null) linha[2] = km;
    if (meses !== null) linha[3] = meses;
    if (obs) linha[8] = obs;
  };

  // Caminhonete diesel 4x4: óleo mais curto, itens de transmissão a mais
  ajustar('Caminhonete diesel 4x4', 'Óleo do motor', 10000, 12, 'Diesel com uso severo pede 5.000 km em serviço de patrulhamento em via não pavimentada.');
  ajustar('Caminhonete diesel 4x4', 'Filtro de combustível', 10000, 12, 'Diesel exige troca mais frequente; trocar antes se houver perda de potência.');
  porCategoria['Caminhonete diesel 4x4'].push(
    ['Fluidos', 'Óleo do diferencial', 60000, 48, 'Troca', 'Não', 'OLEO DIFERENCIAL|DIFERENCIAL', 'Antes se houver uso em atoleiro ou travessia de água.'],
    ['Fluidos', 'Óleo da caixa de transferência', 60000, 48, 'Troca', 'Não', 'CAIXA DE TRANSFERENCIA|TRANSFER', 'Específico das 4x4.'],
    ['Motor', 'Filtro de partículas / Arla 32', 0, 12, 'Inspeção', 'Não', 'ARLA|SCR|CATALISADOR|DPF', 'Diesel com pós-tratamento de emissões.'],
    ['Suspensão e direção', 'Rolamentos de roda', 80000, 60, 'Inspeção', 'Sim', 'ROLAMENTO|CUBO DE RODA', 'Ruído em curva é o primeiro sinal.']);

  // Motocicleta: tudo mais curto, e a transmissão por corrente entra como segurança
  porCategoria['Motocicleta'] = [
    ['Fluidos', 'Óleo do motor', 5000, 6, 'Troca', 'Sim', 'OLEO MOTOR|TROCA DE OLEO', 'Motor de moto trabalha em rotação alta e com menos óleo: intervalo curto.'],
    ['Filtros', 'Filtro de óleo', 5000, 6, 'Troca', 'Sim', 'FILTRO DE OLEO', 'Junto com o óleo.'],
    ['Filtros', 'Filtro de ar', 10000, 12, 'Troca', 'Não', 'FILTRO DE AR', 'Metade em via de terra.'],
    ['Motor', 'Velas de ignição', 10000, 12, 'Troca', 'Não', 'VELA', ''],
    ['Freios', 'Pastilhas de freio', 15000, 12, 'Troca', 'Sim', 'PASTILHA', 'Inspecionar a cada 5.000 km.'],
    ['Freios', 'Discos de freio', 40000, 48, 'Inspeção', 'Sim', 'DISCO DE FREIO', 'Conferir espessura e empenamento.'],
    ['Freios', 'Fluido de freio', 20000, 24, 'Troca', 'Sim', 'FLUIDO DE FREIO|DOT', 'Mais crítico que no carro: sistema menor, aquece mais rápido.'],
    ['Pneus', 'Troca de pneus', 20000, 60, 'Troca', 'Sim', 'PNEU', 'Dianteiro e traseiro gastam em ritmos diferentes. Limite de idade: 5 anos.'],
    ['Suspensão e direção', 'Corrente, coroa e pinhão', 25000, 24, 'Troca', 'Sim', 'CORRENTE|COROA|PINHAO|KIT RELACAO', 'Lubrificar a cada 500 km. Corrente folgada ou travada causa queda.'],
    ['Suspensão e direção', 'Rolamento da direção e suspensão', 20000, 12, 'Inspeção', 'Sim', 'ROLAMENTO|SUSPENSAO|BENGALA|AMORTECEDOR', 'Folga na direção é perda de controle.'],
    ['Elétrica', 'Bateria', 0, 24, 'Troca', 'Não', 'BATERIA', 'Moto parada descarrega mais rápido.'],
    ['Segurança', 'Iluminação e sinalização', 0, 6, 'Inspeção', 'Sim', 'LAMPADA|FAROL|LANTERNA|GIROFLEX|SIRENE', '']
  ];

  // Van, micro-ônibus e caminhão: transporte de pessoas e carga pesada
  ['Van/Micro-ônibus', 'Caminhão'].forEach(cat => {
    ajustar(cat, 'Óleo do motor', 15000, 12, 'Motor diesel de maior porte; seguir o manual, que costuma permitir intervalo maior.');
    ajustar(cat, 'Pastilhas de freio', 40000, 24, 'Inspecionar a cada 10.000 km. Veículo carregado exige mais do freio.');
    porCategoria[cat].push(
      ['Freios', 'Sistema de freio a ar e reservatórios', 0, 6, 'Inspeção', 'Sim', 'FREIO A AR|COMPRESSOR|RESERVATORIO DE AR', 'Drenar a água dos reservatórios e conferir vazamentos.'],
      ['Suspensão e direção', 'Molas e feixes', 60000, 48, 'Inspeção', 'Sim', 'MOLA|FEIXE DE MOLA|GRAMPO', ''],
      ['Segurança', 'Cintos e saídas de emergência', 0, 6, 'Inspeção', 'Sim', 'CINTO|SAIDA DE EMERGENCIA', 'Obrigatório em transporte de pessoas.']);
  });

  const linhas = [];
  PREVENTIVA.categorias.forEach(cat => {
    porCategoria[cat].forEach(l => linhas.push([cat, l[0], l[1], l[2] || '', l[3] || '', l[4], l[5], l[6], l[7] || '']));
  });
  return linhas;
}

/** Cria (ou recria) a base de referência da preventiva. */
function criarBasePreventiva() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);

  let aba = ss.getSheetByName(PREVENTIVA.abaPadrao);
  if (aba) {
    const resposta = aba.getLastRow();
    Logger.log('A aba ' + PREVENTIVA.abaPadrao + ' já existe com ' + resposta + ' linha(s). Nada foi alterado.');
    Logger.log('Para recriar do zero, apague a aba e rode de novo.');
  } else {
    aba = ss.insertSheet(PREVENTIVA.abaPadrao);
    const linhas = _tabelaPreventiva_();
    aba.getRange(1, 1, 1, PREVENTIVA.cabPadrao.length).setValues([PREVENTIVA.cabPadrao]);
    aba.getRange(2, 1, linhas.length, PREVENTIVA.cabPadrao.length).setValues(
      linhas.map(l => [l[0], l[1], l[2], l[3], l[4], l[5], l[6], l[7], l[8]]));
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, PREVENTIVA.cabPadrao.length).setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
    aba.setColumnWidth(3, 230); aba.setColumnWidth(8, 260); aba.setColumnWidth(9, 420);
    Logger.log(linhas.length + ' item(ns) gravado(s) em ' + PREVENTIVA.abaPadrao + '.');
  }

  let exc = ss.getSheetByName(PREVENTIVA.abaViatura);
  if (!exc) {
    exc = ss.insertSheet(PREVENTIVA.abaViatura);
    exc.getRange(1, 1, 1, PREVENTIVA.cabViatura.length).setValues([PREVENTIVA.cabViatura]);
    exc.setFrozenRows(1);
    exc.getRange(1, 1, 1, PREVENTIVA.cabViatura.length).setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
    Logger.log('Aba ' + PREVENTIVA.abaViatura + ' criada para as exceções por placa.');
  }
  SpreadsheetApp.flush();
  limparCache();
  return 'ok';
}

/** Lê a base de referência, já pronta para a tela. */
function lerBasePreventiva(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  return _basePreventiva_();
}

/** Mesma leitura, sem exigir sessão: usada pelo cálculo e pelo diagnóstico. */
function _basePreventiva_() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const aba = ss.getSheetByName(PREVENTIVA.abaPadrao);
    if (!aba) return { ok: false, erro: 'Rode criarBasePreventiva() no editor para criar a base.' };
    const padrao = [];
    if (aba.getLastRow() > 1) {
      aba.getRange(2, 1, aba.getLastRow() - 1, PREVENTIVA.cabPadrao.length).getValues().forEach(l => {
        if (!String(l[2] || '').trim()) return;
        padrao.push({ categoria: String(l[0] || ''), grupo: String(l[1] || ''), item: String(l[2] || ''),
          km: _num_(l[3]) || 0, meses: _num_(l[4]) || 0, tipo: String(l[5] || ''),
          critico: /sim/i.test(String(l[6] || '')), chaves: String(l[7] || ''), obs: String(l[8] || '') });
      });
    }
    const excecoes = [];
    const exc = ss.getSheetByName(PREVENTIVA.abaViatura);
    if (exc && exc.getLastRow() > 1) {
      exc.getRange(2, 1, exc.getLastRow() - 1, PREVENTIVA.cabViatura.length).getValues().forEach(l => {
        const placa = String(l[0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!placa) return;
        excecoes.push({ placa: placa, item: String(l[1] || ''), km: _num_(l[2]) || 0,
          meses: _num_(l[3]) || 0, motivo: String(l[4] || '') });
      });
    }
    return { ok: true, padrao: padrao, excecoes: excecoes,
      categorias: PREVENTIVA.categorias, grupos: PREVENTIVA.grupos };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Cria ou atualiza a exceção de uma viatura. */
function salvarExcecaoPreventiva(token, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode definir exceções.' };
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    let aba = ss.getSheetByName(PREVENTIVA.abaViatura);
    if (!aba) { criarBasePreventiva(); aba = ss.getSheetByName(PREVENTIVA.abaViatura); }
    const placa = String((dados || {}).placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const item = String((dados || {}).item || '').trim();
    if (!placa || !item) return { ok: false, erro: 'Informe a placa e o item.' };
    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');

    let linha = -1;
    if (aba.getLastRow() > 1) {
      const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < valores.length; i++) {
        if (String(valores[i][0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === placa &&
            String(valores[i][1] || '').trim() === item) { linha = i + 2; break; }
      }
    }
    if (linha < 0) linha = aba.getLastRow() + 1;
    aba.getRange(linha, 1, 1, PREVENTIVA.cabViatura.length).setValues([[placa, item,
      _parseNumeroBR_(dados.km) || '', _parseNumeroBR_(dados.meses) || '',
      String(dados.motivo || ''), agora, p.sessao.email]]);
    SpreadsheetApp.flush();
    limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Exceção de preventiva', placa, item,
      (dados.km || '') + ' km / ' + (dados.meses || '') + ' meses • ' + (dados.motivo || ''));
    return { ok: true };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}


/**
 * Cálculo da preventiva.
 *
 * A regra nunca fica no código: é lida da aba PreventivaPadrao (e das exceções
 * por placa) a cada execução. Para não reprocessar 34 mil abastecimentos a
 * cada abertura, o resultado é guardado em cache — mas a chave do cache inclui
 * uma assinatura da base de regras. Mudou um intervalo na planilha, a
 * assinatura muda e o cálculo é refeito sozinho na próxima abertura.
 */

/** Assinatura das regras: muda sempre que um intervalo ou item for alterado. */
function _assinaturaPreventiva_(padrao, excecoes) {
  const texto = padrao.map(r => r.categoria + '|' + r.item + '|' + r.km + '|' + r.meses + '|' + r.chaves).join(';') +
    '#' + excecoes.map(e => e.placa + '|' + e.item + '|' + e.km + '|' + e.meses).join(';');
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, texto, Utilities.Charset.UTF_8);
  return bytes.map(b => ((b & 0xFF) + 256).toString(16).slice(1)).join('').substring(0, 12);
}

/** Categoria de preventiva de uma viatura, a partir do tipo e da espécie. */
function _categoriaPreventiva_(v) {
  const t = _normCab_((v.tipo || '') + ' ' + (v.especie || '') + ' ' + (v.modelo || ''));
  if (/MOTOCICLETA|MOTONETA|CICLOMOTOR|TRICICLO/.test(t)) return 'Motocicleta';
  if (/CAMINHAO|CAMINHAO TRATOR|TRATOR|REBOQUE/.test(t)) return 'Caminhão';
  if (/ONIBUS|MICROONIBUS|MICRO-ONIBUS|VAN|FURGAO/.test(t)) return 'Van/Micro-ônibus';
  if (/CAMIONETA|CAMINHONETE|PICAPE|CABINE DUPLA|4X4|HILUX|S10|RANGER|L200|AMAROK|TRITON/.test(t)) {
    return /DIESEL|4X4|HILUX|S10|RANGER|L200|AMAROK|TRITON/.test(_normCab_((v.comb || '') + ' ' + (v.modelo || '')))
      ? 'Caminhonete diesel 4x4' : 'Camionete/SUV';
  }
  if (/UTILITARIO|SUV/.test(t)) return 'Camionete/SUV';
  return 'Automóvel';
}

/** Hodômetro e ritmo de uso de cada viatura, pela série de abastecimentos. */
function _odometrosPorPlaca_(ss) {
  const mapa = {};
  // as duas bases registram hodômetro; usamos ambas e ficamos com a mais recente
  const fontes = [
    { aba: CONFIG.ABA_ABAST, exigidas: ['PLACA', 'LITROS', 'VALOR EMISSAO'], nome: 'abastecimento' },
    { aba: CONFIG.ABA_MANUT, exigidas: ['PLACA', 'VALOR EMISSAO'], nome: 'manutenção' }
  ];
  fontes.forEach(fonte => {
    const tab = _abaTransacoes_(ss, fonte.aba, fonte.exigidas);
    if (!tab) return;
    const { valores, cab } = tab;
    const iData = cab.indexOf('DATA TRANSACAO'), iPlaca = cab.indexOf('PLACA'),
          iOdo = cab.indexOf('HODOMETRO OU HORIMETRO');
    if (iPlaca < 0 || iOdo < 0) return;
    valores.forEach(l => {
      const placa = String(l[iPlaca] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const odo = _num_(l[iOdo]) || 0;
      if (!placa || odo <= 0) return;
      const data = _diaISO_(l[iData]);
      if (!data) return;
      const m = mapa[placa] || (mapa[placa] = { leituras: [] });
      m.leituras.push({ data: data, odo: odo, fonte: fonte.nome });
    });
  });

  Object.keys(mapa).forEach(placa => {
    const m = mapa[placa];
    m.leituras.sort((a, b) => a.data.localeCompare(b.data));
    // descarta leitura absurda: menor que a anterior ou salto acima de 5.000 km entre abastecimentos
    const limpas = [];
    m.leituras.forEach(x => {
      const ant = limpas[limpas.length - 1];
      if (!ant) { limpas.push(x); return; }
      if (x.odo < ant.odo) return;                         // hodômetro andou para trás
      if (x.odo - ant.odo > 5000) return;                  // salto incompatível com um tanque
      limpas.push(x);
    });
    m.suspeitas = m.leituras.length - limpas.length;
    m.leituras = limpas;
    const n = limpas.length;
    m.odometro = n ? limpas[n - 1].odo : 0;
    m.ultimaLeitura = n ? limpas[n - 1].data : '';
    m.ultimaFonte = n ? limpas[n - 1].fonte : '';
    m.primeiraLeitura = n ? limpas[0].data : '';
    m.primeiroOdo = n ? limpas[0].odo : 0;
    // km por mês, medido nos últimos 12 meses de leituras
    if (n >= 2) {
      const fim = limpas[n - 1], ini = limpas[Math.max(0, n - 1 - 40)];
      const dias = (new Date(fim.data) - new Date(ini.data)) / 86400000;
      m.kmMes = dias > 20 ? Math.round((fim.odo - ini.odo) / dias * 30) : 0;
    } else m.kmMes = 0;
    m.confiavel = n >= 3 && m.kmMes > 0;
    m.leiturasQtd = n;
  });
  return mapa;
}

/**
 * Hodômetro aproximado de uma viatura numa data, interpolando entre as duas
 * leituras de abastecimento mais próximas. Usado quando o registro do serviço
 * não traz a quilometragem — o que é comum no detalhamento das OS.
 */
function _odoNaData_(serie, dataISO) {
  if (!serie || !serie.leituras || !serie.leituras.length || !dataISO) return { valor: 0, estimado: false };
  const leituras = serie.leituras;
  let antes = null, depois = null;
  for (let i = 0; i < leituras.length; i++) {
    if (leituras[i].data <= dataISO) antes = leituras[i];
    if (leituras[i].data >= dataISO && !depois) depois = leituras[i];
  }
  if (antes && antes.data === dataISO) return { valor: antes.odo, estimado: false };
  if (antes && depois && depois.data > antes.data) {
    const total = (new Date(depois.data) - new Date(antes.data)) / 86400000;
    const parcial = (new Date(dataISO) - new Date(antes.data)) / 86400000;
    const valor = Math.round(antes.odo + (depois.odo - antes.odo) * (parcial / total));
    return { valor: valor, estimado: true };
  }
  if (antes) {       // depois da última leitura: projeta pelo ritmo
    const dias = (new Date(dataISO) - new Date(antes.data)) / 86400000;
    return { valor: Math.round(antes.odo + (serie.kmMes || 0) * dias / 30), estimado: true };
  }
  return { valor: depois ? depois.odo : 0, estimado: true };
}

/**
 * Aba de detalhamento de itens das OS. Procura, nesta ordem, na planilha de
 * manutenção em uso, na planilha-mãe e na planilha antiga — enquanto a
 * migração dessa aba não acontecer, os dados ainda estão lá.
 */
function _abaDetalhamento_() {
  const procurar = ss => {
    if (!ss) return null;
    const exata = ss.getSheetByName(CONFIG.ABA_DETALHAMENTO);
    if (exata) return exata;
    return ss.getSheets().find(a => /DETALHAMENTO/.test(_normCab_(a.getName()))) || null;
  };
  const candidatas = [];
  try { candidatas.push(_ssManut_()); } catch (e) {}
  try { candidatas.push(SpreadsheetApp.openById(CONFIG.ID_BASE)); } catch (e) {}
  if (CONFIG.ID_MANUT_ANTIGA) { try { candidatas.push(SpreadsheetApp.openById(CONFIG.ID_MANUT_ANTIGA)); } catch (e) {} }
  for (let i = 0; i < candidatas.length; i++) {
    const aba = procurar(candidatas[i]);
    if (aba && aba.getLastRow() > 1) return aba;
  }
  return null;
}

/**
 * Última execução de cada item. Em vez de depender de uma coluna específica,
 * varre todas as colunas de texto que descrevem serviço, peça ou item — os
 * nomes variam entre ManutBD e DetalhamentoDB.
 */
function _servicosPorPlaca_(ss, padrao, diag) {
  const mapa = {};
  const relatorio = diag || { fontes: [], casamentos: {} };

  const registrar = (placa, data, odo, texto, fonte, os, coluna) => {
    if (!placa || !texto) return;
    const alvo = _normCab_(texto);
    if (alvo.length < 3) return;
    padrao.forEach(regra => {
      if (!regra.chaves) return;
      const casa = regra.chaves.split('|').some(k => k.trim() && alvo.indexOf(_normCab_(k)) >= 0);
      if (!casa) return;
      relatorio.casamentos[regra.item] = (relatorio.casamentos[regra.item] || 0) + 1;
      const chave = placa + '|' + regra.item;
      const atual = mapa[chave];
      // prefere sempre o registro com data; entre dois com data, o mais recente
      const melhor = !atual || (data && !atual.data) || (data && atual.data && data > atual.data) ||
                     (!data && !atual.data && (odo || 0) > (atual.odo || 0));
      if (melhor) mapa[chave] = { data: data || '', odo: odo || 0, texto: String(texto).substring(0, 120),
        fonte: fonte, os: os || '', coluna: coluna || '' };
    });
  };

  /** Percorre uma tabela qualquer procurando placa, data, hodômetro e textos. */
  const varrer = (valores, cabIdx, fonte) => {
    if (!valores || !valores.length) return;
    const nomes = valores[cabIdx].map(c => _normCab_(c));
    const iPlaca = nomes.findIndex(c => /^PLACA/.test(c));
    if (iPlaca < 0) { relatorio.fontes.push(fonte + ': sem coluna de placa'); return; }
    // a data pode se chamar DATA TRANSACAO, Conclusão do Serviço, Emissão...
    const iData = nomes.findIndex(c => /^DATA|CONCLUSAO|EMISSAO|^DT /.test(c));
    const iOdo = nomes.findIndex(c => /HODOMETRO|ODOMETRO|\bKM\b|QUILOMETR/.test(c));
    const iOs = nomes.findIndex(c => /ORDEM DE SERVICO|ORDEM SERVICO|^OS$|^N OS/.test(c));
    // qualquer coluna cujo nome sugira descrição de serviço, peça ou item
    const textuais = [];
    nomes.forEach((n, i) => {
      if (/DESCRI|SERVIC|ITEM|PECA|PECAS|PRODUTO|MANUTENCAO|OBSERVA|INFORMACAO/.test(n)) textuais.push(i);
    });
    if (!textuais.length) { relatorio.fontes.push(fonte + ': nenhuma coluna de descrição'); return; }
    relatorio.fontes.push(fonte + ': ' + (valores.length - cabIdx - 1) + ' linha(s)' +
      ' | data: ' + (iData >= 0 ? valores[cabIdx][iData] : 'NÃO ACHOU') +
      ' | hodômetro: ' + (iOdo >= 0 ? valores[cabIdx][iOdo] : 'não há') +
      ' | descrição: ' + textuais.map(i => valores[cabIdx][i]).join(', '));
    for (let r = cabIdx + 1; r < valores.length; r++) {
      const placa = String(valores[r][iPlaca] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!placa) continue;
      const data = iData >= 0 ? _diaISO_(valores[r][iData]) : '';
      const odo = iOdo >= 0 ? (_num_(valores[r][iOdo]) || 0) : 0;
      const os = iOs >= 0 ? String(valores[r][iOs] || '').replace(/\D/g, '') : '';
      textuais.forEach(i => registrar(placa, data, odo, valores[r][i], fonte, os, valores[cabIdx][i]));
    }
  };

  const acharCabecalho = valores => {
    for (let i = 0; i < Math.min(8, valores.length); i++) {
      if (valores[i].some(c => /^PLACA/.test(_normCab_(c)))) return i;
    }
    return 0;
  };

  // DetalhamentoDB: item a item das OS (o nome da aba varia entre planilhas)
  try {
    const aba = _abaDetalhamento_();
    if (aba && aba.getLastRow() > 1) {
      const valores = aba.getDataRange().getValues();
      varrer(valores, acharCabecalho(valores), 'Detalhamento: ' + aba.getParent().getName() + ' / ' + aba.getName());
    } else relatorio.fontes.push('Detalhamento: aba não encontrada ou vazia');
  } catch (e) { relatorio.fontes.push('Detalhamento: ' + String(e).substring(0, 80)); }

  // ManutBD: transações de manutenção
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_MANUT);
    if (aba && aba.getLastRow() > 1) {
      const valores = aba.getDataRange().getValues();
      varrer(valores, acharCabecalho(valores), 'ManutBD');
    } else relatorio.fontes.push('ManutBD: aba não encontrada ou vazia');
  } catch (e) { relatorio.fontes.push('ManutBD: ' + String(e).substring(0, 80)); }

  // AbastBD: o contrato permite pequenas despesas no cartão — troca de óleo e
  // filtros aparecem aqui, sem ordem de serviço
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_ABAST);
    if (aba && aba.getLastRow() > 1) {
      const valores = aba.getDataRange().getValues();
      varrer(valores, acharCabecalho(valores), 'Cartão de abastecimento');
    } else relatorio.fontes.push('AbastBD: aba não encontrada ou vazia');
  } catch (e) { relatorio.fontes.push('AbastBD: ' + String(e).substring(0, 80)); }

  return mapa;
}

/** Mostra no log por que a preventiva encontrou (ou não) os serviços. */
function diagnosticarPreventiva() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const base = _basePreventiva_();
  const padrao = base.ok ? base.padrao : [];
  Logger.log('Regras carregadas: ' + padrao.length + (base.ok ? '' : ' — ' + base.erro));
  if (padrao.length) {
    Logger.log('   exemplo de regra: ' + padrao[0].categoria + ' / ' + padrao[0].item + ' / chaves: ' + padrao[0].chaves);
  }
  const diag = { fontes: [], casamentos: {} };
  const servicos = _servicosPorPlaca_(ss, padrao, diag);
  Logger.log('--- fontes lidas ---');
  diag.fontes.forEach(f => Logger.log('   ' + f));
  Logger.log('--- itens reconhecidos ---');
  const chaves = Object.keys(diag.casamentos).sort((a, b) => diag.casamentos[b] - diag.casamentos[a]);
  if (!chaves.length) Logger.log('   nenhum: as palavras-chave da aba PreventivaPadrao não apareceram nas descrições');
  chaves.forEach(k => Logger.log('   ' + k + ': ' + diag.casamentos[k] + ' ocorrência(s)'));
  Logger.log('--- pares placa+item com histórico: ' + Object.keys(servicos).length);
  Object.keys(servicos).slice(0, 10).forEach(k => {
    const s = servicos[k];
    Logger.log('   ' + k + ' → ' + (s.data || 'sem data') + ' | ' + (s.odo || 'sem km') + ' | ' + s.texto);
  });
  const odo = _odometrosPorPlaca_(ss);
  const placas = Object.keys(odo);
  Logger.log('--- hodômetros: ' + placas.length + ' placa(s); confiáveis: ' + placas.filter(p => odo[p].confiavel).length);
  placas.slice(0, 5).forEach(p => Logger.log('   ' + p + ': ' + odo[p].odometro + ' km | ' + odo[p].kmMes + ' km/mês | ' + odo[p].leituras.length + ' leitura(s)'));
  return 'ok';
}

/**
 * Situação da preventiva de toda a frota. Sempre com as regras atuais:
 * se a planilha mudou, a assinatura muda e o cache é descartado.
 */
function lerPreventiva(token, forcar) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const base = _basePreventiva_();
    if (!base.ok) return base;
    const assinatura = _assinaturaPreventiva_(base.padrao, base.excecoes);
    const chave = 'painel_preventiva_' + assinatura;      // a regra faz parte da chave
    if (!forcar) {
      const guardado = _cacheLer_(chave);
      if (guardado) { guardado.doCache = true; return guardado; }
    }

    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const odometros = _odometrosPorPlaca_(ss);
    const servicos = _servicosPorPlaca_(ss, base.padrao);

    // exceções por placa e item
    const excecao = {};
    base.excecoes.forEach(e => { excecao[e.placa + '|' + e.item] = e; });

    const aba = ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const idx = _mapearCampos_(cab);
    const linhas = aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues();

    const hoje = new Date();
    const hojeISO = Utilities.formatDate(hoje, CONFIG.FUSO, 'yyyy-MM-dd');
    const itens = [];

    linhas.forEach(l => {
      const placa = String(l[idx.placa] || '').trim().toUpperCase();
      if (!placa) return;
      const status = idx.status !== undefined ? String(l[idx.status] || '') : '';
      if (/DESFAZ|BAIXAD|ALIENAD/i.test(_normCab_(status))) return;      // fora da frota ativa

      const v = { tipo: idx.tipo !== undefined ? l[idx.tipo] : '', especie: idx.especie !== undefined ? l[idx.especie] : '',
        modelo: idx.modelo !== undefined ? l[idx.modelo] : '', comb: idx.comb !== undefined ? l[idx.comb] : '' };
      const categoria = _categoriaPreventiva_(v);
      const odo = odometros[placa] || { odometro: 0, kmMes: 0, confiavel: false, ultimaLeitura: '', suspeitas: 0 };

      base.padrao.filter(r => r.categoria === categoria).forEach(regra => {
        const exc = excecao[placa + '|' + regra.item];
        const km = exc && exc.km ? exc.km : regra.km;
        const meses = exc && exc.meses ? exc.meses : regra.meses;
        const ultimo = servicos[placa + '|' + regra.item] || null;

        let kmDesde = null, diasDesde = null, vencidoKm = false, vencidoTempo = false, previsao = '';
        let odoUltimo = ultimo ? ultimo.odo : 0, odoEstimado = false;
        if (ultimo && !odoUltimo && ultimo.data) {
          const est = _odoNaData_(odo, ultimo.data);
          odoUltimo = est.valor; odoEstimado = est.estimado && !!est.valor;
        }
        if (ultimo) {
          if (km && odoUltimo && odo.odometro) { kmDesde = odo.odometro - odoUltimo; vencidoKm = kmDesde >= km; }
          if (meses && ultimo.data) {
            diasDesde = Math.round((new Date(hojeISO) - new Date(ultimo.data)) / 86400000);
            vencidoTempo = diasDesde >= meses * 30;
          }
          // quando vence por quilometragem, projetando o ritmo atual
          if (km && kmDesde !== null && odo.kmMes > 0 && !vencidoKm) {
            const faltam = km - kmDesde;
            const dias = Math.round(faltam / odo.kmMes * 30);
            const d = new Date(hoje.getTime() + dias * 86400000);
            previsao = Utilities.formatDate(d, CONFIG.FUSO, 'dd/MM/yyyy');
          }
        }
        const semHistorico = !ultimo;
        // Sem registro não significa pendência: se a viatura só é observada há
        // pouco tempo (ou rodou pouco desde a primeira leitura), o item ainda
        // não teria vencido de qualquer forma.
        let semRegistroEmDia = false;
        if (semHistorico && odo.primeiraLeitura) {
          const diasObs = Math.round((new Date(hojeISO) - new Date(odo.primeiraLeitura)) / 86400000);
          const kmObs = odo.odometro && odo.primeiroOdo ? odo.odometro - odo.primeiroOdo : 0;
          const dentroTempo = !meses || diasObs < meses * 30;
          const dentroKm = !km || (kmObs && kmObs < km);
          semRegistroEmDia = dentroTempo && dentroKm;
        }
        const vencido = vencidoKm || vencidoTempo;
        // dias até vencer, para ordenar: negativo = vencido
        let diasAteVencer = null;
        if (vencido) diasAteVencer = -1;
        else if (meses && diasDesde !== null) diasAteVencer = meses * 30 - diasDesde;
        if (km && kmDesde !== null && odo.kmMes > 0) {
          const porKm = Math.round((km - kmDesde) / odo.kmMes * 30);
          diasAteVencer = diasAteVencer === null ? porKm : Math.min(diasAteVencer, porKm);
        }

        itens.push({ placa: placa, categoria: categoria,
          modelo: idx.modelo !== undefined ? String(l[idx.modelo] || '') : '',
          unidade: idx.unidade !== undefined ? String(l[idx.unidade] || '') : '',
          statusVtr: status, grupo: regra.grupo, item: regra.item, tipo: regra.tipo, critico: regra.critico,
          intervaloKm: km, intervaloMeses: meses, comExcecao: !!exc, motivoExcecao: exc ? exc.motivo : '',
          odometro: odo.odometro, kmMes: odo.kmMes, odoConfiavel: odo.confiavel,
          odoData: odo.ultimaLeitura ? _dataBR_(odo.ultimaLeitura) : '', leiturasQtd: odo.leiturasQtd || 0,
          odoFonte: odo.ultimaFonte || '',
          ultimaData: ultimo ? _dataBR_(ultimo.data) : '', ultimoOdo: odoUltimo, odoEstimado: odoEstimado,
          ultimoTexto: ultimo ? ultimo.texto : '',
          ultimaOs: ultimo ? ultimo.os : '', ultimaFonte: ultimo ? ultimo.fonte : '', ultimaColuna: ultimo ? ultimo.coluna : '',
          viaCartao: ultimo ? /CARTAO/i.test(_normCab_(ultimo.fonte || '')) : false,
          kmDesde: kmDesde === undefined ? null : kmDesde, diasDesde: diasDesde === undefined ? null : diasDesde,
          semHistorico: semHistorico, semRegistroEmDia: semRegistroEmDia,
          diasObservados: odo.primeiraLeitura ? Math.round((new Date(hojeISO) - new Date(odo.primeiraLeitura)) / 86400000) : null,
          vencido: vencido, vencidoKm: vencidoKm, vencidoTempo: vencidoTempo,
          diasAteVencer: diasAteVencer, previsao: previsao });
      });
    });

    const saida = { ok: true, itens: itens, assinatura: assinatura,
      geradoEm: Utilities.formatDate(hoje, CONFIG.FUSO, 'dd/MM/yyyy HH:mm'),
      placasSemOdometro: Object.keys(odometros).filter(k => !odometros[k].confiavel).length,
      totalRegras: base.padrao.length, totalExcecoes: base.excecoes.length };
    _cacheGravar_(chave, saida, CONFIG.CACHE_SEG || 3600);
    return saida;
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}


/**
 * Cenário real: com que quilometragem e em quanto tempo a frota vem de fato
 * trocando cada item, por categoria de veículo. Serve para comparar com o
 * intervalo que definimos — se a prática difere muito, ou o parâmetro está
 * errado, ou há algo acontecendo com as viaturas.
 */
function analisarPreventivaReal(token, forcar) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const base = _basePreventiva_();
    if (!base.ok) return base;
    const chave = 'painel_prev_real_' + _assinaturaPreventiva_(base.padrao, base.excecoes);
    if (!forcar) { const g = _cacheLer_(chave); if (g) { g.doCache = true; return g; } }

    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const odometros = _odometrosPorPlaca_(ss);

    // categoria de cada placa
    const aba = ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const idx = _mapearCampos_(cab);
    const categoria = {}, dadosVtr = {};
    aba.getRange(2, 1, aba.getLastRow() - 1, aba.getLastColumn()).getValues().forEach(l => {
      const placa = String(l[idx.placa] || '').trim().toUpperCase();
      if (!placa) return;
      const v = { tipo: idx.tipo !== undefined ? l[idx.tipo] : '', especie: idx.especie !== undefined ? l[idx.especie] : '',
        modelo: idx.modelo !== undefined ? l[idx.modelo] : '', comb: idx.comb !== undefined ? l[idx.comb] : '' };
      categoria[placa] = _categoriaPreventiva_(v);
      dadosVtr[placa] = { modelo: String(v.modelo || ''), unidade: idx.unidade !== undefined ? String(l[idx.unidade] || '') : '' };
    });

    // todas as execuções de cada item (não só a última)
    const execucoes = [];
    const registrar = (placa, data, odo, texto) => {
      if (!placa || !texto) return;
      const alvo = _normCab_(texto);
      base.padrao.forEach(regra => {
        if (!regra.chaves || regra.tipo === 'Inspeção') return;
        const casa = regra.chaves.split('|').some(k => k.trim() && alvo.indexOf(_normCab_(k)) >= 0);
        if (casa) execucoes.push({ placa: placa, item: regra.item, grupo: regra.grupo, data: data || '', odo: odo || 0 });
      });
    };
    const varrer = (valores, cabIdx) => {
      const nomes = valores[cabIdx].map(c => _normCab_(c));
      const iPlaca = nomes.findIndex(c => /^PLACA/.test(c));
      if (iPlaca < 0) return;
      const iData = nomes.findIndex(c => /^DATA|CONCLUSAO|EMISSAO|^DT /.test(c));
      const iOdo = nomes.findIndex(c => /HODOMETRO|ODOMETRO|\bKM\b|QUILOMETR/.test(c));
      const textuais = [];
      nomes.forEach((n, i) => { if (/DESCRI|SERVIC|ITEM|PECA|PECAS|PRODUTO|MANUTENCAO/.test(n)) textuais.push(i); });
      for (let r = cabIdx + 1; r < valores.length; r++) {
        const placa = String(valores[r][iPlaca] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (!placa) continue;
        const data = iData >= 0 ? _diaISO_(valores[r][iData]) : '';
        const odo = iOdo >= 0 ? (_num_(valores[r][iOdo]) || 0) : 0;
        textuais.forEach(i => registrar(placa, data, odo, valores[r][i]));
      }
    };
    const acharCab = valores => { for (let i = 0; i < Math.min(8, valores.length); i++) if (valores[i].some(c => /^PLACA/.test(_normCab_(c)))) return i; return 0; };
    try { const a = _abaDetalhamento_(); if (a && a.getLastRow() > 1) { const v = a.getDataRange().getValues(); varrer(v, acharCab(v)); } } catch (e) {}
    try { const a = ss.getSheetByName(CONFIG.ABA_MANUT); if (a && a.getLastRow() > 1) { const v = a.getDataRange().getValues(); varrer(v, acharCab(v)); } } catch (e) {}

    // intervalos observados: diferença entre execuções consecutivas do mesmo item
    const porChave = {};
    execucoes.forEach(e => {
      const k = e.placa + '|' + e.item;
      (porChave[k] = porChave[k] || []).push(e);
    });
    const amostras = {};   // categoria|item → { km: [], dias: [] }
    Object.keys(porChave).forEach(k => {
      const lista = porChave[k].filter(x => x.data).sort((a, b) => a.data.localeCompare(b.data));
      const placa = lista.length ? lista[0].placa : '';
      const cat = categoria[placa] || 'Automóvel';
      const item = lista.length ? lista[0].item : '';
      const chaveCat = cat + '|' + item;
      const a = amostras[chaveCat] || (amostras[chaveCat] = { km: [], dias: [], placas: {}, grupo: lista.length ? lista[0].grupo : '' });
      a.placas[placa] = true;
      for (let i = 1; i < lista.length; i++) {
        const ant = lista[i - 1], atual = lista[i];
        const dias = Math.round((new Date(atual.data) - new Date(ant.data)) / 86400000);
        if (dias > 20 && dias < 2000) a.dias.push(dias);        // ignora lançamentos do mesmo serviço
        if (ant.odo > 0 && atual.odo > ant.odo) {
          const km = atual.odo - ant.odo;
          if (km > 300 && km < 200000) a.km.push(km);
        }
      }
    });

    const mediana = arr => { if (!arr.length) return 0; const o = arr.slice().sort((x, y) => x - y); return o[Math.floor(o.length / 2)]; };
    const media = arr => arr.length ? Math.round(arr.reduce((s, x) => s + x, 0) / arr.length) : 0;

    const comparativo = [];
    base.padrao.filter(r => r.tipo !== 'Inspeção').forEach(regra => {
      const a = amostras[regra.categoria + '|' + regra.item];
      if (!a || (!a.km.length && !a.dias.length)) return;
      const kmReal = mediana(a.km), diasReal = mediana(a.dias);
      const desvioKm = regra.km && kmReal ? Math.round((kmReal / regra.km - 1) * 100) : null;
      const desvioTempo = regra.meses && diasReal ? Math.round((diasReal / (regra.meses * 30) - 1) * 100) : null;
      comparativo.push({ categoria: regra.categoria, grupo: regra.grupo, item: regra.item, critico: regra.critico,
        previstoKm: regra.km, previstoMeses: regra.meses,
        realKm: kmReal, realKmMedia: media(a.km), realDias: diasReal, realMeses: diasReal ? Math.round(diasReal / 30 * 10) / 10 : 0,
        amostrasKm: a.km.length, amostrasTempo: a.dias.length, viaturas: Object.keys(a.placas).length,
        desvioKm: desvioKm, desvioTempo: desvioTempo });
    });
    comparativo.sort((a, b) => Math.abs(b.desvioKm === null ? 0 : b.desvioKm) - Math.abs(a.desvioKm === null ? 0 : a.desvioKm));

    const saida = { ok: true, comparativo: comparativo, execucoes: execucoes.length,
      geradoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm') };
    _cacheGravar_(chave, saida, CONFIG.CACHE_SEG || 3600);
    return saida;
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}


/** Itens registrados numa OS, para conferir o que foi feito. */
function detalharOS(token, os) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const alvo = String(os || '').replace(/\D/g, '');
  if (!alvo) return { ok: false, erro: 'Informe o número da OS.' };
  try {
    const itens = [];
    let cabecalho = [];
    const aba = _abaDetalhamento_();
    if (aba && aba.getLastRow() > 1) {
      const valores = aba.getDataRange().getValues();
      let cabIdx = 0;
      for (let i = 0; i < Math.min(8, valores.length); i++) {
        if (valores[i].some(c => /^PLACA/.test(_normCab_(c)))) { cabIdx = i; break; }
      }
      const nomes = valores[cabIdx].map(c => String(c || '').trim());
      const norm = nomes.map(c => _normCab_(c));
      const iOs = norm.findIndex(c => /ORDEM DE SERVICO|ORDEM SERVICO|^OS$/.test(c));
      if (iOs >= 0) {
        cabecalho = nomes;
        for (let r = cabIdx + 1; r < valores.length; r++) {
          if (String(valores[r][iOs] || '').replace(/\D/g, '') !== alvo) continue;
          const linha = {};
          nomes.forEach((nome, i) => {
            if (!nome) return;
            const v = valores[r][i];
            linha[nome] = (v instanceof Date) ? _dataBR_(v) : String(v === null || v === undefined ? '' : v).trim();
          });
          itens.push(linha);
        }
      }
    }
    // resumo da OS, pelo OrçamentosDB
    let resumo = null;
    try {
      const abaOrc = _ssManut_().getSheetByName(CONFIG.ABA_ORCAMENTOS);
      if (abaOrc && abaOrc.getLastRow() > 2) {
        const valores = abaOrc.getDataRange().getValues();
        let cab = 0;
        for (let i = 0; i < Math.min(6, valores.length); i++) {
          if (valores[i].some(c => /ORDEM\s*SERVI/i.test(String(c)))) { cab = i; break; }
        }
        const nomes = valores[cab].map(c => _normCab_(c));
        const iOs = nomes.findIndex(c => /ORDEM SERVICO|^OS$/.test(c));
        if (iOs >= 0) {
          for (let r = cab + 1; r < valores.length; r++) {
            if (String(valores[r][iOs] || '').replace(/\D/g, '') !== alvo) continue;
            resumo = {};
            valores[cab].forEach((nome, i) => {
              if (!String(nome || '').trim()) return;
              const v = valores[r][i];
              resumo[String(nome).trim()] = (v instanceof Date) ? _dataBR_(v) : String(v === null || v === undefined ? '' : v).trim();
            });
            break;
          }
        }
      }
    } catch (e) { Logger.log('Resumo da OS: ' + e); }

    return { ok: true, os: alvo, itens: itens, colunas: cabecalho, resumo: resumo,
      pdf: (_indexarPdfsOS_() || []).filter(x => String(x.os || '').replace(/\D/g, '') === alvo).map(x => x.url)[0] || '' };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Resumo da preventiva de uma viatura, para a ficha. */
function preventivaDaViatura(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const tudo = lerPreventiva(token, false);
    if (!tudo.ok) return tudo;
    const alvo = String(placa || '').trim().toUpperCase();
    const itens = tudo.itens.filter(x => x.placa === alvo)
      .sort((a, b) => {
        const pa = a.vencido ? 0 : a.semHistorico ? 2 : 1, pb = b.vencido ? 0 : b.semHistorico ? 2 : 1;
        if (pa !== pb) return pa - pb;
        return (a.diasAteVencer === null ? 9999 : a.diasAteVencer) - (b.diasAteVencer === null ? 9999 : b.diasAteVencer);
      });
    return { ok: true, itens: itens,
      vencidos: itens.filter(x => x.vencido).length,
      proximos: itens.filter(x => !x.vencido && x.diasAteVencer !== null && x.diasAteVencer <= 30).length,
      criticos: itens.filter(x => x.critico && (x.vencido || x.semHistorico)).length,
      odometro: itens.length ? itens[0].odometro : 0, kmMes: itens.length ? itens[0].kmMes : 0 };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/* ============================================================
   GESTÃO DE DEMANDAS — quadro com três fases
   Aba "Demandas" na planilha-mãe, criada na primeira execução.
   Uma demanda pode estar ligada a uma viatura (placa) ou ser geral
   da frota. As anotações ficam num histórico dentro da própria linha.
   ============================================================ */

const DEMANDAS = {
  aba: 'Demandas',
  fases: ['Caixa de entrada', 'Em resolução', 'Concluído'],
  prioridades: ['Normal', 'Alta', 'Urgente'],
  cab: ['ID', 'Criada em', 'Criada por', 'Fase', 'Prioridade', 'Título', 'Descrição', 'Placa',
        'Responsável', 'Prazo', 'Atualizada em', 'Concluída em', 'Anotações', 'Processo SEI', 'Tarefas']
};

/** Número do processo SEI no formato oficial (00000.000000/0000-00). */
function _seiLimpo_(v) {
  const t = String(v === null || v === undefined ? '' : v).trim();
  if (!t) return '';
  const d = t.replace(/\D/g, '');
  if (d.length === 17) return d.substring(0, 5) + '.' + d.substring(5, 11) + '/' + d.substring(11, 15) + '-' + d.substring(15);
  return t;                                  // formato diferente fica como digitado
}

/**
 * Tarefas de uma demanda. Guardadas numa única célula, uma por linha, no
 * formato  [x] texto | prazo | responsável  — legível também na planilha.
 */
function _tarefasDeTexto_(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .split('\n')
    .map(l => String(l).trim())
    .filter(l => l)
    .map(l => {
      const m = l.match(/^\[([ xX])\]\s*(.*)$/);
      const feita = !!(m && /[xX]/.test(m[1]));
      const resto = m ? m[2] : l;
      const partes = resto.split('|').map(x => x.trim());
      return { feita: feita, texto: partes[0] || '', prazo: partes[1] || '', responsavel: partes[2] || '' };
    })
    .filter(t => t.texto);
}

function _tarefasParaTexto_(tarefas) {
  return (tarefas || []).filter(t => t && String(t.texto || '').trim()).map(t =>
    '[' + (t.feita ? 'x' : ' ') + '] ' + String(t.texto).trim() +
    (t.prazo ? ' | ' + _dataBR_(t.prazo) : '') +
    (t.responsavel ? ' | ' + String(t.responsavel).trim() : '')
  ).join('\n');
}

/** Placas de uma demanda: uma, várias separadas por vírgula, ou nenhuma. */
function _placasDaDemanda_(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .split(/[,;\/\n]+/)
    .map(x => x.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    .filter(x => x.length >= 6);
}

function _abaDemandas_() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  let aba = ss.getSheetByName(DEMANDAS.aba);
  if (!aba) {
    aba = ss.insertSheet(DEMANDAS.aba);
    aba.getRange(1, 1, 1, DEMANDAS.cab.length).setValues([DEMANDAS.cab]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, DEMANDAS.cab.length).setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
    aba.setColumnWidth(6, 260); aba.setColumnWidth(7, 320); aba.setColumnWidth(13, 420);
  } else {
    // abas criadas antes de um campo existir ganham a coluna. É preciso alargar
    // a grade primeiro: escrever além da última coluna existente dá erro.
    const necessarias = DEMANDAS.cab.length;
    if (aba.getMaxColumns() < necessarias) aba.insertColumnsAfter(aba.getMaxColumns(), necessarias - aba.getMaxColumns());
    [[14, 'Processo SEI'], [15, 'Tarefas']].forEach(c => {
      if (String(aba.getRange(1, c[0]).getValue() || '').trim() === '') {
        aba.getRange(1, c[0]).setValue(c[1])
           .setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
      }
    });
  }
  return aba;
}

function _linhaDemanda_(aba, id) {
  const n = aba.getLastRow();
  if (n < 2) return -1;
  const ids = aba.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

/** Todas as demandas, já prontas para o quadro. */
function lerDemandas(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = _abaDemandas_();
    const n = aba.getLastRow();
    const lista = [];
    if (n > 1) {
      aba.getRange(2, 1, n - 1, DEMANDAS.cab.length).getValues().forEach((l, i) => {
        if (!String(l[0]).trim() && !String(l[5]).trim()) return;
        lista.push({
          id: String(l[0]), linha: i + 2,
          criadaEm: _dataTxt_(l[1]), criadaPor: String(l[2] || ''),
          fase: String(l[3] || DEMANDAS.fases[0]), prioridade: String(l[4] || 'Normal'),
          titulo: String(l[5] || ''), descricao: String(l[6] || ''),
          placas: _placasDaDemanda_(l[7]),
          placa: _placasDaDemanda_(l[7])[0] || '',          // compatibilidade com o que já existia
          responsavel: String(l[8] || ''), prazo: _dataBR_(l[9]),
          atualizadaEm: _dataTxt_(l[10]), concluidaEm: _dataTxt_(l[11]),
          anotacoes: String(l[12] || '').split('\n').filter(x => x.trim()),
          sei: String(l[13] || '').trim(),
          tarefas: _tarefasDeTexto_(l[14])
        });
      });
    }
    return { ok: true, demandas: lista, fases: DEMANDAS.fases, prioridades: DEMANDAS.prioridades };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Cria ou atualiza uma demanda. Sem id, cria. */
function salvarDemanda(token, id, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Quadro ocupado. Tente de novo.' }; }
  try {
    const aba = _abaDemandas_();
    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
    const titulo = String((dados || {}).titulo || '').trim();
    if (!titulo) return { ok: false, erro: 'Informe o título da demanda.' };

    let linha = id ? _linhaDemanda_(aba, id) : -1;
    let novoId = id;
    if (linha < 0) {
      novoId = 'D' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyMMddHHmmss');
      linha = Math.max(aba.getLastRow() + 1, 2);
      aba.getRange(linha, 1, 1, DEMANDAS.cab.length).setValues([[
        novoId, agora, p.sessao.email, dados.fase || DEMANDAS.fases[0], dados.prioridade || 'Normal',
        titulo, dados.descricao || '', _placasDaDemanda_(dados.placa).join(', '),
        dados.responsavel || '', _dataBR_(dados.prazo), agora, '',
        agora + ' • ' + p.sessao.email + ': demanda criada', _seiLimpo_(dados.sei),
        _tarefasParaTexto_(dados.tarefas)
      ]]);
    } else {
      const atual = aba.getRange(linha, 1, 1, DEMANDAS.cab.length).getValues()[0];
      const mudancas = [];
      const campo = (indice, valor, rotulo) => {
        const antes = String(atual[indice] || '').trim();
        const depois = String(valor === null || valor === undefined ? '' : valor).trim();
        if (depois !== antes) mudancas.push(rotulo + ': "' + antes + '" → "' + depois + '"');
        return depois;
      };
      const fase = campo(3, dados.fase || atual[3], 'fase');
      const prioridade = campo(4, dados.prioridade || atual[4], 'prioridade');
      const tit = campo(5, titulo, 'título');
      const desc = campo(6, dados.descricao || '', 'descrição');
      const placa = campo(7, _placasDaDemanda_(dados.placa).join(', '), 'placa');
      const resp = campo(8, dados.responsavel || '', 'responsável');
      const prazo = campo(9, _dataBR_(dados.prazo), 'prazo');
      const sei = campo(13, _seiLimpo_(dados.sei), 'processo SEI');
      // as tarefas são gravadas por inteiro; o histórico registra o que mudou
      let tarefasTxt = String(atual[14] || '');
      if (dados.tarefas !== undefined) {
        const novas = _tarefasParaTexto_(dados.tarefas);
        if (novas !== tarefasTxt) {
          const antes = _tarefasDeTexto_(tarefasTxt), depois = _tarefasDeTexto_(novas);
          const feitas = depois.filter(t => t.feita && !antes.some(a => a.texto === t.texto && a.feita));
          const criadas = depois.filter(t => !antes.some(a => a.texto === t.texto));
          const removidas = antes.filter(a => !depois.some(t => t.texto === a.texto));
          const partes = [];
          feitas.forEach(t => partes.push('concluiu "' + t.texto + '"'));
          criadas.forEach(t => partes.push('criou a tarefa "' + t.texto + '"' + (t.prazo ? ' para ' + t.prazo : '')));
          removidas.forEach(t => partes.push('removeu a tarefa "' + t.texto + '"'));
          if (partes.length) mudancas.push(partes.join('; '));
          tarefasTxt = novas;
        }
      }
      const concluida = /conclu/i.test(fase) ? (String(atual[11] || '').trim() || agora) : '';
      aba.getRange(linha, 4, 1, 9).setValues([[fase, prioridade, tit, desc, placa, resp, prazo, agora, concluida]]);
      aba.getRange(linha, 14, 1, 2).setValues([[sei, tarefasTxt]]);
      if (mudancas.length) {
        const historico = String(atual[12] || '');
        aba.getRange(linha, 13).setValue((historico ? historico + '\n' : '') + agora + ' • ' + p.sessao.email + ': ' + mudancas.join('; '));
      }
    }
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, id ? 'Editar demanda' : 'Criar demanda', _placasDaDemanda_(dados.placa).join(' '), novoId, titulo);
    return { ok: true, id: novoId, novo: !id };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Move a demanda de fase (usado ao arrastar o cartão). */
function moverDemanda(token, id, fase) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (DEMANDAS.fases.indexOf(fase) < 0) return { ok: false, erro: 'Fase inválida.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Quadro ocupado.' }; }
  try {
    const aba = _abaDemandas_();
    const linha = _linhaDemanda_(aba, id);
    if (linha < 0) return { ok: false, erro: 'Demanda não encontrada.' };
    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
    const anterior = String(aba.getRange(linha, 4).getValue() || '');
    if (anterior === fase) return { ok: true, id: id, fase: fase };
    aba.getRange(linha, 4).setValue(fase);
    aba.getRange(linha, 11).setValue(agora);
    if (/conclu/i.test(fase)) { if (!String(aba.getRange(linha, 12).getValue() || '').trim()) aba.getRange(linha, 12).setValue(agora); }
    else aba.getRange(linha, 12).setValue('');
    const historico = String(aba.getRange(linha, 13).getValue() || '');
    aba.getRange(linha, 13).setValue((historico ? historico + '\n' : '') + agora + ' • ' + p.sessao.email + ': ' + anterior + ' → ' + fase);
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Mover demanda', '', id, anterior + ' → ' + fase);
    return { ok: true, id: id, fase: fase, atualizadaEm: agora };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Acrescenta uma anotação ao histórico da demanda. */
function anotarDemanda(token, id, texto) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const nota = String(texto || '').trim();
  if (!nota) return { ok: false, erro: 'Escreva a anotação.' };
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Quadro ocupado.' }; }
  try {
    const aba = _abaDemandas_();
    const linha = _linhaDemanda_(aba, id);
    if (linha < 0) return { ok: false, erro: 'Demanda não encontrada.' };
    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
    const historico = String(aba.getRange(linha, 13).getValue() || '');
    const linhaNova = agora + ' • ' + p.sessao.email + ': ' + nota.replace(/\n/g, ' ');
    aba.getRange(linha, 13).setValue((historico ? historico + '\n' : '') + linhaNova);
    aba.getRange(linha, 11).setValue(agora);
    SpreadsheetApp.flush();
    return { ok: true, anotacao: linhaNova };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Remove uma demanda (só o administrador). */
function excluirDemanda(token, id) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode excluir.' };
  try {
    const aba = _abaDemandas_();
    const linha = _linhaDemanda_(aba, id);
    if (linha < 0) return { ok: false, erro: 'Demanda não encontrada.' };
    const titulo = String(aba.getRange(linha, 6).getValue() || '');
    aba.deleteRow(linha);
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Excluir demanda', '', id, titulo);
    return { ok: true };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}


/* ============================================================
   ANOTAÇÕES — notas curtas de apoio à gestão da frota
   Aba "AnotacoesGestao" na planilha-mãe. Substitui os bilhetes
   espalhados: senhas de sistema, processos de referência, links,
   pendências pontuais. Conteúdo marcado como sensível vem oculto
   e só aparece quando o usuário pede.
   ============================================================ */

const NOTAS = {
  aba: 'AnotacoesGestao',
  cab: ['ID', 'Criada em', 'Autor', 'Categoria', 'Título', 'Conteúdo', 'Sensível', 'Atualizada em'],
  categorias: ['Acessos e senhas', 'Processos de referência', 'Links úteis', 'Contatos', 'Garantias', 'Pendências', 'Geral']
};

function _abaNotas_() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  let aba = ss.getSheetByName(NOTAS.aba);
  if (!aba) {
    aba = ss.insertSheet(NOTAS.aba);
    aba.getRange(1, 1, 1, NOTAS.cab.length).setValues([NOTAS.cab]);
    aba.setFrozenRows(1);
    aba.getRange(1, 1, 1, NOTAS.cab.length).setFontWeight('bold').setBackground('#0B2C5C').setFontColor('#FFFFFF');
    aba.setColumnWidth(5, 240); aba.setColumnWidth(6, 460);
  }
  return aba;
}

function _linhaNota_(aba, id) {
  const n = aba.getLastRow();
  if (n < 2) return -1;
  const ids = aba.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

/** Lista as anotações. O conteúdo sensível só vai junto se for pedido. */
function lerNotas(token, comSensivel) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = _abaNotas_();
    const n = aba.getLastRow();
    const lista = [];
    if (n > 1) {
      aba.getRange(2, 1, n - 1, NOTAS.cab.length).getValues().forEach(l => {
        const titulo = String(l[4] || '').trim();
        if (!titulo) return;
        const sensivel = /sim|x|true|1/i.test(String(l[6] || ''));
        lista.push({ id: String(l[0]), criadaEm: _dataTxt_(l[1]), autor: String(l[2] || ''),
          categoria: String(l[3] || 'Geral'), titulo: titulo,
          conteudo: (sensivel && !comSensivel) ? '' : String(l[5] || ''),
          sensivel: sensivel, atualizadaEm: _dataTxt_(l[7]) });
      });
    }
    return { ok: true, notas: lista, categorias: NOTAS.categorias };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Conteúdo de uma anotação sensível, sob demanda. */
function revelarNota(token, id) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const aba = _abaNotas_();
    const linha = _linhaNota_(aba, id);
    if (linha < 0) return { ok: false, erro: 'Anotação não encontrada.' };
    const conteudo = String(aba.getRange(linha, 6).getValue() || '');
    _logAcao_(p.ss, p.sessao.email, 'Ver anotação sensível', '', id, String(aba.getRange(linha, 5).getValue() || ''));
    return { ok: true, conteudo: conteudo };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Cria ou atualiza uma anotação. */
function salvarNota(token, id, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const titulo = String((dados || {}).titulo || '').trim();
    if (!titulo) return { ok: false, erro: 'Informe o título.' };
    const aba = _abaNotas_();
    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
    let linha = id ? _linhaNota_(aba, id) : -1;
    let novoId = id;
    if (linha < 0) {
      novoId = 'N' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyMMddHHmmss');
      linha = Math.max(aba.getLastRow() + 1, 2);
      aba.getRange(linha, 1, 1, NOTAS.cab.length).setValues([[novoId, agora, p.sessao.email,
        dados.categoria || 'Geral', titulo, dados.conteudo || '', dados.sensivel ? 'Sim' : '', agora]]);
    } else {
      aba.getRange(linha, 4, 1, 5).setValues([[dados.categoria || 'Geral', titulo,
        dados.conteudo || '', dados.sensivel ? 'Sim' : '', agora]]);
    }
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, id ? 'Editar anotação' : 'Criar anotação', '', novoId, titulo);
    return { ok: true, id: novoId, novo: !id };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Exclui uma anotação. */
function excluirNota(token, id) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!p.sessao.admin) return { ok: false, erro: 'Apenas o administrador pode excluir.' };
  try {
    const aba = _abaNotas_();
    const linha = _linhaNota_(aba, id);
    if (linha < 0) return { ok: false, erro: 'Anotação não encontrada.' };
    const titulo = String(aba.getRange(linha, 5).getValue() || '');
    aba.deleteRow(linha);
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Excluir anotação', '', id, titulo);
    return { ok: true };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Traz o conteúdo da aba "Anotações" antiga para o formato novo. */
function importarAnotacoesAntigas() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const origem = ss.getSheetByName('Anotações') || ss.getSheetByName('Anotacoes');
  if (!origem) { Logger.log('Aba "Anotações" não encontrada.'); return; }
  const valores = origem.getDataRange().getValues();
  Logger.log('Aba encontrada: ' + origem.getName() + ' — ' + valores.length + ' linha(s), ' + (valores[0] || []).length + ' coluna(s).');
  Logger.log('Primeiras linhas, para conferência:');
  valores.slice(0, 8).forEach((l, i) => Logger.log('  ' + (i + 1) + ': ' + l.map(c => String(c || '').substring(0, 40)).join(' | ')));
  const aba = _abaNotas_();
  const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm');
  const autor = Session.getEffectiveUser().getEmail();
  const novas = [];
  valores.forEach((l, i) => {
    if (i === 0 && /TITULO|T[ÍI]TULO|ASSUNTO/i.test(String(l[0] || ''))) return;   // cabeçalho
    const titulo = String(l[0] || '').trim();
    const conteudo = l.slice(1).map(c => String(c || '').trim()).filter(Boolean).join(' • ');
    if (!titulo && !conteudo) return;
    const texto = (titulo + ' ' + conteudo).toLowerCase();
    const sensivel = /senha|login|acesso|token|credencial/.test(texto);
    novas.push(['N' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'yyMMddHHmmss') + i, agora, autor,
      sensivel ? 'Acessos e senhas' : 'Geral', titulo || conteudo.substring(0, 60), conteudo, sensivel ? 'Sim' : '', agora]);
  });
  if (!novas.length) { Logger.log('Nada a importar.'); return; }
  aba.getRange(aba.getLastRow() + 1, 1, novas.length, NOTAS.cab.length).setValues(novas);
  SpreadsheetApp.flush();
  Logger.log(novas.length + ' anotação(ões) importada(s) para ' + NOTAS.aba + '. A aba antiga não foi alterada.');
  return novas.length + ' importadas';
}

/* ============================================================
   MULTAS — acompanhamento dos processos e geração das defesas
   Fonte: planilha "Multas 16ª SPRF/CE".
     linha 2 = parâmetros {{...}} por coluna
     linha 3 = cabeçalho legível
     linha 4+ = registros
   ============================================================ */

const MULTAS = {
  aba: 'Multas', abaDefesas: 'Defesas', abaOutras: 'Outras VTRs',
  linhaParametros: 2, linhaCabecalho: 3, primeiraLinha: 4,
  colLancamento: 33,   // AG — data em que o registro entrou
  colLinkDefesa: 32,   // AF — era a marcação "Selecionado"; passa a guardar o link da defesa
  // campo curto → coluna (1-based)
  col: { tipo: 1, dataInfracao: 2, dataDefesa: 3, orgao: 4, ai: 5, aiOriginario: 6, placa: 7,
         processo: 8, enquadramento: 9, protocolo: 10, observacoes: 11, status: 12,
         condutor: 13, matricula: 14, movimentacaoSei: 15, seiOriginario: 16, protocoloOriginario: 17 },
  rotulos: { tipo: 'Tipo', dataInfracao: 'Data da infração', dataDefesa: 'Data da defesa', orgao: 'Órgão',
             ai: 'Nº do AI', aiOriginario: 'Nº do AI originário', placa: 'Placa', processo: 'Nº do processo',
             enquadramento: 'Enquadramento', protocolo: 'Protocolo', observacoes: 'Observações',
             status: 'Status', condutor: 'Condutor', matricula: 'Matrícula' },
  tipos: [{ sigla: 'NA', nome: 'Notificação de Autuação' }, { sigla: 'NP', nome: 'Notificação de Penalidade' }]
};

/** Ano de uma data em texto (dd/mm/aaaa ou aaaa-mm-dd). Zero quando não houver. */
function _anoDaData_(t) {
  const s = String(t || '');
  let m = s.match(/\d{1,2}\/\d{1,2}\/(\d{4})/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/^(\d{4})-\d{2}-\d{2}/);
  if (m) return parseInt(m[1], 10);
  return 0;
}

function _ssMultas_() { return SpreadsheetApp.openById(CONFIG.ID_MULTAS); }

/** Aba de bases (status, enquadramentos, órgãos) — localizada pelo cabeçalho. */
function _abaBasesMultas_(ss) {
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) {
    const a = abas[i];
    if (a.getLastRow() < 2 || a.getLastColumn() < 5) continue;
    const topo = a.getRange(1, 1, Math.min(3, a.getLastRow()), a.getLastColumn()).getValues();
    const achou = topo.some(l => l.some(c => /DOCUMENTO MODELO/i.test(String(c))));
    if (achou) return a;
  }
  return null;
}

/** Bases: status, órgãos com gestor, enquadramentos com descrição e modelo, outras viaturas. */
function _basesMultas_(ss) {
  const bases = { status: [], orgaos: [], enquadramentos: [], outrasVtrs: [] };
  const aba = _abaBasesMultas_(ss);
  if (aba) {
    const valores = aba.getDataRange().getValues();
    let linhaCab = 0;
    for (let i = 0; i < Math.min(4, valores.length); i++) {
      if (valores[i].some(c => /DOCUMENTO MODELO/i.test(String(c)))) { linhaCab = i; break; }
    }
    const cab = valores[linhaCab].map(c => _normCab_(c));
    const c = re => cab.findIndex(x => re.test(x));
    const iStatus = c(/^STATUS$/), iEnq = c(/^ENQUADRAMENTO$/), iDesc = c(/DESCRICAO/),
          iModelo = c(/DOCUMENTO MODELO/), iOrgao = c(/^ORGAO$/), iGestor = c(/^GESTOR$/);
    // cada coluna tem a sua própria quantidade de itens; lemos todas as linhas
    // da aba e ignoramos apenas as células vazias, sem parar na primeira lacuna.
    for (let r = linhaCab + 1; r < valores.length; r++) {
      const l = valores[r];
      const st = iStatus >= 0 ? String(l[iStatus] || '').trim() : '';
      if (st && bases.status.indexOf(st) < 0) bases.status.push(st);
      const enq = iEnq >= 0 ? String(l[iEnq] || '').trim() : '';
      if (enq && !bases.enquadramentos.some(x => x.enquadramento === enq)) bases.enquadramentos.push({ enquadramento: enq,
        descricao: iDesc >= 0 ? String(l[iDesc] || '').trim() : '',
        modelo: iModelo >= 0 ? String(l[iModelo] || '').trim() : '' });
      const org = iOrgao >= 0 ? String(l[iOrgao] || '').trim() : '';
      if (org && !bases.orgaos.some(x => x.orgao === org)) bases.orgaos.push({ orgao: org, gestor: iGestor >= 0 ? String(l[iGestor] || '').trim() : '' });
    }
    bases._aba = aba.getName();
    bases._cols = { linhaCab: linhaCab + 1, status: iStatus + 1, enq: iEnq + 1, desc: iDesc + 1, modelo: iModelo + 1, orgao: iOrgao + 1, gestor: iGestor + 1 };
  }
  const outras = ss.getSheetByName(MULTAS.abaOutras);
  if (outras && outras.getLastRow() > 1) {
    outras.getRange(2, 1, outras.getLastRow() - 1, 3).getValues().forEach(l => {
      const placa = String(l[0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (placa) bases.outrasVtrs.push({ placa: placa, renavam: String(l[1] || '').trim(), modelo: String(l[2] || '').trim() });
    });
  }
  return bases;
}


/**
 * Lê as cores que a própria planilha usa na coluna de status (formatação
 * condicional da coluna L da aba Multas) para o painel exibir igual.
 * Entende regras de texto igual/contém e fórmulas do tipo =$L3="Deferido".
 */
function _coresStatusMultas_(aba) {
  const cores = [];
  try {
    const regras = aba.getConditionalFormatRules();
    regras.forEach(regra => {
      const faixas = regra.getRanges().map(r => r.getA1Notation());
      const naColunaStatus = faixas.some(a => /(^|[^A-Z])L\d*/i.test(a) || /^L/i.test(a));
      const cond = regra.getBooleanCondition();
      if (!cond) return;
      const fundo = cond.getBackground(), fonte = cond.getFontColor();
      if (!fundo && !fonte) return;
      const tipo = String(cond.getCriteriaType());
      const valores = cond.getCriteriaValues() || [];
      let textos = [];
      if (/TEXT_EQUAL_TO|TEXT_CONTAINS|TEXT_STARTS_WITH/.test(tipo)) {
        textos = valores.map(v => String(v)).filter(Boolean);
      } else if (/CUSTOM_FORMULA/.test(tipo)) {
        const f = String(valores[0] || '');
        (f.match(/"([^"]{2,})"/g) || []).forEach(m => textos.push(m.replace(/"/g, '')));
      }
      textos.forEach(t => {
        if (!t || t.length < 2) return;
        cores.push({ texto: t, fundo: fundo || '', fonte: fonte || '', coluna: naColunaStatus,
          contem: /TEXT_CONTAINS|CUSTOM_FORMULA/.test(tipo) });
      });
    });
  } catch (e) { Logger.log('Cores do status: ' + e); }
  return cores;
}

/** Mostra no log as cores encontradas — útil para conferir a equalização. */
function verCoresStatusMultas() {
  const aba = _ssMultas_().getSheetByName(MULTAS.aba);
  const cores = _coresStatusMultas_(aba);
  if (!cores.length) { Logger.log('Nenhuma formatação condicional reconhecida na aba Multas.'); return; }
  Logger.log(cores.length + ' regra(s) reconhecida(s):');
  cores.forEach(c => Logger.log('   "' + c.texto + '" → fundo ' + (c.fundo || '—') + ', fonte ' + (c.fonte || '—') + (c.contem ? ' (por conter)' : '')));
}


/** Primeiro valor não vazio entre as colunas candidatas de uma linha. */
function _valorEntreColunas_(linha, candidatas) {
  for (let i = 0; i < candidatas.length; i++) {
    const c = candidatas[i];
    if (c === undefined || c < 0) continue;
    const v = String(linha[c] === null || linha[c] === undefined ? '' : linha[c]).trim();
    if (v) return v;
  }
  return '';
}


/** Chave de comparação de um AI: alfanumérica, sem espaços nem pontuação. */
function _chaveAi_(v) {
  return String(v === null || v === undefined ? '' : v).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Mostra o texto de multas de uma viatura como ele está na ConsultaBD e o que
 * o painel conseguiu extrair. É com isso que o leitor deve ser ajustado.
 *     verTextoMultas('POC3545')
 */
function verTextoMultas(placa) {
  placa = String(placa || '').trim().toUpperCase();
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const idx = _mapearCampos_(cab);
  if (idx.multasTxt === undefined) { Logger.log('Coluna de multas não encontrada.'); return; }
  const n = aba.getLastRow() - 1;
  const placas = aba.getRange(2, idx.placa + 1, n, 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());

  const alvos = placa ? [placas.indexOf(placa)] : placas.map((p, i) => i).slice(0, 5);
  if (placa && alvos[0] < 0) { Logger.log('Placa não encontrada.'); return; }

  alvos.forEach(i => {
    if (i < 0) return;
    const texto = String(aba.getRange(i + 2, idx.multasTxt + 1).getValue() || '');
    Logger.log('=== ' + placas[i] + ' ===');
    Logger.log('Texto na coluna de multas (' + texto.length + ' caracteres):');
    texto.split(/\r?\n/).forEach((l, k) => Logger.log('  ' + (k + 1) + ': ' + l));
    const m = _parseMultas_(texto);
    Logger.log('O painel extraiu: ' + m.itens.length + ' auto(s) | qtd ' + m.qtd + ' | total ' + _moedaBR_(m.total || 0) +
      (m.consultaEm ? ' | consulta ' + m.consultaEm : ''));
    m.itens.forEach(it => Logger.log('   AI ' + it.ait + ' | ' + (it.descricao || '') + ' | ' + _moedaBR_(it.aPagar || it.valor || 0)));
  });
  return 'ok';
}

/**
 * Multas em cobrança: um AI por linha, a partir do texto de multas da
 * ConsultaBD, cruzado com a planilha de acompanhamento (aba Multas).
 * É o que a PRF ainda está sendo cobrada, com o que já sabemos de cada AI.
 */
function lerMultasEmCobranca(token, ignorarCache) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const CHAVE = 'painel_cobranca_v1';
  if (!ignorarCache) {
    const guardado = _cacheLer_(CHAVE);
    if (guardado) { guardado.doCache = true; return guardado; }
  }
  try {
    const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
    const idx = _mapearCampos_(cab);
    if (idx.multasTxt === undefined) return { ok: false, erro: 'Coluna de multas não encontrada na ConsultaBD.' };
    const n = aba.getLastRow() - 1;
    const valores = aba.getRange(2, 1, n, aba.getLastColumn()).getValues();

    // o que já está registrado na planilha de multas, por número do AI
    const registro = {};
    try {
      const ssM = _ssMultas_();
      const abaM = ssM.getSheetByName(MULTAS.aba);
      if (abaM && abaM.getLastRow() >= MULTAS.primeiraLinha) {
        // só as colunas necessárias, em uma única leitura
        const ultimaCol = Math.max(MULTAS.col.ai, MULTAS.col.status, MULTAS.col.tipo, MULTAS.col.orgao,
          MULTAS.col.enquadramento, MULTAS.col.processo, MULTAS.col.protocolo, MULTAS.col.dataDefesa);
        abaM.getRange(MULTAS.primeiraLinha, 1, abaM.getLastRow() - MULTAS.primeiraLinha + 1, ultimaCol)
          .getDisplayValues().forEach((l, i) => {
            const ai = _chaveAi_(l[MULTAS.col.ai - 1]);
            if (!ai) return;
            registro[ai] = { linha: MULTAS.primeiraLinha + i,
              status: String(l[MULTAS.col.status - 1] || '').trim(),
              tipo: String(l[MULTAS.col.tipo - 1] || '').trim(),
              orgao: String(l[MULTAS.col.orgao - 1] || '').trim(),
              enquadramento: String(l[MULTAS.col.enquadramento - 1] || '').trim(),
              processo: String(l[MULTAS.col.processo - 1] || '').trim(),
              protocolo: String(l[MULTAS.col.protocolo - 1] || '').trim(),
              dataDefesa: _dataBR_(l[MULTAS.col.dataDefesa - 1]) };
          });
      }
    } catch (e) { Logger.log('Planilha de multas: ' + e); }

    const lista = [];
    let semDetalhe = 0;
    valores.forEach(l => {
      const texto = String(l[idx.multasTxt] || '');
      if (!texto.trim()) return;
      const placa = String(l[idx.placa] || '').trim().toUpperCase();
      const m = _parseMultas_(texto);
      // texto que só diz "sem multas" não é pendência
      if (!m.itens.length && !m.qtd && /SEM MULTA|NADA CONSTA|NENHUMA/i.test(_normCab_(texto))) return;
      // viatura com multa cuja descrição não pôde ser decomposta em autos:
      // entra assim mesmo, para não sumir da tela
      if (!m.itens.length) {
        semDetalhe++;
        lista.push({
          ai: '', placa: placa,
          modelo: idx.modelo !== undefined ? String(l[idx.modelo] || '') : '',
          unidade: idx.unidade !== undefined ? String(l[idx.unidade] || '') : '',
          statusVtr: idx.status !== undefined ? String(l[idx.status] || '') : '',
          uso: idx.uso !== undefined ? String(l[idx.uso] || '') : '',
          propriedade: _valorEntreColunas_(l, [idx.prop, 65]),
          anoEx: idx.anoEx !== undefined ? String(l[idx.anoEx] || '').replace(/\D/g, '') : '',
          vencLic: idx.vencLic !== undefined ? _dataBR_(l[idx.vencLic]) : '',
          statusLic: idx.statusLic !== undefined ? String(l[idx.statusLic] || '') : '',
          abastRecente: idx.abast2m !== undefined ? String(l[idx.abast2m] || '').trim() : '',
          descricao: texto.replace(/\s+/g, ' ').substring(0, 160),
          infracao: m.qtd ? m.qtd + ' auto(s) na consulta' : '',
          vencimento: '',
          valor: m.total || 0, aPagar: m.total || 0,
          consultaEm: m.consultaEm || '', semDetalhe: true, registrada: false,
          status: '', tipo: '', orgao: '', enquadramento: '', processo: '', protocolo: '', dataDefesa: '', linhaMulta: 0
        });
        return;
      }
      m.itens.forEach(item => {
        const reg = registro[_chaveAi_(item.ait)] || null;
        lista.push({
          ai: String(item.ait || '').trim(), placa: placa,
          modelo: idx.modelo !== undefined ? String(l[idx.modelo] || '') : '',
          unidade: idx.unidade !== undefined ? String(l[idx.unidade] || '') : '',
          statusVtr: idx.status !== undefined ? String(l[idx.status] || '') : '',
          uso: idx.uso !== undefined ? String(l[idx.uso] || '') : '',
          propriedade: _valorEntreColunas_(l, [idx.prop, 65]),
          anoEx: idx.anoEx !== undefined ? String(l[idx.anoEx] || '').replace(/\D/g, '') : '',
          vencLic: idx.vencLic !== undefined ? _dataBR_(l[idx.vencLic]) : '',
          statusLic: idx.statusLic !== undefined ? String(l[idx.statusLic] || '') : '',
          abastRecente: idx.abast2m !== undefined ? String(l[idx.abast2m] || '').trim() : '',
          descricao: item.descricao || '', infracao: item.infracao || '',
          vencimento: item.venc || '', valor: item.valor || 0, aPagar: item.aPagar || item.valor || 0,
          consultaEm: m.consultaEm || '',
          registrada: !!reg,
          status: reg ? reg.status : '', tipo: reg ? reg.tipo : '', orgao: reg ? reg.orgao : '',
          enquadramento: reg ? reg.enquadramento : '', processo: reg ? reg.processo : '',
          protocolo: reg ? reg.protocolo : '', dataDefesa: reg ? reg.dataDefesa : '',
          linhaMulta: reg ? reg.linha : 0
        });
      });
    });

    const saida = { ok: true, itens: lista,
      consultaEm: lista.length ? lista[0].consultaEm : '',
      totalAPagar: Math.round(lista.reduce((t, x) => t + (x.aPagar || 0), 0) * 100) / 100,
      semRegistro: lista.filter(x => !x.registrada).length,
      semDetalhe: semDetalhe, geradoEm: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm') };
    _cacheGravar_(CHAVE, saida, CONFIG.CACHE_SEG || 3600);
    return saida;
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Multas cadastradas + vínculos + conferência com as multas da viatura na ConsultaBD. */
function lerMultas(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const ss = _ssMultas_();
    const aba = ss.getSheetByName(MULTAS.aba);
    if (!aba) return { ok: false, erro: 'Aba "' + MULTAS.aba + '" não encontrada.' };
    const nLin = aba.getLastRow();
    const nCol = Math.max(aba.getLastColumn(), MULTAS.colLancamento);
    const valores = nLin >= MULTAS.primeiraLinha
      ? aba.getRange(MULTAS.primeiraLinha, 1, nLin - MULTAS.primeiraLinha + 1, nCol).getDisplayValues() : [];

    const bases = _basesMultas_(ss);
    const cadastro = _multasDaFrota_();           // AI → { placa, consultaEm, valor }
    const lista = [];
    let ignoradas = 0, semData = 0;
    valores.forEach((l, i) => {
      const ai = String(l[MULTAS.col.ai - 1] || '').trim();
      const placa = String(l[MULTAS.col.placa - 1] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!ai && !placa) return;
      // corte por ano: só o período com acompanhamento
      const anoLinha = _anoDaData_(String(l[MULTAS.col.dataInfracao - 1] || '') || String(l[MULTAS.colLancamento - 1] || ''));
      if (anoLinha && anoLinha < CONFIG.MULTAS_ANO_INICIAL) { ignoradas++; return; }
      if (!anoLinha) { semData++; }
      const item = { linha: MULTAS.primeiraLinha + i };
      Object.keys(MULTAS.col).forEach(k => { item[k] = String(l[MULTAS.col[k] - 1] || '').trim(); });
      ['dataInfracao', 'dataDefesa'].forEach(k => { item[k] = _dataBR_(item[k]); });
      item.placa = placa;
      // a coluna A nem sempre está preenchida; a coluna R traz o tipo calculado
      const tipoCalculado = String(l[17] || '').trim();
      if (!item.tipo && tipoCalculado) item.tipo = /penalidade/i.test(tipoCalculado) ? 'NP' : (/autua/i.test(tipoCalculado) ? 'NA' : tipoCalculado);
      item.tipoNome = (MULTAS.tipos.find(t => t.sigla === item.tipo.toUpperCase()) || {}).nome || tipoCalculado || item.tipo;
      item.lancamento = String(l[MULTAS.colLancamento - 1] || '').trim() || item.dataInfracao;
      const linkCelula = String(l[MULTAS.colLinkDefesa - 1] || '').trim();
      item.linkDefesa = /^https?:\/\//i.test(linkCelula) ? linkCelula : '';
      // ainda está sendo cobrada da PRF?
      const naFrota = cadastro[ai.replace(/\D/g, '')] || cadastro[ai.toUpperCase()];
      item.cobrada = !!naFrota;
      item.consultaEm = naFrota ? naFrota.consultaEm : '';
      item.valorMulta = naFrota ? naFrota.valor : 0;
      lista.push(item);
    });

    // vínculos: mesmo processo (autuação × penalidade) e AI originário
    const porProcesso = {};
    lista.forEach(m => { if (m.processo) (porProcesso[m.processo] = porProcesso[m.processo] || []).push(m.ai); });
    const porAi = {};
    lista.forEach(m => { if (m.ai) porAi[m.ai] = m; });
    lista.forEach(m => {
      m.irmas = (porProcesso[m.processo] || []).filter(x => x && x !== m.ai);
      const orig = m.aiOriginario ? porAi[m.aiOriginario] : null;
      m.origem = orig ? { ai: orig.ai, enquadramento: orig.enquadramento, status: orig.status, data: orig.dataInfracao } : null;
      m.derivadas = lista.filter(x => x.aiOriginario && x.aiOriginario === m.ai).map(x => x.ai);
    });

    return { ok: true, multas: lista, bases: bases, tipos: MULTAS.tipos, rotulos: MULTAS.rotulos,
      coresStatus: _coresStatusMultas_(aba),
      anoInicial: CONFIG.MULTAS_ANO_INICIAL, ignoradas: ignoradas, semData: semData,
      pastaDefesas: CONFIG.PASTA_DEFESAS ? 'https://drive.google.com/drive/folders/' + CONFIG.PASTA_DEFESAS : '',
      pastaModelos: CONFIG.PASTA_MODELOS_MULTAS ? 'https://drive.google.com/drive/folders/' + CONFIG.PASTA_MODELOS_MULTAS : '' };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** AIs que ainda constam nas multas das viaturas (coluna Multas da ConsultaBD). */
function _multasDaFrota_() {
  const mapa = {};
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const aba = ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
    const idx = _mapearCampos_(cab);
    if (idx.multasTxt === undefined || idx.placa === undefined) return mapa;
    const n = aba.getLastRow() - 1;
    const placas = aba.getRange(2, idx.placa + 1, n, 1).getValues();
    const textos = aba.getRange(2, idx.multasTxt + 1, n, 1).getValues();
    textos.forEach((l, i) => {
      const txt = String(l[0] || '');
      if (!txt) return;
      const m = _parseMultas_(txt);
      m.itens.forEach(item => {
        const chave = String(item.ait || '').replace(/\D/g, '');
        if (!chave) return;
        mapa[chave] = { placa: String(placas[i][0] || '').trim().toUpperCase(), consultaEm: m.consultaEm, valor: item.aPagar || item.valor || 0 };
        mapa[String(item.ait).toUpperCase()] = mapa[chave];
      });
    });
  } catch (e) { Logger.log('Multas da frota: ' + e); }
  return mapa;
}

/** Normaliza data para dd/mm/aaaa (aceita d/m/aa, dd-mm-aaaa, aaaa-mm-dd e Date). */
function _dataBR_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, CONFIG.FUSO, 'dd/MM/yyyy');
  const t = String(v === null || v === undefined ? '' : v).trim();
  if (!t) return '';
  let m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? (parseInt(m[3], 10) > 50 ? '19' + m[3] : '20' + m[3]) : m[3];
    return ('0' + m[1]).slice(-2) + '/' + ('0' + m[2]).slice(-2) + '/' + ano;
  }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[3] + '/' + m[2] + '/' + m[1];
  return t;
}

/** Lê um único registro de multa já no formato usado pela tela. */
function _lerUmaMulta_(aba, linha) {
  const nCol = Math.max(aba.getLastColumn(), MULTAS.colLancamento);
  const l = aba.getRange(linha, 1, 1, nCol).getDisplayValues()[0];
  const item = { linha: linha };
  Object.keys(MULTAS.col).forEach(k => { item[k] = String(l[MULTAS.col[k] - 1] || '').trim(); });
  ['dataInfracao', 'dataDefesa'].forEach(k => { item[k] = _dataBR_(item[k]); });
  item.placa = String(item.placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const tipoCalculado = String(l[17] || '').trim();
  if (!item.tipo && tipoCalculado) item.tipo = /penalidade/i.test(tipoCalculado) ? 'NP' : (/autua/i.test(tipoCalculado) ? 'NA' : tipoCalculado);
  item.tipoNome = (MULTAS.tipos.find(t => t.sigla === String(item.tipo).toUpperCase()) || {}).nome || tipoCalculado || item.tipo;
  item.lancamento = String(l[MULTAS.colLancamento - 1] || '').trim() || item.dataInfracao;
  const link = String(l[MULTAS.colLinkDefesa - 1] || '').trim();
  item.linkDefesa = /^https?:\/\//i.test(link) ? link : '';
  item.irmas = []; item.derivadas = []; item.origem = null;
  item.cobrada = false; item.consultaEm = ''; item.valorMulta = 0;
  return item;
}

/** Cria ou atualiza um registro de multa. */
function salvarMulta(token, linha, campos) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const aba = _ssMultas_().getSheetByName(MULTAS.aba);
    if (!aba) return { ok: false, erro: 'Aba de multas não encontrada.' };
    let alvo = parseInt(linha, 10) || 0;
    const novo = !alvo;
    if (novo) {
      alvo = Math.max(aba.getLastRow() + 1, MULTAS.primeiraLinha);
      // replica as fórmulas das colunas calculadas (R a U e os dados da viatura)
      if (alvo > MULTAS.primeiraLinha) {
        const modelo = aba.getRange(alvo - 1, 1, 1, Math.max(aba.getLastColumn(), MULTAS.colLancamento)).getFormulasR1C1()[0];
        modelo.forEach((f, i) => { if (f) aba.getRange(alvo, i + 1).setFormulaR1C1(f); });
      }
      aba.getRange(alvo, MULTAS.colLancamento).setValue(Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy'));
    }
    const gravados = [], recusados = [];
    Object.keys(campos || {}).forEach(k => {
      const col = MULTAS.col[k];
      if (!col) { recusados.push(k); return; }
      const celula = aba.getRange(alvo, col);
      if (celula.getFormula()) { recusados.push((MULTAS.rotulos[k] || k) + ' (fórmula)'); return; }
      let valor = campos[k];
      if (k === 'tipo') {
        const achado = MULTAS.tipos.find(t => t.nome === valor || t.sigla === String(valor).toUpperCase());
        valor = achado ? achado.sigla : valor;          // a planilha guarda NA/NP
      }
      if (k === 'placa') valor = String(valor || '').toUpperCase();
      if (/^data/i.test(k)) valor = _dataBR_(valor);
      celula.setValue(valor === null || valor === undefined ? '' : valor);
      gravados.push(MULTAS.rotulos[k] || k);
    });
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, novo ? 'Cadastrar multa' : 'Editar multa', String(campos.placa || ''),
      String(campos.ai || ''), gravados.join(', '));
    return { ok: true, linha: alvo, novo: novo, gravados: gravados, recusados: recusados,
             item: _lerUmaMulta_(aba, alvo) };   // devolve só este registro, sem reler a planilha
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Acrescenta um item às bases (órgão, enquadramento ou outra viatura). */
function cadastrarBaseMulta(token, tipo, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const ss = _ssMultas_();
    if (tipo === 'outraVtr') {
      let aba = ss.getSheetByName(MULTAS.abaOutras);
      if (!aba) { aba = ss.insertSheet(MULTAS.abaOutras); aba.appendRow(['Placa', 'Renavam', 'Marca/Modelo']); }
      aba.appendRow([String(dados.placa || '').toUpperCase(), dados.renavam || '', dados.modelo || '']);
    } else {
      const aba = _abaBasesMultas_(ss);
      if (!aba) return { ok: false, erro: 'Aba de bases não encontrada.' };
      const bases = _basesMultas_(ss);
      const c = bases._cols;
      const proxima = col => {
        const valores = aba.getRange(c.linhaCab + 1, col, Math.max(1, aba.getLastRow() - c.linhaCab), 1).getValues();
        for (let i = 0; i < valores.length; i++) if (!String(valores[i][0]).trim()) return c.linhaCab + 1 + i;
        return aba.getLastRow() + 1;
      };
      if (tipo === 'orgao') {
        const linha = proxima(c.orgao);
        aba.getRange(linha, c.orgao).setValue(String(dados.orgao || '').trim());
        if (c.gestor > 0) aba.getRange(linha, c.gestor).setValue(String(dados.gestor || '').trim());
      } else if (tipo === 'enquadramento') {
        const linha = proxima(c.enq);
        aba.getRange(linha, c.enq).setValue(String(dados.enquadramento || '').trim());
        if (c.desc > 0) aba.getRange(linha, c.desc).setValue(String(dados.descricao || '').trim());
        if (c.modelo > 0) aba.getRange(linha, c.modelo).setValue(String(dados.modelo || '').trim());
      } else return { ok: false, erro: 'Tipo de cadastro inválido.' };
    }
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Cadastrar ' + tipo + ' (multas)', '', 'OK', JSON.stringify(dados).substring(0, 200));
    return { ok: true, bases: _basesMultas_(ss) };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Normaliza os órgãos da aba de multas e completa a base com os que faltarem. */
function normalizarOrgaosMultas() {
  const ss = _ssMultas_();
  const aba = ss.getSheetByName(MULTAS.aba);
  const bases = _basesMultas_(ss);
  const conhecidos = {};
  bases.orgaos.forEach(o => { conhecidos[_normCab_(o.orgao)] = o.orgao; });
  const n = aba.getLastRow() - MULTAS.primeiraLinha + 1;
  if (n < 1) { Logger.log('Sem registros.'); return; }
  const faixa = aba.getRange(MULTAS.primeiraLinha, MULTAS.col.orgao, n, 1);
  const valores = faixa.getValues();
  const novos = {}, ajustes = [];
  const saida = valores.map(l => {
    const bruto = String(l[0] || '').trim();
    if (!bruto) return [''];
    const chave = _normCab_(bruto);
    if (conhecidos[chave]) { if (conhecidos[chave] !== bruto) ajustes.push(bruto + ' → ' + conhecidos[chave]); return [conhecidos[chave]]; }
    novos[bruto] = (novos[bruto] || 0) + 1;
    return [bruto];
  });
  faixa.setValues(saida);
  Logger.log('Padronizados: ' + (ajustes.length ? ajustes.slice(0, 20).join(' | ') : 'nenhum'));
  Logger.log('Órgãos ausentes na base (sem gestor): ' + (Object.keys(novos).length ? Object.keys(novos).map(k => k + ' (' + novos[k] + ')').join(' | ') : 'nenhum'));
  const acrescentar = Object.keys(novos);
  if (acrescentar.length) {
    acrescentar.forEach(o => cadastrarBaseMultaInterno_(ss, 'orgao', { orgao: o, gestor: '' }));
    Logger.log(acrescentar.length + ' órgão(s) acrescentado(s) à base, sem gestor — complete depois.');
  }
}
function cadastrarBaseMultaInterno_(ss, tipo, dados) {
  const aba = _abaBasesMultas_(ss);
  const bases = _basesMultas_(ss);
  const c = bases._cols;
  const valores = aba.getRange(c.linhaCab + 1, c.orgao, Math.max(1, aba.getLastRow() - c.linhaCab), 1).getValues();
  let linha = aba.getLastRow() + 1;
  for (let i = 0; i < valores.length; i++) if (!String(valores[i][0]).trim()) { linha = c.linhaCab + 1 + i; break; }
  aba.getRange(linha, c.orgao).setValue(dados.orgao);
}

/** Gera a defesa de uma multa a partir do modelo do enquadramento. */
function gerarDefesaMulta(token, linha) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const ss = _ssMultas_();
    const aba = ss.getSheetByName(MULTAS.aba);
    const alvo = parseInt(linha, 10);
    if (!alvo || alvo < MULTAS.primeiraLinha) return { ok: false, erro: 'Registro inválido.' };
    const nCol = Math.max(aba.getLastColumn(), MULTAS.colLancamento);
    const dados = aba.getRange(alvo, 1, 1, nCol).getDisplayValues()[0];
    const parametrosCab = aba.getRange(MULTAS.linhaParametros, 1, 1, nCol).getValues()[0];

    // parâmetros: cada coluna cujo cabeçalho da linha 2 é {{chave}}
    const parametros = { data: Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy') };
    parametrosCab.forEach((h, i) => {
      const t = String(h || '');
      if (t.indexOf('{{') < 0) return;
      parametros[t.replace(/[{}]/g, '').trim()] = String(dados[i] || '').trim();
    });
    // complementos que o painel calcula
    const enquadramento = String(dados[MULTAS.col.enquadramento - 1] || '').trim();
    const orgao = String(dados[MULTAS.col.orgao - 1] || '').trim();
    const placa = String(dados[MULTAS.col.placa - 1] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const bases = _basesMultas_(ss);
    const enq = bases.enquadramentos.find(e => e.enquadramento === enquadramento);
    const org = bases.orgaos.find(o => _normCab_(o.orgao) === _normCab_(orgao));
    if (!parametros.idmodelo && enq) parametros.idmodelo = enq.modelo;
    if (!parametros.artigoinfracao && enq) parametros.artigoinfracao = enq.descricao;
    if (!parametros.gestordoorgao && org) parametros.gestordoorgao = org.gestor;
    if (!parametros.tipodenotificacao) {
      const t = MULTAS.tipos.find(x => x.sigla === String(dados[MULTAS.col.tipo - 1] || '').trim().toUpperCase());
      parametros.tipodenotificacao = t ? t.nome.replace('Notificação de ', '') : '';
    }
    if (!parametros.marcamodelo || !parametros.unidade) {
      const v = _viaturaPorPlaca_(placa);
      if (v) { parametros.marcamodelo = parametros.marcamodelo || v.modelo; parametros.unidade = parametros.unidade || v.unidade; }
      else {
        const outra = bases.outrasVtrs.find(o => o.placa === placa);
        if (outra) parametros.marcamodelo = parametros.marcamodelo || outra.modelo;
      }
    }
    if (!parametros.idmodelo) return { ok: false, erro: 'O enquadramento "' + enquadramento + '" não tem documento modelo na base.' };

    const numeroAI = parametros.numeroai || String(dados[MULTAS.col.ai - 1] || '').trim();
    const pasta = DriveApp.getFolderById(CONFIG.PASTA_DEFESAS);
    const nome = 'Defesa ' + numeroAI + ' - ' + Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy');
    // substitui a defesa anterior da mesma multa, em vez de acumular
    const substituidas = _descartarPorPrefixo_(pasta, 'Defesa ' + numeroAI);
    const linkAnterior = String(dados[MULTAS.colLinkDefesa - 1] || '');
    const idAnterior = (linkAnterior.match(/\/d\/([\w-]{20,})/) || [])[1];
    if (idAnterior) { try { DriveApp.getFileById(idAnterior).setTrashed(true); } catch (e) {} }

    const copia = DriveApp.getFileById(parametros.idmodelo).makeCopy(nome, pasta);
    const doc = DocumentApp.openById(copia.getId());
    const corpo = doc.getBody();
    Object.keys(parametros).forEach(k => { corpo.replaceText('\\{\\{' + k + '\\}\\}', parametros[k] || ''); });
    doc.saveAndClose();
    try { copia.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const url = copia.getUrl();
    aba.getRange(alvo, MULTAS.colLinkDefesa).setValue(url);
    if (!String(dados[MULTAS.col.dataDefesa - 1] || '').trim()) {
      aba.getRange(alvo, MULTAS.col.dataDefesa).setValue(Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy'));
    }
    SpreadsheetApp.flush();
    _logAcao_(p.ss, p.sessao.email, 'Gerar defesa', placa, numeroAI, url);
    return { ok: true, url: url, nome: nome, parametros: parametros, substituidas: substituidas };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}



/** Edita um item já existente nas bases (órgão, enquadramento ou outra viatura). */
function editarBaseMulta(token, tipo, chaveOriginal, dados) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(15000); } catch (e) { return { ok: false, erro: 'Planilha ocupada.' }; }
  try {
    const ss = _ssMultas_();
    if (tipo === 'outraVtr') {
      const aba = ss.getSheetByName(MULTAS.abaOutras);
      if (!aba) return { ok: false, erro: 'Aba "' + MULTAS.abaOutras + '" não encontrada.' };
      const valores = aba.getRange(2, 1, Math.max(1, aba.getLastRow() - 1), 3).getValues();
      for (let i = 0; i < valores.length; i++) {
        if (String(valores[i][0] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase() === String(chaveOriginal).toUpperCase()) {
          aba.getRange(i + 2, 1, 1, 3).setValues([[String(dados.placa || '').toUpperCase(), dados.renavam || valores[i][1], dados.modelo || '']]);
          SpreadsheetApp.flush();
          return { ok: true, bases: _basesMultas_(ss) };
        }
      }
      return { ok: false, erro: 'Placa não encontrada na base.' };
    }
    const aba = _abaBasesMultas_(ss);
    if (!aba) return { ok: false, erro: 'Aba de bases não encontrada.' };
    const c = _basesMultas_(ss)._cols;
    const col = tipo === 'orgao' ? c.orgao : c.enq;
    const n = Math.max(1, aba.getLastRow() - c.linhaCab);
    const valores = aba.getRange(c.linhaCab + 1, col, n, 1).getValues();
    for (let i = 0; i < valores.length; i++) {
      if (String(valores[i][0] || '').trim() === String(chaveOriginal).trim()) {
        const linha = c.linhaCab + 1 + i;
        if (tipo === 'orgao') {
          aba.getRange(linha, c.orgao).setValue(String(dados.orgao || '').trim());
          if (c.gestor > 0) aba.getRange(linha, c.gestor).setValue(String(dados.gestor || '').trim());
        } else {
          aba.getRange(linha, c.enq).setValue(String(dados.enquadramento || '').trim());
          if (c.desc > 0) aba.getRange(linha, c.desc).setValue(String(dados.descricao || '').trim());
          if (c.modelo > 0) aba.getRange(linha, c.modelo).setValue(String(dados.modelo || '').trim());
        }
        SpreadsheetApp.flush();
        _logAcao_(p.ss, p.sessao.email, 'Editar ' + tipo + ' (multas)', '', chaveOriginal, JSON.stringify(dados).substring(0, 200));
        return { ok: true, linha: linha, bases: _basesMultas_(ss) };
      }
    }
    return { ok: false, erro: 'Item não encontrado na base.' };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Descrição completa e gestor de cada item, para a tela de cadastros poder editar. */
function _basesDetalhadas_(ss) { return _basesMultas_(ss); }

/**
 * Copia os documentos modelo das defesas para a pasta de modelos e troca os IDs
 * na base da planilha de multas. Roda uma vez; se rodar de novo, reaproveita a
 * cópia que já existir na pasta (não duplica).
 */
function migrarModelosMultas() {
  const destino = DriveApp.getFolderById(CONFIG.PASTA_MODELOS_MULTAS);
  const ss = _ssMultas_();
  const aba = _abaBasesMultas_(ss);
  if (!aba) throw new Error('Aba de bases não encontrada na planilha de multas.');
  const bases = _basesMultas_(ss);
  const colModelo = bases._cols.modelo;
  const linhaCab = bases._cols.linhaCab;
  const n = aba.getLastRow() - linhaCab;
  if (n < 1) { Logger.log('Nada a migrar.'); return; }

  const faixa = aba.getRange(linhaCab + 1, colModelo, n, 1);
  const valores = faixa.getValues();
  const mapa = {}, resumo = [];

  const saida = valores.map(l => {
    const idAntigo = String(l[0] || '').trim();
    if (!idAntigo) return [''];
    if (mapa[idAntigo]) return [mapa[idAntigo]];
    try {
      const original = DriveApp.getFileById(idAntigo);
      const nome = original.getName();
      // já existe cópia com esse nome na pasta? reaproveita
      let copia = null;
      const iguais = destino.getFilesByName(nome);
      if (iguais.hasNext()) { copia = iguais.next(); resumo.push(nome + ': já existia na pasta'); }
      else { copia = original.makeCopy(nome, destino); resumo.push(nome + ': copiado'); }
      try { copia.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      mapa[idAntigo] = copia.getId();
      return [copia.getId()];
    } catch (e) {
      resumo.push(idAntigo + ': FALHOU — ' + String(e).substring(0, 100));
      return [idAntigo];
    }
  });
  faixa.setValues(saida);
  SpreadsheetApp.flush();
  limparCache();

  Logger.log('Pasta de destino: ' + destino.getName() + ' (' + CONFIG.PASTA_MODELOS_MULTAS + ')');
  resumo.forEach(r => Logger.log('  ' + r));
  Logger.log('IDs trocados na base: ' + Object.keys(mapa).length + ' modelo(s) distinto(s).');
  Object.keys(mapa).forEach(velho => Logger.log('  ' + velho + ' → ' + mapa[velho]));
  Logger.log('Os documentos originais continuam onde estavam; a base passa a usar as cópias.');
  return resumo.join(' | ');
}

function _viaturaPorPlaca_(placa) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const aba = ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
    const idx = _mapearCampos_(cab);
    const n = aba.getLastRow() - 1;
    const placas = aba.getRange(2, idx.placa + 1, n, 1).getValues().map(l => String(l[0] || '').trim().toUpperCase());
    const i = placas.indexOf(placa);
    if (i < 0) return null;
    const linha = aba.getRange(i + 2, 1, 1, aba.getLastColumn()).getValues()[0];
    return { modelo: idx.modelo !== undefined ? String(linha[idx.modelo] || '') : '',
             unidade: idx.unidade !== undefined ? String(linha[idx.unidade] || '') : '' };
  } catch (e) { return null; }
}

/* ============================================================
   FILA DE AÇÕES DO DETRAN
   O Apps Script não alcança sistemas.detran.ce.gov.br (o Google sai
   por IPs que o portal recusa). O painel enfileira aqui e o
   trabalhador Python (worker_detran.py), rodando na rede local,
   executa e devolve o resultado nesta mesma aba.
   ============================================================ */

const ACOES_FILA = { crlv: 'Baixar CRLV', multas: 'Consultar multas', boleto: 'Gerar boleto' };

function _abaFila_(ss) {
  let aba = ss.getSheetByName(CONFIG.ABA_FILA);
  if (!aba) {
    aba = ss.insertSheet(CONFIG.ABA_FILA);
    aba.appendRow(['ID', 'Criado em', 'Usuário', 'Ação', 'Placa', 'Renavam', 'CRV', 'Código', 'Status', 'Resultado', 'Detalhe', 'Atualizado em']);
    aba.setFrozenRows(1);
    aba.setColumnWidth(11, 420);
  }
  return aba;
}



/**
 * Limpa da fila os erros que já não refletem a realidade: linhas antigas cuja
 * placa hoje tem o dado preenchido, e repetições do mesmo pedido. Mantém o que
 * ainda é pendência de verdade.
 */
function limparErrosResolvidos(token) {
  const p = _prepararAcao_(token || '');
  if (token && p.erroPadrao) return p.erroPadrao;
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_FILA);
  if (!aba || aba.getLastRow() < 2) { Logger.log('Fila vazia.'); return { ok: true, removidas: 0 }; }

  // quem hoje tem CRV e código na ConsultaBD
  const base = ss.getSheetByName(CONFIG.ABA_BASE);
  const cab = base.getRange(1, 1, 1, base.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const idx = _mapearCampos_(cab);
  const temDado = {};
  base.getRange(2, 1, base.getLastRow() - 1, base.getLastColumn()).getValues().forEach(l => {
    const placa = String(l[idx.placa] || '').trim().toUpperCase();
    if (!placa) return;
    const crv = idx.crv !== undefined ? String(l[idx.crv] || '').trim() : '';
    const cod = idx.codCrv !== undefined ? String(l[idx.codCrv] || '').trim() : '';
    temDado[placa] = !!(crv && cod);
  });

  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 12).getValues();
  const remover = [];
  const vistos = {};
  for (let i = valores.length - 1; i >= 0; i--) {         // de baixo para cima: mantém o mais recente
    const l = valores[i];
    const status = _normCab_(l[8]);
    if (status.indexOf('ERRO') !== 0 && status.indexOf('SEM DADOS') !== 0) continue;
    const placa = String(l[4] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const acao = String(l[3] || '').trim();
    const detalhe = String(l[10] || '');
    const chave = placa + '|' + acao;

    if (/CRV|c[oó]digo de seguran/i.test(detalhe) && temDado[placa]) { remover.push(i + 2); continue; }
    if (vistos[chave]) { remover.push(i + 2); continue; }   // repetição do mesmo pedido
    vistos[chave] = true;
  }
  remover.sort((a, b) => b - a).forEach(linha => aba.deleteRow(linha));
  SpreadsheetApp.flush();
  limparCache();
  Logger.log(remover.length + ' linha(s) removida(s) da fila: erros já resolvidos ou repetidos.');
  Logger.log('Permanecem os que ainda refletem pendência real.');
  return { ok: true, removidas: remover.length };
}

/**
 * Agrupa os itens com erro da fila pelo motivo, separando o que é dado
 * faltando (nunca vai funcionar enquanto o cadastro não for completado) do
 * que é falha de execução (vale reenfileirar).
 *     diagnosticarErrosFila()
 */
function diagnosticarErrosFila() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  const aba = ss.getSheetByName(CONFIG.ABA_FILA);
  if (!aba || aba.getLastRow() < 2) { Logger.log('Fila vazia.'); return; }
  const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 12).getValues();

  const motivos = {};
  const placasSemDado = {};
  let total = 0;
  valores.forEach(l => {
    const status = _normCab_(l[8]);
    if (status.indexOf('ERRO') !== 0) return;
    total++;
    const detalhe = String(l[10] || '').trim();
    const placa = String(l[4] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let motivo, categoria;
    if (/sem CRV|CRV\/c[oó]digo|c[oó]digo de seguran/i.test(detalhe)) {
      motivo = 'Sem CRV ou código de segurança na planilha'; categoria = 'dado';
    } else if (/sem renavam|renavam/i.test(detalhe)) {
      motivo = 'Sem Renavam na planilha'; categoria = 'dado';
    } else if (/placa n[aã]o encontrada|linha da placa/i.test(detalhe)) {
      motivo = 'Placa não encontrada na ConsultaBD'; categoria = 'dado';
    } else if (/login|senha|succ|autentic/i.test(detalhe)) {
      motivo = 'DETRAN recusou o login (placa e renavam não conferem)'; categoria = 'dado';
    } else if (/timeout|ConnectionError|HTTPError|Max retries|getaddrinfo|SSL/i.test(detalhe)) {
      motivo = 'Falha de conexão com o DETRAN'; categoria = 'execução';
    } else if (/PDF|PdfReader|exerc[ií]cio/i.test(detalhe)) {
      motivo = 'Problema ao ler o PDF do CRLV'; categoria = 'execução';
    } else {
      motivo = detalhe ? detalhe.substring(0, 70) : 'sem detalhe registrado'; categoria = 'outro';
    }
    const k = categoria + '|' + motivo;
    if (!motivos[k]) motivos[k] = { categoria: categoria, motivo: motivo, qtd: 0, placas: [] };
    motivos[k].qtd++;
    if (motivos[k].placas.length < 40) motivos[k].placas.push(placa);
    if (categoria === 'dado' && placa) placasSemDado[placa] = motivo;
  });

  Logger.log('=== ' + total + ' item(ns) com erro na fila ===');
  const lista = Object.keys(motivos).map(k => motivos[k]).sort((a, b) => b.qtd - a.qtd);
  ['dado', 'execução', 'outro'].forEach(cat => {
    const doGrupo = lista.filter(x => x.categoria === cat);
    if (!doGrupo.length) return;
    const soma = doGrupo.reduce((t, x) => t + x.qtd, 0);
    Logger.log('');
    Logger.log('--- ' + (cat === 'dado' ? 'FALTA DADO NO CADASTRO (reenfileirar não resolve)'
      : cat === 'execução' ? 'FALHA NA EXECUÇÃO (vale tentar de novo)'
      : 'OUTROS MOTIVOS') + ': ' + soma + ' item(ns)');
    doGrupo.forEach(x => {
      Logger.log('   ' + x.qtd + 'x  ' + x.motivo);
      Logger.log('        ' + x.placas.join(' '));
    });
  });

  // quantas viaturas da frota estão sem CRV, independentemente da fila
  try {
    const base = ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = base.getRange(1, 1, 1, base.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
    const idx = _mapearCampos_(cab);
    if (idx.crv !== undefined && idx.codCrv !== undefined) {
      const linhas = base.getRange(2, 1, base.getLastRow() - 1, base.getLastColumn()).getValues();
      let semCrv = 0, comCrlv = 0, ativas = 0;
      const faltando = [];
      linhas.forEach(l => {
        const placa = String(l[idx.placa] || '').trim().toUpperCase();
        if (!placa) return;
        const status = _normCab_(idx.status !== undefined ? l[idx.status] : '');
        if (/DESFAZ|BAIXAD|ALIENAD/.test(status)) return;
        ativas++;
        const crv = String(l[idx.crv] || '').trim(), cod = String(l[idx.codCrv] || '').trim();
        if (crv && cod) return;
        semCrv++;
        if (idx.linkCrlv !== undefined && String(l[idx.linkCrlv] || '').trim()) comCrlv++;
        if (faltando.length < 60) faltando.push(placa + (String(l[idx.linkCrlv] || '').trim() ? '*' : ''));
      });
      Logger.log('');
      Logger.log('=== Cadastro da frota ===');
      Logger.log('Viaturas ativas: ' + ativas + ' | sem CRV ou código: ' + semCrv +
        ' | destas, com PDF de CRLV no Drive: ' + comCrlv);
      Logger.log('(* = tem o PDF do CRLV guardado, então o dado pode ser extraído de lá)');
      Logger.log(faltando.join(' '));
      if (comCrlv) Logger.log('Dá para preencher ' + comCrlv + ' automaticamente lendo os CRLVs já guardados.');
    }
  } catch (e) { Logger.log('Conferência do cadastro: ' + e); }
  return 'ok';
}

/** Agentes que executam a fila do DETRAN, com o último sinal de vida. */
function lerAgentes(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  try {
    const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
    const aba = ss.getSheetByName('Agentes');
    const agentes = [];
    const agora = new Date();
    if (aba && aba.getLastRow() > 1) {
      aba.getRange(2, 1, aba.getLastRow() - 1, 6).getValues().forEach(l => {
        const nome = String(l[0] || '').trim();
        if (!nome) return;
        // o Sheets pode guardar isso como data ou como texto, conforme o formato da célula
        let quando = null, txt = '';
        if (l[1] instanceof Date) {
          quando = l[1];
          txt = Utilities.formatDate(quando, CONFIG.FUSO, 'dd/MM/yyyy HH:mm:ss');
        } else {
          txt = String(l[1] || '').trim();
          const m = txt.match(/(\d{2})\/(\d{2})\/(\d{4})[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
          if (m) quando = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
            Number(m[4]), Number(m[5]), Number(m[6] || 0));
        }
        const minutos = quando ? Math.round((agora - quando) / 60000) : null;
        agentes.push({ nome: nome, sinal: txt, minutos: minutos,
          ativo: minutos !== null && minutos <= 5,
          estado: String(l[2] || '').trim(), noCiclo: _num_(l[3]) || 0,
          total: _num_(l[4]) || 0, obs: String(l[5] || '').trim() });
      });
    }
    const fila = { pendentes: 0, executando: 0, erro: 0, semDados: 0, concluidos: 0 };
    const abaFila = ss.getSheetByName(CONFIG.ABA_FILA);
    if (abaFila && abaFila.getLastRow() > 1) {
      abaFila.getRange(2, 9, abaFila.getLastRow() - 1, 1).getValues().forEach(l => {
        const st = _normCab_(l[0]);
        if (st.indexOf('PENDENTE') === 0) fila.pendentes++;
        else if (st.indexOf('EXECUTANDO') === 0) fila.executando++;
        else if (st.indexOf('SEM DADOS') === 0) fila.semDados++;
        else if (st.indexOf('ERRO') === 0) fila.erro++;
        else if (st.indexOf('CONCLU') === 0) fila.concluidos++;
      });
    }
    agentes.sort((a, b) => (a.minutos === null ? 9999 : a.minutos) - (b.minutos === null ? 9999 : b.minutos));
    return { ok: true, agentes: agentes, fila: fila,
      algumAtivo: agentes.some(a => a.ativo),
      consultadoEm: Utilities.formatDate(agora, CONFIG.FUSO, 'HH:mm:ss') };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
}

/** Enfileira uma ou várias placas de uma vez. Devolve quantas entraram e quantas já estavam pendentes. */
function enfileirarAcoes(token, acao, placas) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  if (!ACOES_FILA[acao]) return { ok: false, erro: 'Ação desconhecida: ' + acao };
  placas = (placas || []).map(x => String(x || '').trim().toUpperCase()).filter(Boolean);
  if (!placas.length) return { ok: false, erro: 'Nenhuma placa informada.' };

  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Fila ocupada. Tente de novo.' }; }
  try {
    const aba = _abaFila_(p.ss);
    const base = p.ss.getSheetByName(CONFIG.ABA_BASE);
    const cab = base.getRange(1, 1, 1, base.getLastColumn()).getValues()[0].map(v => String(v || '').trim());
    const idx = _mapearCampos_(cab);
    const nLin = Math.max(1, base.getLastRow() - 1);
    const col = campo => idx[campo] !== undefined ? base.getRange(2, idx[campo] + 1, nLin, 1).getValues().map(l => String(l[0] || '').trim()) : [];
    const colPlacas = col('placa').map(x => x.toUpperCase());
    const colRenavam = col('renavam'), colCrv = col('crv'), colCod = col('codCrv');

    // o que já está pendente não entra de novo
    const pendentes = {};
    if (aba.getLastRow() > 1) {
      aba.getRange(2, 1, aba.getLastRow() - 1, 9).getValues().forEach(l => {
        if (String(l[8]).toUpperCase() === 'PENDENTE') pendentes[String(l[3]) + '|' + String(l[4]).toUpperCase()] = true;
      });
    }

    const agora = Utilities.formatDate(new Date(), CONFIG.FUSO, 'dd/MM/yyyy HH:mm:ss');
    const novas = [], repetidas = [];
    placas.forEach(placa => {
      if (pendentes[ACOES_FILA[acao] + '|' + placa]) { repetidas.push(placa); return; }
      const i = colPlacas.indexOf(placa);
      novas.push([Utilities.getUuid().substring(0, 8), agora, p.sessao.email, ACOES_FILA[acao], placa,
        i >= 0 ? (colRenavam[i] || '').replace(/\D/g, '') : '', i >= 0 ? (colCrv[i] || '') : '', i >= 0 ? (colCod[i] || '') : '',
        'PENDENTE', '', '', '']);
    });
    if (novas.length) aba.getRange(aba.getLastRow() + 1, 1, novas.length, 12).setValues(novas);
    _logAcao_(p.ss, p.sessao.email, ACOES_FILA[acao] + ' (fila)', novas.length + ' placa(s)', 'ENFILEIRADO',
      novas.slice(0, 30).map(l => l[4]).join(', ') + (repetidas.length ? ' | já pendentes: ' + repetidas.join(', ') : ''));
    return { ok: true, enfileiradas: novas.length, repetidas: repetidas };
  } catch (e) {
    return { ok: false, erro: String(e.message || e) };
  } finally { trava.releaseLock(); }
}

/** Situação da fila para a tela (pendentes primeiro, depois as últimas concluídas). */
function obterFila(token, quantidade) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const aba = _abaFila_(p.ss);
  if (aba.getLastRow() < 2) return { ok: true, itens: [], pendentes: 0, executando: 0 };
  const linhas = aba.getRange(2, 1, aba.getLastRow() - 1, 12).getValues().map(l => ({
    id: String(l[0]), criado: _dataTxt_(l[1]), quem: String(l[2]), acao: String(l[3]), placa: String(l[4]),
    status: String(l[8]).toUpperCase(), resultado: String(l[9]), detalhe: String(l[10]), atualizado: _dataTxt_(l[11])
  }));
  const pendentes = linhas.filter(x => x.status === 'PENDENTE');
  const executando = linhas.filter(x => x.status === 'EXECUTANDO');
  const resto = linhas.filter(x => x.status !== 'PENDENTE' && x.status !== 'EXECUTANDO').reverse();
  const n = Math.min(quantidade || 80, 300);
  return { ok: true, pendentes: pendentes.length, executando: executando.length,
    itens: executando.concat(pendentes).concat(resto).slice(0, n) };
}

/** Remove da fila o que já terminou (mantém pendentes e em execução). */
function limparFilaConcluidas(token) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  const trava = LockService.getScriptLock();
  try { trava.waitLock(20000); } catch (e) { return { ok: false, erro: 'Fila ocupada.' }; }
  try {
    const aba = _abaFila_(p.ss);
    if (aba.getLastRow() < 2) return { ok: true, removidas: 0 };
    const valores = aba.getRange(2, 1, aba.getLastRow() - 1, 12).getValues();
    const manter = valores.filter(l => ['PENDENTE', 'EXECUTANDO'].indexOf(String(l[8]).toUpperCase()) >= 0);
    const removidas = valores.length - manter.length;
    if (removidas) {
      aba.getRange(2, 1, valores.length, 12).clearContent();
      if (manter.length) aba.getRange(2, 1, manter.length, 12).setValues(manter);
    }
    return { ok: true, removidas: removidas };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; } finally { trava.releaseLock(); }
}

/** Rode no editor: mostra coluna a coluna o que ficou editável e por que as demais bloquearam. */
function diagnosticarEdicao() {
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
  const mapa = _mapaEdicao_(aba);
  const editaveis = mapa.lista.filter(x => x.editavel), bloqueadas = mapa.lista.filter(x => !x.editavel);
  Logger.log('EDITÁVEIS (' + editaveis.length + '): ' + editaveis.map(x => x.nome + (x.campo ? '' : ' [sem campo no app]')).join(' | '));
  Logger.log('BLOQUEADAS (' + bloqueadas.length + '):');
  bloqueadas.forEach(x => Logger.log('  ' + x.nome + ' → ' + x.motivo));
}

/* ------------------------------------------------------------ */
/*  ConsultaBD — mapeada por NOME de coluna                      */
/* ------------------------------------------------------------ */

const CAMPOS = {
  placa:        ['Placa', 0],
  renavam:      ['Renavam', 0],
  anoEx:        ['Ano Exercício', 0],
  anoFab:       ['Ano Fabricação', 0],
  anoMod:       ['Ano Modelo', 0],
  categoria:    ['Categoria', 0],
  chassi:       ['Chassi', 0],
  comb:         ['Combustível', 0],
  cor:          ['Cor', 0],
  debIpva:      ['Débito Ipva', 0],
  debLic:       ['Débito Licenciamento', 0],
  especie:      ['Espécie', 0],
  modelo:       ['Marca/Modelo', 0],
  multasTxt:    ['Multas', 0],
  municipio:    ['Município Emplacamento', 0],
  nacionalidade:['Nacionalidade', 0],
  motor:        ['Número Motor', 0],
  obs:          ['Observações', 0],
  recall:       ['Pendência Recall', 0],
  roubo:        ['Queixa Roubo', 0],
  restricoes:   ['Restrições', 0],
  tipo:         ['Tipo', 0],
  obsCessao:    ['Observações', 1],
  vencLic:      ['Vencimento Licenciamento', 0],
  statusLic:    ['Status Licenciamento', 0],
  mesLic:       ['Multas', 1],
  unidade:      ['Unidade SIPAC', 0],
  uso:          ['Uso SIPAC', 0],
  status:       ['Status SIPAC', 0],
  statusInv:    ['Status Inventário', 0],
  obsInv:       ['Observações Inventário', 0],
  placaMerc:    ['Placa Mercosul', 0],
  qtdAbast:     ['Qtd de Abastecimentos', 0],
  odometro:     ['Odômetro', 0],
  abastR:       ['Soma Abastecimentos R$ (12 meses)', 0],
  kmR:          ['Soma Kilometros (12 meses)', 0],
  litros:       ['Soma Litros (12 meses)', 0],
  abastRsKm:    ['Soma Abastecimento R$/Km Rodados (Últimos 12 Meses)', 0],
  consumo:      ['Consumo Médio (Soma Km Rodados/Soma Litros Abastecidos) (Últimos 12 Meses)', 0],
  manutR:       ['Soma Manutenção R$ (12 meses)', 0],
  manutRsKm:    ['Soma Manutenção R$/Km Rodados (Últimos 12 Meses)', 0],
  conceito:     ['Conceito', 0],
  abast2m:      ['Abastecimento últimos 2 meses', 0],
  placaRes:     ['Placa Reservada', 0],
  tombamento:   ['Tombamento', 0],
  crv:          ['Nº CRV', 0],
  codCrv:       ['Código Segurança CRV', 0],
  unidTomb:     ['Unidade Tombamento', 0],
  linkTomb:     ['Link Tombamento', 0],
  sugDesf:      ['Sugestão Desfazimento', 0],
  desf:         ['Desfazimento', 0],
  abast12m:     ['Abastecimento 12 meses', 0],
  cnpj:         ['CPF/CNPJ Proprietário', 0],
  blind:        ['Blindagem', 0],
  carac:        ['Caracterizado', 0],
  fipe:         ['FIPE', 0],
  freq:         ['Frequência de Uso', 0],
  prop:         ['Propriedade', 0],
  linkCrlv:     ['Link CRLV', 0],
  fotoFD:       ['FD', 0],
  fotoLE:       ['LE', 0],
  fotoTR:       ['TR', 0],
  fotoLD:       ['LD', 0],
  analiseDesf:  ['Análise Desfazimento 05/2025', 0],
  crvFisico:    ['CRV Físico', 0]
};

function _lerVeiculos_(ss) {
  const aba = ss.getSheetByName(CONFIG.ABA_BASE);
  if (!aba) throw new Error('Aba "' + CONFIG.ABA_BASE + '" não encontrada na planilha base.');
  const valores = aba.getDataRange().getValues();
  const cab = valores[0].map(v => String(v || '').trim());
  const idx = _mapearCampos_(cab);
  const anoRef = new Date().getFullYear();
  const saida = [];

  for (let r = 1; r < valores.length; r++) {
    const linha = valores[r];
    const placa = _txt_(linha[idx.placa]);
    if (!placa) continue;
    const v = {};
    Object.keys(idx).forEach(k => { v[k] = _normalizar_(k, linha[idx[k]]); });

    v.unidadeCurta  = v.desf ? 'BENS P/BAIXA-CE' : String(v.unidade || '').replace(/\/NUCINT|\/NEC|\/NUAP|\/NICAI/g, '');
    v.placaVinc     = v.placaRes ? 'Sim' : 'Não';
    v.emDesf        = v.desf ? 'Sim' : 'Não';
    v.modeloCurto   = _modeloCurto_(v.modelo);
    v.idade         = (v.anoFab && v.anoFab > 1900) ? (anoRef - v.anoFab) : null;
    v.faixaIdade    = _faixaIdade_(v.idade);
    v.faixaOdo      = _faixaOdometro_(v.odometro);

    const m = _parseMultas_(v.multasTxt);
    v.qtdMultas = m.qtd; v.valorMultas = m.total; v.multas = m.itens; v.temMultas = m.qtd > 0 ? 'Sim' : 'Não'; v.multasConsultaEm = m.consultaEm;
    const c = _parseCessao_(v.obsCessao);
    v.cessaoMunicipio = c.municipio; v.cessaoData = c.data; v.cessaoProcesso = c.processo;
    const d = _parseDesfazimento_(v.desf);
    v.desfAno = d.ano; v.desfProcesso = d.processo;

    v.fotos = { FD: v.fotoFD, LE: v.fotoLE, TR: v.fotoTR, LD: v.fotoLD };
    v.temFotos = (v.fotoFD || v.fotoLE || v.fotoTR || v.fotoLD) ? 'Sim' : 'Não';
    delete v.fotoFD; delete v.fotoLE; delete v.fotoTR; delete v.fotoLD;
    saida.push(v);
  }
  return saida;
}

/**
 * Posição conhecida de algumas colunas, usada quando o cabeçalho estiver
 * escrito de outra forma. Índice a partir de zero: BL = 63, BN = 65.
 */
const POSICAO_CONHECIDA = { fipe: 63, prop: 65 };

function _mapearCampos_(cab) {
  const posicoes = {}, normalizadas = {};
  cab.forEach((nome, i) => {
    if (!posicoes[nome]) posicoes[nome] = [];
    posicoes[nome].push(i);
    const chave = _normCab_(nome);
    if (chave && !normalizadas[chave]) normalizadas[chave] = [];
    if (chave) normalizadas[chave].push(i);
  });
  const idx = {}, faltando = [];
  Object.keys(CAMPOS).forEach(k => {
    const [nome, oc] = CAMPOS[k];
    const lista = posicoes[nome];
    if (lista && lista[oc] !== undefined) { idx[k] = lista[oc]; return; }
    // mesmo nome, ignorando acentos, caixa e espaços repetidos
    const alt = normalizadas[_normCab_(nome)];
    if (alt && alt[oc] !== undefined) { idx[k] = alt[oc]; return; }
    // reserva: posição conhecida da coluna, quando o cabeçalho não casar
    if (POSICAO_CONHECIDA[k] !== undefined && POSICAO_CONHECIDA[k] < cab.length) {
      idx[k] = POSICAO_CONHECIDA[k];
      Logger.log('Coluna "' + nome + '" não casou pelo nome; usando a posição ' + _letraColuna_(POSICAO_CONHECIDA[k] + 1) +
        ' (cabeçalho lá: "' + String(cab[POSICAO_CONHECIDA[k]] || '') + '")');
      return;
    }
    faltando.push(nome + (oc ? ' (' + (oc + 1) + 'ª)' : ''));
  });
  if (faltando.length) Logger.log('Colunas não encontradas na ConsultaBD: ' + faltando.join(' | '));
  return idx;
}

/** Mostra no log onde cada coluna importante foi encontrada. */
function conferirColunasConsultaBD() {
  const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_BASE);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(c => String(c || '').trim());
  const idx = _mapearCampos_(cab);
  ['placa', 'modelo', 'unidade', 'uso', 'status', 'prop', 'fipe', 'cnpj', 'multasTxt'].forEach(k => {
    const i = idx[k];
    Logger.log('  ' + k.padEnd(10) + (i === undefined ? 'NÃO ENCONTRADA' : _letraColuna_(i + 1) + '  "' + cab[i] + '"'));
  });
  Logger.log('Cabeçalho da coluna BN: "' + (cab[65] || '') + '"');
  // colunas com o mesmo nome costumam ser a causa de campo vazio
  const repetidas = [];
  cab.forEach((nome, i) => { if (_normCab_(nome) === 'PROPRIEDADE') repetidas.push(_letraColuna_(i + 1)); });
  Logger.log('Colunas chamadas "Propriedade": ' + (repetidas.join(', ') || 'nenhuma'));
  // amostra do conteúdo real de cada uma
  const n = Math.min(5, aba.getLastRow() - 1);
  if (n > 0) {
    repetidas.forEach(letra => {
      const valores = aba.getRange(2, cab.findIndex((c, i) => _letraColuna_(i + 1) === letra) + 1, n, 1).getValues();
      Logger.log('   ' + letra + ': ' + valores.map(v => '"' + String(v[0] || '') + '"').join(' '));
    });
  }
  return 'ok';
}

function _normalizar_(campo, valor) {
  const numericos = ['anoEx','anoFab','anoMod','qtdAbast','odometro','abastR','kmR','litros','abastRsKm','consumo','manutR','manutRsKm'];
  if (numericos.indexOf(campo) >= 0) return _num_(valor);
  if (campo === 'vencLic') return _data_(valor);
  if (['renavam','tombamento','crv','codCrv','cnpj'].indexOf(campo) >= 0) return _txt_(valor).replace(/\.0$/, '');
  return _txt_(valor);
}

/* ------------------------------------------------------------ */
/*  Abas auxiliares                                              */
/* ------------------------------------------------------------ */

function _lerGestores_(ss) {
  const aba = ss.getSheetByName(CONFIG.ABA_GESTORES);
  if (!aba) return [];
  const valores = aba.getDataRange().getValues();
  let h = -1;
  for (let i = 0; i < Math.min(5, valores.length); i++) {
    if (valores[i].some(c => String(c).trim().toUpperCase() === 'SERVIDOR')) { h = i; break; }
  }
  if (h < 0) return [];
  const cab = valores[h].map(c => String(c).trim().toUpperCase());
  const col = nome => cab.indexOf(nome);
  const iUn1 = col('UNIDADE'), iUn2 = cab.lastIndexOf('UNIDADE'), iNome = col('SERVIDOR'),
        iMat = col('MATRÍCULA'), iFun = col('FUNÇÃO'), iTel = col('TELEFONE'), iMail = col('EMAIL');
  const saida = [];
  for (let r = h + 1; r < valores.length; r++) {
    const l = valores[r]; const nome = _txt_(l[iNome]); if (!nome) continue;
    saida.push({ unidade: _txt_(l[iUn1]), unidadeSipac: iUn2 !== iUn1 ? _txt_(l[iUn2]) : _txt_(l[iUn1]), nome: nome,
      matricula: _txt_(l[iMat]).replace(/\.0$/, ''), funcao: _txt_(l[iFun]), telefone: _txt_(l[iTel]), email: iMail >= 0 ? _txt_(l[iMail]) : '' });
  }
  return saida;
}

/** Primeiro endereço encontrado na linha, qualquer que seja o nome da coluna. */
function _urlDaLinha_(o) {
  const chaves = Object.keys(o);
  for (let i = 0; i < chaves.length; i++) {
    const v = o[chaves[i]];
    const t = String(v === null || v === undefined ? '' : v).trim();
    if (/^https?:\/\//i.test(t)) return t;
    const m = t.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);   // =HIPERLINK("...";"...")
    if (m) return m[1];
  }
  return '';
}

/** Primeiro dos rótulos que existir no objeto. Com `link`, só aceita valor que pareça URL. */
function _primeiroValor_(o, rotulos, link) {
  for (let i = 0; i < rotulos.length; i++) {
    const v = o[rotulos[i]];
    if (v === undefined || v === null || String(v).trim() === '') continue;
    if (link && !/^https?:\/\//i.test(String(v).trim())) continue;
    if (!link && /^https?:\/\//i.test(String(v).trim())) continue;
    return v;
  }
  return '';
}

/**
 * Oficina de cada OS. A aba Aceites não traz o estabelecimento, então ele é
 * buscado, em ordem: aba OS (coluna Oficina), OrçamentosDB e AceitesDB.
 */
function _oficinasPorOs_(ss) {
  const mapa = {};
  const guardar = (os, nome) => {
    const chave = String(os || '').replace(/\D/g, '');
    const valor = String(nome || '').trim();
    if (chave && valor && !mapa[chave]) mapa[chave] = valor;
  };
  // 1) aba OS da planilha-mãe
  try {
    const tab = _abaPorCabecalho_(ss, CONFIG.ABA_OS_PENDENTES, ['OS', 'Placa', 'Orçado', 'Status']);
    if (tab) _linhasComoObjetos_(tab).forEach(o => guardar(o['OS'], o['Oficina']));
  } catch (e) { Logger.log('Oficinas (OS): ' + e); }
  // 2) OrçamentosDB
  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_ORCAMENTOS);
    if (aba && aba.getLastRow() > 2) {
      const valores = aba.getDataRange().getValues();
      let cab = 0;
      for (let i = 0; i < Math.min(6, valores.length); i++) {
        if (valores[i].some(c => /ORDEM\s*SERVI/i.test(String(c)))) { cab = i; break; }
      }
      const nomes = valores[cab].map(c => _normCab_(c));
      const iOs = nomes.findIndex(c => /ORDEM SERVICO|^OS$/.test(c));
      const iEst = nomes.findIndex(c => /^ESTABELECIMENTO$/.test(c));
      if (iOs >= 0 && iEst >= 0) for (let r = cab + 1; r < valores.length; r++) guardar(valores[r][iOs], valores[r][iEst]);
    }
  } catch (e) { Logger.log('Oficinas (orçamentos): ' + e); }
  // 3) AceitesDB
  try {
    const aba = _ssManut_().getSheetByName(CONFIG.ABA_ACEITES);
    if (aba && aba.getLastRow() > 2) {
      const valores = aba.getDataRange().getValues();
      const m = _mapaAceitesDb_(valores);
      if (m.idx.os >= 0 && m.idx.estabelecimento >= 0) {
        for (let r = m.linhaCab + 1; r < valores.length; r++) guardar(valores[r][m.idx.os], valores[r][m.idx.estabelecimento]);
      }
    }
  } catch (e) { Logger.log('Oficinas (aceites): ' + e); }
  return mapa;
}

function _lerOS_(ss) {
  const pend = _abaPorCabecalho_(ss, CONFIG.ABA_OS_PENDENTES, ['OS', 'Placa', 'Orçado', 'Status']);
  const oficinas = _oficinasPorOs_(ss);
  const linhaDe = {};
  const ace  = _abaPorCabecalho_(ss, CONFIG.ABA_OS_ACEITES,   ['OS', 'Placa', 'Data Aprovação', 'Status']);
  const lista = [];
  if (pend) _linhasComoObjetos_(pend).forEach((o, i) => lista.push({ origem: 'PENDENTE', linha: pend.linhaCab + 2 + i, os: _txt_(o['OS']), placa: _txt_(o['Placa']).toUpperCase(),
    valor: _num_(o['Orçado']), aprovado: _num_(o['Aprovado']), data: _dataTxt_(o['Data']), oficina: _txt_(o['Oficina']), status: _txt_(o['Status']),
    unidade: _txt_(o['Unidade SIPAC']), obs: _txt_(o['Observações']), relato: _txt_(o['Relato']), justificativa: _txt_(o['Justificativa']),
    modelo: _txt_(o['Marca/Modelo']),
    diligencia: _valorPorCabecalho_(o, ['Diligência', 'Diligencia', 'Diligência/Revisão/Fórum', 'Revisão', 'Fórum'], 'DILIGENCIA'),
    aprovacao: _txt_(o['Aprovação'] !== undefined ? o['Aprovação'] : o['Aprovacao']),
    linkAnalise: _txt_(o['Relatório da Análise'] !== undefined ? o['Relatório da Análise'] : o['Relatorio da Analise']) || _urlDaLinha_(o) }));
  if (ace) _linhasComoObjetos_(ace).forEach(o => lista.push({ origem: 'ACEITE', os: _txt_(o['OS']), placa: _txt_(o['Placa']).toUpperCase(),
    valor: _num_(o['Valor Total']), aprovado: null, data: _dataTxt_(o['Data Aprovação']),
    oficina: oficinas[String(_txt_(o['OS'])).replace(/\D/g, '')] || '', status: _txt_(o['Status']),
    unidade: _txt_(o['Unidade SIPAC']), obs: _txt_(o['Observações']), modelo: _txt_(o['Modelo']), inicio: _dataTxt_(o['Data Início Serviço']),
    conclusao: _dataTxt_(o['Data Conclusão Serviço']), limiteAceite: _dataTxt_(o['Data Final p/ Aceite']), limiteISO: _diaISO_(o['Data Final p/ Aceite']) }));
  return lista.filter(x => x.os && x.placa);
}

function _lerSolicitacoes_(ss) {
  const aba = _abaPorCabecalho_(ss, CONFIG.ABA_SOLICITACOES, ['Processo', 'Data Ofício', 'Município']);
  if (!aba) return [];
  return _linhasComoObjetos_(aba).map(o => {
    const kSol = Object.keys(o).find(k => /Solicita/i.test(k)) || '';
    return { processo: _txt_(o['Processo']), data: _dataTxt_(o['Data Ofício']), pedido: kSol ? _txt_(o[kSol]) : '', municipio: _txt_(o['Município']) };
  }).filter(s => s.processo || s.municipio);
}

function _abaPorCabecalho_(ss, nomeFixo, rotulos) {
  const tentar = aba => {
    const nLin = Math.min(3, Math.max(1, aba.getLastRow()));
    const topo = aba.getRange(1, 1, nLin, Math.max(1, aba.getLastColumn())).getValues();
    for (let i = 0; i < topo.length; i++) {
      const cab = topo[i].map(c => String(c).trim());
      if (rotulos.every(r => cab.indexOf(r) >= 0)) return { valores: aba.getDataRange().getValues(), linhaCab: i };
    }
    return null;
  };
  if (nomeFixo) { const aba = ss.getSheetByName(nomeFixo); if (aba) { const r = tentar(aba); if (r) return r; } }
  const abas = ss.getSheets();
  for (let i = 0; i < abas.length; i++) {
    const n = abas[i].getName();
    if ([CONFIG.ABA_BASE, CONFIG.ABA_ABAST, CONFIG.ABA_MANUT].indexOf(n) >= 0) continue;
    const r = tentar(abas[i]); if (r) return r;
  }
  return null;
}

function _linhasComoObjetos_(tab) {
  const cab = tab.valores[tab.linhaCab].map(c => String(c).trim());
  const saida = [];
  for (let r = tab.linhaCab + 1; r < tab.valores.length; r++) {
    const l = tab.valores[r];
    if (l.every(c => c === '' || c === null)) continue;
    const o = {}; cab.forEach((nome, i) => { if (nome && o[nome] === undefined) o[nome] = l[i]; });
    saida.push(o);
  }
  return saida;
}

/* ------------------------------------------------------------ */
/*  Parsers de texto                                             */
/* ------------------------------------------------------------ */

function _parseMultas_(txt) {
  const r = { qtd: 0, total: 0, itens: [], consultaEm: '' };
  if (!txt) return r;
  const mData = txt.match(/Consulta:\s*(\d{2}\/\d{2}\/\d{4})/); if (mData) r.consultaEm = mData[1];
  String(txt).split(/\n|(?=AIT:)/).forEach(l => {
    if (!/AIT:/.test(l)) return;
    const item = { ait: '', descricao: '', infracao: '', venc: '', valor: 0, aPagar: 0 };
    l.split('|').map(p => p.trim()).forEach(p => {
      if (/^AIT:/i.test(p)) item.ait = p.replace(/^AIT:/i, '').trim();
      else if (/^Infra/i.test(p)) item.infracao = p.replace(/^[^:]+:/, '').trim();
      else if (/^Venc/i.test(p)) item.venc = p.replace(/^[^:]+:/, '').trim();
      else if (/^Valor/i.test(p)) item.valor = _moeda_(p);
      else if (/^A pagar/i.test(p)) item.aPagar = _moeda_(p);
      else if (!item.descricao && p) item.descricao = p;
    });
    r.itens.push(item); r.qtd++; r.total += item.aPagar || item.valor || 0;
  });
  r.total = _r2_(r.total);
  return r;
}

function _parseCessao_(txt) {
  const r = { municipio: '', data: '', processo: '' };
  if (!txt) return r;
  const m = String(txt).match(/Prefeitura de\s+(.+?)\s+em\s+(\d{2}\/\d{2}\/\d{4})\s*\(([\d.\/-]+)\)/i);
  if (m) { r.municipio = m[1].trim(); r.data = m[2]; r.processo = m[3]; }
  else {
    const p = String(txt).match(/(\d{5}\.\d{6}\/\d{4}-\d{2})/); if (p) r.processo = p[1];
    const d = String(txt).match(/(\d{2}\/\d{2}\/\d{4})/); if (d) r.data = d[1];
  }
  return r;
}

function _parseDesfazimento_(txt) {
  const r = { ano: '', processo: '' };
  if (!txt) return r;
  const a = String(txt).match(/Ano\s+(\d{4})/i); if (a) r.ano = a[1];
  const p = String(txt).match(/(\d{5}\.\d{6}\/\d{4}-\d{2})/); if (p) r.processo = p[1];
  return r;
}

function _modeloCurto_(modelo) {
  if (!modelo) return '';
  let s = String(modelo).toUpperCase().trim();
  const reboque = /^(R|REB)\//.test(s);
  s = s.replace(/^(I|IMP|R|REB)\//, '');
  const partes = s.split('/');
  let resto = partes.length > 1 ? partes.slice(1).join(' ') : partes[0];
  resto = resto.replace(/^(TOYOTA|NISSAN|RENAULT|FORD|CHEV|CHEVROLET|KIA|MB|M\.BENZ|H\.DAVIDSON|MOTOR-CASA)\s+/i, '');
  const toks = resto.split(/\s+/).filter(Boolean);
  if (/HILUX/.test(resto)) return /SW/.test(resto) ? 'HILUX SW4' : 'HILUX';
  if (/TRAIL?BLAZER/.test(resto)) return 'TRAILBLAZER';
  if (/L200|TRITON/.test(resto)) return 'L200 TRITON';
  if (/PAJERO/.test(resto)) return 'PAJERO';
  if (/SPRINTER/.test(resto)) return 'SPRINTER';
  if (/ACC?ELO/.test(resto)) return 'ACCELO';
  if (/MEGANE/.test(resto)) return 'MEGANE';
  if (/FLHP|DAVIDSON/.test(s)) return 'HARLEY FLHP';
  if (/MOTOR-CASA/.test(s)) return 'MOTOR-CASA';
  if (reboque) return 'REBOQUE ' + toks[0];
  if (/^(F8\d0|NC|XRE|TIGER|K112|CC302)$/.test(toks[0]) || toks[0].length <= 2) return toks.slice(0, 2).join(' ');
  return toks[0].replace(/\d+\.\d+.*$/, '') || toks[0];
}

function _faixaIdade_(idade) {
  if (idade === null || idade === undefined) return 'Sem info';
  if (idade <= 2) return 'Até 2 anos';
  if (idade <= 5) return '3 a 5 anos';
  if (idade <= 8) return '6 a 8 anos';
  if (idade <= 12) return '9 a 12 anos';
  return 'Mais de 12 anos';
}
function _faixaOdometro_(km) {
  if (!km && km !== 0) return 'Sem info';
  if (km < 50000) return 'Até 50 mil km';
  if (km < 100000) return '50 a 100 mil km';
  if (km < 150000) return '100 a 150 mil km';
  if (km < 200000) return '150 a 200 mil km';
  return 'Mais de 200 mil km';
}

/* ------------------------------------------------------------ */
/*  Utilitários                                                  */
/* ------------------------------------------------------------ */

function _txt_(v) { if (v === null || v === undefined) return ''; if (v instanceof Date) return _dataTxt_(v); return String(v).trim(); }

/** Números em formato brasileiro ("1.234,56", "R$ 5,498", "61,55") ou já numéricos. */
function _num_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return isNaN(v) ? null : v;
  let s = String(v).trim().replace(/R\$\s?/, '').replace(/\s/g, '');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function _r2_(n) { return Math.round((n || 0) * 100) / 100; }
function _moeda_(txt) { const m = String(txt).match(/R\$\s?([\d.]+,\d{2}|[\d.]+)/); return m ? (_num_(m[1]) || 0) : 0; }

function _data_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, CONFIG.FUSO, 'dd/MM/yyyy');
  if (typeof v === 'number' && v > 20000 && v < 80000) return Utilities.formatDate(new Date(Math.round((v - 25569) * 86400 * 1000)), 'GMT', 'dd/MM/yyyy');
  return _txt_(v);
}
function _dataTxt_(v) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, CONFIG.FUSO, 'dd/MM/yyyy HH:mm').replace(' 00:00', '');
  return v === null || v === undefined ? '' : String(v).trim();
}
/** "dd/MM/yyyy[ HH:mm:ss]" | Date | serial → "yyyy-MM-dd" */
function _diaISO_(v) {
  if (v instanceof Date) {
    if (isNaN(v)) return '';
    // Datas vindas do Sheets já estão no fuso da planilha; getters locais evitam Utilities.formatDate (lento em massa)
    return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2) + '-' + ('0' + v.getDate()).slice(-2);
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) return Utilities.formatDate(new Date(Math.round((v - 25569) * 86400 * 1000)), 'GMT', 'yyyy-MM-dd');
  const m = String(v || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  const i = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return i ? i[0] : '';
}
function _brDia_(iso) { return iso ? iso.substring(8, 10) + '/' + iso.substring(5, 7) + '/' + iso.substring(0, 4) : ''; }

/* Cache em fatias (limite de 100 KB por chave) */
function _cacheGravar_(chave, obj, seg) {
  try {
    const cache = CacheService.getScriptCache();
    const json = JSON.stringify(obj);
    const tam = 90000, mapa = {}; let n = 0;
    for (let i = 0; i < json.length; i += tam) mapa[chave + '_' + (n++)] = json.substring(i, i + tam);
    mapa[chave + '_n'] = String(n);
    cache.putAll(mapa, seg);
  } catch (e) { Logger.log('Cache não gravado (' + chave + '): ' + e); }
}
function _cacheLer_(chave) {
  try {
    const cache = CacheService.getScriptCache();
    const n = parseInt(cache.get(chave + '_n'), 10); if (!n) return null;
    const chaves = []; for (let i = 0; i < n; i++) chaves.push(chave + '_' + i);
    const partes = cache.getAll(chaves); let json = '';
    for (let i = 0; i < n; i++) { if (!partes[chave + '_' + i]) return null; json += partes[chave + '_' + i]; }
    return JSON.parse(json);
  } catch (e) { return null; }
}
function limparCache() {
  const cache = CacheService.getScriptCache();
  ['painel_frota_v2', 'painel_uso_v2', 'painel_pdfs_v1', 'painel_fotos_v1'].forEach(chave => {
    const n = parseInt(cache.get(chave + '_n'), 10) || 0;
    const lista = [chave + '_n']; for (let i = 0; i < n; i++) lista.push(chave + '_' + i);
    cache.removeAll(lista);
  });
  return 'Cache limpo.';
}

/* ------------------------------------------------------------ */
/*  Diagnóstico — rode no editor                                  */
/* ------------------------------------------------------------ */

function diagnosticar() {
  const ss = SpreadsheetApp.openById(CONFIG.ID_BASE);
  Logger.log('Abas: ' + ss.getSheets().map(a => a.getName() + ' (' + a.getLastRow() + ' linhas)').join(' | '));
  const aba = ss.getSheetByName(CONFIG.ABA_BASE);
  const cab = aba.getRange(1, 1, 1, aba.getLastColumn()).getValues()[0].map(v => String(v).trim());
  Logger.log('Campos mapeados: ' + Object.keys(_mapearCampos_(cab)).length + ' de ' + Object.keys(CAMPOS).length);

  let t0 = Date.now();
  const v = _lerVeiculos_(ss);
  Logger.log('Veículos: ' + v.length + ' em ' + (Date.now() - t0) + ' ms');
  t0 = Date.now();
  const ab = _lerAbastecimento_(ss);
  Logger.log('Abastecimento: ' + ab.linhas + ' transações (' + ab.de + ' a ' + ab.ate + '), ' + ab.mensal.length + ' placa×mês, ' + ab.alertas.length + ' alertas, ' + (Date.now() - t0) + ' ms');
  t0 = Date.now();
  const ma = _lerManutencao_(ss);
  Logger.log('Manutenção: ' + ma.linhas + ' transações (' + ma.de + ' a ' + ma.ate + '), ' + (Date.now() - t0) + ' ms');
  Logger.log('Payload uso: ' + Math.round(JSON.stringify({ a: ab.mensal, b: ab.alertas, c: ab.postos, d: ma.lista }).length / 1024) + ' KB');
  Logger.log('OS: ' + _lerOS_(ss).length + ' | Gestores: ' + _lerGestores_(ss).length + ' | Solicitações: ' + _lerSolicitacoes_(ss).length);
  t0 = Date.now(); const pdfs = _indexarPdfsOS_();
  Logger.log('PDFs de OS: ' + pdfs.length + ' (' + pdfs.filter(p => p.os.length).length + ' com nº de OS, ' + pdfs.filter(p => p.placas.length).length + ' com placa) em ' + (Date.now() - t0) + ' ms');
  const tit = _lerTitulos_();
  Logger.log('Títulos: ' + (tit.erro ? 'ERRO ' + tit.erro : 'Abast ' + (tit.abast ? tit.abast.linhas.length + ' linhas, cab: ' + tit.abast.cab.join(' | ') : 'aba não encontrada') + ' || Manut ' + (tit.manut ? tit.manut.linhas.length + ' linhas, cab: ' + tit.manut.cab.join(' | ') : 'aba não encontrada') + ' || Resumo Glosa: ' + tit.glosaHist.length + ' meses'));
}

function diagnosticarLogin() {
  const u = _lerUsuarios_();
  Logger.log('Usuários na SGP: ' + u.length);
  Logger.log('Exemplos: ' + JSON.stringify(u.slice(0, 3)));
  const eu = u.find(x => CONFIG.ADMINS.indexOf(x.email) >= 0);
  Logger.log('Administrador encontrado na SGP: ' + (eu ? eu.email + ' (matrícula ' + eu.matricula + ', ' + eu.nome + ')' : 'NÃO — confira COL_LOGIN_* em CONFIG'));
  const semArroba = u.filter(x => !/@prf\.gov\.br$/.test(x.email));
  if (semArroba.length) Logger.log('E-mails fora do padrão @prf.gov.br: ' + semArroba.map(x => x.email).join(', '));
}
