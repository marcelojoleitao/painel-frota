/**
 * ============================================================
 *  ATUALIZADOR — puxa o código do GitHub e atualiza este projeto
 *
 *  Fluxo: eu (Claude) faço push no repositório → você roda
 *  atualizarDoGitHub() (ou deixa num gatilho) → o projeto é
 *  atualizado e a implantação do Web App passa a servir a nova
 *  versão. Nada de copiar e colar arquivo por arquivo.
 *
 *  PREPARAÇÃO (uma única vez):
 *  1. Ative a API do Apps Script para a sua conta:
 *     https://script.google.com/home/usersettings → "API do Google Apps Script" → Ativar
 *  2. Configurações do projeto → marque "Mostrar arquivo de manifesto appsscript.json"
 *     e deixe o manifesto assim (mantém tudo que o painel já usa e
 *     acrescenta as permissões de auto-atualização):
 *
 *     {
 *       "timeZone": "America/Fortaleza",
 *       "exceptionLogging": "STACKDRIVER",
 *       "runtimeVersion": "V8",
 *       "webapp": { "executeAs": "USER_DEPLOYING", "access": "DOMAIN" },
 *       "oauthScopes": [
 *         "https://www.googleapis.com/auth/spreadsheets",
 *         "https://www.googleapis.com/auth/drive.readonly",
 *         "https://www.googleapis.com/auth/script.external_request",
 *         "https://www.googleapis.com/auth/script.scriptapp",
 *         "https://www.googleapis.com/auth/userinfo.email",
 *         "https://www.googleapis.com/auth/script.projects",
 *         "https://www.googleapis.com/auth/script.deployments"
 *       ]
 *     }
 *
 *     (Se você já ativou a Drive API avançada, o editor mantém o bloco
 *     "dependencies" sozinho — não precisa mexer.)
 *  3. Salve o token do GitHub fora do código: rode uma vez
 *     definirTokenGitHub('ghp_xxx...') e apague o valor da chamada.
 *     Repositório público dispensa token.
 *  4. Preencha GITHUB.repo e, se quiser deploy automático,
 *     GITHUB.deploymentId (Implantar → Gerenciar implantações → ID).
 *  5. Rode atualizarDoGitHub() e autorize as novas permissões.
 * ============================================================
 */

const GITHUB = {
  repo:   'SEU_USUARIO/painel-frota',   // ex.: 'marcelojol/painel-frota'
  branch: 'main',

  // Arquivos do projeto → caminho no repositório
  arquivos: {
    'Codigo':  { caminho: 'Codigo.gs',    tipo: 'SERVER_JS' },
    'App':     { caminho: 'App.html',     tipo: 'HTML' },
    'Login':   { caminho: 'Login.html',   tipo: 'HTML' },
    'Estilos': { caminho: 'Estilos.html', tipo: 'HTML' },
    'Scripts': { caminho: 'Scripts.html', tipo: 'HTML' }
  },

  // ID da implantação do Web App (Gerenciar implantações → copiar ID).
  // Vazio = atualiza o código e cria a versão, mas você aponta a implantação manualmente.
  deploymentId: '',

  // Este arquivo se atualiza junto? 'Atualizador.gs' no repositório. Deixe true.
  incluirAtualizador: true
};

function definirTokenGitHub(token) {
  PropertiesService.getScriptProperties().setProperty('GITHUB_TOKEN', String(token || '').trim());
  return 'Token salvo nas propriedades do script.';
}

/** Atualiza o projeto com o que está no GitHub e publica nova versão do Web App. */
function atualizarDoGitHub() {
  const scriptId = ScriptApp.getScriptId();
  const tokenGoogle = ScriptApp.getOAuthToken();
  const cabGoogle = { Authorization: 'Bearer ' + tokenGoogle };

  // 1) Conteúdo atual do projeto (a API exige enviar TODOS os arquivos de volta)
  const urlConteudo = 'https://script.googleapis.com/v1/projects/' + scriptId + '/content';
  const atual = _jsonApi_(urlConteudo, { headers: cabGoogle });
  const porNome = {};
  atual.files.forEach(f => { porNome[f.name] = f; });

  // 2) Baixa cada arquivo do repositório e substitui
  const mapa = Object.assign({}, GITHUB.arquivos);
  if (GITHUB.incluirAtualizador) mapa['Atualizador'] = { caminho: 'Atualizador.gs', tipo: 'SERVER_JS' };
  const alterados = [], iguais = [], faltando = [];
  Object.keys(mapa).forEach(nome => {
    const fonte = _baixarDoGitHub_(mapa[nome].caminho);
    if (fonte === null) { faltando.push(mapa[nome].caminho); return; }
    const existente = porNome[nome];
    if (existente && existente.source === fonte) { iguais.push(nome); return; }
    porNome[nome] = { name: nome, type: mapa[nome].tipo, source: fonte };
    alterados.push(nome);
  });
  if (faltando.length) throw new Error('Arquivos não encontrados no repositório ' + GITHUB.repo + '@' + GITHUB.branch + ': ' + faltando.join(', '));
  if (!alterados.length) { Logger.log('Nada a atualizar — projeto já está igual ao GitHub.'); return 'Sem mudanças.'; }

  // 3) Grava o projeto (manifesto e arquivos não mapeados são preservados como estão)
  _jsonApi_(urlConteudo, { method: 'put', contentType: 'application/json', headers: cabGoogle,
    payload: JSON.stringify({ files: Object.values(porNome) }) });
  Logger.log('Arquivos atualizados: ' + alterados.join(', ') + (iguais.length ? ' | sem mudança: ' + iguais.join(', ') : ''));

  // 4) Nova versão + implantação
  const versao = _jsonApi_('https://script.googleapis.com/v1/projects/' + scriptId + '/versions',
    { method: 'post', contentType: 'application/json', headers: cabGoogle,
      payload: JSON.stringify({ description: 'GitHub ' + GITHUB.branch + ' — ' + new Date().toISOString() }) });
  Logger.log('Versão criada: ' + versao.versionNumber);

  if (GITHUB.deploymentId) {
    _jsonApi_('https://script.googleapis.com/v1/projects/' + scriptId + '/deployments/' + GITHUB.deploymentId,
      { method: 'put', contentType: 'application/json', headers: cabGoogle,
        payload: JSON.stringify({ deploymentConfig: { scriptId: scriptId, versionNumber: versao.versionNumber,
          manifestFileName: 'appsscript', description: 'Atualização automática via GitHub' } }) });
    Logger.log('Implantação ' + GITHUB.deploymentId + ' agora serve a versão ' + versao.versionNumber + '.');
  } else {
    Logger.log('GITHUB.deploymentId vazio: aponte a implantação para a versão ' + versao.versionNumber + ' em Gerenciar implantações.');
  }

  // 5) Cache limpo para o painel recarregar com o código/dados novos
  try { limparCache(); } catch (e) {}
  return 'Atualizado: ' + alterados.join(', ') + ' → versão ' + versao.versionNumber;
}

/** Baixa um arquivo do repositório (privado via token nas propriedades; público sem token). */
function _baixarDoGitHub_(caminho) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') || '';
  const url = 'https://api.github.com/repos/' + GITHUB.repo + '/contents/' + encodeURIComponent(caminho).replace(/%2F/g, '/') + '?ref=' + GITHUB.branch;
  const cab = { Accept: 'application/vnd.github.raw' };
  if (token) cab.Authorization = 'Bearer ' + token;
  const r = UrlFetchApp.fetch(url, { headers: cab, muteHttpExceptions: true });
  const codigo = r.getResponseCode();
  if (codigo === 404) return null;
  if (codigo !== 200) throw new Error('GitHub devolveu ' + codigo + ' para ' + caminho + ': ' + r.getContentText().substring(0, 300));
  return r.getContentText();
}

function _jsonApi_(url, opcoes) {
  opcoes = opcoes || {}; opcoes.muteHttpExceptions = true;
  const r = UrlFetchApp.fetch(url, opcoes);
  const codigo = r.getResponseCode();
  if (codigo < 200 || codigo >= 300) throw new Error('API ' + url.replace(/https:\/\/script\.googleapis\.com\/v1\//, '') + ' devolveu ' + codigo + ': ' + r.getContentText().substring(0, 500));
  const texto = r.getContentText();
  return texto ? JSON.parse(texto) : {};
}
