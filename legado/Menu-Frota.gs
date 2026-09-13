function limparselecaofrota() {
  var spreadsheet = SpreadsheetApp.getActive();

  spreadsheet.setActiveSheet(spreadsheet.getSheetByName('Frota'), true);
  spreadsheet.getRange('V4').activate();
  spreadsheet.getCurrentCell().setValue('Não Selecionado');
  spreadsheet.getActiveRange().autoFill(spreadsheet.getRange('V4:V'), SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES);
  spreadsheet.getRange('B5').activate();
};

function marcarselecaofrota() {
  var spreadsheet = SpreadsheetApp.getActive();

  spreadsheet.setActiveSheet(spreadsheet.getSheetByName('Frota'), true);
  spreadsheet.getRange('V4').activate();
  spreadsheet.getCurrentCell().setValue('Selecionado');
  spreadsheet.getActiveRange().autoFill(spreadsheet.getRange('V4:V'), SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES);
  spreadsheet.getRange('B5').activate();
};