function consultardetrance() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Script');
  var cellA1Value = sheet.getRange('F2').getValue(); // Msg de Erro ou OK

  if (cellA1Value == "OK") {
    var mensagem = sheet.getRange("E2").getValue(); // Obtém a mensagem dinâmica da célula B4
    var respostaUsuario = SpreadsheetApp.getUi().alert(mensagem, SpreadsheetApp.getUi().ButtonSet.YES_NO);

    if (respostaUsuario == SpreadsheetApp.getUi().Button.YES) {
      var url = sheet.getRange("G2").getValue();

      var html = HtmlService.createHtmlOutput('<html><script>'
        +'window.close = function(){window.setTimeout(function(){google.script.host.close()},9)};'
        +'var a = document.createElement("a"); a.href="'+url+'"; a.target="_blank";'
        +'if(document.createEvent){'
        +'  var event=document.createEvent("MouseEvents");'
        +'  if(navigator.userAgent.toLowerCase().indexOf("firefox")>-1){window.document.body.append(a)}'                          
        +'  event.initEvent("click",true,true); a.dispatchEvent(event);'
        +'}else{ a.click() }'
        +'close();'
        +'</script>'
        // Offer URL as clickable link in case above code fails.
        +'<body style="word-break:break-word;font-family:sans-serif;">Failed to open automatically. <a href="'+url+'" target="_blank" onclick="window.close()">Click here to proceed</a>.</body>'
        +'<script>google.script.host.setHeight(40);google.script.host.setWidth(410)</script>'
        +'</html>')
        .setWidth( 110 ).setHeight( 1 );

      SpreadsheetApp.getUi().showModalDialog(html, mensagem);
    } else {
      // O usuário clicou em "NÃO", não faz nada
    }
  } else {
    var alertContent = cellA1Value;
    var ui = SpreadsheetApp.getUi();
    ui.alert(alertContent);
  }
}

function consultardnit() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Script');
  var cellA1Value = sheet.getRange('F4').getValue(); // Msg de Erro ou OK

  if (cellA1Value == "OK") {
    var mensagem = sheet.getRange("E4").getValue(); // Obtém a mensagem dinâmica da célula B4
    var respostaUsuario = SpreadsheetApp.getUi().alert(mensagem, SpreadsheetApp.getUi().ButtonSet.YES_NO);

    if (respostaUsuario == SpreadsheetApp.getUi().Button.YES) {
      var url = sheet.getRange("G4").getValue();

      var html = HtmlService.createHtmlOutput('<html><script>'
        +'window.close = function(){window.setTimeout(function(){google.script.host.close()},9)};'
        +'var a = document.createElement("a"); a.href="'+url+'"; a.target="_blank";'
        +'if(document.createEvent){'
        +'  var event=document.createEvent("MouseEvents");'
        +'  if(navigator.userAgent.toLowerCase().indexOf("firefox")>-1){window.document.body.append(a)}'                          
        +'  event.initEvent("click",true,true); a.dispatchEvent(event);'
        +'}else{ a.click() }'
        +'close();'
        +'</script>'
        // Offer URL as clickable link in case above code fails.
        +'<body style="word-break:break-word;font-family:sans-serif;">Failed to open automatically. <a href="'+url+'" target="_blank" onclick="window.close()">Click here to proceed</a>.</body>'
        +'<script>google.script.host.setHeight(40);google.script.host.setWidth(410)</script>'
        +'</html>')
        .setWidth( 110 ).setHeight( 1 );

      SpreadsheetApp.getUi().showModalDialog(html, mensagem);
    } else {
      // O usuário clicou em "NÃO", não faz nada
    }
  } else {
    var alertContent = cellA1Value;
    var ui = SpreadsheetApp.getUi();
    ui.alert(alertContent);
  }
}

function licenciardetrance() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Script');
  var cellA1Value = sheet.getRange('F3').getValue(); // Msg de Erro ou OK

  if (cellA1Value == "OK") {
    var mensagem = sheet.getRange("E3").getValue(); // Obtém a mensagem dinâmica da célula B4
    var respostaUsuario = SpreadsheetApp.getUi().alert(mensagem, SpreadsheetApp.getUi().ButtonSet.YES_NO);

    if (respostaUsuario == SpreadsheetApp.getUi().Button.YES) {
      var url = sheet.getRange("G3").getValue();

      var html = HtmlService.createHtmlOutput('<html><script>'
        +'window.close = function(){window.setTimeout(function(){google.script.host.close()},9)};'
        +'var a = document.createElement("a"); a.href="'+url+'"; a.target="_blank";'
        +'if(document.createEvent){'
        +'  var event=document.createEvent("MouseEvents");'
        +'  if(navigator.userAgent.toLowerCase().indexOf("firefox")>-1){window.document.body.append(a)}'                          
        +'  event.initEvent("click",true,true); a.dispatchEvent(event);'
        +'}else{ a.click() }'
        +'close();'
        +'</script>'
        // Offer URL as clickable link in case above code fails.
        +'<body style="word-break:break-word;font-family:sans-serif;">Failed to open automatically. <a href="'+url+'" target="_blank" onclick="window.close()">Click here to proceed</a>.</body>'
        +'<script>google.script.host.setHeight(40);google.script.host.setWidth(410)</script>'
        +'</html>')
        .setWidth( 110 ).setHeight( 1 );

      SpreadsheetApp.getUi().showModalDialog(html, mensagem);
    } else {
      // O usuário clicou em "NÃO", não faz nada
    }
  } else {
    var alertContent = cellA1Value;
    var ui = SpreadsheetApp.getUi();
    ui.alert(alertContent);
  }
}