function exportarAbastBD() {
  exportarAbaParaXlsx_(
    'AbastBD',
    'Abastecimento'
  );
}

function exportarManutBD() {
  exportarAbaParaXlsx_(
    'ManutBD',
    'Manutencao'
  );
}

function exportarAbaParaXlsx_(nomeAba, nomeBaseArquivo) {

  const ui = SpreadsheetApp.getUi();

  const ssFonte = SpreadsheetApp.openById(TARGET_SPREADSHEET_ID);
  const abaFonte = ssFonte.getSheetByName(nomeAba);

  if (!abaFonte) {
    ui.alert('Aba não encontrada: ' + nomeAba);
    return;
  }

  const timezone =
    ssFonte.getSpreadsheetTimeZone() || 'America/Fortaleza';

  const dataHoje = Utilities.formatDate(
    new Date(),
    timezone,
    'dd.MM.yyyy'
  );

  const nomeArquivo =
    nomeBaseArquivo + '.' + dataHoje;

  let tempSpreadsheet = null;

  try {

    // cria planilha temporária
    tempSpreadsheet = SpreadsheetApp.create(nomeArquivo);

    const abaPadrao = tempSpreadsheet.getSheets()[0];

    // copia aba
    const novaAba = abaFonte.copyTo(tempSpreadsheet);
    novaAba.setName(nomeAba);

    // remove fórmulas (opcional)
    const range = novaAba.getDataRange();
    range.copyTo(range, { contentsOnly: true });

    // remove aba padrão
    tempSpreadsheet.deleteSheet(abaPadrao);

    SpreadsheetApp.flush();

    // URL exportação
    const exportUrl =
      'https://docs.google.com/spreadsheets/d/' +
      tempSpreadsheet.getId() +
      '/export?format=xlsx';

    // download automático
    const html = HtmlService.createHtmlOutput(
      '<html><script>' +

      'window.close = function(){' +
      'window.setTimeout(function(){google.script.host.close()},9)' +
      '};' +

      'var a = document.createElement("a");' +
      'a.href="' + exportUrl + '";' +
      'a.target="_blank";' +
      'a.download="' + nomeArquivo + '.xlsx";' +

      'if(document.createEvent){' +
      'var event=document.createEvent("MouseEvents");' +

      'if(navigator.userAgent.toLowerCase().indexOf("firefox")>-1){' +
      'window.document.body.append(a)' +
      '}' +

      'event.initEvent("click",true,true);' +
      'a.dispatchEvent(event);' +

      '}else{' +
      'a.click()' +
      '}' +

      'close();' +

      '</script>' +

      '<body style="word-break:break-word;font-family:sans-serif;">' +

      'Se o download não iniciar automaticamente, ' +

      '<a href="' + exportUrl + '" target="_blank" onclick="window.close()">' +
      'clique aqui para baixar' +
      '</a>.' +

      '</body>' +

      '<script>' +
      'google.script.host.setHeight(40);' +
      'google.script.host.setWidth(410)' +
      '</script>' +

      '</html>'
    ).setWidth(110).setHeight(1);

    ui.showModalDialog(html, 'Preparando download...');

    // exclui temporária após 1 minuto
    Utilities.sleep(60000);

    try {
      DriveApp
        .getFileById(tempSpreadsheet.getId())
        .setTrashed(true);
    } catch (e) {}

  } catch (erro) {

    ui.alert(
      'Erro ao gerar o arquivo:\n\n' +
      erro.message
    );

    // limpa temporária se der erro
    try {
      if (tempSpreadsheet) {
        DriveApp
          .getFileById(tempSpreadsheet.getId())
          .setTrashed(true);
      }
    } catch (e) {}

  }
}