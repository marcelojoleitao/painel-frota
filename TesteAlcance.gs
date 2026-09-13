/**
 * ============================================================
 *  TESTE DE ALCANCE — o Apps Script chega ao DETRAN-CE?
 *
 *  Cole este arquivo no projeto (novo arquivo .gs), rode
 *  testarAlcanceDetran() e me mande o log.
 *
 *  O que cada resultado significa:
 *   - Todos falham, inclusive os controles → problema geral de rede/permissão.
 *   - Controles passam e todo o DETRAN falha → bloqueio por origem (IP do Google).
 *   - Site principal passa e só /central falha → não é bloqueio de IP; é outra
 *     coisa (proteção específica daquele caminho), possivelmente contornável.
 * ============================================================
 */

function testarAlcanceDetran() {
  const alvos = [
    ['CONTROLE — exemplo.com',        'https://example.com'],
    ['CONTROLE — Google',             'https://www.google.com'],
    ['DETRAN — portal principal',     'https://www.detran.ce.gov.br'],
    ['DETRAN — sistemas (raiz)',      'https://sistemas.detran.ce.gov.br'],
    ['DETRAN — central (usado hoje)', 'https://sistemas.detran.ce.gov.br/central'],
    ['DETRAN — central com barra',    'https://sistemas.detran.ce.gov.br/central/'],
    ['DETRAN — sem https',            'http://sistemas.detran.ce.gov.br/central'],
    ['Governo CE (vizinho)',          'https://www.ceara.gov.br']
  ];

  const cabecalhosNavegador = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8'
  };

  Logger.log('=== TESTE DE ALCANCE (cada alvo é tentado duas vezes) ===');
  alvos.forEach(([rotulo, url]) => {
    Logger.log(rotulo + '  →  ' + url);
    Logger.log('   sem cabeçalhos : ' + _tentar_(url, {}));
    Logger.log('   como navegador : ' + _tentar_(url, cabecalhosNavegador));
  });
  Logger.log('=== FIM ===');
}

function _tentar_(url, cabecalhos) {
  const inicio = Date.now();
  try {
    const r = UrlFetchApp.fetch(url, {
      headers: cabecalhos,
      muteHttpExceptions: true,
      followRedirects: true,
      validateHttpsCertificates: true
    });
    const codigo = r.getResponseCode();
    const tipo = String(r.getAllHeaders()['Content-Type'] || '').split(';')[0];
    const tamanho = r.getContentText().length;
    const servidor = r.getAllHeaders()['Server'] || r.getAllHeaders()['server'] || '';
    return 'HTTP ' + codigo + ' | ' + tamanho + ' car. | ' + (tipo || 'sem tipo') +
           (servidor ? ' | servidor: ' + servidor : '') + ' | ' + (Date.now() - inicio) + ' ms';
  } catch (e) {
    return 'FALHOU: ' + String(e.message || e).substring(0, 160) + ' | ' + (Date.now() - inicio) + ' ms';
  }
}

/** Se o alcance funcionar, este teste vai adiante: tenta o login de verdade em uma placa. */
function testarLoginDetran(placa, renavam) {
  placa = String(placa || '').trim().toUpperCase();
  renavam = String(renavam || '').replace(/\D/g, '');
  if (!placa || !renavam) {
    Logger.log('Informe placa e renavam: testarLoginDetran("ABC1D23", "01234567890")');
    return;
  }
  try {
    const sess = _detranLogin_(placa, renavam);
    Logger.log('LOGIN OK para ' + placa + ' — CSRF de ' + sess.csrf.length + ' caracteres.');
  } catch (e) {
    Logger.log('LOGIN FALHOU para ' + placa + ': ' + (e.message || e));
  }
}
