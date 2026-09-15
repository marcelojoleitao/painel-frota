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
const CODIGO_VERSAO = '2.33.0';

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
  ADMINS:         ['marcelo.leitao@prf.gov.br'],
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
  PASTA_DEFESAS: '1eyLGfer7R58-Usw54gTUTWyvoE8WCtiQ',
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
  const v = (pagina.match(/VERSAO_PAINEL\s*=\s*'([^']+)'/) || [])[1] || '?';
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
        pgfAtualizado: _pgfAtualizado_()
      }
    };
    if (CONFIG.CACHE_SEG > 0) _cacheGravar_(chave, payload, CONFIG.CACHE_SEG);
    payload.meta.doCache = false;
  } else payload.meta.doCache = true;

  payload.usuario = { email: sessao.email, nome: sessao.nome || '', lotacao: sessao.lotacao || '', admin: !!sessao.admin };
  payload.meta.versaoCodigo = CODIGO_VERSAO;   // mesmo vindo do cache, informa a versão em execução
  payload.meta.pgfAtualizado = _pgfAtualizado_();
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
function _datasFotos_(veiculos) {
  const chave = 'painel_fotos_v1';
  const mapa = _cacheLer_(chave) || {};
  if (!veiculos) return mapa;
  const ids = [];
  veiculos.forEach(v => ['FD', 'LE', 'TR', 'LD'].forEach(a => { const id = _idDrive_(v.fotos && v.fotos[a]); if (id && mapa[id] === undefined) ids.push(id); }));
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
function acaoAuditarCrlv(token, placa) {
  const p = _prepararAcao_(token); if (p.erroPadrao) return p.erroPadrao;
  placa = String(placa || '').trim().toUpperCase();
  const aba = p.ss.getSheetByName(CONFIG.ABA_BASE);
  const alvo = _linhaDaPlaca_(aba, placa);
  if (alvo.linha < 0) return { ok: false, erro: 'Placa não encontrada.' };
  const link = alvo.idx.linkCrlv !== undefined ? String(aba.getRange(alvo.linha, alvo.idx.linkCrlv + 1).getValue() || '').trim() : '';
  try {
    if (!link) return { ok: true, status: 'SEM CRLV', detalhe: 'Sem link na coluna BO — nada a auditar.' };
    const bytes = _baixarDoDrive_(link);
    const texto = _pdfTexto_(bytes);
    const placaPdf = _extrairPlacaPdf_(texto);
    if (placaPdf && placaPdf !== placa) {
      _logAcao_(p.ss, p.sessao.email, 'Auditar CRLV', placa, 'CRLV TROCADO', 'PDF é de ' + placaPdf);
      return { ok: true, status: 'CRLV TROCADO', detalhe: 'O PDF do link é da placa ' + placaPdf + ' — confira e anexe o correto.' };
    }
    const ex = _extrairExercicio_(texto, placa);
    if (!ex) {
      _logAcao_(p.ss, p.sessao.email, 'Auditar CRLV', placa, 'NÃO VERIFICÁVEL', 'texto sem exercício');
      return { ok: true, status: 'NÃO VERIFICÁVEL', detalhe: 'Link abre, mas não li o exercício (PDF escaneado?).' };
    }
    const atual = alvo.idx.anoEx !== undefined ? parseInt(String(aba.getRange(alvo.linha, alvo.idx.anoEx + 1).getValue() || '').replace(/\D/g, ''), 10) || 0 : 0;
    if (ex !== atual && alvo.idx.anoEx !== undefined) {
      aba.getRange(alvo.linha, alvo.idx.anoEx + 1).setValue(ex);
      SpreadsheetApp.flush(); limparCache();
      _logAcao_(p.ss, p.sessao.email, 'Auditar CRLV', placa, 'EXERCÍCIO AJUSTADO', atual + ' → ' + ex);
      return { ok: true, status: 'EXERCÍCIO AJUSTADO', detalhe: 'Ano Exercício: ' + (atual || '—') + ' → ' + ex + '.' };
    }
    _logAcao_(p.ss, p.sessao.email, 'Auditar CRLV', placa, 'OK', 'placa confere, exercício ' + ex);
    return { ok: true, status: 'OK', detalhe: 'Placa confere; exercício ' + ex + ' já correto.' };
  } catch (e) {
    const msg = String(e.message || e);
    _logAcao_(p.ss, p.sessao.email, 'Auditar CRLV', placa, 'ERRO', msg);
    return { ok: false, erro: msg };
  }
}


/* ------------------------------------------------------------ */
/*  Documentos da viatura (CRLV e termo de tombamento)           */
/* ------------------------------------------------------------ */

const DOCUMENTOS_VIATURA = {
  crlv:       { campo: 'linkCrlv', rotulo: 'CRLV',                 sufixo: '',       pasta: 'PASTA_CRLV' },
  tombamento: { campo: 'linkTomb', rotulo: 'Termo de tombamento',  sufixo: '_termo', pasta: 'PASTA_TOMBAMENTO' }
};

/**
 * Substitui ou inclui um documento em PDF da viatura. O arquivo vai para a
 * pasta do Drive e o link é gravado na coluna correspondente da ConsultaBD.
 * O arquivo anterior com o mesmo nome vai para a lixeira (fica recuperável).
 */
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


/* ------------------------------------------------------------ */
/*  Edição de campos da aba OS (observações, relato, justificativa) */
/* ------------------------------------------------------------ */

const CAMPOS_OS_EDITAVEIS = { obs: 'Observações', relato: 'Relato', justificativa: 'Justificativa' };
/** Rótulos alternativos aceitos para cada campo editável da aba OS. */
const ALTERNATIVAS_OS = { aprovacao: ['Aprovação', 'Aprovacao', 'Análise', 'Analise'], obs: ['Observações', 'Observacoes'], relato: ['Relato'], justificativa: ['Justificativa'] };

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
    const prefixo = 'NF ' + tipo + ' ' + comp;
    const existentes = pasta.getFiles();
    while (existentes.hasNext()) {
      const f = existentes.next();
      if (f.getName().indexOf(prefixo) === 0) { try { f.setTrashed(true); } catch (e) {} }
    }
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
    const linha = _primeiraLinhaVaziaNaColuna_(aba, 1, 3);
    aba.getRange(linha, 1, 1, 7).setValues([[c.titulo, c.numeroNfse, _parseNumeroBR_(c.valorTotal), '',
      _parseDataBR_(c.dataEmissao), _parseDataBR_(c.vencimento), _formatarCompetencia_(c.competencia, false)]]);
    aba.getRange(linha, 18).setValue(String(c.chave || ''));
    const linkNota = _guardarNotaFiscal_(arquivo, 'Abastecimento', c.competencia, c.numeroNfse);
    _gravarLinkNota_(aba, linha, linkNota);
    SpreadsheetApp.flush(); limparCache();
    _logAcao_(p.ss, p.sessao.email, 'Importar título abastecimento', '', 'Título ' + c.titulo, 'NF ' + c.numeroNfse + ' | ' + c.valorTotal + ' | comp. ' + c.competencia);
    return { ok: true, linha: linha, campos: c, linkNota: linkNota };
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
    const linha = _primeiraLinhaVaziaNaColuna_(aba, 1, 3);
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
    _logAcao_(p.ss, p.sessao.email, 'Importar título manutenção', '', 'Título ' + c.titulo, 'NF ' + c.numeroNfse + ' | peças ' + c.reembolsoPecas + ' | MO ' + c.reembolsoMaoObra);
    return { ok: true, linha: linha, campos: c, linkNota: linkNota, conferencia: _conferirNf_(c) };
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
    return { ok: true, nome: nome, link: pdf.link || '', base64: pdf.base64 || '', aviso: pdf.aviso || '', total: dados.total, comGlosa: dados.comGlosa,
             avaliados: dados.avaliados, grupos: dados.grupos.map(g => ({ combustivel: g.combustivel, subtotal: g.subtotal, itens: g.itens.length })),
             semTeto: Object.keys(dados.semTeto).map(k => k + ' (' + dados.semTeto[k] + ')') };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
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

/** Placas com processo de acidente ainda em aberto (aba Acidentes: col. B preenchida, col. C vazia). */
function _placasComAcidenteAberto_() {
  const mapa = {};
  try {
    const aba = SpreadsheetApp.openById(CONFIG.ID_BASE).getSheetByName(CONFIG.ABA_ACIDENTES);
    if (!aba || aba.getLastRow() < 2) return mapa;
    aba.getRange(2, 1, aba.getLastRow() - 1, 3).getValues().forEach(l => {
      const placa = String(l[1] || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const pago = String(l[2] || '').trim();
      if (placa && !pago) mapa[placa] = String(l[0] || '').trim();   // col. A = referência do processo
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
  const normaliza = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const porRotulo = {};
  resumo.linhas.forEach(l => { porRotulo[normaliza(l[0])] = l[1]; });
  // o modelo pode escrever o rótulo de outra forma; aceitamos variações
  const sinonimos = {
    'outros descontos': ['(-) outros descontos', 'outros descontos', 'outras deducoes', '(-) outras deducoes'],
    'glosa (imr)': ['(-) glosa (imr)', 'glosa imr', '(-) glosa do imr'],
    'valor liquido apos glosa': ['(=) valor liquido apos glosa', 'valor liquido'],
    'valor liquido apos desconto e glosas': ['(=) valor liquido apos desconto e glosas', 'valor liquido']
  };
  Object.keys(sinonimos).forEach(base => {
    const achado = Object.keys(porRotulo).find(k => k.indexOf(base) >= 0);
    if (achado === undefined) return;
    sinonimos[base].forEach(alt => { if (porRotulo[alt] === undefined) porRotulo[alt] = porRotulo[achado]; });
  });

  const tabelas = corpo.getTables();
  for (let t = 0; t < tabelas.length; t++) {
    const tab = tabelas[t];
    for (let r = 0; r < tab.getNumRows(); r++) {
      const linha = tab.getRow(r);
      if (linha.getNumCells() < 2) continue;
      const rotulo = normaliza(linha.getCell(0).getText());
      if (porRotulo[rotulo] === undefined) continue;
      const celula = linha.getCell(linha.getNumCells() - 1);
      const texto = celula.getText();
      const formatado = (texto.indexOf('R$') >= 0 ? 'R$ ' : '') + _decBR_(porRotulo[rotulo]);
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
  return ajustadas;
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
      const antigos = pasta.getFilesByName(novoNome);
      while (antigos.hasNext()) { try { antigos.next().setTrashed(true); } catch (e) {} }
      const copia = DriveApp.getFileById(modelos[nomeModelo]).makeCopy(novoNome, pasta);
      const doc = DocumentApp.openById(copia.getId());
      const corpo = doc.getBody();
      Object.keys(parametros).forEach(chave => { corpo.replaceText(chave.replace(/[{}]/g, '\\$&'), parametros[chave]); });
      const ajustadas = _preencherTabelas_(corpo, leitura.resumo, leitura.serie);
      doc.saveAndClose();
      try { copia.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      gerados.push({ nome: novoNome, url: copia.getUrl(), celulas: ajustadas });
    });

    _logAcao_(p.ss, p.sessao.email, 'Gerar documentos ' + tipo, '', competencia, gerados.map(g => g.nome).join(' | '));
    return { ok: true, gerados: gerados, parametros: Object.keys(parametros).length };
  } catch (e) { return { ok: false, erro: String(e.message || e) }; }
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
  if (linhaCabOrigem < 0) throw new Error('Não encontrei a linha de cabeçalho (com "PLACA") na planilha de origem.');
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
    ['Defesa ' + numeroAI, nome].forEach(prefixo => {
      const antigos = pasta.getFilesByName(prefixo);
      while (antigos.hasNext()) { try { antigos.next().setTrashed(true); } catch (e) {} }
    });
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
    return { ok: true, url: url, nome: nome, parametros: parametros };
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

function _mapearCampos_(cab) {
  const posicoes = {};
  cab.forEach((nome, i) => { if (!posicoes[nome]) posicoes[nome] = []; posicoes[nome].push(i); });
  const idx = {}, faltando = [];
  Object.keys(CAMPOS).forEach(k => {
    const [nome, oc] = CAMPOS[k];
    const lista = posicoes[nome];
    if (lista && lista[oc] !== undefined) idx[k] = lista[oc];
    else faltando.push(nome + (oc ? ' (' + (oc + 1) + 'ª)' : ''));
  });
  if (faltando.length) Logger.log('Colunas não encontradas na ConsultaBD: ' + faltando.join(' | '));
  return idx;
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

function _lerOS_(ss) {
  const pend = _abaPorCabecalho_(ss, CONFIG.ABA_OS_PENDENTES, ['OS', 'Placa', 'Orçado', 'Status']);
  const linhaDe = {};
  const ace  = _abaPorCabecalho_(ss, CONFIG.ABA_OS_ACEITES,   ['OS', 'Placa', 'Data Aprovação', 'Status']);
  const lista = [];
  if (pend) _linhasComoObjetos_(pend).forEach((o, i) => lista.push({ origem: 'PENDENTE', linha: pend.linhaCab + 2 + i, os: _txt_(o['OS']), placa: _txt_(o['Placa']).toUpperCase(),
    valor: _num_(o['Orçado']), aprovado: _num_(o['Aprovado']), data: _dataTxt_(o['Data']), oficina: _txt_(o['Oficina']), status: _txt_(o['Status']),
    unidade: _txt_(o['Unidade SIPAC']), obs: _txt_(o['Observações']), relato: _txt_(o['Relato']), justificativa: _txt_(o['Justificativa']),
    modelo: _txt_(o['Marca/Modelo']),
    aprovacao: _txt_(o['Aprovação'] !== undefined ? o['Aprovação'] : o['Aprovacao']),
    linkAnalise: _txt_(o['Relatório da Análise'] !== undefined ? o['Relatório da Análise'] : o['Relatorio da Analise']) || _urlDaLinha_(o) }));
  if (ace) _linhasComoObjetos_(ace).forEach(o => lista.push({ origem: 'ACEITE', os: _txt_(o['OS']), placa: _txt_(o['Placa']).toUpperCase(),
    valor: _num_(o['Valor Total']), aprovado: null, data: _dataTxt_(o['Data Aprovação']), oficina: '', status: _txt_(o['Status']),
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
