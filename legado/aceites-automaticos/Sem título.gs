function inspecionarHTML() {
  const nome = 'filtroRelatorioUnico'; // sem .html
  const tpl = HtmlService.createTemplateFromFile(nome);
  const src = tpl.getCode(); // conteúdo bruto do arquivo HTML
  SpreadsheetApp.getUi().alert(
    `Arquivo: ${nome}.html\nTamanho: ${src.length} chars\nInício:\n` + src.slice(0, 200)
  );
}
