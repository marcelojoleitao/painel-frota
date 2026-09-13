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

  STATUS_OCULTOS_PADRAO: ['ALIENADO'],
  CACHE_SEG: 3600,        // 1 h (máximo do CacheService: 6 h). Use instalarGatilho() para manter aquecido.

  // Edição (somente ADMINS): coluna bloqueada se tiver fórmula nas linhas de
  // verificação ou fundo nessas cores (azul = fórmula, cinza = preenchida por script)
  EDICAO_CORES_BLOQUEADAS: ['#cfe2f3', '#e8e8e8'],
  EDICAO_LINHAS_VERIFICACAO: [2, 3],
  EDICAO_OBRIGATORIOS: ['placa', 'modelo', 'tipo', 'categoria', 'especie', 'cor', 'comb', 'anoFab', 'anoMod', 'chassi', 'renavam', 'blind', 'carac'],

  // Fotos das viaturas (mesma pasta do consultas_detran.py)
  PASTA_FOTOS: '1RXE1xx0GPYZhtZAuWArmU9z7RVueOcUT',
  // CRLVs baixados/anexados (mesma pasta do consultas_detran.py)
  PASTA_CRLV: '1RAs2cZEE4MzQJHKRiYKZFLefYrQcSAcC',
  // Registro das ações executadas pelo painel (aba criada automaticamente na planilha base)
  ABA_LOG: 'LogAcoes',
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
  return HtmlService.createHtmlOutput(pagina)
    .setTitle(CONFIG.TITULO)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function incluir(nome) {
  return _arquivoHtml_(nome);
}

function _arquivoHtml_(nome) {
  const origem = PropertiesService.getScriptProperties().getProperty('HTML_ORIGEM') || HTML_ORIGEM_PADRAO;
  if (origem === 'github') {
    const chave = 'html_' + nome;
    const cache = CacheService.getScriptCache();
    const guardadas = [];
    for (let i = 0; ; i++) { const p = cache.get(chave + '_' + i); if (p === null) break; guardadas.push(p); }
    if (guardadas.length) return guardadas.join('');
    let texto = null;
    try { texto = _baixarDoGitHub_(nome + '.html'); }
    catch (e) { Logger.log('GitHub indisponível para ' + nome + ' (' + e + '); usando arquivo local.'); }
    if (texto !== null) {
      // Guardar em cache é oportunista: se falhar (arquivo grande demais), servimos
      // o conteúdo do GitHub mesmo assim — nunca caímos para o arquivo local por isso.
      try {
        if (nome === 'App') limparCacheHtml();   // push novo: derruba os demais para não misturar versões
        // uma chamada por fatia: putAll com payload somado acima de 100 KB é recusado
        let n = 0;
        for (let i = 0; i < texto.length; i += 30000) cache.put(chave + '_' + (n++), texto.substring(i, i + 30000), HTML_CACHE_SEG);
      } catch (e) { Logger.log('Cache do HTML ' + nome + ' não gravado (' + e + ') — servindo direto do GitHub.'); }
      return texto;
    }
    Logger.log('HTML ' + nome + ' não encontrado no GitHub; usando arquivo local.');
  }
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
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

/** Depois de um push, rode isto (ou espere até 5 min) para o painel refletir o GitHub. */
function limparCacheHtml() {
  const cache = CacheService.getScriptCache();
  ['App', 'Login', 'Estilos', 'Scripts'].forEach(nome => {
    const lista = []; for (let i = 0; i < 120; i++) lista.push('html_' + nome + '_' + i);
    cache.removeAll(lista);
  });
  return 'Cache de HTML limpo — próximo acesso baixa do GitHub.';
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
        statusOcultosPadrao: CONFIG.STATUS_OCULTOS_PADRAO
      }
    };
    if (CONFIG.CACHE_SEG > 0) _cacheGravar_(chave, payload, CONFIG.CACHE_SEG);
    payload.meta.doCache = false;
  } else payload.meta.doCache = true;

  payload.usuario = { email: sessao.email, nome: sessao.nome || '', lotacao: sessao.lotacao || '', admin: !!sessao.admin };
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
    // "Resumo Glosa": Competência | Valor da Glosa (glosa de preços abusivos desde 03/2021)
    const rg = _abaPorCabecalho_(ss, '', ['Competência', 'Valor da Glosa']);
    if (rg) saida.glosaHist = _linhasComoObjetos_(rg).map(o => ({ comp: _txt_(o['Competência']), valor: _num_(o['Valor da Glosa']) || 0 })).filter(x => /\d{2}\/\d{4}/.test(x.comp));
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
  const lista = [];
  for (let c = 0; c < nCols; c++) {
    if (!cab[c]) continue;
    lista.push({ col: c + 1, nome: cab[c], campo: campoPorCol[c] || '', editavel: !bloqueada[c], motivo: bloqueada[c] });
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

function _lerOS_(ss) {
  const pend = _abaPorCabecalho_(ss, CONFIG.ABA_OS_PENDENTES, ['OS', 'Placa', 'Orçado', 'Status']);
  const ace  = _abaPorCabecalho_(ss, CONFIG.ABA_OS_ACEITES,   ['OS', 'Placa', 'Data Aprovação', 'Status']);
  const lista = [];
  if (pend) _linhasComoObjetos_(pend).forEach(o => lista.push({ origem: 'PENDENTE', os: _txt_(o['OS']), placa: _txt_(o['Placa']).toUpperCase(),
    valor: _num_(o['Orçado']), aprovado: _num_(o['Aprovado']), data: _dataTxt_(o['Data']), oficina: _txt_(o['Oficina']), status: _txt_(o['Status']),
    unidade: _txt_(o['Unidade SIPAC']), obs: _txt_(o['Observações']), relato: _txt_(o['Relato']), justificativa: _txt_(o['Justificativa']), modelo: _txt_(o['Marca/Modelo']) }));
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
