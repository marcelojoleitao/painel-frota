function atualizarPlacasMercosul() {
  const html = HtmlService.createHtmlOutputFromFile('entradaDePlacas')
    .setWidth(500)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(html, 'Atualizar Placas para o Padrão Mercosul');
}

function atualizarPlacasEmTodasAbas(inputTexto) {
  // --- monta mapa ANTIGA -> NOVA aceitando linhas "ABC1234" ou "ABC1234-ABC1D23"
  const linhas = inputTexto.trim().split('\n');
  const mapaPlacas = new Map();
  const ignoradas = [];

  linhas.forEach(l => {
    const bruto = (l || '').trim().toUpperCase();
    if (!bruto) return;

    // mantém compatibilidade com "ANTIGA-NOVA" se vier assim
    if (bruto.includes('-')) {
      const [antigaRaw, novaRaw] = bruto.split('-');
      const antiga = (antigaRaw || '').trim();
      const nova = (novaRaw || '').trim();
      if (antiga && nova) {
        mapaPlacas.set(sanitizarPlaca(antiga), sanitizarPlaca(nova));
      } else {
        ignoradas.push(bruto);
      }
      return;
    }

    // caso padrão pedido: só a placa antiga
    const antiga = sanitizarPlaca(bruto);
    const nova = converterAntigaParaMercosul(antiga);
    if (nova) {
      mapaPlacas.set(antiga, nova);
    } else {
      ignoradas.push(bruto);
    }
  });

  if (mapaPlacas.size === 0) {
    SpreadsheetApp.getUi().alert("Nenhuma placa válida informada.\nVerifique o formato (ex.: ABC1234).");
    return;
  }

  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const planilhaId = planilha.getId();

  const config = {
    '1_bJESdOs8rbmyzkKBJSSnpIi08pfecq7bVxqxp8N0Lw': [ // Fotos VTR
      { aba: '2024', coluna: 'A' },
    ],
    '1KhqXE-U92sAzLEct-F_8PJUtN34yxZkYXVO0invLlnM': [ // Analise Desfazimento
      { aba: 'Frota', coluna: 'A' },
    ],
    '1WpI_krrzyB65lfN6lYZHr9aD1-x0cSUg_g61xGgvNrk': [ // Aceites
      { aba: 'DetalhamentoDB', coluna: 'F' },
      { aba: 'AceitesDB', coluna: 'B' },
      { aba: 'OrçamentosDB', coluna: 'B' },
    ],
    '1w2K4UNAmMY_2WCTlyNdmj-b7AEgvBiW0wxW_1PPa6a8': [ // Gestão
      { aba: 'ConsultaBD', coluna: 'A' },
      { aba: 'AbastBD', coluna: 'F' },
      { aba: 'ManutBD', coluna: 'F' },
      { aba: 'PGF', coluna: 'B' },
      { aba: 'Desfazimento', coluna: 'H' },
      { aba: 'Acidentes', coluna: 'B' },
      { aba: 'SemPosse', coluna: 'A' },
      { aba: 'LicenciarBD', coluna: 'A' },
    ],
    '12gJWTsSfj_TqIAFvlrqsLUpBf2qMlZ9xXmgodA2fVDc': [ // Multas
      { aba: 'Multas', coluna: 'G' },
      { aba: 'DNIT', coluna: 'F' },
      { aba: 'CRVs', coluna: 'A' },
      { aba: 'PLACAS CRLV/2024', coluna: 'A' },
    ],
  };

  const configuracoes = config[planilhaId];
  if (!configuracoes) {
    SpreadsheetApp.getUi().alert("Essa planilha não está configurada no script.");
    return;
  }

  configuracoes.forEach(({ aba, coluna }) => {
    const folha = planilha.getSheetByName(aba);
    if (!folha) return;

    const colIndex = coluna.charCodeAt(0) - 64;
    const numLinhas = folha.getLastRow();
    if (numLinhas === 0) return;

    const dados = folha.getRange(1, colIndex, numLinhas).getValues();
    const linhasAlteradas = [];

    for (let i = 0; i < dados.length; i++) {
      const valorAtual = String(dados[i][0] || '').trim().toUpperCase();
      if (!valorAtual) continue;

      const normalizado = sanitizarPlaca(valorAtual);
      if (mapaPlacas.has(normalizado)) {
        dados[i][0] = mapaPlacas.get(normalizado);
        linhasAlteradas.push(i);
      }
    }

    if (linhasAlteradas.length > 0) {
      // mantém o mesmo fluxo (escrita célula a célula)
      linhasAlteradas.forEach(i => {
        folha.getRange(i + 1, colIndex).setValue(dados[i][0]);
      });
    }
  });

  let msg = "Atualização concluída com sucesso.";
  if (ignoradas.length) {
    msg += "\n\nLinhas ignoradas (formato inválido):\n• " + ignoradas.join("\n• ");
  }
  SpreadsheetApp.getUi().alert(msg);
}

/** --- auxiliares --- **/

function converterAntigaParaMercosul(placaAntiga) {
  // aceita exatamente LLLNNNN
  const reAntiga = /^[A-Z]{3}\d{4}$/;
  const limpa = sanitizarPlaca(placaAntiga);
  if (!reAntiga.test(limpa)) {
    // se já estiver no padrão novo, apenas retorna
    if (/^[A-Z]{3}\d[A-Z]\d{2}$/.test(limpa)) return limpa;
    return null;
  }
  const letras = limpa.slice(0, 3);
  const n1 = limpa[3];
  const n2 = limpa[4]; // este vira letra
  const n3 = limpa[5];
  const n4 = limpa[6];

  const mapa = ['A','B','C','D','E','F','G','H','I','J']; // 0..9
  const letraMapeada = mapa[parseInt(n2, 10)];
  return `${letras}${n1}${letraMapeada}${n3}${n4}`;
}

function sanitizarPlaca(txt) {
  // remove tudo que não seja A-Z ou 0-9 e deixa maiúsculo
  return String(txt || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
