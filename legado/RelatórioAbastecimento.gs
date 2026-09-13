
/**
 * Relatório de Abastecimento de Viaturas
 * Baseado nas abas:
 * - ConsultaBD
 * - AbastBD
 */

const ABA_CONSULTA = 'ConsultaBD';
const ABA_ABAST = 'AbastBD';

const ABA_REL_EXEC = 'Relatório Abastecimento';
const ABA_REL_PLACAS = 'Rel Analítico Placas';
const ABA_REL_UNIDADES = 'Rel Analítico Unidades';
const ABA_REL_ALERTAS = 'Rel Alertas Abastecimento';
const ABA_REL_BASE_GRAF = 'Rel Dados Gráficos';

const ABAS_PDF = [ABA_REL_EXEC, ABA_REL_PLACAS, ABA_REL_UNIDADES, ABA_REL_ALERTAS];

const COR_TITULO = '#1d2144';
const COR_HEADER = '#1d2144';
const COR_SUBHEADER = '#d9e2f3';
const COR_ALERTA = '#fde68a';
const COR_CRITICO = '#fecaca';
const COR_SUAVE = '#ffffff';
const COR_TOTAL = '#cccccc';
const COR_FONTE_HEADER = '#ffd102';
const FONTE = 'Arial';



function abrirDialogoRelatorioAbastecimento() {
  const html = HtmlService.createHtmlOutputFromFile('RelatorioAbastecimentoDialog')
    .setWidth(460)
    .setHeight(420);
  SpreadsheetApp.getUi().showModalDialog(html, 'Gerar relatório de abastecimento');
}

function gerarRelatorioAbastecimento(payload) {
  try {
    const tz = Session.getScriptTimeZone();
    const inicio = _parseInputDate_(payload.dataInicial, true);
    const fim = _parseInputDate_(payload.dataFinal, false);

    if (!inicio || !fim) throw new Error('Informe data inicial e final válidas.');
    if (inicio.getTime() > fim.getTime()) throw new Error('A data inicial não pode ser maior que a data final.');

    const filtros = {
      unidade: String(payload.unidade || '').trim(),
      uso: String(payload.uso || '').trim(),
      placa: _normPlaca_(payload.placa || ''),
      somenteReservadas: !!payload.somenteReservadas,
      somenteComAbastecimentoValido: !!payload.somenteComAbastecimentoValido
    };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shConsulta = ss.getSheetByName(ABA_CONSULTA);
    const shAbast = ss.getSheetByName(ABA_ABAST);

    if (!shConsulta) throw new Error(`Aba "${ABA_CONSULTA}" não encontrada.`);
    if (!shAbast) throw new Error(`Aba "${ABA_ABAST}" não encontrada.`);

    const consultaInfo = _loadConsultaMap_(shConsulta);
    const abastInfo = _loadAbastecimentos_(shAbast, inicio, fim, filtros, consultaInfo.map);
    const analytics = _buildAnalytics_(abastInfo, consultaInfo, filtros, inicio, fim, tz);

    _writeExecutiveReport_(ss, analytics, filtros, inicio, fim, tz);
    _writePlacasReport_(ss, analytics, filtros, inicio, fim, tz);
    _writeUnidadesReport_(ss, analytics, filtros, inicio, fim, tz);
    _writeAlertasReport_(ss, analytics, filtros, inicio, fim, tz);
    _writeChartDataAndCharts_(ss, analytics);

    let pdfInfo = null;
    try {
      pdfInfo = _exportarRelatoriosPdf_(ss, inicio, fim, tz);
    } catch (e) {
      pdfInfo = null;
      SpreadsheetApp.getActive().toast('Relatórios gerados, mas houve falha ao exportar o PDF: ' + e.message, 'Aviso', 8);
    }

    return {
      ok: true,
      message:
        'Relatório gerado com sucesso.\n\n' +
        'Abastecimentos considerados: ' + _fmtInt_(analytics.summary.totalAbastecimentos) + '\n' +
        'Viaturas com abastecimento: ' + _fmtInt_(analytics.summary.viaturasAbastecidas) + '\n' +
        'Valor total: ' + _fmtBRL_(analytics.summary.valorTotal),
      pdfUrl: pdfInfo && pdfInfo.url ? pdfInfo.url : '',
      pdfName: pdfInfo && pdfInfo.name ? pdfInfo.name : ''
    };
  } catch (err) {
    return { ok: false, message: String(err && err.message ? err.message : err) };
  }
}

function _loadConsultaMap_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) throw new Error('A aba ConsultaBD está vazia.');

  const headers = values[0];
  const idx = _buildHeaderIndex_(headers);

  const colMap = {
    placa: _idxByLetter_('A'),
    marcaModelo: _requireHeaderIndex_(idx, 'Marca/Modelo'),
    combustivel: _requireHeaderIndex_(idx, 'Combustível'),
    tipo: _requireHeaderIndex_(idx, 'Tipo'),
    usoSipac: _idxByLetter_('AD'),
    placaReservada: _idxByLetter_('AY'),
    unidadeSipac: _idxByLetter_('AC'),
    statusSipac: _idxByLetter_('AE'),
    caracterizado: _idxByLetter_('BK'),
    blindagem: _idxByLetter_('BJ'),
    propriedade: _idxByLetter_('BN'),
    fipe: _idxByLetter_('BL'),
    odometro12m: _idxByLetter_('AJ'),
    qtdAbast12m: _idxByLetter_('AI'),
    somaAbast12m: _idxByLetter_('AK'),
    somaKm12m: _idxByLetter_('AL'),
    somaLitros12m: _idxByLetter_('AM'),
    consumo12m: _idxByLetter_('AO'),
    custoKm12m: _idxByLetter_('AN')
  };

  const map = {};
  let totalVeiculos = 0;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const placa = _normPlaca_(row[colMap.placa]);
    if (!placa) continue;

    totalVeiculos++;
    map[placa] = {
      placa: placa,
      marcaModelo: row[colMap.marcaModelo] || '',
      combustivel: row[colMap.combustivel] || '',
      tipo: row[colMap.tipo] || '',
      usoSipac: row[colMap.usoSipac] || '',
      placaReservada: row[colMap.placaReservada] || '',
      unidadeSipac: row[colMap.unidadeSipac] || '',
      statusSipac: row[colMap.statusSipac] || '',
      caracterizado: row[colMap.caracterizado] || '',
      blindagem: row[colMap.blindagem] || '',
      propriedade: row[colMap.propriedade] || '',
      fipe: _toNumber_(row[colMap.fipe]),
      odometro12m: _toNumber_(row[colMap.odometro12m]),
      qtdAbast12m: _toNumber_(row[colMap.qtdAbast12m]),
      somaAbast12m: _toNumber_(row[colMap.somaAbast12m]),
      somaKm12m: _toNumber_(row[colMap.somaKm12m]),
      somaLitros12m: _toNumber_(row[colMap.somaLitros12m]),
      consumo12m: _toNumber_(row[colMap.consumo12m]),
      custoKm12m: _toNumber_(row[colMap.custoKm12m])
    };
  }

  return { map, totalVeiculos };
}

function _loadAbastecimentos_(sheet, inicio, fim, filtros, consultaMap) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('A aba AbastBD está vazia.');

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(values.length, 10); i++) {
    const row = values[i].map(x => String(x || '').trim());
    if (
      row.indexOf('DATA TRANSACAO') >= 0 &&
      row.indexOf('PLACA') >= 0 &&
      row.indexOf('SERVICO') >= 0 &&
      row.indexOf('LITROS') >= 0
    ) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) {
    throw new Error('Não foi possível localizar a linha de cabeçalho da aba AbastBD.');
  }

  const headers = values[headerRowIndex].map(h => String(h || '').trim());
  const idx = _buildHeaderIndex_(headers);

  let idxValor = -1;
  headers.forEach((h, i) => {
    if (h === 'VALOR EMISSAO') idxValor = i;
  });
  if (idxValor === -1) {
    throw new Error('Header "VALOR EMISSAO" não encontrado em AbastBD.');
  }

  const col = {
    data: _requireHeaderIndex_(idx, 'DATA TRANSACAO'),
    placa: _requireHeaderIndex_(idx, 'PLACA'),
    servico: _requireHeaderIndex_(idx, 'SERVICO'),
    combustivel: _requireHeaderIndex_(idx, 'TIPO COMBUSTIVEL'),
    litros: _requireHeaderIndex_(idx, 'LITROS'),
    vlLitro: _requireHeaderIndex_(idx, 'VL/LITRO'),
    hodometro: _requireHeaderIndex_(idx, 'HODOMETRO OU HORIMETRO'),
    kmRodados: _requireHeaderIndex_(idx, 'KM RODADOS OU HORAS TRABALHADAS'),
    kmLitro: _requireHeaderIndex_(idx, 'KM/LITRO OU LITROS/HORA'),
    valor: idxValor,
    posto: _requireHeaderIndex_(idx, 'NOME ESTABELECIMENTO'),
    cidade: _requireHeaderIndex_(idx, 'CIDADE'),
    uf: _requireHeaderIndex_(idx, 'UF'),
    usoSipacAbast: _requireHeaderIndex_(idx, 'Uso SIPAC')
  };

  const registros = [];
  const placasSet = {};
  const placasForaConsulta = {};
  const veiculosSemCadastro = [];
  let totalLinhasPeriodo = 0;
  let totalLinhasAbastecimento = 0;

  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    const data = _parseBrDateTime_(row[col.data]);
    if (!data) continue;
    if (data.getTime() < inicio.getTime() || data.getTime() > fim.getTime()) continue;

    totalLinhasPeriodo++;

    const servico = String(row[col.servico] || '').trim().toUpperCase();
    if (servico !== 'ABASTECIMENTO') continue;

    totalLinhasAbastecimento++;

    const placa = _normPlaca_(row[col.placa]);
    if (!placa) continue;

    const cadastro = consultaMap[placa] || null;

    if (filtros.placa && placa !== filtros.placa) continue;
    if (filtros.unidade) {
      const unid = cadastro ? String(cadastro.unidadeSipac || '').trim() : '';
      if (unid !== filtros.unidade) continue;
    }
    if (filtros.uso) {
      const uso = cadastro ? String(cadastro.usoSipac || '').trim() : String(row[col.usoSipacAbast] || '').trim();
      if (uso !== filtros.uso) continue;
    }
    if (filtros.somenteReservadas) {
      const reservada = cadastro ? _isTruthyText_(cadastro.placaReservada) : false;
      if (!reservada) continue;
    }

    const litros = _toNumber_(row[col.litros]);
    const vlLitro = _toNumber_(row[col.vlLitro]);
    const hodometro = _toNumber_(row[col.hodometro]);
    const kmRodados = _toNumber_(row[col.kmRodados]);
    const kmLitro = _toNumber_(row[col.kmLitro]);
    const valor = _toNumber_(row[col.valor]);

    if (filtros.somenteComAbastecimentoValido && (litros <= 0 || valor <= 0)) continue;

    const rec = {
      data: data,
      competencia: Utilities.formatDate(data, Session.getScriptTimeZone(), 'MM/yyyy'),
      placa: placa,
      combustivelAbast: row[col.combustivel] || '',
      litros: litros,
      vlLitro: vlLitro,
      hodometro: hodometro,
      kmRodados: kmRodados,
      kmLitro: kmLitro,
      valor: valor,
      posto: row[col.posto] || '',
      cidade: row[col.cidade] || '',
      uf: row[col.uf] || '',
      usoSipacAbast: row[col.usoSipacAbast] || '',
      cadastro: cadastro
    };

    registros.push(rec);
    placasSet[placa] = true;

    if (!cadastro) {
      placasForaConsulta[placa] = true;
      veiculosSemCadastro.push(rec);
    }
  }

  return {
    registros,
    placasSet: Object.keys(placasSet),
    placasForaConsulta: Object.keys(placasForaConsulta),
    veiculosSemCadastro,
    totalLinhasPeriodo,
    totalLinhasAbastecimento
  };
}

function _buildAnalytics_(abastInfo, consultaInfo, filtros, inicio, fim, tz) {
  const registros = abastInfo.registros;
  const byPlaca = {};
  const byUnidade = {};
  const byUso = {};
  const byTipo = {};
  const byCombustivel = {};
  const byPosto = {};
  const byCidade = {};
  const byMes = {};
  const alertas = {
    placasSemCadastro: [],
    kmNegativo: [],
    kmZero: [],
    consumoAlto: [],
    consumoBaixo: [],
    divergenciaCombustivel: [],
    precoAcimaMedia: [],
    duplicidadeMesmoDia: []
  };

  let valorTotal = 0;
  let litrosTotal = 0;
  let kmTotal = 0;
  let abastecimentosValidosConsumo = 0;

  const mediaPrecoPorComb = {};
  const contPrecoPorComb = {};
  const chaveDuplicidade = {};

  registros.forEach(r => {
    const cad = r.cadastro || {};
    const unidade = String(cad.unidadeSipac || '').trim() || 'SEM CADASTRO';
    const uso = String(cad.usoSipac || '').trim() || String(r.usoSipacAbast || '').trim() || 'SEM USO';
    const tipo = String(cad.tipo || '').trim() || 'SEM TIPO';
    const combustivelCadastro = String(cad.combustivel || '').trim() || 'SEM COMBUSTÍVEL';
    const combustivelAbast = String(r.combustivelAbast || '').trim() || 'SEM COMBUSTÍVEL';
    const posto = String(r.posto || '').trim() || 'SEM POSTO';
    const cidade = String(r.cidade || '').trim() || 'SEM CIDADE';
    const mes = r.competencia;

    valorTotal += r.valor;
    litrosTotal += r.litros;
    kmTotal += Math.max(0, r.kmRodados);

    if (r.kmLitro > 0) abastecimentosValidosConsumo++;

    _accGroup_(byMes, mes, r);
    _accGroup_(byUnidade, unidade, r);
    _accGroup_(byUso, uso, r);
    _accGroup_(byTipo, tipo, r);
    _accGroup_(byCombustivel, combustivelAbast, r);
    _accGroup_(byPosto, posto, r);
    _accGroup_(byCidade, cidade, r);

    if (!byPlaca[r.placa]) {
      byPlaca[r.placa] = {
        placa: r.placa,
        marcaModelo: cad.marcaModelo || '',
        combustivelCadastro: combustivelCadastro,
        tipo: cad.tipo || '',
        usoSipac: cad.usoSipac || '',
        unidadeSipac: cad.unidadeSipac || '',
        placaReservada: cad.placaReservada || '',
        blindagem: cad.blindagem || '',
        caracterizado: cad.caracterizado || '',
        propriedade: cad.propriedade || '',
        abastecimentos: 0,
        litros: 0,
        valor: 0,
        km: 0,
        somaVlLitro: 0,
        somaKmLitro: 0,
        qtdVlLitro: 0,
        qtdKmLitro: 0,
        postos: {},
        cidades: {}
      };
    }

    const p = byPlaca[r.placa];
    p.abastecimentos++;
    p.litros += r.litros;
    p.valor += r.valor;
    p.km += Math.max(0, r.kmRodados);
    if (r.vlLitro > 0) {
      p.somaVlLitro += r.vlLitro;
      p.qtdVlLitro++;
    }
    if (r.kmLitro > 0) {
      p.somaKmLitro += r.kmLitro;
      p.qtdKmLitro++;
    }
    if (posto) p.postos[posto] = true;
    if (cidade) p.cidades[cidade] = true;

    if (!r.cadastro) {
      alertas.placasSemCadastro.push([
        r.placa, _fmtDate_(r.data, tz), cidade, posto, r.litros, r.valor
      ]);
    }
    if (r.kmRodados < 0) {
      alertas.kmNegativo.push([
        r.placa, _fmtDate_(r.data, tz), r.kmRodados, r.hodometro, r.valor, posto
      ]);
    }
    if (r.kmRodados === 0) {
      alertas.kmZero.push([
        r.placa, _fmtDate_(r.data, tz), r.hodometro, r.litros, r.valor, posto
      ]);
    }
    if (r.kmLitro > 25) {
      alertas.consumoAlto.push([
        r.placa, _fmtDate_(r.data, tz), r.kmLitro, r.litros, r.kmRodados, posto
      ]);
    }
    if (r.kmLitro > 0 && r.kmLitro < 3) {
      alertas.consumoBaixo.push([
        r.placa, _fmtDate_(r.data, tz), r.kmLitro, r.litros, r.kmRodados, posto
      ]);
    }

    if (!_combustiveisCompativeis_(combustivelCadastro, combustivelAbast)) {
      alertas.divergenciaCombustivel.push([
        r.placa, combustivelCadastro, combustivelAbast, _fmtDate_(r.data, tz), r.valor, posto
      ]);
    }

    if (r.vlLitro > 0) {
      mediaPrecoPorComb[combustivelAbast] = (mediaPrecoPorComb[combustivelAbast] || 0) + r.vlLitro;
      contPrecoPorComb[combustivelAbast] = (contPrecoPorComb[combustivelAbast] || 0) + 1;
    }

    const dupKey = [r.placa, _fmtDate_(r.data, tz)].join('|');
    chaveDuplicidade[dupKey] = (chaveDuplicidade[dupKey] || 0) + 1;
  });

  Object.keys(chaveDuplicidade).forEach(k => {
    if (chaveDuplicidade[k] > 2) {
      const parts = k.split('|');
      alertas.duplicidadeMesmoDia.push([parts[0], parts[1], chaveDuplicidade[k]]);
    }
  });

  const precoMedioComb = {};
  Object.keys(mediaPrecoPorComb).forEach(c => {
    precoMedioComb[c] = mediaPrecoPorComb[c] / contPrecoPorComb[c];
  });

  registros.forEach(r => {
    const comb = String(r.combustivelAbast || '').trim() || 'SEM COMBUSTÍVEL';
    const media = precoMedioComb[comb] || 0;
    if (media > 0 && r.vlLitro > media * 1.15) {
      alertas.precoAcimaMedia.push([
        r.placa, comb, r.vlLitro, media, _fmtDate_(r.data, tz), r.posto, r.cidade
      ]);
    }
  });

  const placasArr = Object.keys(byPlaca).map(k => {
    const p = byPlaca[k];
    p.ticketMedio = p.abastecimentos ? p.valor / p.abastecimentos : 0;
    p.mediaLitros = p.abastecimentos ? p.litros / p.abastecimentos : 0;
    p.custoKm = p.km > 0 ? p.valor / p.km : 0;
    p.consumoMedio = p.litros > 0 ? p.km / p.litros : 0;
    p.precoMedioLitro = p.qtdVlLitro ? p.somaVlLitro / p.qtdVlLitro : 0;
    p.kmLitroMedioInfo = p.qtdKmLitro ? p.somaKmLitro / p.qtdKmLitro : 0;
    p.qtdPostos = Object.keys(p.postos).length;
    p.qtdCidades = Object.keys(p.cidades).length;
    return p;
  }).sort((a, b) => b.valor - a.valor);

  const unidadesArr = _groupObjToArray_(byUnidade);
  const usosArr = _groupObjToArray_(byUso);
  const tiposArr = _groupObjToArray_(byTipo);
  const combustiveisArr = _groupObjToArray_(byCombustivel);
  const postosArr = _groupObjToArray_(byPosto);
  const cidadesArr = _groupObjToArray_(byCidade);
  const mesesArr = _groupObjToArray_(byMes).sort((a, b) => _compareMesAno_(a.chave, b.chave));

  const viaturasAbastecidas = placasArr.length;
  const viaturasSemAbastecimento = consultaInfo.totalVeiculos - viaturasAbastecidas;

  return {
    registros,
    summary: {
      periodoInicial: inicio,
      periodoFinal: fim,
      totalVeiculosBase: consultaInfo.totalVeiculos,
      totalLinhasPeriodo: abastInfo.totalLinhasPeriodo,
      totalLinhasAbastecimento: abastInfo.totalLinhasAbastecimento,
      totalAbastecimentos: registros.length,
      viaturasAbastecidas,
      viaturasSemAbastecimento,
      placasSemCadastro: abastInfo.placasForaConsulta.length,
      valorTotal,
      litrosTotal,
      kmTotal,
      ticketMedio: registros.length ? valorTotal / registros.length : 0,
      litrosMedio: registros.length ? litrosTotal / registros.length : 0,
      valorMedioLitro: litrosTotal > 0 ? valorTotal / litrosTotal : 0,
      consumoMedio: litrosTotal > 0 ? kmTotal / litrosTotal : 0,
      custoKmMedio: kmTotal > 0 ? valorTotal / kmTotal : 0,
      abastecimentosValidosConsumo
    },
    placasArr,
    unidadesArr,
    usosArr,
    tiposArr,
    combustiveisArr,
    postosArr,
    cidadesArr,
    mesesArr,
    alertas,
    filtros
  };
}

function _accGroup_(obj, key, r) {
  if (!obj[key]) {
    obj[key] = {
      chave: key,
      abastecimentos: 0,
      litros: 0,
      valor: 0,
      km: 0,
      placas: {}
    };
  }
  obj[key].abastecimentos++;
  obj[key].litros += r.litros;
  obj[key].valor += r.valor;
  obj[key].km += Math.max(0, r.kmRodados);
  obj[key].placas[r.placa] = true;
}

function _groupObjToArray_(obj) {
  return Object.keys(obj).map(k => {
    const x = obj[k];
    x.qtdPlacas = Object.keys(x.placas).length;
    x.ticketMedio = x.abastecimentos ? x.valor / x.abastecimentos : 0;
    x.mediaLitros = x.abastecimentos ? x.litros / x.abastecimentos : 0;
    x.consumoMedio = x.litros > 0 ? x.km / x.litros : 0;
    x.custoKm = x.km > 0 ? x.valor / x.km : 0;
    return x;
  }).sort((a, b) => b.valor - a.valor);
}

function _writeExecutiveReport_(ss, analytics, filtros, inicio, fim, tz) {
  const sh = _getOrCreateSheet_(ss, ABA_REL_EXEC);
  _prepareReportSheet_(sh, 300, 12, 3);

  let r = 3;
  const periodoTxt = 'Período: ' + _fmtDate_(inicio, tz) + ' a ' + _fmtDate_(fim, tz);
  sh.getRange(r, 1, 1, 8).merge();
  sh.getRange(r, 1).setValue(periodoTxt);
  _styleHeader_(sh.getRange(r, 1, 1, 8));
  r++;

  const filtrosTxt = [
    filtros.unidade ? 'Unidade: ' + filtros.unidade : 'Unidade: Todas',
    filtros.uso ? 'Uso: ' + filtros.uso : 'Uso: Todos',
    filtros.placa ? 'Placa: ' + filtros.placa : 'Placa: Todas',
    filtros.somenteReservadas ? 'Somente reservadas: Sim' : 'Somente reservadas: Não'
  ].join(' | ');

  sh.getRange(r, 1, 1, 8).merge();
  sh.getRange(r, 1).setValue(filtrosTxt);
  sh.getRange(r, 1).setFontFamily(FONTE).setFontSize(10).setBackground('#f3f4f6');
  r += 2;

  sh.getRange(r, 1, 1, 2).setValues([['INDICADOR', 'VALOR']]);
  _styleHeader_(sh.getRange(r, 1, 1, 2));
  r++;

  const resumo = analytics.summary;
  const linhasResumo = [
    ['Viaturas cadastradas na base', resumo.totalVeiculosBase],
    ['Linhas no período', resumo.totalLinhasPeriodo],
    ['Linhas de abastecimento no período', resumo.totalLinhasAbastecimento],
    ['Abastecimentos considerados', resumo.totalAbastecimentos],
    ['Viaturas abastecidas no período', resumo.viaturasAbastecidas],
    ['Viaturas sem abastecimento no período', resumo.viaturasSemAbastecimento],
    ['Placas abastecidas sem cadastro na ConsultaBD', resumo.placasSemCadastro],
    ['Valor total abastecido', resumo.valorTotal],
    ['Litros totais', resumo.litrosTotal],
    ['Km rodados totais informados', resumo.kmTotal],
    ['Ticket médio por abastecimento', resumo.ticketMedio],
    ['Litros médios por abastecimento', resumo.litrosMedio],
    ['Valor médio por litro', resumo.valorMedioLitro],
    ['Consumo médio consolidado (km/l)', resumo.consumoMedio],
    ['Custo médio consolidado por km', resumo.custoKmMedio]
  ];

  sh.getRange(r, 1, linhasResumo.length, 2).setValues(linhasResumo);
  _styleBodyTable_(sh.getRange(r, 1, linhasResumo.length, 2));
  _formatMetricColumn_(sh, r, linhasResumo);
  r += linhasResumo.length + 2;

  r = _writeRankingBlock_(sh, r, 'TOP 15 PLACAS POR VALOR ABASTECIDO', analytics.placasArr.slice(0, 15).map(x => [
    x.placa, x.marcaModelo, x.unidadeSipac, x.usoSipac, x.abastecimentos, x.litros, x.km, x.valor, x.consumoMedio, x.custoKm
  ]), ['Placa', 'Marca/Modelo', 'Unidade SIPAC', 'Uso SIPAC', 'Qtd Abast.', 'Litros', 'Km', 'Valor', 'Km/L', 'R$/Km']);

  r = _writeRankingBlock_(sh, r, 'TOP 15 UNIDADES POR VALOR ABASTECIDO', analytics.unidadesArr.slice(0, 15).map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.km, x.valor, x.consumoMedio, x.custoKm
  ]), ['Unidade SIPAC', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Km', 'Valor', 'Km/L', 'R$/Km']);

  r = _writeRankingBlock_(sh, r, 'TOP 15 POSTOS POR VALOR ABASTECIDO', analytics.postosArr.slice(0, 15).map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.valor, x.ticketMedio
  ]), ['Posto', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Valor', 'Ticket Médio']);

  r = _writeRankingBlock_(sh, r, 'TOP 15 CIDADES POR VALOR ABASTECIDO', analytics.cidadesArr.slice(0, 15).map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.valor, x.ticketMedio
  ]), ['Cidade', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Valor', 'Ticket Médio']);

  r = _writeRankingBlock_(sh, r, 'CONSOLIDADO POR COMBUSTÍVEL', analytics.combustiveisArr.map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.valor, x.ticketMedio, x.consumoMedio, x.custoKm
  ]), ['Combustível', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Valor', 'Ticket Médio', 'Km/L', 'R$/Km']);

  r = _writeRankingBlock_(sh, r, 'CONSOLIDADO POR USO SIPAC', analytics.usosArr.map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.km, x.valor, x.consumoMedio, x.custoKm
  ]), ['Uso SIPAC', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Km', 'Valor', 'Km/L', 'R$/Km']);

  r = _writeRankingBlock_(sh, r, 'CONSOLIDADO POR TIPO DE VEÍCULO', analytics.tiposArr.map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.km, x.valor, x.consumoMedio, x.custoKm
  ]), ['Tipo', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Km', 'Valor', 'Km/L', 'R$/Km']);

  _applySheetFinishing_(sh, 12, 3);
}

function _writeRankingBlock_(sh, rowStart, titulo, data, headers) {
  _ensureSheetSize_(sh, rowStart + Math.max(data.length, 5) + 5, headers.length);

  sh.getRange(rowStart, 1, 1, headers.length).merge();
  sh.getRange(rowStart, 1).setValue(titulo);
  _styleHeader_(sh.getRange(rowStart, 1, 1, headers.length));
  rowStart++;

  sh.getRange(rowStart, 1, 1, headers.length).setValues([headers]);
  _styleSubHeader_(sh.getRange(rowStart, 1, 1, headers.length));
  rowStart++;

  if (data.length) {
    sh.getRange(rowStart, 1, data.length, headers.length).setValues(data);
    _styleBodyTable_(sh.getRange(rowStart, 1, data.length, headers.length));
    _applyNumericFormatsByHeader_(sh, rowStart, data.length, headers);
    rowStart += data.length;
  } else {
    sh.getRange(rowStart, 1).setValue('Sem dados para o bloco.');
    rowStart++;
  }

  return rowStart + 2;
}

function _writePlacasReport_(ss, analytics, filtros, inicio, fim, tz) {
  const headers = [
    'Placa', 'Marca/Modelo', 'Combustível Cadastro', 'Tipo', 'Uso SIPAC', 'Unidade SIPAC',
    'Reservada', 'Blindagem', 'Caracterizado', 'Qtd Abast.', 'Litros', 'Km', 'Valor',
    'Ticket Médio', 'Média Litros', 'Preço Médio Litro', 'Consumo Médio (Km/L)',
    'Custo por Km', 'Qtd Postos', 'Qtd Cidades', 'Propriedade'
  ];

  const sh = _getOrCreateSheet_(ss, ABA_REL_PLACAS);
  _prepareReportSheet_(sh, Math.max(100, analytics.placasArr.length + 15), headers.length, 5);

  let r = 3;
  sh.getRange(r, 1, 1, headers.length).merge();
  sh.getRange(r, 1).setValue('Período: ' + _fmtDate_(inicio, tz) + ' a ' + _fmtDate_(fim, tz));
  _styleHeader_(sh.getRange(r, 1, 1, headers.length));
  r += 2;

  sh.getRange(r, 1, 1, headers.length).setValues([headers]);
  _styleHeader_(sh.getRange(r, 1, 1, headers.length));
  r++;

  const data = analytics.placasArr.map(x => [
    x.placa, x.marcaModelo, x.combustivelCadastro, x.tipo, x.usoSipac, x.unidadeSipac,
    x.placaReservada, x.blindagem, x.caracterizado, x.abastecimentos, x.litros, x.km, x.valor,
    x.ticketMedio, x.mediaLitros, x.precoMedioLitro, x.consumoMedio, x.custoKm,
    x.qtdPostos, x.qtdCidades, x.propriedade
  ]);

  if (data.length) {
    sh.getRange(r, 1, data.length, headers.length).setValues(data);
    _styleBodyTable_(sh.getRange(r, 1, data.length, headers.length));
    _applyNumericFormatsByHeader_(sh, r, data.length, headers);
    _resetFilter_(sh);
    sh.getRange(r, 1, data.length, headers.length).createFilter();
  } else {
    sh.getRange(r, 1).setValue('Sem dados para o período/filtros informados.');
  }

  _applySheetFinishing_(sh, headers.length, 5);
}

function _writeUnidadesReport_(ss, analytics, filtros, inicio, fim, tz) {
  const sh = _getOrCreateSheet_(ss, ABA_REL_UNIDADES);
  _prepareReportSheet_(sh, Math.max(100, analytics.unidadesArr.length + 15), 10, 3);

  let r = 3;
  sh.getRange(r, 1, 1, 10).merge();
  sh.getRange(r, 1).setValue('Período: ' + _fmtDate_(inicio, tz) + ' a ' + _fmtDate_(fim, tz));
  _styleHeader_(sh.getRange(r, 1, 1, 10));
  r += 2;

  const headers = [
    'Unidade SIPAC', 'Qtd Placas', 'Qtd Abast.', 'Litros', 'Km', 'Valor',
    'Ticket Médio', 'Média Litros', 'Consumo Médio (Km/L)', 'Custo por Km'
  ];

  sh.getRange(r, 1, 1, headers.length).setValues([headers]);
  _styleHeader_(sh.getRange(r, 1, 1, headers.length));
  r++;

  const data = analytics.unidadesArr.map(x => [
    x.chave, x.qtdPlacas, x.abastecimentos, x.litros, x.km, x.valor,
    x.ticketMedio, x.mediaLitros, x.consumoMedio, x.custoKm
  ]);

  if (data.length) {
    sh.getRange(r, 1, data.length, headers.length).setValues(data);
    _styleBodyTable_(sh.getRange(r, 1, data.length, headers.length));
    _applyNumericFormatsByHeader_(sh, r, data.length, headers);
    _resetFilter_(sh);
    sh.getRange(r, 1, data.length, headers.length).createFilter();
  } else {
    sh.getRange(r, 1).setValue('Sem dados para o período/filtros informados.');
  }

  _applySheetFinishing_(sh, headers.length, 3);
}

function _writeAlertasReport_(ss, analytics, filtros, inicio, fim, tz) {
  const sh = _getOrCreateSheet_(ss, ABA_REL_ALERTAS);
  _prepareReportSheet_(sh, 600, 8, 3);

  let r = 3;
  sh.getRange(r, 1, 1, 8).merge();
  sh.getRange(r, 1).setValue('Período: ' + _fmtDate_(inicio, tz) + ' a ' + _fmtDate_(fim, tz));
  _styleHeader_(sh.getRange(r, 1, 1, 8));
  r += 2;

  r = _writeAlertSection_(sh, r, 'PLACAS COM ABASTECIMENTO SEM CADASTRO NA CONSULTABD',
    ['Placa', 'Data', 'Cidade', 'Posto', 'Litros', 'Valor'],
    analytics.alertas.placasSemCadastro, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'REGISTROS COM KM RODADOS NEGATIVO',
    ['Placa', 'Data', 'Km Rodados', 'Hodômetro', 'Valor', 'Posto'],
    analytics.alertas.kmNegativo, COR_CRITICO);

  r = _writeAlertSection_(sh, r, 'REGISTROS COM KM RODADOS ZERADO',
    ['Placa', 'Data', 'Hodômetro', 'Litros', 'Valor', 'Posto'],
    analytics.alertas.kmZero, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'REGISTROS COM CONSUMO MUITO ALTO (> 25 KM/L)',
    ['Placa', 'Data', 'Km/L', 'Litros', 'Km Rodados', 'Posto'],
    analytics.alertas.consumoAlto, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'REGISTROS COM CONSUMO MUITO BAIXO (< 3 KM/L)',
    ['Placa', 'Data', 'Km/L', 'Litros', 'Km Rodados', 'Posto'],
    analytics.alertas.consumoBaixo, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'DIVERGÊNCIA ENTRE COMBUSTÍVEL CADASTRADO E ABASTECIDO',
    ['Placa', 'Combustível Cadastro', 'Combustível Abastecido', 'Data', 'Valor', 'Posto'],
    analytics.alertas.divergenciaCombustivel, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'PREÇO/LITRO ACIMA DE 15% DA MÉDIA DO COMBUSTÍVEL',
    ['Placa', 'Combustível', 'Preço/Litro', 'Média', 'Data', 'Posto', 'Cidade'],
    analytics.alertas.precoAcimaMedia, COR_ALERTA);

  r = _writeAlertSection_(sh, r, 'MAIS DE 2 ABASTECIMENTOS NO MESMO DIA PARA A MESMA PLACA',
    ['Placa', 'Data', 'Qtd Registros'],
    analytics.alertas.duplicidadeMesmoDia, COR_ALERTA);

  _applySheetFinishing_(sh, 8, 3);
}

function _writeAlertSection_(sh, rowStart, titulo, headers, data, bg) {
  _ensureSheetSize_(sh, rowStart + Math.max(data.length, 5) + 5, headers.length);

  sh.getRange(rowStart, 1, 1, headers.length).merge();
  sh.getRange(rowStart, 1).setValue(titulo);
  sh.getRange(rowStart, 1, 1, headers.length)
    .setBackground(bg)
    .setFontWeight('bold')
    .setFontFamily(FONTE)
    .setFontSize(10)
    .setFontColor('#000000');
  rowStart++;

  sh.getRange(rowStart, 1, 1, headers.length).setValues([headers]);
  _styleSubHeader_(sh.getRange(rowStart, 1, 1, headers.length));
  rowStart++;

  if (data && data.length) {
    sh.getRange(rowStart, 1, data.length, headers.length).setValues(data);
    _styleBodyTable_(sh.getRange(rowStart, 1, data.length, headers.length));
    _applyNumericFormatsByHeader_(sh, rowStart, data.length, headers);
    rowStart += data.length;
  } else {
    sh.getRange(rowStart, 1).setValue('Nenhum caso encontrado.');
    rowStart++;
  }

  return rowStart + 2;
}

function _writeChartDataAndCharts_(ss, analytics) {
  const sh = _getOrCreateSheet_(ss, ABA_REL_BASE_GRAF);
  sh.clear();
  _clearAllCharts_(sh);
  _ensureSheetSize_(sh, 100, 40);

  let c = 1;

  const blocos = [
    {
      titulo: 'Evolução Mensal',
      headers: ['Mês/Ano', 'Valor', 'Litros', 'Qtd Abast.', 'Qtd Placas', 'Km', 'Km/L', 'R$/Km'],
      data: analytics.mesesArr.map(x => [
        x.chave, x.valor, x.litros, x.abastecimentos, x.qtdPlacas, x.km, x.consumoMedio, x.custoKm
      ])
    },
    {
      titulo: 'Top Placas',
      headers: ['Placa', 'Valor'],
      data: analytics.placasArr.slice(0, 10).map(x => [x.placa, x.valor])
    },
    {
      titulo: 'Top Unidades',
      headers: ['Unidade SIPAC', 'Valor'],
      data: analytics.unidadesArr.slice(0, 10).map(x => [x.chave, x.valor])
    },
    {
      titulo: 'Combustível',
      headers: ['Combustível', 'Valor'],
      data: analytics.combustiveisArr.map(x => [x.chave, x.valor])
    },
    {
      titulo: 'Uso SIPAC',
      headers: ['Uso SIPAC', 'Valor'],
      data: analytics.usosArr.slice(0, 12).map(x => [x.chave, x.valor])
    }
  ];

  const posicoes = {};

  blocos.forEach(bloco => {
    _ensureSheetSize_(sh, Math.max(10, bloco.data.length + 5), c + bloco.headers.length + 2);

    sh.getRange(1, c, 1, bloco.headers.length).merge();
    sh.getRange(1, c).setValue(bloco.titulo);
    _styleHeader_(sh.getRange(1, c, 1, bloco.headers.length));

    sh.getRange(2, c, 1, bloco.headers.length).setValues([bloco.headers]);
    _styleSubHeader_(sh.getRange(2, c, 1, bloco.headers.length));

    if (bloco.data.length) {
      sh.getRange(3, c, bloco.data.length, bloco.headers.length).setValues(bloco.data);
      _styleBodyTable_(sh.getRange(3, c, bloco.data.length, bloco.headers.length));
      _applyNumericFormatsByHeader_(sh, 3, bloco.data.length, bloco.headers, c);
    }

    posicoes[bloco.titulo] = {
      row: 3,
      col: c,
      rows: Math.max(1, bloco.data.length),
      cols: bloco.headers.length
    };

    c += bloco.headers.length + 2;
  });

  _applySheetFinishing_(sh, Math.max(c, 20), 3);

  _addChart_(sh, posicoes['Evolução Mensal'], Charts.ChartType.COLUMN, 'Valor por mês', 1, 1);
  _addChart_(sh, posicoes['Top Placas'], Charts.ChartType.BAR, 'Top 10 placas por valor', 20, 1);
  _addChart_(sh, posicoes['Top Unidades'], Charts.ChartType.BAR, 'Top 10 unidades por valor', 39, 1);
  _addChart_(sh, posicoes['Combustível'], Charts.ChartType.PIE, 'Participação por combustível', 1, 10);
  _addChart_(sh, posicoes['Uso SIPAC'], Charts.ChartType.BAR, 'Valor por uso SIPAC', 20, 10);
}

function _addChart_(sheet, pos, chartType, title, row, col) {
  if (!pos) return;
  const range = sheet.getRange(pos.row - 1, pos.col, pos.rows + 1, Math.min(pos.cols, 2));
  const chart = sheet.newChart()
    .setChartType(chartType)
    .addRange(range)
    .setOption('title', title)
    .setOption('legend', { position: 'none' })
    .setPosition(row, col, 0, 0)
    .build();
  sheet.insertChart(chart);
}

function _styleTitle_(range) {
  range
    .setBackground(COR_TITULO)
    .setFontColor(COR_FONTE_HEADER)
    .setFontWeight('bold')
    .setFontFamily(FONTE)
    .setFontSize(13)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function _styleHeader_(range) {
  range
    .setBackground(COR_HEADER)
    .setFontColor(COR_FONTE_HEADER)
    .setFontWeight('bold')
    .setFontFamily(FONTE)
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function _styleSubHeader_(range) {
  range
    .setBackground(COR_SUBHEADER)
    .setFontColor('#000000')
    .setFontWeight('bold')
    .setFontFamily(FONTE)
    .setFontSize(10)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
}

function _styleBodyTable_(range) {
  range
    .setFontFamily(FONTE)
    .setFontSize(8)
    .setFontWeight('normal')
    .setFontColor('#000000')
    .setBackground('#ffffff')
    .setVerticalAlignment('middle')
    .setWrap(false)
    .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
}

function _applySheetFinishing_(sh, totalCols, frozenRows) {
  sh.setFrozenRows(frozenRows || 3);
  sh.getDataRange().setWrap(false);
}

function _formatMetricColumn_(sh, rowStart, linhasResumo) {
  for (let i = 0; i < linhasResumo.length; i++) {
    const label = linhasResumo[i][0];
    const row = rowStart + i;
    const cell = sh.getRange(row, 2);

    if (/valor|ticket|r\$|fipe/i.test(label)) {
      cell.setNumberFormat('"R$" #,##0.00');
    } else if (/litros|km|médio|média|consumo/i.test(label)) {
      cell.setNumberFormat('#,##0.00');
    } else {
      cell.setNumberFormat('#,##0');
    }
  }
}

function _applyNumericFormatsByHeader_(sh, rowStart, numRows, headers, colOffset) {
  colOffset = colOffset || 1;
  headers.forEach((h, i) => {
    const rng = sh.getRange(rowStart, colOffset + i, numRows, 1);
    if (/valor|ticket|fipe|r\$|preço/i.test(h)) {
      rng.setNumberFormat('"R$" #,##0.00');
    } else if (/litros|km\/l|r\/km|km|média|medio|médio/i.test(h)) {
      rng.setNumberFormat('#,##0.00');
    } else if (/qtd|quant/i.test(h)) {
      rng.setNumberFormat('#,##0');
    }
  });
}

function _prepareReportSheet_(sh, minRows, minCols, frozenRows) {
  _clearBodyBelowHeader_(sh);
  _clearAllCharts_(sh);
  _ensureSheetSize_(sh, minRows, minCols);
  _resetFilter_(sh);
  sh.setFrozenRows(frozenRows || 3);
}

function _clearBodyBelowHeader_(sh) {
  const maxRows = sh.getMaxRows();
  const maxCols = sh.getMaxColumns();
  if (maxRows <= 2 || maxCols <= 0) return;
  sh.getRange(3, 1, maxRows - 2, maxCols).clearContent().clearFormat().clearDataValidations().clearNote();
}

function _resetFilter_(sh) {
  const filter = sh.getFilter();
  if (filter) filter.remove();
}

function _exportarRelatoriosPdf_(ss, inicio, fim, tz) {
  const nomePdf =
    'Relatório Abastecimento - ' +
    Utilities.formatDate(inicio, tz, 'dd.MM.yyyy') +
    ' a ' +
    Utilities.formatDate(fim, tz, 'dd.MM.yyyy') +
    '.pdf';

  const tempSs = SpreadsheetApp.create('TMP PDF - Relatório Abastecimento');
  const tempId = tempSs.getId();

  try {
    const sheetsIniciais = tempSs.getSheets();
    if (!sheetsIniciais || !sheetsIniciais.length) {
      throw new Error('Não foi possível criar a planilha temporária para exportação do PDF.');
    }

    const defaultSheet = sheetsIniciais[0];
    let copiasCriadas = 0;
    const abasCopiadas = [];

    for (let i = 0; i < ABAS_PDF.length; i++) {
      const nomeAba = ABAS_PDF[i];
      const origem = ss.getSheetByName(nomeAba);

      if (!origem) {
        throw new Error('A aba obrigatória para exportação não foi encontrada: ' + nomeAba);
      }

      let copia;
      try {
        copia = origem.copyTo(tempSs);
      } catch (e) {
        throw new Error('Falha ao copiar a aba "' + nomeAba + '" para a planilha temporária: ' + e.message);
      }

      const nomeTemporario = '_TMP_' + (i + 1) + '_' + new Date().getTime();
      try {
        copia.setName(nomeTemporario);
      } catch (e) {
        throw new Error('Falha ao renomear temporariamente a cópia da aba "' + nomeAba + '": ' + e.message);
      }

      try {
        tempSs.setActiveSheet(copia);
        tempSs.moveActiveSheet(i + 1);
      } catch (e) {
        throw new Error('Falha ao posicionar a aba temporária "' + nomeAba + '": ' + e.message);
      }

      abasCopiadas.push({ sheet: copia, nomeFinal: nomeAba });
      copiasCriadas++;
    }

    if (copiasCriadas === 0) {
      throw new Error('Nenhuma aba foi copiada para a planilha temporária. Não é possível gerar o PDF.');
    }

    if (tempSs.getSheets().length <= 1) {
      throw new Error('A planilha temporária ficou com apenas uma aba visível. Exportação interrompida para evitar erro estrutural.');
    }

    try {
      tempSs.deleteSheet(defaultSheet);
    } catch (e) {
      throw new Error('Falha ao remover a aba padrão da planilha temporária: ' + e.message);
    }

    for (let i = 0; i < abasCopiadas.length; i++) {
      const item = abasCopiadas[i];
      try {
        item.sheet.setName(item.nomeFinal);
      } catch (e) {
        item.sheet.setName(item.nomeFinal + ' ' + (i + 1));
      }
    }

    SpreadsheetApp.flush();

    const url =
      'https://docs.google.com/spreadsheets/d/' +
      tempId +
      '/export' +
      '?format=pdf' +
      '&size=A4' +
      '&portrait=false' +
      '&fitw=true' +
      '&sheetnames=true' +
      '&printtitle=false' +
      '&pagenumbers=true' +
      '&gridlines=false' +
      '&fzr=true' +
      '&top_margin=0.25' +
      '&bottom_margin=0.25' +
      '&left_margin=0.25' +
      '&right_margin=0.25';

    const token = ScriptApp.getOAuthToken();
    const response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });

    if (response.getResponseCode() !== 200) {
      throw new Error(
        'Falha ao exportar PDF. Código: ' +
          response.getResponseCode() +
          ' | Resposta: ' +
          response.getContentText()
      );
    }

    const pdfBlob = response.getBlob().setName(nomePdf);

    const parentIt = DriveApp.getFileById(ss.getId()).getParents();
    const folder = parentIt.hasNext() ? parentIt.next() : DriveApp.getRootFolder();
    const arquivo = folder.createFile(pdfBlob);

    return {
      fileId: arquivo.getId(),
      url: arquivo.getUrl(),
      name: arquivo.getName()
    };
  } finally {
    try {
      DriveApp.getFileById(tempId).setTrashed(true);
    } catch (e) {}
  }
}

function _getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function _ensureSheetSize_(sh, minRows, minCols) {
  if (sh.getMaxRows() < minRows) {
    sh.insertRowsAfter(sh.getMaxRows(), minRows - sh.getMaxRows());
  }
  if (sh.getMaxColumns() < minCols) {
    sh.insertColumnsAfter(sh.getMaxColumns(), minCols - sh.getMaxColumns());
  }
}

function _clearAllCharts_(sh) {
  const charts = sh.getCharts();
  charts.forEach(chart => sh.removeChart(chart));
}

function _buildHeaderIndex_(headers) {
  const idx = {};
  headers.forEach((h, i) => {
    idx[String(h || '').trim()] = i;
  });
  return idx;
}

function _requireHeaderIndex_(idx, headerName) {
  if (idx[headerName] === undefined) {
    throw new Error('Header não encontrado: ' + headerName);
  }
  return idx[headerName];
}

function _idxByLetter_(letter) {
  let col = 0;
  const s = String(letter).toUpperCase().trim();
  for (let i = 0; i < s.length; i++) {
    col = col * 26 + (s.charCodeAt(i) - 64);
  }
  return col - 1;
}

function _toNumber_(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim();
  if (!s) return 0;
  s = s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function _normPlaca_(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
}

function _parseInputDate_(str, inicioDia) {
  if (!str) return null;
  const parts = String(str).split('-');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), inicioDia ? 0 : 23, inicioDia ? 0 : 59, inicioDia ? 0 : 59, inicioDia ? 0 : 999);
  return isNaN(d.getTime()) ? null : d;
}

function _parseBrDateTime_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v;
  }

  const s = String(v || '').trim();
  if (!s) return null;

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3]);
    const hh = Number(m[4] || 0);
    const mm = Number(m[5] || 0);
    const ss = Number(m[6] || 0);

    const dt = new Date(y, mo, d, hh, mm, ss);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const iso = new Date(s);
  return isNaN(iso.getTime()) ? null : iso;
}

function _fmtDate_(d, tz) {
  return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), 'dd/MM/yyyy');
}

function _fmtBRL_(n) {
  return Utilities.formatString('R$ %s', _fmtNumber_(n, 2));
}

function _fmtInt_(n) {
  return _fmtNumber_(n, 0);
}

function _fmtNumber_(n, dec) {
  n = Number(n || 0);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  });
}

function _isTruthyText_(v) {
  const s = String(v || '').trim().toUpperCase();
  return ['SIM', 'S', 'TRUE', 'VERDADEIRO', 'X', 'RESERVADA', 'RESERVADO'].indexOf(s) >= 0;
}

function _compareMesAno_(a, b) {
  const pa = String(a).split('/');
  const pb = String(b).split('/');
  const da = new Date(Number(pa[1]), Number(pa[0]) - 1, 1).getTime();
  const db = new Date(Number(pb[1]), Number(pb[0]) - 1, 1).getTime();
  return da - db;
}

function _normalizeCombustivel_(v) {
  let s = String(v || '').toUpperCase().trim();
  if (!s) return '';
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  if (s.indexOf('DIESEL') >= 0 || s.indexOf('S-10') >= 0 || s.indexOf('S10') >= 0) {
    return 'DIESEL';
  }

  // Flex / gasolina / álcool com grafias variadas
  if (
    s.indexOf('ALCO/GASOL') >= 0 ||
    s.indexOf('ALCOOL/GASOLINA') >= 0 ||
    s.indexOf('GASOLINA/ALCOOL') >= 0 ||
    s.indexOf('GASOL/ALCOOL') >= 0 ||
    s.indexOf('FLEX') >= 0
  ) {
    return 'FLEX';
  }

  if (s === 'GASOL' || s.indexOf('GASOLINA') >= 0 || s.indexOf('GASOL COMUM') >= 0) {
    return 'GASOLINA';
  }

  if (s === 'ALCOOL' || s.indexOf('ETANOL') >= 0 || s.indexOf('ALCOOL') >= 0) {
    return 'ETANOL';
  }

  if (s.indexOf('GNV') >= 0) return 'GNV';
  if (s.indexOf('ELETRIC') >= 0) return 'ELETRICO';

  return s;
}

function _combustiveisCompativeis_(cadastro, abastecido) {
  const c = _normalizeCombustivel_(cadastro);
  const a = _normalizeCombustivel_(abastecido);
  if (!c || !a) return true;
  if (c === a) return true;

  const flexGroup = ['FLEX', 'GASOLINA', 'ETANOL'];
  if (flexGroup.indexOf(c) >= 0 && flexGroup.indexOf(a) >= 0) return true;

  return false;
}
