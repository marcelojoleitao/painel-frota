/*************************************************
 * IMPORTADOR MODULAR — CONFIG
 *************************************************/
const SS_FROTA    = '1w2K4UNAmMY_2WCTlyNdmj-b7AEgvBiW0wxW_1PPa6a8'; // AbastBD, ManutBD
const SS_TITULOS  = '1qbyt1iCKP8dvZFDTmA3Zk-UHHdYYugDeO12WyJYGKYM'; // Títulos Abast. / Títulos Manut.
const SS_MANUT_DB = '1WpI_krrzyB65lfN6lYZHr9aD1-x0cSUg_g61xGgvNrk'; // DetalhamentoDB, AceitesDB
const SS_ANP      = '1VRF3ulO6Z0c0WwyPCwN5dLGWjPiSuTEmEQ7eqXwEaNc'; // Histórico ANP

const SHEET_ABAST = 'AbastBD';
const SHEET_MANUT = 'ManutBD';
const DEST_COLS   = 40; // A:AN (AbastBD/ManutBD)

const ABA_TIT_ABAST = 'Títulos Abast.';
const ABA_TIT_MANUT = 'Títulos Manut.';
const ABA_DETALHE   = 'DetalhamentoDB';
const ABA_ACEITES   = 'AceitesDB';
const ABA_ANP       = 'Histórico ANP';

// DetalhamentoDB: dados em F:AB (23 colunas); AC = Título; AD = Competência
const DETALHE_COL_INI    = 6;   // F
const DETALHE_NUM_COLS   = 23;  // F:AB
const DETALHE_COL_TITULO = 29;  // AC
const DETALHE_COL_COMP   = 30;  // AD

// AceitesDB: dados em A:G; H = tipo
const ACEITE_NUM_COLS = 7; // A:G
const ACEITE_COL_TIPO = 8; // H

// Histórico ANP: dados em A:J
const ANP_NUM_COLS = 10; // A:J

// Download direto da série histórica da ANP (usado pela atualização "Glosa ANP")
const URL_GLOSA_ANP = 'https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/precos-revenda-e-de-distribuicao-combustiveis/shlp/mensal/mensal-estados-desde-jan2013.xlsx';

const MESES_PT = {jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12};

// Qual chave gravar nos títulos: 'nacional' (Chave de Acesso NFS-e Nacional) ou 'municipal'
const CHAVE_PADRAO = 'nacional';

/*************************************************
 * MENU / DIÁLOGO
 *************************************************/

function abrirDialogUpload() {
  const html = HtmlService.createHtmlOutputFromFile('UploadArquivos')
    .setWidth(720).setHeight(820);
  // modeless: não trava a planilha, então os toasts aparecem durante as importações
  SpreadsheetApp.getUi().showModelessDialog(html, 'Importador de arquivos');
}

// Serializa gravações (evita corrida pela "próxima linha vazia") e emite toast no fim
function executar_(titulo, fn) {
  const lock = LockService.getScriptLock();
  try { lock.waitLock(30000); }
  catch (e) { const r = { ok: false, mensagem: 'Outra importação está em andamento. Tente novamente em instantes.' }; toast_(r.mensagem, titulo, true); return r; }
  try {
    const res = fn();
    toast_(res && res.ok ? res.mensagem : ((res && res.mensagem) || 'Erro.'), titulo, !(res && res.ok));
    return res;
  } catch (e) {
    const r = err_(titulo, e); toast_(r.mensagem, titulo, true); return r;
  } finally {
    lock.releaseLock();
  }
}

function toast_(msg, titulo, erro) {
  try {
    const txt = String(msg || '').replace(/\n/g, ' · ').slice(0, 250);
    SpreadsheetApp.getActiveSpreadsheet().toast(txt, (erro ? '⚠ ' : '✓ ') + 'Importações · ' + titulo, 8);
  } catch (e) {}
}

/*************************************************
 * ABASTECIMENTO (Excel -> AbastBD)  [lógica original]
 *************************************************/
function importarAbastUpload(fileObj) {
  return executar_('Abastecimento', function () {
    if (!fileObj) throw new Error('Selecione o arquivo de Abastecimento.');
    const aba = abrirAba_(SS_FROTA, SHEET_ABAST);
    const dados = lerExcelDrive_(fileObj, false); // display values
    const r = importarAbast_(aba, dados);
    return ok_(`AbastBD\nLidos: ${r.lidos}\nInseridos: ${r.inseridos}\nDuplicados ignorados: ${r.duplicados}`);
  });
}

/*************************************************
 * MANUTENÇÃO (Excel -> ManutBD)  [lógica original]
 *************************************************/
function importarManutUpload(fileObj) {
  return executar_('Manutenção', function () {
    if (!fileObj) throw new Error('Selecione o arquivo de Manutenção.');
    const aba = abrirAba_(SS_FROTA, SHEET_MANUT);
    const dados = lerExcelDrive_(fileObj, false);
    const r = importarManut_(aba, dados);
    return ok_(`ManutBD\nLidos: ${r.lidos}\nInseridos: ${r.inseridos}\nDuplicados ignorados: ${r.duplicados}`);
  });
}

/*************************************************
 * ITEM 3 — DETALHAMENTO (HTML rowspan-aware -> DetalhamentoDB F:AB / AC / AD)
 * payload = { file, titulo, competencia }  (titulo/competencia opcionais)
 *************************************************/
function importarDetalhamentoUpload(payload) {
  return executar_('Detalhamento', function () {
    const fileObj = payload && payload.file;
    if (!fileObj) throw new Error('Selecione o arquivo de Detalhamento.');
    const titulo = String((payload && payload.titulo) || '').trim();
    const comp   = formatarCompetencia_((payload && payload.competencia) || '', false);
    const aba = abrirAba_(SS_MANUT_DB, ABA_DETALHE);
    const grid = lerTabelaUpload_(fileObj); // HTML ou Drive
    const r = importarDetalhamento_(aba, grid, titulo, comp);
    return ok_(`DetalhamentoDB\nLinhas inseridas: ${r.inseridos}` +
               (titulo ? `\nTítulo (AC): ${titulo}` : '') +
               (comp ? `\nCompetência (AD): ${comp}` : ''));
  });
}

function importarDetalhamento_(aba, grid, titulo, comp) {
  if (!grid || grid.length <= 2) return { inseridos: 0 };
  const body = grid.slice(2); // pula as 2 linhas de cabeçalho
  const linhas = [];
  body.forEach(row => {
    if (!row.some(c => String(c).trim() !== '')) return;
    const linha = new Array(DETALHE_NUM_COLS).fill('');
    for (let i = 0; i < DETALHE_NUM_COLS; i++) linha[i] = (row[i] !== undefined ? row[i] : '');
    linhas.push(linha);
  });
  if (!linhas.length) return { inseridos: 0 };
  const startRow = proximaLinhaAppend_(aba, DETALHE_COL_INI, 3);
  aba.getRange(startRow, DETALHE_COL_INI, linhas.length, DETALHE_NUM_COLS).setValues(linhas); // F:AB
  if (titulo) aba.getRange(startRow, DETALHE_COL_TITULO, linhas.length, 1).setValues(linhas.map(() => [titulo])); // AC
  if (comp)   aba.getRange(startRow, DETALHE_COL_COMP,   linhas.length, 1).setValues(linhas.map(() => [comp]));   // AD
  return { inseridos: linhas.length };
}

/*************************************************
 * ITEM 4 e 5 — ACEITES (HTML -> AceitesDB A:G + H)
 * payload = { file, tipo }  tipo = 'Gestor' | 'Automático'
 *************************************************/
function importarAceiteUpload(payload) {
  return executar_('Aceite', function () {
    const fileObj = payload && payload.file;
    const tipo = payload && payload.tipo;
    if (!fileObj) throw new Error('Selecione o arquivo de Aceite.');
    if (tipo !== 'Gestor' && tipo !== 'Automático') throw new Error('Tipo de aceite inválido.');
    const aba = abrirAba_(SS_MANUT_DB, ABA_ACEITES);
    const grid = lerTabelaUpload_(fileObj);
    const r = importarAceite_(aba, grid, tipo);
    return ok_(`AceitesDB (${tipo})\nLidos: ${r.lidos}\nInseridos: ${r.inseridos}\nDuplicados (OS já existente) ignorados: ${r.duplicados}`);
  });
}

function importarAceite_(aba, grid, tipo) {
  if (!grid || grid.length <= 8) return { lidos: 0, inseridos: 0, duplicados: 0 };
  const body = grid.slice(8); // pula linhas 1 a 8 (preâmbulo + cabeçalho)
  const existentes = obterValoresColuna_(aba, 1, 2);
  const novos = new Set();
  const linhas = [];
  let lidos = 0, duplicados = 0;
  body.forEach(row => {
    if (ehRodapeAceite_(row)) return;
    if (!row.some(c => String(c).trim() !== '')) return;
    const os = normalizarCodigo_(row[0]);
    if (!os) return;
    lidos++;
    if (existentes.has(os) || novos.has(os)) { duplicados++; return; }
    const linha = new Array(ACEITE_NUM_COLS).fill('');
    for (let i = 0; i < ACEITE_NUM_COLS; i++) linha[i] = (row[i] !== undefined ? row[i] : '');
    linhas.push(linha);
    novos.add(os);
  });
  if (!linhas.length) return { lidos, inseridos: 0, duplicados };
  const startRow = proximaLinhaAppend_(aba, 1, 2);
  aba.getRange(startRow, 1, linhas.length, ACEITE_NUM_COLS).setValues(linhas);              // A:G
  aba.getRange(startRow, ACEITE_COL_TIPO, linhas.length, 1).setValues(linhas.map(() => [tipo])); // H
  return { lidos, inseridos: linhas.length, duplicados };
}

function ehRodapeAceite_(row) {
  const txt = removerAcentos_(row.map(c => String(c)).join(' ').toUpperCase());
  return /QTDE\.?\s*DE\s*OS/.test(txt) || /TOTAL\s+GERAL/.test(txt) || /TOTAL\s+ACEITE/.test(txt);
}

/*************************************************
 * ITEM 6 — GLOSA ANP (xlsx real, valores tipados -> Histórico ANP A:J)
 * payload = { file, competencia }  competencia = MM/YYYY (obrigatória)
 *************************************************/
function importarGlosaUpload(payload) {
  return executar_('Glosa ANP', function () {
    const fileObj = payload && payload.file;
    if (!fileObj) throw new Error('Selecione o arquivo de Glosa ANP.');
    const comp = formatarCompetencia_((payload && payload.competencia) || '', true);
    const [mm, yyyy] = comp.split('/').map(Number);
    const aba = abrirAba_(SS_ANP, ABA_ANP);
    const dados = lerExcelDrive_(fileObj, true); // valores TIPADOS (datas reais na col A)
    const r = importarGlosaANP_(aba, dados, mm, yyyy);
    return ok_(`Histórico ANP — Competência ${comp}\nLinhas correspondentes: ${r.encontrados}\nInseridas: ${r.inseridos}`);
  });
}

// Baixa a série da ANP direto do site e importa a competência informada.
// payload = { competencia }  (MM/YYYY, obrigatória) — sem upload.
function importarGlosaAnpUpdate(payload) {
  return executar_('Glosa ANP', function () {
    const comp = formatarCompetencia_((payload && payload.competencia) || '', true);
    const [mm, yyyy] = comp.split('/').map(Number);
    const aba = abrirAba_(SS_ANP, ABA_ANP);
    const blob = baixarGlosaAnp_();               // download via UrlFetchApp
    const dados = lerBlobExcel_(blob, true);       // converte no Drive e lê valores TIPADOS
    const r = importarGlosaANP_(aba, dados, mm, yyyy);
    return ok_(`Histórico ANP (baixado da ANP) — Competência ${comp}\nLinhas correspondentes: ${r.encontrados}\nInseridas: ${r.inseridos}`);
  });
}

function baixarGlosaAnp_() {
  let resp;
  try {
    resp = UrlFetchApp.fetch(URL_GLOSA_ANP, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppsScript' }
    });
  } catch (e) {
    throw new Error('Não consegui acessar o site da ANP: ' + (e && e.message ? e.message : e));
  }
  const code = resp.getResponseCode();
  if (code !== 200) throw new Error('Download da ANP retornou HTTP ' + code + '. Tente novamente mais tarde ou confira o link.');
  const blob = resp.getBlob()
    .setName('glosa-anp.xlsx')
    .setContentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  if (blob.getBytes().length < 1000) throw new Error('O arquivo baixado da ANP veio vazio/curto.');
  return blob;
}

function importarGlosaANP_(aba, dados, mm, yyyy) {
  if (!dados || !dados.length) return { encontrados: 0, inseridos: 0 };
  const jaExiste = contarCompetenciaANP_(aba, mm, yyyy);
  if (jaExiste > 0) {
    throw new Error('A competência ' + String(mm).padStart(2, '0') + '/' + yyyy +
      ' já possui ' + jaExiste + ' linha(s) na aba Histórico ANP. Remova-as antes de reimportar para não duplicar.');
  }
  const dataComp = new Date(yyyy, mm - 1, 1);
  const linhas = [];
  dados.forEach(row => {
    const c = parseCompetenciaCelula_(row[0]);
    if (!c || c.mm !== mm || c.yyyy !== yyyy) return;
    const linha = new Array(ANP_NUM_COLS).fill('');
    linha[0] = dataComp; // col A normalizada
    for (let i = 1; i < ANP_NUM_COLS; i++) linha[i] = (row[i] !== undefined && row[i] !== null ? row[i] : '');
    linhas.push(linha);
  });
  if (!linhas.length) return { encontrados: 0, inseridos: 0 };
  const startRow = proximaLinhaAppend_(aba, 1, 2);
  aba.getRange(startRow, 1, linhas.length, ANP_NUM_COLS).setValues(linhas);  // A:J
  aba.getRange(startRow, 1, linhas.length, 1).setNumberFormat('MM/yyyy');     // col A -> MM/YYYY
  return { encontrados: linhas.length, inseridos: linhas.length };
}

// Conta quantas linhas já existem na aba destino para a competência informada
function contarCompetenciaANP_(aba, mm, yyyy) {
  const last = aba.getLastRow();
  if (last < 1) return 0;
  const vals = aba.getRange(1, 1, last, 1).getValues();
  let n = 0;
  vals.forEach(function (r) { const c = parseCompetenciaCelula_(r[0]); if (c && c.mm === mm && c.yyyy === yyyy) n++; });
  return n;
}

/*************************************************
 * ITEM 1 e 2 — LEITURA DO PDF DA NF (pré-preenche o formulário)
 *************************************************/
function importarTituloAbastUpload(fileObj) {
  return executar_('Título Abast.', function () {
    if (!fileObj) throw new Error('Selecione o PDF da NF de Abastecimento.');
    const texto = extrairTextoPdf_(fileObj);
    if (!texto || texto.replace(/\s/g, '').length < 30) throw new Error('Não consegui ler o texto do PDF.');
    const d = parseNfAbast_(texto);
    if (!d.titulo) throw new Error('Não localizei o Nº do Título (TITULO NRO.) no PDF.');
    const aba = abrirAba_(SS_TITULOS, ABA_TIT_ABAST);
    const linha = primeiraLinhaVaziaNaColuna_(aba, 1, 3);
    aba.getRange(linha, 1, 1, 7).setValues([[
      d.titulo, d.notaFiscal, parseNumeroBR_(d.valorBruto), parseNumeroBR_(d.juros),
      parseDataBR_(d.dataEmissao), parseDataBR_(d.dataVencimento), formatarCompetencia_(d.competencia, false)
    ]]);                                                                  // A:G
    aba.getRange(linha, 18, 1, 1).setValues([[String(d.chave || '')]]);   // R
    return ok_(`Título Abast. gravado (linha ${linha}).\n` +
               `Título ${d.titulo} · NF ${d.notaFiscal} · Bruto ${d.valorBruto}\n` +
               `Emissão ${d.dataEmissao} · Venc. ${d.dataVencimento} · Comp. ${d.competencia}`);
  });
}

function importarTituloManutUpload(fileObj) {
  return executar_('Título Manut.', function () {
    if (!fileObj) throw new Error('Selecione o PDF da NF de Manutenção.');
    const texto = extrairTextoPdf_(fileObj);
    if (!texto || texto.replace(/\s/g, '').length < 30) throw new Error('Não consegui ler o texto do PDF.');
    const d = parseNfManut_(texto);
    if (!d.titulo) throw new Error('Não localizei o Nº do Título (TITULO NRO.) no PDF.');
    const aba = abrirAba_(SS_TITULOS, ABA_TIT_MANUT);
    const linha = primeiraLinhaVaziaNaColuna_(aba, 1, 3);
    aba.getRange(linha, 1, 1, 5).setValues([[
      d.titulo, d.notaFiscal, parseNumeroBR_(d.valorTotal),
      parseNumeroBR_(d.reembolsoPecas), parseNumeroBR_(d.reembolsoMaoObra)
    ]]);                                                                  // A:E (F/G = fórmulas)
    aba.getRange(linha, 8, 1, 4).setValues([[
      parseNumeroBR_(d.juros), parseDataBR_(d.dataEmissao), parseDataBR_(d.dataVencimento),
      formatarCompetencia_(d.competencia, false)
    ]]);                                                                  // H:K
    aba.getRange(linha, 19, 1, 1).setValues([[String(d.chave || '')]]);   // S
    return ok_(`Título Manut. gravado (linha ${linha}).\n` +
               `Título ${d.titulo} · NF ${d.notaFiscal} · Total ${d.valorTotal}\n` +
               `Peças ${d.reembolsoPecas} · MO ${d.reembolsoMaoObra} · Venc. ${d.dataVencimento} · Comp. ${d.competencia}`,
               { dados: { titulo: d.titulo, competencia: d.competencia } }); // alimenta o Detalhamento
  });
}

// Diagnóstico opcional: retorna o texto extraído do PDF, os campos lidos e a lista
// de moedas candidatas. Útil se algum PDF novo extrair valores errados.
function diagnosticarNf(fileObj) {
  try {
    if (!fileObj) throw new Error('Selecione o PDF.');
    const texto = extrairTextoPdf_(fileObj);
    const moedas = (removerAcentos_(String(texto)).replace(/\s+/g, ' ').toUpperCase().match(/\d[\d.]*,\d{2}/g) || []);
    return { ok: true, campos: extrairCamposNf_(texto), moedas: moedas, texto: String(texto).slice(0, 4000) };
  } catch (e) { return err_('Diagnóstico', e); }
}

function parseNfAbast_(texto) {
  const c = extrairCamposNf_(texto);
  return {
    titulo: c.titulo, notaFiscal: c.numeroNfse, valorBruto: c.valorTotal, juros: '',
    dataEmissao: c.dataEmissao, dataVencimento: c.vencimento, competencia: c.competencia, chave: c.chave
  };
}

function parseNfManut_(texto) {
  const c = extrairCamposNf_(texto);
  return {
    titulo: c.titulo, notaFiscal: c.numeroNfse, valorTotal: c.valorTotal,
    reembolsoPecas: c.reembolsoPecas, reembolsoMaoObra: c.reembolsoMaoObra, juros: '',
    dataEmissao: c.dataEmissao, dataVencimento: c.vencimento, competencia: c.competencia, chave: c.chave
  };
}

function extrairCamposNf_(texto) {
  const T = removerAcentos_(String(texto || '')).replace(/\s+/g, ' ').trim().toUpperCase();
  const g = (re) => { const x = T.match(re); return x ? x[1].trim() : ''; };

  const compRaw = g(/DATA COMPETENCIA:?\s*(\d{2}\/\d{2}\/\d{4})/);
  let competencia = '';
  if (compRaw) { const p = parseCompetenciaCelula_(compRaw); if (p) competencia = String(p.mm).padStart(2, '0') + '/' + p.yyyy; }

  const fat = T.match(/\d{7,}\s+(\d{2}\/\d{2}\/\d{4})/) ||
              T.match(/VENCIMENTO[\s\S]{0,40}?(\d{2}\/\d{2}\/\d{4})/);
  const chaveNac = g(/CHAVE DE ACESSO NFS-?E NACIONAL:?\s*([0-9]+)/);
  const chaveMun = g(/CHAVE DE ACESSO:?\s*([0-9][0-9\-\/]+)/);
  const chave = (CHAVE_PADRAO === 'municipal' && chaveMun) ? chaveMun : (chaveNac || chaveMun);

  const valorTotal = g(/VALOR TOTAL DA NOTA FISCAL:?\s*R?\$?\s*([\d.]+,\d{2})/);
  const valorLiquido = g(/VALOR LIQUIDO DA NOTA FISCAL:?\s*R?\$?\s*([\d.]+,\d{2})/);
  const descontoCond = g(/DESCONTO CONDICIONAL\s*:?\s*([\d.]+,\d{2})/);
  const reemb = extrairReembolsos_(T, parseNumeroBR_(valorTotal), parseNumeroBR_(valorLiquido), parseNumeroBR_(descontoCond));

  return {
    titulo: g(/TITULO NRO\.?\s*:?\s*(\d+)/),
    numeroNfse: g(/NUMERO NFS-?E NACIONAL\s*:?\s*(\d+)/),
    valorTotal: valorTotal,
    reembolsoPecas: reemb.pecas,
    reembolsoMaoObra: reemb.mao,
    dataEmissao: g(/DATA DE EMISSAO:?\s*(\d{2}\/\d{2}\/\d{4})/),
    vencimento: fat ? fat[1] : '',
    competencia: competencia,
    chave: chave
  };
}

// Reembolsos (Manut): na NFS-e há DOIS pares que somam o VALOR TOTAL
//   (Peças+MãoObra) e (Desconto+Líquido). Removemos os valores rotulados
//   (Total, Líquido, Desconto) e procuramos o par de moedas que soma o total.
//   IMPORTANTE: não usamos lookahead (?!\d), pois na conversão do Drive os valores
//   ficam colados ao texto seguinte (ex.: "105.498,6901/06/2026"); o padrão já para
//   após as 2 casas decimais. "2,00000000" vira candidato "2,00" (inofensivo: não
//   soma o total com nada). 1ª moeda do par = Peças; 2ª = Mão de Obra.
function extrairReembolsos_(T, totalNum, liquidoNum, descontoNum) {
  const RE_MOEDA = /\d[\d.]*,\d{2}/g;
  const todas = (T.match(RE_MOEDA) || []).map(function (s) { return { s: s, n: parseNumeroBR_(s) }; });
  if (!totalNum) {
    const idx0 = T.lastIndexOf('REEMBOLSO');
    if (idx0 > -1) { const ms = (T.slice(idx0).match(RE_MOEDA) || []).filter(function (x) { return parseNumeroBR_(x) > 0; }); if (ms.length >= 2) return { pecas: ms[0], mao: ms[1] }; }
    return { pecas: '', mao: '' };
  }
  const excluir = [totalNum, liquidoNum, descontoNum].filter(function (x) { return x > 0; });
  const ehExcluido = function (n) { return excluir.some(function (x) { return Math.abs(x - n) < 0.005; }); };
  const cand = todas.filter(function (m) { return m.n > 0 && !ehExcluido(m.n); });
  for (let i = 0; i < cand.length; i++) {
    for (let j = i + 1; j < cand.length; j++) {
      if (Math.abs(cand[i].n + cand[j].n - totalNum) < 0.005) return { pecas: cand[i].s, mao: cand[j].s };
    }
  }
  // fallback: duas primeiras moedas (>0) após o último rótulo REEMBOLSO
  const idx = T.lastIndexOf('REEMBOLSO');
  if (idx > -1) { const ms = (T.slice(idx).match(RE_MOEDA) || []).filter(function (x) { return parseNumeroBR_(x) > 0; }); if (ms.length >= 2) return { pecas: ms[0], mao: ms[1] }; }
  return { pecas: '', mao: '' };
}

function extrairTextoPdf_(fileObj) {
  const blob = criarBlobBase64_(fileObj);
  let texto = converterPdfParaTexto_(blob, null);       // 1) usa a camada de texto
  if (texto && texto.replace(/\s/g, '').length > 50) return texto;
  return converterPdfParaTexto_(blob, 'pt-BR');          // 2) fallback OCR
}

function converterPdfParaTexto_(blob, ocrLang) {
  const resource = { name: '[TEMP] NF ' + Date.now(), mimeType: MimeType.GOOGLE_DOCS };
  const opts = ocrLang ? { ocrLanguage: ocrLang } : {};
  let doc;
  try { doc = Drive.Files.create(resource, blob, opts); }
  catch (e) { if (ocrLang) return ''; doc = Drive.Files.create(resource, blob); }
  try { return DocumentApp.openById(doc.id).getBody().getText(); }
  finally { excluirArquivoTemporario_(doc); }
}

/*************************************************
 * (Gravação dos títulos agora é feita direto em
 *  importarTituloAbastUpload / importarTituloManutUpload)
 *************************************************/

/*************************************************
 * LEITURA DE ARQUIVOS (HTML-table OU Excel real)
 *************************************************/
// Detecta o tipo: xlsx (PK), HTML (<table>) ou xls binário antigo (Drive)
function lerTabelaUpload_(fileObj) {
  const bytes = Utilities.base64Decode(fileObj.base64);
  const ehZip = bytes.length > 1 && bytes[0] === 80 && bytes[1] === 75; // 'PK' => xlsx
  if (!ehZip) {
    const txt = Utilities.newBlob(bytes).getDataAsString('UTF-8');
    if (/<table[\s>]/i.test(txt) || /<tr[\s>]/i.test(txt)) return parseHtmlTable_(txt);
  }
  return lerExcelDrive_(fileObj, false); // fallback: conversão pelo Drive (display)
}

// Conversão via Drive. tipado=false => getDisplayValues; tipado=true => getValues
function lerExcelDrive_(fileObj, tipado) {
  return lerBlobExcel_(criarBlobBase64_(fileObj), tipado);
}

function lerBlobExcel_(blob, tipado) {
  const temp = converterExcelParaGoogleSheet_(blob);
  try {
    const sh = SpreadsheetApp.openById(temp.id).getSheets()[0];
    return tipado ? sh.getDataRange().getValues() : sh.getDataRange().getDisplayValues();
  } finally {
    excluirArquivoTemporario_(temp);
  }
}

// Parser de tabela HTML respeitando rowspan/colspan (preenche células mescladas)
function parseHtmlTable_(html) {
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
      const val = limparCelulaHtml_(cell);
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

function limparCelulaHtml_(cellHtml) {
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

/*************************************************
 * UPLOAD / CONVERSÃO (genérico)
 *************************************************/
function criarBlobBase64_(fileObj) {
  const bytes = Utilities.base64Decode(fileObj.base64);
  return Utilities.newBlob(bytes, fileObj.mimeType, fileObj.fileName);
}

function converterExcelParaGoogleSheet_(blob) {
  const resource = { name: '[TEMP] ' + blob.getName(), mimeType: MimeType.GOOGLE_SHEETS };
  return Drive.Files.create(resource, blob);
}

function excluirArquivoTemporario_(file) {
  try {
    if (file && file.id) Drive.Files.remove(file.id);
  } catch (e) {
    try { if (file && file.id) DriveApp.getFileById(file.id).setTrashed(true); } catch (err) {}
  }
}

/*************************************************
 * UTILITÁRIOS DE DESTINO
 *************************************************/
function abrirAba_(spreadsheetId, nomeAba) {
  const aba = SpreadsheetApp.openById(spreadsheetId).getSheetByName(nomeAba);
  if (!aba) throw new Error('Aba não encontrada: ' + nomeAba);
  return aba;
}

function proximaLinhaAppend_(aba, col, floor) {
  const maxRows = aba.getMaxRows();
  const vals = aba.getRange(1, col, maxRows, 1).getDisplayValues();
  let last = 0;
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() !== '') last = i + 1;
  return Math.max(last + 1, floor);
}

function primeiraLinhaVaziaNaColuna_(aba, col, startRow) {
  const maxRows = aba.getMaxRows();
  if (startRow > maxRows) return startRow;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]).trim() === '') return startRow + i;
  return maxRows + 1;
}

function obterValoresColuna_(aba, col, startRow) {
  const set = new Set();
  const maxRows = aba.getMaxRows();
  if (maxRows < startRow) return set;
  const vals = aba.getRange(startRow, col, maxRows - startRow + 1, 1).getDisplayValues();
  vals.forEach(r => { const v = normalizarCodigo_(r[0]); if (v) set.add(v); });
  return set;
}

function ajustarTamanhoLinha_(row, cols) {
  const out = new Array(cols).fill('');
  for (let i = 0; i < Math.min(cols, row.length); i++) out[i] = row[i];
  return out;
}

function normalizarCodigo_(v) { return String(v || '').trim(); }

/*************************************************
 * PARSERS BR (número, data, competência)
 *************************************************/
function parseNumeroBR_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).trim().replace(/r\$/gi, '').replace(/\s/g, '');
  if (!s) return '';
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function parseDataBR_(v) {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return s;
  const d = new Date(normalizarAno_(m[3]), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
  return isNaN(d.getTime()) ? s : d;
}

function normalizarAno_(a) {
  a = String(a);
  return a.length === 2 ? 2000 + parseInt(a, 10) : parseInt(a, 10);
}

function formatarCompetencia_(s, obrigatorio) {
  let t = (s === null || s === undefined) ? '' : String(s).trim();
  if (!t) { if (obrigatorio) throw new Error('Informe a competência no formato MM/YYYY (ex.: 05/2026).'); return ''; }
  const p = parseCompetenciaCelula_(t);
  if (!p) throw new Error('Competência inválida: "' + t + '". Use MM/YYYY (ex.: 05/2026).');
  return String(p.mm).padStart(2, '0') + '/' + p.yyyy;
}

function parseCompetenciaCelula_(v) {
  if (v === null || v === undefined) return null;
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v)) {
    return { mm: v.getMonth() + 1, yyyy: v.getFullYear() };
  }
  let s = removerAcentos_(String(v).trim().toLowerCase()).replace(/\s+/g, '');
  if (!s) return null;
  let m = s.match(/^([a-z]{3,})[\/\-.]?(\d{2,4})$/);            // mai/26
  if (m) { const mes = MESES_PT[m[1].substring(0, 3)]; return mes ? { mm: mes, yyyy: normalizarAno_(m[2]) } : null; }
  m = s.match(/^\d{1,2}[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);     // dd/mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: normalizarAno_(m[2]) } : null; }
  m = s.match(/^(\d{1,2})[\/\-.](\d{2,4})$/);                   // mm/aaaa
  if (m) { const mes = parseInt(m[1], 10); return (mes >= 1 && mes <= 12) ? { mm: mes, yyyy: normalizarAno_(m[2]) } : null; }
  return null;
}

function removerAcentos_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function ok_(msg, extra) { return Object.assign({ ok: true, mensagem: msg }, extra || {}); }
function err_(ctx, e) { return { ok: false, mensagem: `Erro (${ctx}): ` + (e && e.message ? e.message : e) }; }

/*************************************************
 * ===== IMPORTAÇÃO ABAST (original, inalterada) =====
 *************************************************/
function importarAbast_(sheetDestino, data) {
  if (!data || data.length < 2) return { inseridos: 0, duplicados: 0, lidos: 0 };
  const rows = data.slice(1);
  const codigosExistentes = obterCodigosExistentesColunaA_(sheetDestino);
  const codigosNovos = new Set();
  const paraInserir = [];
  let duplicados = 0, lidos = 0;
  rows.forEach(row => {
    const codigo = normalizarCodigo_(row[0]);
    if (!codigo) return;
    lidos++;
    if (codigosExistentes.has(codigo) || codigosNovos.has(codigo)) { duplicados++; return; }
    paraInserir.push(ajustarTamanhoLinha_(row, DEST_COLS));
    codigosNovos.add(codigo);
  });
  if (paraInserir.length > 0) {
    const startRow = Math.max(sheetDestino.getLastRow() + 1, 2);
    sheetDestino.getRange(startRow, 1, paraInserir.length, DEST_COLS).setValues(paraInserir);
  }
  return { inseridos: paraInserir.length, duplicados, lidos };
}

/*************************************************
 * ===== IMPORTAÇÃO MANUT (original, inalterada) =====
 *************************************************/
function importarManut_(sheetDestino, data) {
  if (!data || data.length < 2) return { inseridos: 0, duplicados: 0, lidos: 0 };
  const headerRowIndex = findHeaderRowFrom2DArray_(data, 'CODIGO TRANSACAO');
  if (headerRowIndex === -1) throw new Error("Não encontrei a linha do header de manutenção ('CODIGO TRANSACAO').");
  const matriz = data.slice(headerRowIndex);
  if (matriz.length < 2) return { inseridos: 0, duplicados: 0, lidos: 0 };
  const header = matriz[0];
  const body = matriz.slice(1);
  const headerMap = {};
  header.forEach((h, idx) => { const k = normalizeHeader_(String(h || '')); if (k && headerMap[k] === undefined) headerMap[k] = idx; });
  const desiredHeaders = getDesiredHeadersManut_();
  const codigosExistentes = obterCodigosExistentesColunaA_(sheetDestino);
  const codigosNovos = new Set();
  const paraInserir = [];
  let duplicados = 0, lidos = 0;
  body.forEach(srcRow => {
    const novaLinha = desiredHeaders.map(h => { const srcCol = resolveSourceCol_(headerMap, h); return srcCol > -1 ? (srcRow[srcCol] || '') : ''; });
    const codigo = normalizarCodigo_(novaLinha[0]);
    if (!codigo) return;
    lidos++;
    if (codigosExistentes.has(codigo) || codigosNovos.has(codigo)) { duplicados++; return; }
    paraInserir.push(ajustarTamanhoLinha_(novaLinha, DEST_COLS));
    codigosNovos.add(codigo);
  });
  if (paraInserir.length > 0) {
    const startRow = Math.max(sheetDestino.getLastRow() + 1, 2);
    sheetDestino.getRange(startRow, 1, paraInserir.length, DEST_COLS).setValues(paraInserir);
  }
  return { inseridos: paraInserir.length, duplicados, lidos };
}

function obterCodigosExistentesColunaA_(sheet) {
  const lastRow = sheet.getLastRow();
  const set = new Set();
  if (lastRow < 2) return set;
  const vals = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
  vals.forEach(r => { const codigo = normalizarCodigo_(r[0]); if (codigo) set.add(codigo); });
  return set;
}

function findHeaderRowFrom2DArray_(data, headerToken) {
  const tokenN = normalizeHeader_(headerToken);
  for (let r = 0; r < data.length; r++) if (normalizeHeader_(String(data[r][0] || '')) === tokenN) return r;
  for (let r = 0; r < data.length; r++) for (let c = 0; c < data[r].length; c++) if (normalizeHeader_(String(data[r][c] || '')) === tokenN) return r;
  return -1;
}

function getDesiredHeadersManut_() {
  return [
    'CODIGO TRANSACAO','FORMA DE PAGAMENTO','CODIGO CLIENTE','NOME REDUZIDO','DATA TRANSACAO',
    'PLACA','TIPO FROTA','MODELO VEICULO','NUMERO FROTA','ANO','MATRICULA','NOME MOTORISTA',
    'SERVICO','TIPO COMBUSTIVEL','LITROS','VL/LITRO','HODOMETRO OU HORIMETRO',
    'KM RODADOS OU HORAS TRABALHADAS','KM/LITRO OU LITROS/HORA','VALOR EMISSAO',
    'CODIGO ESTABELECIMENTO','NOME ESTABELECIMENTO','TIPO ESTABELECIMENTO','ENDERECO','BAIRRO',
    'CIDADE','UF','INFORMACAO ADIDIONAL 1','INFORMACAO ADIDIONAL 2','INFORMACAO ADIDIONAL 3',
    'INFORMACAO ADIDIONAL 4','INFORMACAO ADIDIONAL 5','FORMA TRANSACAO','CODIGO LIBERACAO RESTRICAO',
    'SERIE POS','NUMERO CARTAO','FAMILIA VEICULO','GRUPO RESTRICAO','CODIGO EMISSORA','RESPONSAVEL'
  ];
}

function resolveSourceCol_(headerMap, desiredHeader) {
  const desired = normalizeHeader_(desiredHeader);
  let candidates = [];
  switch (desired) {
    case normalizeHeader_('CODIGO TRANSACAO'): candidates = ['CODIGO TRANSACAO', 'CODIGO_TRANSACAO']; break;
    case normalizeHeader_('FORMA DE PAGAMENTO'): candidates = ['FORMA DE PAGAMENTO', 'FORMA_PAGAMENTO']; break;
    case normalizeHeader_('CODIGO CLIENTE'): candidates = ['CODIGO CLIENTE']; break;
    case normalizeHeader_('NOME REDUZIDO'): candidates = ['NOME REDUZIDO']; break;
    case normalizeHeader_('DATA TRANSACAO'): candidates = ['DATA TRANSACAO', 'DATA DA TRANSACAO', 'DATA']; break;
    case normalizeHeader_('PLACA'): candidates = ['PLACA']; break;
    case normalizeHeader_('TIPO FROTA'): candidates = ['TIPO FROTA']; break;
    case normalizeHeader_('MODELO VEICULO'): candidates = ['MODELO VEICULO', 'MODELO']; break;
    case normalizeHeader_('NUMERO FROTA'): candidates = ['NUMERO FROTA']; break;
    case normalizeHeader_('ANO'): candidates = ['ANO']; break;
    case normalizeHeader_('MATRICULA'): candidates = ['MATRICULA']; break;
    case normalizeHeader_('NOME MOTORISTA'): candidates = ['NOME MOTORISTA', 'MOTORISTA']; break;
    case normalizeHeader_('SERVICO'): candidates = ['SERVICO']; break;
    case normalizeHeader_('TIPO COMBUSTIVEL'): candidates = ['TIPO COMBUSTIVEL']; break;
    case normalizeHeader_('HODOMETRO OU HORIMETRO'): candidates = ['HODOMETRO OU HORIMETRO']; break;
    case normalizeHeader_('KM RODADOS OU HORAS TRABALHADAS'): candidates = ['KM RODADOS OU HORAS TRABALHADAS']; break;
    case normalizeHeader_('INFORMACAO ADIDIONAL 1'): candidates = ['INFORMACAO ADIDIONAL 1']; break;
    case normalizeHeader_('INFORMACAO ADIDIONAL 2'): candidates = ['INFORMACAO ADIDIONAL 2']; break;
    case normalizeHeader_('INFORMACAO ADIDIONAL 3'): candidates = ['INFORMACAO ADIDIONAL 3']; break;
    case normalizeHeader_('INFORMACAO ADIDIONAL 4'): candidates = ['INFORMACAO ADIDIONAL 4']; break;
    case normalizeHeader_('INFORMACAO ADIDIONAL 5'): candidates = ['INFORMACAO ADIDIONAL 5']; break;
    case normalizeHeader_('FORMA TRANSACAO'): candidates = ['FORMA TRANSACAO', 'TIPO TRANSACAO']; break;
    case normalizeHeader_('CODIGO LIBERACAO RESTRICAO'): candidates = ['CODIGO LIBERACAO RESTRICAO']; break;
    case normalizeHeader_('NUMERO CARTAO'): candidates = ['NUMERO CARTAO']; break;
    case normalizeHeader_('FAMILIA VEICULO'): candidates = ['FAMILIA VEICULO']; break;
    case normalizeHeader_('GRUPO RESTRICAO'): candidates = ['GRUPO RESTRICAO']; break;
    case normalizeHeader_('RESPONSAVEL'): candidates = ['RESPONSAVEL']; break;
    case normalizeHeader_('LITROS'): candidates = ['KWH/LITROS CONSUMIDOS', 'LITROS', 'KWH LITROS CONSUMIDOS']; break;
    case normalizeHeader_('VL/LITRO'): candidates = ['R$/KWH R$/LITRO', 'VL/LITRO', 'R$ KWH R$ LITRO']; break;
    case normalizeHeader_('KM/LITRO OU LITROS/HORA'): candidates = ['KM/KWH', 'KM/LITRO OU LITROS/HORA']; break;
    case normalizeHeader_('VALOR EMISSAO'): candidates = ['VALOR TOTAL DA TRANSACAO', 'VALOR DA RECARGA', 'VALOR EMISSAO']; break;
    case normalizeHeader_('CODIGO ESTABELECIMENTO'): candidates = ['CODIGO ESTABELECIMENTO']; break;
    case normalizeHeader_('NOME ESTABELECIMENTO'): candidates = ['NOME ESTABELECIMENTO']; break;
    case normalizeHeader_('TIPO ESTABELECIMENTO'): candidates = ['TIPO ESTABELECIMENTO']; break;
    case normalizeHeader_('ENDERECO'):
    case normalizeHeader_('BAIRRO'):
    case normalizeHeader_('CIDADE'):
    case normalizeHeader_('UF'):
    case normalizeHeader_('SERIE POS'):
    case normalizeHeader_('CODIGO EMISSORA'): return -1;
    default: candidates = [desiredHeader]; break;
  }
  for (let i = 0; i < candidates.length; i++) { const nk = normalizeHeader_(String(candidates[i] || '')); if (headerMap[nk] !== undefined) return headerMap[nk]; }
  return -1;
}

function normalizeHeader_(s) {
  s = String(s || '').trim().toUpperCase();
  s = s.replace(/\|/g, ' ').replace(/_/g, ' ').replace(/\t/g, ' ');
  s = removerAcentos_(s).replace(/\s+/g, ' ').trim();
  return s;
}