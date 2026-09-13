function onEdit(e) {
  const aba = e.source.getSheetByName('DetalhamentoDB');
  const celulaEditada = e.range;

  if (e.source.getActiveSheet().getName() !== 'DetalhamentoDB') return;

  const coluna = celulaEditada.getColumn();
  const linha = celulaEditada.getRow();

  if ((coluna === 29 || coluna === 30) && linha >= 4) {
    preencherColunasA_E_F_M_DetalhamentoDB();
  }
}

function preencherColunasA_E_F_M_DetalhamentoDB() {
  const aba = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DetalhamentoDB');

  // Detecta a última linha com peça (coluna O)
  const colO = aba.getRange("O4:O").getValues(); // da linha 4 em diante
  let ultimaLinha = colO.findLastIndex(v => v[0] !== "") + 4;
  if (ultimaLinha < 4) return;

  const numLinhas = ultimaLinha - 3;

  const colA = aba.getRange(4, 1, numLinhas).getValues(); // Coluna A
  const colC = aba.getRange(4, 3, numLinhas).getValues(); // Coluna C
  const colE = aba.getRange(4, 5, numLinhas).getValues(); // Coluna E
  const colL = aba.getRange(4, 12, numLinhas).getValues(); // Coluna L
  const colN = aba.getRange(4, 14, numLinhas).getValues(); // Coluna N
  const colF_M = aba.getRange(4, 6, numLinhas, 8).getValues(); // Colunas F a M

  const novaColunaA = [];
  const novaColunaE = [];
  const novasColunasF_M = [];

  let ultimaLinhaF_M = Array(8).fill("");

  for (let i = 0; i < numLinhas; i++) {
    const valorN = colN[i][0];
    const valorL = colL[i][0];
    const valorC = colC[i][0];
    const valorAnteriorA = i === 0 ? "" : novaColunaA[i - 1][0];
    const valorAnteriorE = i === 0 ? "" : novaColunaE[i - 1][0];
    const linhaF_M = colF_M[i];

    // Coluna A
    if (valorN === "") {
      novaColunaA.push([""]);
    } else if (valorC === "") {
      novaColunaA.push([valorAnteriorA]);
    } else {
      novaColunaA.push([valorC]);
    }

    // Coluna E
    if (valorN === "") {
      novaColunaE.push([""]);
    } else if (valorL !== "") {
      novaColunaE.push([valorL]);
    } else {
      novaColunaE.push([valorAnteriorE]);
    }

    // Colunas F a M
    const novaLinhaF_M = [];
    for (let j = 0; j < 8; j++) {
      const valor = linhaF_M[j];
      if (valor !== "") {
        ultimaLinhaF_M[j] = valor;
        novaLinhaF_M.push(valor);
      } else {
        novaLinhaF_M.push(ultimaLinhaF_M[j]);
      }
    }
    novasColunasF_M.push(novaLinhaF_M);
  }

  aba.getRange(4, 1, numLinhas, 1).setValues(novaColunaA);      // Coluna A
  aba.getRange(4, 5, numLinhas, 1).setValues(novaColunaE);      // Coluna E
  aba.getRange(4, 6, numLinhas, 8).setValues(novasColunasF_M);  // Colunas F a M
}

