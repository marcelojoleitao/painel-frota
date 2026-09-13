function exportarAbaSimples() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();

  // Perguntar aba
  const listaAbas = sheets.map((sheet, i) => `${i+1}. ${sheet.getName()}`).join("\n");
  const abaPrompt = ui.prompt("Exportar Aba", `Digite o número da aba que deseja exportar:\n\n${listaAbas}`, ui.ButtonSet.OK_CANCEL);
  if (abaPrompt.getSelectedButton() != ui.Button.OK) return;

  const indice = parseInt(abaPrompt.getResponseText()) - 1;
  if (isNaN(indice) || indice < 0 || indice >= sheets.length) {
    ui.alert("Número inválido.");
    return;
  }
  const abaOriginal = sheets[indice];

  // Criar planilha temporária com a aba selecionada
  const planilhaTemp = SpreadsheetApp.create("Export " + abaOriginal.getName());
  const abaTemp = planilhaTemp.getSheets()[0];
  abaOriginal.copyTo(planilhaTemp).activate();
  planilhaTemp.deleteSheet(abaTemp); // remove aba vazia inicial

  // Perguntar formato
  const formatoPrompt = ui.prompt("Formato de Exportação", "Digite:\n1 para XLSX\n2 para PDF", ui.ButtonSet.OK_CANCEL);
  if (formatoPrompt.getSelectedButton() != ui.Button.OK) return;
  const formato = formatoPrompt.getResponseText();

  let url;
  if (formato == "1") {
    url = `https://docs.google.com/feeds/download/spreadsheets/Export?key=${planilhaTemp.getId()}&exportFormat=xlsx`;
  } else if (formato == "2") {
    const sheetId = planilhaTemp.getSheets()[0].getSheetId();
    url = `https://docs.google.com/spreadsheets/d/${planilhaTemp.getId()}/export?format=pdf&exportFormat=pdf&gid=${sheetId}&portrait=false&size=A4&fitw=true&sheetnames=false&printtitle=false&pagenumbers=false&gridlines=false&fzr=false`;
  } else {
    ui.alert("Formato inválido.");
    return;
  }

  // Mostrar link
  const html = HtmlService.createHtmlOutput(`
    <html><body>
      <a href="${url}" target="_blank">
        <strong>⬇️ Clique aqui para baixar (${formato == "1" ? "XLSX" : "PDF"})</strong>
      </a>
      <br><br>
      A planilha temporária será excluída em 30 segundos.
      <script>setTimeout(function(){ google.script.host.close(); }, 10000);</script>
    </body></html>`);
  SpreadsheetApp.getUi().showModalDialog(html, "Download Exportação");

  // Agendar exclusão
  ScriptApp.newTrigger("excluirPlanilhaTemporaria")
    .timeBased()
    .after(30 * 1000)
    .create();
  PropertiesService.getScriptProperties().setProperty("planilhaTempId", planilhaTemp.getId());
}

function excluirPlanilhaTemporaria() {
  const fileId = PropertiesService.getScriptProperties().getProperty("planilhaTempId");
  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
      PropertiesService.getScriptProperties().deleteProperty("planilhaTempId");
    } catch (e) {
      Logger.log("Erro ao excluir planilha temporária: " + e.message);
    }
  }
}
