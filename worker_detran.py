#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
worker_detran.py — trabalhador da fila do Painel da Frota (16ª SPRF/CE)

Por que existe: o Apps Script (Google) não alcança sistemas.detran.ce.gov.br.
O painel enfileira as ações na aba FilaAcoes e este programa, rodando na sua
máquina/rede, executa e devolve o resultado na mesma planilha.

Uso:
    python worker_detran.py              # processa a fila e fica vigiando
    python worker_detran.py --uma-vez    # processa o que está pendente e sai
    python worker_detran.py --intervalo 30

Requisitos: mesmos do consultas_detran.py (requests, beautifulsoup4, gspread,
google-auth, PyPDF2) e o credenciais.json na mesma pasta.
"""

import argparse
import datetime
import io
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

import gspread
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None

# ============================================================
# CONFIG — os mesmos valores do consultas_detran.py
# ============================================================
BASE_URL = "https://sistemas.detran.ce.gov.br/central"
ARQUIVO_CREDENCIAL = "credenciais.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive"]

ID_PLANILHA = "1w2K4UNAmMY_2WCTlyNdmj-b7AEgvBiW0wxW_1PPa6a8"
ABA_BASE = "ConsultaBD"
ABA_FILA = "FilaAcoes"
ABA_LOG = "LogAcoes"

CB_PLACA, CB_RENAVAM, CB_ANO = 1, 2, 3
CB_RESULT_MULTA = 15          # O
CB_CRV, CB_COD = 53, 54       # BA, BB
CB_LINK_CRLV = 67             # BO

PASTA_DRIVE_CRLV = "1RAs2cZEE4MzQJHKRiYKZFLefYrQcSAcC"

MAX_RETRIES, RETRY_WAIT, REQUEST_TIMEOUT, PAUSA_ENTRE = 3, 4, 30, 1.0
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) "
              "Gecko/20100101 Firefox/149.0")

# Colunas da aba FilaAcoes (1-based)
F_ID, F_CRIADO, F_QUEM, F_ACAO, F_PLACA, F_RENAVAM, F_CRV, F_COD, F_STATUS, F_RESULTADO, F_DETALHE, F_ATUALIZADO = range(1, 13)

_clientes = {}


# ============================================================
# Google
# ============================================================
def clientes():
    if not _clientes:
        cred = Credentials.from_service_account_file(ARQUIVO_CREDENCIAL, scopes=SCOPES)
        gc = gspread.authorize(cred)
        _clientes["gc"] = gc
        _clientes["ss"] = gc.open_by_key(ID_PLANILHA)
        _clientes["drive"] = build("drive", "v3", credentials=cred, cache_discovery=False)
    return _clientes["gc"], _clientes["ss"], _clientes["drive"]


CAB_FILA = ["ID", "Criado em", "Usuário", "Ação", "Placa", "Renavam", "CRV", "Código",
            "Status", "Resultado", "Detalhe", "Atualizado em"]
CAB_LOG = ["Data/Hora", "Usuário", "Ação", "Placa", "Resultado", "Detalhe"]


def aba(nome):
    """Abre a aba; cria (com cabeçalho) se ainda não existir — a FilaAcoes só
    nasce quando o painel enfileira o primeiro item."""
    _, ss, _ = clientes()
    try:
        return ss.worksheet(nome)
    except gspread.WorksheetNotFound:
        if nome == ABA_FILA:
            ws = ss.add_worksheet(title=ABA_FILA, rows=1000, cols=12)
            ws.append_row(CAB_FILA, value_input_option="USER_ENTERED")
            ws.freeze(rows=1)
            print(f"   (aba {ABA_FILA} criada)")
            return ws
        if nome == ABA_LOG:
            ws = ss.add_worksheet(title=ABA_LOG, rows=1000, cols=6)
            ws.append_row(CAB_LOG, value_input_option="USER_ENTERED")
            ws.freeze(rows=1)
            print(f"   (aba {ABA_LOG} criada)")
            return ws
        raise


def _retry_api(fn, *a, **kw):
    for t in range(1, 4):
        try:
            return fn(*a, **kw)
        except Exception as e:
            if t == 3:
                raise
            print(f"   (API do Sheets falhou: {e} — tentando de novo)")
            time.sleep(3 * t)


# ============================================================
# HTTP / DETRAN  (mesmos fluxos do consultas_detran.py)
# ============================================================
def nova_sessao():
    s = requests.Session()
    s.headers.update({"User-Agent": USER_AGENT,
                      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                      "Accept-Encoding": "gzip, deflate, br",
                      "DNT": "1", "Connection": "keep-alive"})
    return s


def _get(session, url, **kw):
    for t in range(1, MAX_RETRIES + 1):
        try:
            r = session.get(url, timeout=REQUEST_TIMEOUT, **kw)
            r.raise_for_status()
            return r
        except Exception:
            if t == MAX_RETRIES:
                raise
            time.sleep(RETRY_WAIT)


def _post(session, url, **kw):
    for t in range(1, MAX_RETRIES + 1):
        try:
            r = session.post(url, timeout=REQUEST_TIMEOUT, **kw)
            r.raise_for_status()
            return r
        except Exception:
            if t == MAX_RETRIES:
                raise
            time.sleep(RETRY_WAIT)


def _csrf(html):
    tag = BeautifulSoup(html, "html.parser").find("meta", {"name": "csrf-token"})
    return tag["content"] if tag else ""


def _auth_token(html):
    tag = BeautifulSoup(html, "html.parser").find("input", {"name": "authenticity_token"})
    return tag["value"] if tag else ""


def norm_txt(s):
    s = (s or "").lower()
    for a, b in [("ç", "c"), ("ã", "a"), ("á", "a"), ("â", "a"), ("é", "e"),
                 ("ê", "e"), ("í", "i"), ("ó", "o"), ("ô", "o"), ("ú", "u")]:
        s = s.replace(a, b)
    return s


def detran_login(placa, renavam):
    s = nova_sessao()
    r1 = _get(s, BASE_URL, headers={"Accept": "text/html,application/xhtml+xml,*/*;q=0.8"})
    csrf = _csrf(r1.text)
    if not csrf:
        raise ValueError("CSRF token não encontrado.")
    s.headers.update({"X-CSRF-Token": csrf, "X-Requested-With": "XMLHttpRequest", "Referer": BASE_URL})
    r2 = _get(s, f"{BASE_URL}/veiculos/detalhamento_servico", params={"codigo": "0"})
    auth = _auth_token(r2.text)
    if not auth:
        raise ValueError("authenticity_token não encontrado.")
    r3 = _post(s, f"{BASE_URL}/veiculos/login",
               headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "Accept": "application/json, text/javascript, */*; q=0.01"},
               data={"authenticity_token": auth, "veiculo[tipo_formulario]": "1",
                     "veiculo[placa]": placa, "veiculo[renavam_chassi]": renavam, "veiculo[chassi]": ""})
    try:
        j = r3.json()
    except Exception:
        raise ValueError(f"Login sem JSON. Status {r3.status_code}.")
    if j.get("status") != "succ":
        e = j.get("errors", {})
        raise ValueError(f"Login falhou: {e.get('error_message', e or j)}")
    return s, csrf


# ---------------- CRLV ----------------
def crlv_baixar_pdf(session, csrf, crv, cod):
    session.headers.update({"Referer": f"{BASE_URL}/veiculos/principal", "Accept": "text/html, */*; q=0.01"})
    _get(session, f"{BASE_URL}/veiculos/consultar_crlve")
    r5 = _post(session, f"{BASE_URL}/veiculos/consultar_crlve",
               headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
               data={"numero_crv": crv, "codigo_seguranca": cod})
    if "baixar_crlve" not in r5.text:
        msg = BeautifulSoup(r5.text, "html.parser").get_text(" ", strip=True)[:250]
        raise ValueError(f"Download não liberado (CRV/código?). {msg}")
    r6 = _post(session, f"{BASE_URL}/veiculos/baixar_crlve",
               headers={"Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/pdf,application/octet-stream,*/*"},
               data={"_method": "post", "authenticity_token": csrf})
    if "pdf" not in r6.headers.get("Content-Type", "").lower() or len(r6.content) < 500:
        raise ValueError("Resposta não é um PDF válido.")
    return r6.content


def pdf_texto(dados):
    if not PdfReader:
        return ""
    try:
        reader = PdfReader(io.BytesIO(dados))
        return "\n".join((p.extract_text() or "") for p in reader.pages[:2])
    except Exception:
        return ""


def extrair_exercicio(dados, placa):
    s = " ".join(pdf_texto(dados).replace("\n", " ").split())
    if placa:
        i = s.find(placa)
        if i != -1:
            m = re.search(r"\b(20\d{2})\b", s[i:i + 250])
            if m:
                return int(m.group(1))
    m = re.search(r"\bEXERC[IÍ]CIO\b.{0,80}\b(20\d{2})\b", s, re.IGNORECASE)
    if m:
        return int(m.group(1))
    m = re.search(r"\b(20\d{2})\b", s)
    return int(m.group(1)) if m else 0


def drive_enviar_pdf(nome, dados):
    _, _, drive = clientes()
    try:
        resp = drive.files().list(q=f"name='{nome}' and '{PASTA_DRIVE_CRLV}' in parents and trashed=false",
                                  fields="files(id)").execute()
        for f in resp.get("files", []):
            try:
                drive.files().delete(fileId=f["id"]).execute()
            except Exception:
                pass
    except Exception:
        pass
    media = MediaIoBaseUpload(io.BytesIO(dados), mimetype="application/pdf", resumable=False)
    arq = drive.files().create(body={"name": nome, "parents": [PASTA_DRIVE_CRLV]},
                               media_body=media, fields="id").execute()
    try:
        drive.permissions().create(fileId=arq["id"], body={"type": "anyone", "role": "reader"}, fields="id").execute()
    except Exception:
        pass
    return f"https://drive.google.com/file/d/{arq['id']}/view?usp=sharing"


# ---------------- multas ----------------
def _situacao_multas(html):
    for b in BeautifulSoup(html, "html.parser").find_all("div", class_="links-veiculo"):
        titulo = (b.get("data-title") or "").lower()
        classes = " ".join(b.get("class", []))
        texto = b.get_text(" ", strip=True).lower()
        if "multa" not in titulo and "multa" not in texto:
            continue
        if "alert-success" in classes and "não possui multas" in texto:
            return "sem_multa"
        if "alert-danger" in classes:
            return "com_multa"
    return "desconhecido"


def _tabela_multas(html):
    t = BeautifulSoup(html, "html.parser").find("table", {"id": "emissao-multas"})
    if not t:
        return "Tabela de multas não encontrada."
    linhas = []
    for tr in t.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 8 or "total" in tds[0].get_text(strip=True).lower():
            continue
        ait = tds[1].get_text(strip=True)
        if not ait:
            continue
        linhas.append(f"AIT:{ait} | {tds[3].get_text(strip=True)} | "
                      f"Infração:{tds[4].get_text(strip=True)} | Venc:{tds[5].get_text(strip=True)} | "
                      f"Valor:R${tds[6].get_text(strip=True).replace('R$','').strip()} | "
                      f"A pagar:R${tds[7].get_text(strip=True).replace('R$','').strip()}")
    return "\n".join(linhas) if linhas else "Multas indicadas, tabela vazia."


# ============================================================
# Localização da linha na ConsultaBD
# ============================================================
_mapa_linhas = {}


def linha_da_placa(placa, recarregar=False):
    global _mapa_linhas
    if recarregar or not _mapa_linhas:
        col = _retry_api(aba(ABA_BASE).col_values, CB_PLACA)
        _mapa_linhas = {}
        for i, v in enumerate(col[1:], start=2):
            p = re.sub(r"[^A-Z0-9]", "", (v or "").strip().upper())
            if p:
                _mapa_linhas.setdefault(p, i)
    return _mapa_linhas.get(placa)


def gravar_celula(linha, coluna, valor):
    _retry_api(aba(ABA_BASE).update_cell, linha, coluna, valor)


def registrar_log(quem, acao, placa, resultado, detalhe):
    try:
        agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        _retry_api(aba(ABA_LOG).append_row,
                   [agora, quem or "worker", acao, placa, resultado, str(detalhe)[:900]],
                   value_input_option="USER_ENTERED")
    except Exception as e:
        print(f"   (log não gravado: {e})")


# ============================================================
# Execução de cada ação
# ============================================================
def executar(item):
    """item = dicionário com os campos da linha da fila. Devolve (resultado, detalhe)."""
    acao = item["acao"]
    placa = item["placa"]
    renavam = re.sub(r"\D", "", item["renavam"] or "").zfill(11)
    linha = linha_da_placa(placa)
    if not linha:
        raise ValueError(f"placa {placa} não encontrada na {ABA_BASE}")
    if not renavam or renavam == "00000000000":
        raise ValueError("sem renavam na planilha")

    if acao == "Consultar multas":
        session, _ = detran_login(placa, renavam)
        session.headers.update({"Referer": f"{BASE_URL}/veiculos/principal", "Accept": "text/html, */*; q=0.01"})
        r4 = _get(session, f"{BASE_URL}/veiculos/principal")
        sit = _situacao_multas(r4.text)
        if sit == "sem_multa":
            resultado_txt = "SEM MULTAS"
        elif sit == "desconhecido":
            resultado_txt = "Situação não identificada."
        else:
            r5 = _get(session, f"{BASE_URL}/veiculos/multas")
            resultado_txt = _tabela_multas(r5.text)
        hoje = datetime.datetime.now().strftime("%d/%m/%Y")
        gravar_celula(linha, CB_RESULT_MULTA, f"Data da Última Consulta: {hoje}\n{resultado_txt}")
        n = resultado_txt.count("AIT:")
        status = "SEM MULTAS" if resultado_txt == "SEM MULTAS" else (f"{n} MULTA(S)" if n else "VERIFICAR")
        return status, resultado_txt.replace("\n", " · ")[:300]

    if acao == "Baixar CRLV":
        crv = re.sub(r"\D", "", item["crv"] or "")
        cod = re.sub(r"\D", "", item["cod"] or "")
        if not crv or not cod:
            raise ValueError("sem CRV/código de segurança na planilha")
        session, csrf = detran_login(placa, renavam)
        dados = crlv_baixar_pdf(session, csrf, crv, cod)
        link = drive_enviar_pdf(f"{placa}.pdf", dados)
        gravar_celula(linha, CB_LINK_CRLV, link)
        detalhe = "PDF salvo no Drive"
        ex = extrair_exercicio(dados, placa)
        if ex:
            gravar_celula(linha, CB_ANO, ex)
            detalhe += f" • exercício {ex} gravado"
        return "CRLV BAIXADO", detalhe

    if acao == "Gerar boleto":
        session, _ = detran_login(placa, renavam)
        session.headers.update({"Referer": f"{BASE_URL}/veiculos/principal", "Accept": "text/html, */*; q=0.01"})
        r4 = _get(session, f"{BASE_URL}/veiculos/licenciamento")
        html = r4.text
        texto = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
        if "veiculo ja licenciado" in norm_txt(texto):
            return "JÁ LICENCIADO", "DETRAN informa licenciamento em dia."
        if not BeautifulSoup(html, "html.parser").find(id="btn-emitir-licenciamento"):
            return "PENDÊNCIA", "DETRAN não liberou a emissão (impedimento/pendência)."
        auth = _auth_token(html)
        if not auth:
            raise ValueError("authenticity_token do licenciamento não encontrado.")
        session.headers.update({"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                                "Accept": "application/pdf,application/octet-stream,*/*"})
        r5 = _post(session, f"{BASE_URL}/veiculos/gerar_boleto", data={"authenticity_token": auth})
        if "pdf" not in r5.headers.get("Content-Type", "").lower() and len(r5.content) < 1000:
            raise ValueError("gerar_boleto não retornou PDF.")
        ano = datetime.datetime.now().year
        link = drive_enviar_pdf(f"{placa} - {ano}.pdf", r5.content)
        return "BOLETO GERADO", link

    raise ValueError(f"ação desconhecida: {acao}")


# ============================================================
# Laço da fila
# ============================================================
def ler_pendentes():
    ws = aba(ABA_FILA)
    valores = _retry_api(ws.get_all_values)
    itens = []
    for i, l in enumerate(valores[1:], start=2):
        l = l + [""] * (12 - len(l))
        if (l[F_STATUS - 1] or "").strip().upper() != "PENDENTE":
            continue
        itens.append({"linha": i, "id": l[F_ID - 1], "quem": l[F_QUEM - 1], "acao": (l[F_ACAO - 1] or "").strip(),
                      "placa": re.sub(r"[^A-Z0-9]", "", (l[F_PLACA - 1] or "").upper()),
                      "renavam": l[F_RENAVAM - 1], "crv": l[F_CRV - 1], "cod": l[F_COD - 1]})
    return ws, itens


def marcar(ws, linha, status, resultado="", detalhe=""):
    agora = datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    _retry_api(ws.update,
               f"I{linha}:L{linha}",
               [[status, resultado, str(detalhe)[:900], agora]],
               value_input_option="USER_ENTERED")


def processar_fila():
    ws, itens = ler_pendentes()
    if not itens:
        return 0
    print(f"\n{len(itens)} item(ns) pendente(s) — iniciando às {datetime.datetime.now():%H:%M:%S}")
    linha_da_placa("", recarregar=True)
    feitos = 0
    for n, item in enumerate(itens, start=1):
        rotulo = f"[{n}/{len(itens)}] {item['acao']} — {item['placa']}"
        print(f" {rotulo} …", end="", flush=True)
        try:
            marcar(ws, item["linha"], "EXECUTANDO")
        except Exception:
            pass
        try:
            resultado, detalhe = executar(item)
            marcar(ws, item["linha"], "CONCLUÍDO", resultado, detalhe)
            registrar_log(item["quem"], item["acao"], item["placa"], resultado, detalhe)
            print(f" {resultado}")
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            marcar(ws, item["linha"], "ERRO", "ERRO", msg)
            registrar_log(item["quem"], item["acao"], item["placa"], "ERRO", msg)
            print(f" ERRO — {msg}")
        feitos += 1
        time.sleep(PAUSA_ENTRE)
    print(f"Concluído: {feitos} item(ns).")
    return feitos


def main():
    ap = argparse.ArgumentParser(description="Processa a fila de ações do DETRAN do Painel da Frota.")
    ap.add_argument("--uma-vez", action="store_true", help="processa o que está pendente e encerra")
    ap.add_argument("--intervalo", type=int, default=20, help="segundos entre verificações (padrão: 20)")
    args = ap.parse_args()

    print("Trabalhador da fila — Painel da Frota 16ª SPRF/CE")
    try:
        clientes()
        print(f"Planilha conectada. Aba da fila: {ABA_FILA}")
    except Exception as e:
        print(f"Não consegui abrir a planilha: {e}")
        sys.exit(1)

    # confere de saída se o DETRAN responde desta máquina
    try:
        t0 = time.time()
        r = requests.get(BASE_URL, timeout=20, headers={"User-Agent": USER_AGENT})
        print(f"DETRAN respondeu HTTP {r.status_code} em {time.time()-t0:.1f}s — conexão ok.")
    except Exception as e:
        print(f"ATENÇÃO: não consegui acessar o DETRAN desta máquina ({type(e).__name__}: {e}).")
        print("O trabalhador vai rodar mesmo assim, mas as ações vão falhar até a rede permitir.")

    if args.uma_vez:
        processar_fila()
        return

    print(f"Vigiando a fila a cada {args.intervalo}s. Ctrl+C para sair.")
    try:
        while True:
            try:
                if processar_fila() == 0:
                    print(".", end="", flush=True)
            except Exception as e:
                print(f"\nFalha no ciclo: {type(e).__name__}: {e}")
            time.sleep(args.intervalo)
    except KeyboardInterrupt:
        print("\nEncerrado.")


if __name__ == "__main__":
    main()
