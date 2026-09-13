function onEdit(e) {
  var planilha = e.source;
  var aba = planilha.getActiveSheet();
  var range = e.range;
  var linha = range.getRow();
  var coluna = range.getColumn();
  var currentDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  // Script existente para a aba 'LicenciarBD'
  if (aba.getName() === 'LicenciarBD') {
    ordenarPorData(aba);
  }

  // Script para a aba 'SipacRelatório'
  if (aba.getName() === 'SipacRelatório' && linha >= 3 && coluna >= 1 && coluna <= 9) {
    aba.getRange('B1').setValue('Informações Obtidas Através do Sistema SIPAC Frota em geração de relatório no formato Relatório em ' + currentDate);
  }

  // Script para a aba 'SipacListagem'
  if (aba.getName() === 'SipacListagem' && linha >= 3 && coluna >= 1 && coluna <= 9) {
    aba.getRange('D1').setValue('Informações Obtidas Através do Sistema SIPAC Frota em geração de relatório no formato Listagem em ' + currentDate);
  }

  // Script para a aba 'AbastBD'
  if (aba.getName() === 'AbastBD' && linha >= 3 && coluna >= 1 && coluna <= 40) {
    aba.getRange('Q1').setValue('Informações Obtidas Através do Sistema GoodManager da Ticket em 04/11/2024 em ' + currentDate);
  }

  // Script para a aba 'ManutBD'
  if (aba.getName() === 'ManutBD' && linha >= 3 && coluna >= 1 && coluna <= 40) {
    aba.getRange('Q1').setValue('Informações Obtidas Através do Sistema GoodManager da Ticket em 04/11/2024 em ' + currentDate);
  }

  // >>> NOVO BLOCO: aplicar fórmulas ao editar coluna A em 'ConsultaBD'
  if (aba.getName() === 'ConsultaBD' && coluna === 1 && linha > 1) {
    aba.getRange('AJ' + linha).setFormula(`=IFERROR(IF(A${linha}="";"";ARRAYFORMULA(MAX(FILTER(AbastBD!Q:Q;(AbastBD!F:F=A${linha})*(AbastBD!AQ:AQ="Abastecimento")))));"Erro")`);
    aba.getRange('AK' + linha).setFormula(`=IFERROR(IF(A${linha}="";"";SUMIFS(AbastBD!AO:AO;AbastBD!F:F;A${linha};AbastBD!AQ:AQ;"=Abastecimento";AbastBD!AP:AP;"12 MESES"));0)`);
    aba.getRange('AL' + linha).setFormula(`=IFERROR(IF(A${linha}="";"";SUMIFS(AbastBD!R:R;AbastBD!F:F;A${linha};AbastBD!AQ:AQ;"=Abastecimento";AbastBD!AP:AP;"12 MESES"));0)`);
    aba.getRange('AM' + linha).setFormula(`=IFERROR(IF(A${linha}="";"";SUMIFS(AbastBD!O:O;AbastBD!F:F;A${linha};AbastBD!AQ:AQ;"=Abastecimento";AbastBD!AP:AP;"12 MESES"));0)`);
    aba.getRange('AP' + linha).setFormula(`=IFERROR(IF(A${linha}="";"";SUMIFS(ManutBD!AO:AO;ManutBD!F:F;A${linha};ManutBD!M:M;"<>Acidente";ManutBD!AP:AP;"12 MESES";ManutBD!AQ:AQ;"<>SIM"));0)`);
  }
}




function ordenarPorData(aba) {
  // Define o range (intervalo) a ser ordenado
  var range = aba.getRange('A2:F' + aba.getLastRow());

  // Obtém os dados da planilha
  var dados = range.getValues();

  // Ordena os dados com base na coluna B (data) em ordem decrescente
  dados.sort(function (a, b) {
    return new Date(b[1]) - new Date(a[1]);
  });

  // Atualiza a planilha com os dados ordenados
  range.setValues(dados);
}

