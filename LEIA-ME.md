# Painel da Frota — 16ª SPRF/CE (v2)

Web App em Apps Script, somente leitura, com login. Lê direto da planilha-mãe
**Frota 16ª SPRF - Gestão**: `ConsultaBD` (cadastro), `AbastBD` e `ManutBD` (transações do GoodManager), `Gestores`.

## Arquivos
| Arquivo | Função |
|---|---|
| `Codigo.gs` | Login (SGP), sessão, leitura por nome de coluna, agregação de AbastBD/ManutBD, cache |
| `App.html` | Estrutura da página (5 abas) |
| `Login.html` | Tela de login (e-mail + matrícula) |
| `Estilos.html` | Identidade visual (mesma do Inventário) |
| `Scripts.html` | Filtros, gráficos com filtro cruzado, tabela, análises de abastecimento e manutenção, ficha |

## Instalação
1. Extensões → Apps Script (na planilha-mãe ou em projeto independente). Crie os cinco arquivos com esses nomes.
2. Rode `diagnosticarLogin()` — confirma que a aba `SGP` (col. B matrícula, col. G e-mail) está sendo lida e que o administrador aparece.
3. Rode `diagnosticar()` — lista as abas, campos mapeados, quantidade de transações e tempo de leitura de AbastBD/ManutBD.
4. Implantar → Aplicativo da Web → Executar como **Eu** → acesso **Qualquer pessoa na PRF** (o login do app é a segunda camada).

## Perfis
- **Usuário** (qualquer e-mail/matrícula válidos na SGP): Painel, Viaturas, Abastecimento, Manutenção, Documentação (Licenciamento e multas, Cedidos).
- **Administrador** (`CONFIG.ADMINS`, hoje marcelo.leitao@prf.gov.br): além disso, Em desfazimento, Análise de desfazimento, Solicitações de prefeituras, os filtros de desfazimento e a coluna "Análise desf." Esses dados não são enviados ao navegador de quem não é administrador.

A sessão dura 6 h (renovada a cada uso) e fica no navegador; o botão ⏻ encerra.

## Abastecimento (AbastBD) e Manutenção (ManutBD)
Carregadas sob demanda na primeira vez que uma dessas abas (ou o histórico na ficha) é aberta; depois ficam em cache por 10 min no servidor.
O servidor agrega o abastecimento por placa × mês (valor, litros, km, nº de abastecimentos, odômetro mín/máx, combustível) e envia a manutenção transação a transação (data, placa, valor, oficina, tipo, cidade, odômetro, motorista, unidade, acidente).

Seletor de período em cada aba: 3 / 6 / 12 / 24 meses (ancorados no último mês com dados), cada ano disponível, ou tudo. Todos os filtros laterais continuam valendo.

**Abastecimento**: evolução mensal (R$ e km), por unidade, tipo, uso, combustível, consumo por modelo, R$/km por tipo, top 10 (gasto, km, pior consumo), postos mais usados, **alertas por transação** (consumo < 3 ou > 25 km/l, > 100 litros, fora do CE, odômetro retroativo), viaturas disponíveis sem abastecer e a **Conferência ConsultaBD × AbastBD/ManutBD** — compara as colunas "Soma … (12 meses)" com o cálculo direto e lista as viaturas que divergem mais de 10%.

**Manutenção**: evolução mensal (R$ e nº de serviços), por unidade, tipo de estabelecimento, tipo de veículo, modelo, gasto médio por viatura por modelo, por idade, por conceito, oficinas (faturamento e nº de serviços), top 10 (gasto, nº de serviços, R$/km usando o km da AbastBD no mesmo período), **retornos à mesma oficina em até 30 dias**, acidentes e a tabela completa de serviços do período.

**Ficha**: seção "Histórico de abastecimento e manutenção" com totais históricos, custo total por km, abastecimento mês a mês e todas as manutenções da viatura.

## Ajustes em `CONFIG`
- `ADMINS`, `ID_LOGIN`, `ABA_LOGIN`, `COL_LOGIN_MATR` (B = 2), `COL_LOGIN_NOME` (C), `COL_LOGIN_LOT` (F), `COL_LOGIN_EMAIL` (G = 7), `SESSAO_SEG`.
- `ABA_ABAST` / `ABA_MANUT` — se o nome mudar, o app ainda tenta achar pelo cabeçalho.
- `STATUS_OCULTOS_PADRAO`, `CACHE_SEG`, `ABA_OS_PENDENTES`, `ABA_OS_ACEITES`, `ABA_SOLICITACOES`.
- Critérios dos alertas ficam em `_lerAbastecimento_` (Codigo.gs); o de retorno à oficina (30 dias) em `renderManut` (Scripts.html).

## Removido nesta versão
Notas PGF (idade, rodagem, abastecimento, manutenção, nota final) — só o Conceito é exibido. Colunas e filtros de desfazimento saíram do perfil comum.

## v2.1 — Ordens de serviço, PDFs, Pagamentos, cache aquecido
- **Aba Ordens de serviço**: KPIs (em andamento, aguardando gestor, aguardando aceite, aceite vencido / vence em ≤ 3 dias, cobradas, PDFs indexados), OS por status, orçado por unidade e por oficina, tabela de **Aceites** ordenada pelo prazo (col. H) com semáforo, tabela de **OS** com botões de status (col. G). Fonte: abas `OS` e `Aceites` da planilha base.
- **PDFs de OS** (`CONFIG.PASTA_OS_PDF`, subpastas incluídas): o app lê o nome do arquivo e reconhece números de OS (7–9 dígitos) e placas. O link "PDF" aparece ao lado da OS nas tabelas, na ficha da viatura (seção Ordens de serviço) e como ícone na tabela de Viaturas. Índice em cache por 6 h.
- **Aba Pagamentos**: lê `Títulos Abast.` (A:R) e `Títulos Manut.` (A:S) e a aba `Resumo Glosa` da planilha de títulos, mapeando pelo cabeçalho real (Título, NF, Valor Bruto, Peças/Mão de obra (+ acidente), Juros, Emissão, Vencimento, Competência, Nota de Pagamento, Processo SEI, Desconto contratual, Glosa IMR, Glosa preços abusivos, SEIs do atesto/relatório/NF/glosa/IMR). KPIs: bruto, abastecimento, manutenção (peças × MO), desconto contratual, glosas, juros, títulos sem nota de pagamento, acidentes. Gráficos: bruto mensal abastecimento × manutenção, peças × mão de obra, glosas por competência, histórico de glosa de preços desde 03/2021, por ano, composição bruto → líquido. Tabelas por tipo com líquido calculado (bruto − desconto − glosas); clique no processo ou nos números SEI copia para a área de transferência.
- **Retornos à oficina** agora exigem intervalo de 1 a 30 dias — lançamentos no mesmo dia (peças + mão de obra da mesma OS) não contam mais.
- **Tempo de carga**: o cache passou a 1 h e existe `instalarGatilho()` — rode uma vez no editor: cria um gatilho horário que executa `aquecerCache()` e deixa tudo pronto antes de alguém abrir. Com isso a tela "Lendo AbastBD e ManutBD" só aparece se o gatilho falhar.
