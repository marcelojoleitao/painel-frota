/****************************************************
 * RELATÓRIO ÚNICO (NORMAL ou GLOSA) — A..Q (17) / A..U (21)
 * - Normal -> "Histórico Peças" (17 colunas)
 * - Glosa  -> "Histórico Peças (Glosa)" (21 colunas)
 *     • R,S,T: "Início","Final","Dias Úteis"
 *     • U: Gestor do bloco (valor da Coluna A de DetalhamentoDB) em TODO o bloco
 * - NÃO mexer na Coluna V (22ª) quando gerar/atualizar Glosa
 * - Na primeira linha de dados de cada bloco (Glosa): T = =V{linha}, bold, font 12
 * - PDFs por Gestor: oculta U na cópia, exporta, reexibe, mostra links
 ****************************************************/

function abrirDialogoRelatorioUnico() {
  const html = HtmlService.createHtmlOutputFromFile('filtroRelatorioUnico')
    .setWidth(420).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, 'Gerar Relatório de Peças');
}

/** ===================== Helpers de normalização/filtros ===================== */

function _normComp_(txt) {
  let s = String(txt || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})[\/\-](\d{1,2})$/); if (m) s = `${('0'+m[2]).slice(-2)}/${m[1]}`;
  m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);      if (m) s = `${('0'+m[1]).slice(-2)}/${m[2]}`;
  m = s.match(/^(\d{1,2})\/(\d{2})$/);          if (m) s = `${('0'+m[1]).slice(-2)}/20${m[2]}`;
  return /^\d{2}\/\d{4}$/.test(s) ? s : '';
}
function _isDate_(v){ return Object.prototype.toString.call(v)==='[object Date]' && !isNaN(v); }
function _compOK_(v, compFiltro, tz){
  if (!compFiltro) return true;
  const alvo = _normComp_(compFiltro); if (!alvo) return false;
  if (_isDate_(v)) return Utilities.formatDate(v, tz, 'MM/yyyy') === alvo;
  const s = _normComp_(String(v||'')); return s && s === alvo;
}
function _placaOK_(v, placaFiltro){
  if (!placaFiltro) return true;
  return String(v||'').toUpperCase() === String(placaFiltro).toUpperCase();
}
function _isGlosa_(v){ return String(v||'').trim().toUpperCase() === 'GLOSA'; }

/** ===================== Helpers de construção ===================== */

function _fixLen_(arr, tamanho) { const out = (arr || []).slice(0, tamanho); while (out.length < tamanho) out.push(''); return out; }
function _toNumber_(v){ if (typeof v === 'number') return v; const n = Number(String(v||'').trim().replace(/\./g,'').replace(',','.')); return isNaN(n) ? 0 : n; }

/** Reset do destino: remove merges/filtros e limpa APENAS a área alvo (1..N colunas). NÃO mexe na coluna V. */
function resetDestinoArea_(destino, N, linhasNec) {
  const f = destino.getFilter(); if (f) f.remove();

  // garantir colunas necessárias sem tocar >N
  if (destino.getMaxColumns() < N) destino.insertColumnsAfter(destino.getMaxColumns(), N - destino.getMaxColumns());
  // garantir linhas
  const linhasMin = Math.max(linhasNec + 10, 50);
  if (destino.getMaxRows() < linhasMin) destino.insertRowsAfter(destino.getMaxRows(), linhasMin - destino.getMaxRows());

  // >>> NOVO: reexibe TODAS as linhas e as colunas 1..N (evita herdar ocultação de runs/PDF anteriores)
  destino.showRows(1, destino.getMaxRows());
  destino.showColumns(1, N);

  // quebra merges e limpa SOMENTE colunas 1..N (protege V e além)
  const rangeAlvo = destino.getRange(1, 1, destino.getMaxRows(), N);
  rangeAlvo.breakApart();
  rangeAlvo.clear(); // limpa conteúdo + formato + notas + validações, sem ambiguidade de flags
}

/** Baseline de formato igual pros dois relatórios (apenas na área 1..N) */
function aplicarBaselineFormato_(destino, startRow, numRows, numCols) {
  const r = destino.getRange(startRow, 1, numRows, numCols);
  r.setFontFamily('Arial').setFontSize(8).setFontWeight('normal').setFontColor('#000000')
   .setBackground('#ffffff').setWrap(false).setHorizontalAlignment('left').setVerticalAlignment('middle');
}

/** Estilização de cabeçalho (duas linhas) */
function estilizarCabecalhos_(destino, linCab1, numCols, isGlosa) {
  destino.getRange(linCab1, 1, 2, numCols)
    .setBackground('#1d2144').setFontColor('#ffd102')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
    .setWrap(true).setFontWeight('bold');
  for (let c = 1; c <= 10; c++) destino.getRange(linCab1, c, 2, 1).merge();
  destino.getRange(linCab1, 11, 1, 3).merge();
  destino.getRange(linCab1, 14, 1, 3).merge();
  destino.getRange(linCab1, 17, 2, 1).merge();
  if (isGlosa) {
    destino.getRange(linCab1, 18, 2, 1).merge(); // R
    destino.getRange(linCab1, 19, 2, 1).merge(); // S
    destino.getRange(linCab1, 20, 2, 1).merge(); // T
    destino.getRange(linCab1, 21, 2, 1).merge(); // U
  }
}

/** Bold nas seções (A:B apenas) */
function boldSecaoAB_(destino, row, numCols) {
  destino.getRange(row, 1, 1, 2).setFontWeight('bold');
  if (numCols > 2) destino.getRange(row, 3, 1, numCols-2).setFontWeight('normal');
}

/** Totais: fundo cinza, bold linha inteira, moeda na col 17 */
function estilizarTotal_(destino, row, numCols) {
  const line = destino.getRange(row, 1, 1, numCols);
  line.setBackground('#cccccc').setFontWeight('bold').setFontColor('#000000');
  destino.getRange(row, 17).setNumberFormat('R$ #,##0.00').setHorizontalAlignment('right');
}

/** Alinhamento dos números no corpo (direita nas colunas 12..16 e 17) */
function alinharNumerosCorpo_(destino, startRow, numRows) {
  destino.getRange(startRow, 12, numRows, 5).setHorizontalAlignment('right');
  destino.getRange(startRow, 17, numRows, 1).setHorizontalAlignment('right').setNumberFormat('R$ #,##0.00');
}

/** ======= Helpers p/ coluna U e fórmula T simples ======= */
function withGestorColU_(rowArr, N, isGlosa, gestorAtual) {
  if (!isGlosa) return _fixLen_(rowArr, N);
  const arr = _fixLen_(rowArr, N);
  arr[20] = gestorAtual || '';   // índice 20 = col 21 (U)
  return arr;
}

// R/S com VLOOKUP (tenta , e ;) e T simples (=V{linha} com bold 12)
function setFormulasRST_Simples_(sheet, firstDataRow) {
  const r = firstDataRow;

  const R_variants = [
    `=VLOOKUP(TO_TEXT(A${r}),AceitesDB!A:D,4,FALSE)`,
    `=VLOOKUP(TO_TEXT(A${r});AceitesDB!A:D;4;FALSE)`
  ];
  const S_variants = [
    `=VLOOKUP(TO_TEXT(A${r}),AceitesDB!A:F,6,FALSE)`,
    `=VLOOKUP(TO_TEXT(A${r});AceitesDB!A:F;6;FALSE)`
  ];

  // R (col 18) e S (col 19)
  try { sheet.getRange(r, 18).clearContent(); } catch(e){}
  trySet_(sheet.getRange(r, 18), R_variants);

  try { sheet.getRange(r, 19).clearContent(); } catch(e){}
  trySet_(sheet.getRange(r, 19), S_variants);

  // T (col 20) = V{linha}, bold 12
  sheet.getRange(r, 20)
       .clearContent()
       .setFormula(`=V${r}`)
       .setFontWeight('bold')
       .setFontSize(12);
}

/** Usa a 1ª fórmula que não vira #ERROR!. Mantém como está se nenhuma “pegar”. */
function trySet_(range, variants) {
  for (const f of variants) {
    range.setFormula(f);
    SpreadsheetApp.flush();
    const v = range.getDisplayValue();
    if (v && v.charAt(0) !== '#') return true;
  }
  return false;
}

/** ===================== GERADOR ===================== */
function gerarRelatorioUnico(tipoRelatorio, competenciaSelecionada, placaSelecionada) {
  const tz   = Session.getScriptTimeZone();
  const isGlosa = (String(tipoRelatorio||'').toLowerCase() === 'glosa');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const origem = ss.getSheetByName('DetalhamentoDB');
  if (!origem) throw new Error('Aba "DetalhamentoDB" não encontrada.');

  const destinoNome = isGlosa ? 'Histórico Peças (Glosa)' : 'Histórico Peças';
  const destino = ss.getSheetByName(destinoNome) || ss.insertSheet(destinoNome);

  const dados = origem.getDataRange().getValues();
  if (dados.length < 2) {
    resetDestinoArea_(destino, (isGlosa?21:17), 5);
    destino.getRange(4,1).setValue('Base vazia.');
    return 'Base vazia (apenas cabeçalho).';
  }
  const registros = dados.slice(1);

  // Índices (0-based)
  const colPlaca        = 5;   // F
  const colCompetencia  = 29;  // AD
  const colValorTotal   = 27;  // AB
  const colAE           = 30;  // AE
  const colOrigemA      = 0;   // A

  const compFiltro  = _normComp_(competenciaSelecionada);
  const placaFiltro = String(placaSelecionada || '').trim();

  const filtrados = registros.filter(l => {
    const okComp  = _compOK_(l[colCompetencia], compFiltro, tz);
    const okPlaca = _placaOK_(l[colPlaca], placaFiltro);
    const okGlosa = isGlosa ? _isGlosa_(l[colAE]) : true;
    return okComp && okPlaca && okGlosa;
  });

  const N = isGlosa ? 21 : 17; // Glosa A..U (21) — NÃO tocamos a V (22)
  if (filtrados.length === 0) {
    resetDestinoArea_(destino, N, 5);
    destino.getRange(4,1).setValue('Nenhum registro com os filtros.');
    return 'Nenhum registro encontrado.';
  }

  // Cabeçalhos
  const cab1 = _fixLen_([
    'Ordem de Serviço','Conclusão do Serviço','Grupo de Peça','Peça','Unidade de Medida','Tipo de Peça',
    'Mão de Obra','Tipo de Manutenção','Garantia','Garantia',
    'Peça','Peça','Peça','Mão de Obra','Mão de Obra','Mão de Obra','Total'
  ].concat(isGlosa?['Início','Final','Dias Úteis','']:[]), N);

  const cab2 = _fixLen_([
    '', '', '', '', '', '', '', '', '', '',
    'Mão de Obra','Quantidade','Valor Unit.','Total','Quantidade','Valor Unit.',''
  ].concat(isGlosa?['','','','']:[]), N);

  const resultado = [];
  const blocos = []; // {tipo, linha}
  const formulaTargetsT = []; // {row}

  let ultimaChaveVeiculo = '';
  let ultimaFamilia = '';
  let subtotal = 0;
  let totalGeral = 0;
  let gestorAtual = '';

  filtrados.forEach(linha => {
    const chaveVeiculo = [linha[5], linha[6], linha[7], linha[8], linha[9]].join('|'); // F..J
    const familiaAtual = linha[10]; // K

    const novaChave = (chaveVeiculo !== ultimaChaveVeiculo);
    if (novaChave) {
      if (ultimaChaveVeiculo) {
        resultado.push(withGestorColU_([
          'TOTAL DO VEÍCULO:','','','','','','','','','','','','','','','', subtotal
        ].concat(isGlosa?['','','','']:[]), N, isGlosa, gestorAtual));
        blocos.push({tipo:'total', linha:resultado.length});
        totalGeral += subtotal;
        resultado.push(new Array(N).fill(''));
        subtotal = 0;
      }

      gestorAtual = String(linha[colOrigemA] || '');

      resultado.push(withGestorColU_(
        [`${linha[5]} - ${linha[6]} - ${linha[7]} - ${linha[8]} - ${linha[9]}`]
          .concat(isGlosa?['','','','']:[]),
        N, isGlosa, gestorAtual
      ));
      blocos.push({tipo:'veiculo', linha:resultado.length});

      resultado.push(withGestorColU_(['Família:', familiaAtual]
        .concat(isGlosa?['','','','']:[]), N, isGlosa, gestorAtual));
      blocos.push({tipo:'familia', linha:resultado.length});

      resultado.push(withGestorColU_(cab1, N, isGlosa, gestorAtual)); blocos.push({tipo:'cabecalho1', linha:resultado.length});
      resultado.push(withGestorColU_(cab2, N, isGlosa, gestorAtual)); blocos.push({tipo:'cabecalho2', linha:resultado.length});

      // próxima linha será a primeira de dados do bloco → guardamos para colocar T = =V{linha}
      if (isGlosa) {
        const startRowPlanilha = 4;
        const firstDataRow = startRowPlanilha + resultado.length;
        formulaTargetsT.push({ row: firstDataRow });
      }

      ultimaChaveVeiculo = chaveVeiculo;
      ultimaFamilia = familiaAtual;
    }

    if (familiaAtual !== ultimaFamilia) {
      resultado.push(withGestorColU_(['Família:', familiaAtual]
        .concat(isGlosa?['','','','']:[]), N, isGlosa, gestorAtual));
      blocos.push({tipo:'familia', linha:resultado.length});
      ultimaFamilia = familiaAtual;
    }

    // Dados L..AC (17) + R/S/T vazias + U com gestorAtual (sem tocar V)
    const linha17  = _fixLen_(linha.slice(11, 29), 17);
    const linhaOut = withGestorColU_(linha17.concat(isGlosa?['','','','']:[]), N, isGlosa, gestorAtual);
    resultado.push(linhaOut);

    subtotal += _toNumber_(linha[colValorTotal]);
  });

  if (ultimaChaveVeiculo) {
    resultado.push(withGestorColU_([
      'TOTAL DO VEÍCULO:','','','','','','','','','','','','','','','', subtotal
    ].concat(isGlosa?['','','','']:[]), N, isGlosa, gestorAtual));
    blocos.push({tipo:'total', linha:resultado.length});
    totalGeral += subtotal;
    resultado.push(new Array(N).fill(''));
  }

  resultado.push(_fixLen_([
    'TOTAL GERAL:','','','','','','','','','','','','','','','', totalGeral
  ].concat(isGlosa?['','','','']:[]), N));
  blocos.push({tipo:'totalgeral', linha:resultado.length});

  // ===== Escrita + formatação =====
  resetDestinoArea_(destino, N, resultado.length + 6);
  const startRow = 4;
  const range = destino.getRange(startRow, 1, resultado.length, N);
  range.setValues(resultado);

  aplicarBaselineFormato_(destino, startRow, resultado.length, N);
  alinharNumerosCorpo_(destino, startRow, resultado.length);

  blocos.forEach(b => {
    const row = startRow - 1 + b.linha;
    if (b.tipo === 'veiculo' || b.tipo === 'familia') {
      boldSecaoAB_(destino, row, N);
    } else if (b.tipo === 'cabecalho1') {
      estilizarCabecalhos_(destino, row, N, isGlosa);
    } else if (b.tipo === 'cabecalho2') {
      // coberto pelo cab1 (2 linhas)
    } else if (b.tipo === 'total' || b.tipo === 'totalgeral') {
      estilizarTotal_(destino, row, N);
    }
  });

  // Fórmula simples em T (primeira linha de dados de cada bloco)
  if (isGlosa && formulaTargetsT.length) {
    formulaTargetsT.forEach(t => setFormulasRST_Simples_(destino, t.row));
  }

  // <<< Oculta TODAS as linhas vazias abaixo do "TOTAL GERAL:" até o fim da aba
  const lastReportRow = startRow + resultado.length - 1; // linha do TOTAL GERAL
  const maxRows = destino.getMaxRows();
  if (maxRows > lastReportRow) {
    destino.hideRows(lastReportRow + 1, maxRows - lastReportRow);
  }

  return `OK: ${(isGlosa?'GLOSA':'NORMAL')} | linhas: ${filtrados.length}`;
}

/* ===========================================================
   PDFs por Gestor (Glosa)
   - Cópia da aba "Histórico Peças (Glosa)"
   - Oculta U (21), filtra por gestor, exporta PDF, reexibe U, apaga cópia
   - Exibe modal com links e link da pasta
   =========================================================== */

/* ====== SUBSTITUA ESTA FUNÇÃO INTEIRA ====== */
function gerarPdfsGlosaPorGestor() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName('Histórico Peças (Glosa)');
  if (!src) { SpreadsheetApp.getUi().alert('Gere o relatório de Glosa primeiro.'); return; }

  const lastRow = src.getLastRow();
  const lastCol = src.getLastColumn();
  if (lastRow < 5) { SpreadsheetApp.getUi().alert('Relatório de Glosa está vazio.'); return; }

  // Gestores únicos (col U = 21)
  const gestSet = new Set();
  src.getRange(4, 21, lastRow - 3, 1).getValues()
     .forEach(r => { const g = String(r[0]||'').trim(); if (g) gestSet.add(g); });
  const gestores = Array.from(gestSet);
  if (!gestores.length) { SpreadsheetApp.getUi().alert('Nenhum gestor encontrado na coluna U.'); return; }

  const tz = Session.getScriptTimeZone();
  const folder = DriveApp.createFolder(`PDFs Glosa - ${Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH.mm')}`);

  // Cópia da aba (preserva estilos)
  const tmp = src.copyTo(ss).setName('TMP_GLOSA_EXPORT');
  ss.setActiveSheet(tmp);

  // Oculta U antes de exportar
  try { if (!tmp.isColumnHiddenByUser(21)) tmp.hideColumns(21); } catch (e) {}

  // Filtro só na área usada (até U; não toca V)
  if (tmp.getFilter()) tmp.getFilter().remove();
  const usedRange = tmp.getRange(1, 1, lastRow, Math.min(lastCol, 21));
  usedRange.createFilter();
  const filter = tmp.getFilter();
  const colU = 21;

  const created = [];
  const failures = [];

  const ssId = ss.getId();
  const gid = tmp.getSheetId();
  const token = ScriptApp.getOAuthToken();

  // Export URL base (A4 paisagem, sem gridlines, etc.)
  const baseUrl = `https://docs.google.com/spreadsheets/d/${ssId}/export` +
    `?format=pdf&exportFormat=pdf&gid=${gid}` +
    `&size=A4&portrait=false&fitw=true&sheetnames=false&printtitle=false` +
    `&pagenumbers=false&gridlines=false&fzr=false`;

  gestores.forEach(gestor => {
    try {
      filter.setColumnFilterCriteria(colU,
        SpreadsheetApp.newFilterCriteria().setHiddenValues([]).whenTextEqualTo(gestor).build()
      );

      const blob = fetchPdfSafe_(baseUrl, token);
      if (blob) {
        blob.setName(`Glosa - ${gestor}.pdf`);
        const file = folder.createFile(blob);
        created.push({ gestor, url: file.getUrl() });
      } else {
        failures.push({ gestor, reason: 'Export retornou vazio' });
      }
    } catch (e) {
      failures.push({ gestor, reason: String(e && e.message ? e.message : e) });
    }
    Utilities.sleep(500); // respiro entre exports
  });

  // Reexibe U e limpeza
  try { if (tmp.isColumnHiddenByUser(21)) tmp.showColumns(21); } catch (e) {}
  if (tmp.getFilter()) tmp.getFilter().remove();
  ss.deleteSheet(tmp);

  // Constrói HTML de resultado (sucessos e falhas)
  const okList = created.map(o => `<li><a target="_blank" href="${o.url}">${o.gestor}</a></li>`).join('');
  const failList = failures.map(o => `<li>${o.gestor} — <span style="color:#b00">${o.reason}</span></li>`).join('');
  const hasOk = created.length > 0;
  const hasFail = failures.length > 0;

  const html = HtmlService.createHtmlOutput(
    `<html><body style="font-family:Arial;padding:12px">
      <h3>Exportação em PDF (Glosa) por Gestor</h3>
      <p><a href="${folder.getUrl()}" target="_blank">📁 Abrir pasta: ${folder.getName()}</a></p>
      ${hasOk ? `<h4>✅ Arquivos gerados</h4><ul>${okList}</ul>` : '<p>Nenhum PDF gerado com sucesso.</p>'}
      ${hasFail ? `<h4>⚠️ Falhas</h4><ul>${failList}</ul>` : ''}
      <button onclick="google.script.host.close()">Fechar</button>
     </body></html>`
  ).setWidth(520).setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Exportação em PDF (Glosa)');
}

/* ====== ADICIONE ESTA HELPER (logo abaixo) ====== */
function fetchPdfSafe_(url, token) {
  // tenta até 5 vezes, com backoff progressivo e pequenos “jitter”
  for (let i = 0; i < 5; i++) {
    try {
      const resp = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true,
        followRedirects: true
      });
      const code = resp.getResponseCode();
      if (code >= 200 && code < 300) {
        const blob = resp.getBlob();
        if (blob && blob.getBytes().length > 0) return blob;
      } else {
        Logger.log(`export pdf attempt ${i+1}: HTTP ${code} — ${resp.getContentText().slice(0,200)}`);
      }
    } catch (e) {
      Logger.log(`export pdf attempt ${i+1} error: ${e}`);
    }
    // backoff (400ms, 800ms, 1200ms, 1600ms, 2000ms) + jitter
    Utilities.sleep(400 * (i+1) + Math.floor(Math.random()*120));
  }
  return null;
}
