function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Ações")
    .addItem("Exportar Aba para XLSX ou PDF", "exportarAbaSimples")
    .addSeparator()
    .addItem('Atualizar Placas (abrir janela)…', 'atualizarPlacasMercosul')
    .addItem('Atualizar colando lista (prompt)…', 'menuAtualizarPlacasMercosulPrompt')
    .addSeparator()
    .addItem('Gerar Relatório de Peças', 'abrirDialogoRelatorioUnico')
    .addItem('Gerar Relatório de Glosa por Gestor', 'gerarPdfsGlosaPorGestor')
    .addToUi();
}

