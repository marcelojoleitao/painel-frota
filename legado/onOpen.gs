function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('Menu')
    .addItem('Atualizar Placas (abrir janela)…', 'atualizarPlacasMercosul')
    .addSeparator()
    .addItem('Atualizar colando lista (prompt)…', 'menuAtualizarPlacasMercosulPrompt')
    .addItem('Gerar relatório de abastecimento', 'abrirDialogoRelatorioAbastecimento')
    .addItem('Importar Abastecimento e Manutenção', 'abrirDialogUpload')
    .addItem('Exportar AbastBD XLSX','exportarAbastBD')
    .addItem('Exportar ManutBD XLSX','exportarManutBD')
    .addToUi();
}



/**
 * Alternativa sem a janela HTML: cola a lista no prompt
 * e reaproveita a função principal.
 */
function menuAtualizarPlacasMercosulPrompt() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    'Atualizar Placas (Mercosul)',
    'Cole a lista (uma por linha). Aceita "ABC1234" ou "ABC1234-ABC1D23".',
    ui.ButtonSet.OK_CANCEL
  );

  if (resp.getSelectedButton() !== ui.Button.OK) return;

  const texto = (resp.getResponseText() || '').trim();
  if (!texto) {
    ui.alert('Nenhum dado informado.');
    return;
  }
  atualizarPlacasEmTodasAbas(texto);
}
