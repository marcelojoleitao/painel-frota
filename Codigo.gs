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
  const t = HtmlService.createTemplate(_arquivoHtml_('App'));
  t.titulo = CONFIG.TITULO;
  return t.evaluate()
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
    try {
      const texto = _baixarDoGitHub_(nome + '.html');
      if (texto !== null) {
        const fatias = {}; let n = 0;
        for (let i = 0; i < texto.length; i += 90000) fatias[chave + '_' + (n++)] = texto.substring(i, i + 90000);
        cache.putAll(fatias, HTML_CACHE_SEG);
        return texto;
      }
      Logger.log('HTML ' + nome + ' não encontrado no GitHub; usando arquivo local.');
    } catch (e) { Logger.log('GitHub indisponível para ' + nome + ' (' + e + '); usando arquivo local.'); }
  }
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

/** Depois de um push, rode isto (ou espere até 5 min) para o painel refletir o GitHub. */
function limparCacheHtml() {
  const cache = CacheService.getScriptCache();
  ['App', 'Login', 'Estilos', 'Scripts'].forEach(nome => {
    const lista = []; for (let i = 0; i < 40; i++) lista.push('html_' + nome + '_' + i);
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
  if (!sessao.admin) payload.solicitacoes = [];   // dado sensível: só administrador
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
