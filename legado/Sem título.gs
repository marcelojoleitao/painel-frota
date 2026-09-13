function posicionarNaUltimaLinhaColunaD() {
  // Obtém a planilha ativa
  var planilhaAtiva = SpreadsheetApp.getActiveSpreadsheet();
  var abaAtiva = planilhaAtiva.getActiveSheet();

  // Obtém os dados da coluna D
  var ultimaLinha = abaAtiva.getLastRow();
  var dadosColunaD = abaAtiva.getRange("D1:D" + ultimaLinha).getValues();

  // Encontra a última linha preenchida na coluna D
  var ultimaLinhaPreenchida = 0;
  for (var i = dadosColunaD.length - 1; i >= 0; i--) {
    if (dadosColunaD[i][0] !== "") {
      ultimaLinhaPreenchida = i + 1;
      break;
    }
  }

  // Posiciona a visualização na última linha preenchida da coluna D
  if (ultimaLinhaPreenchida > 0) {
    abaAtiva.setActiveRange(abaAtiva.getRange("D" + ultimaLinhaPreenchida));
  } else {
    SpreadsheetApp.getUi().alert("Não há dados na coluna D.");
  }
}
