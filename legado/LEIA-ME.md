# Scripts antigos da planilha (referência)

Exportados do projeto Apps Script ligado à planilha "Frota 16ª SPRF - Gestão".
Ficam aqui só como referência histórica — o que era útil foi trazido para o painel:

| Origem | Onde está agora |
|---|---|
| `AtualizaRelatórios.gs` → importarAbastUpload / importarManutUpload | aba **Dados → Importações** (`importarBase`) |
| `ExportaRelatório.gs` → exportarAbastBD / exportarManutBD | aba **Dados → Exportações** (`exportarBase`) |
| `RelatórioAbastecimento.gs` (4 abas + PDF) | aba **Dados → Relatórios** (`gerarRelatorioAbastecimento`, PDF direto) |
| `Botões-Frotas Detran.gs` | aba **Ações** + fila do DETRAN (`worker_detran.py`) |

Não migrados (avaliar se ainda são usados): importação de Detalhamento, Aceites,
Glosa ANP e Títulos; `PlacaMercosul.gs`; `OnEdit.gs`; `Fórmulas.gs`; menus da planilha.
