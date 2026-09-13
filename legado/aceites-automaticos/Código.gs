  function FiltroAceite() {
  var spreadsheet = SpreadsheetApp.getActive();
  spreadsheet.setActiveSheet(spreadsheet.getSheetByName('Aceites Mensal'), true);

  var filter = spreadsheet.getActiveSheet().getFilter();
  if (filter != null){filter.remove()};
  spreadsheet.getRange('K:K').activate();
  spreadsheet.getRange('K:K').createFilter();
  spreadsheet.getRange('K1').activate();
  var criteria = SpreadsheetApp.newFilterCriteria()
  .setHiddenValues(['Ocultar',''])
  .build();
  spreadsheet.getActiveSheet().getFilter().setColumnFilterCriteria(11, criteria)
  
};

