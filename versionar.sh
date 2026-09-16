#!/bin/bash
# Mantém as três versões sempre iguais: VERSAO.txt, Scripts.html e Codigo.gs.
# Uso: ./versionar.sh 2.37.0
set -e
v="$1"
[ -z "$v" ] && { echo "informe a versão"; exit 1; }
echo "$v" > VERSAO.txt
sed -i -E "s/const VERSAO_PAINEL = '[^']+';/const VERSAO_PAINEL = '$v';/" Scripts.html
sed -i -E "s/const CODIGO_VERSAO = '[^']+';/const CODIGO_VERSAO = '$v';/" Codigo.gs
echo "VERSAO.txt : $(cat VERSAO.txt)"
grep -m1 "VERSAO_PAINEL = " Scripts.html
grep -m1 "CODIGO_VERSAO = " Codigo.gs
