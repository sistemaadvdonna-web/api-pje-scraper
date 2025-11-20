#!/bin/bash

# Script de teste da API PJE Scraper
# Uso: ./test-api.sh SEU_CODIGO_OTP

if [ -z "$1" ]; then
  echo "❌ Erro: Código OTP não fornecido"
  echo "Uso: ./test-api.sh SEU_CODIGO_OTP"
  echo ""
  echo "Exemplo: ./test-api.sh 123456"
  exit 1
fi

OTP_CODE=$1

echo "============================================================"
echo "🧪 Testando API PJE Scraper"
echo "============================================================"
echo ""
echo "📋 Configuração:"
echo "   OTP Code: $OTP_CODE"
echo "   Endpoint: http://localhost:3001/api/scrape/start"
echo ""
echo "🚀 Iniciando teste..."
echo ""

curl -X POST http://localhost:3001/api/scrape/start \
  -H "Content-Type: application/json" \
  -d "{
    \"searches\": [
      {\"numeroOAB\": \"142942\", \"letraOAB\": \"\", \"ufOAB\": \"MG\"}
    ],
    \"otpCode\": \"$OTP_CODE\"
  }" \
  -w "\n\n⏱️  Tempo total: %{time_total}s\n" \
  | jq '.' 2>/dev/null || cat

echo ""
echo "============================================================"
echo "✅ Teste concluído!"
echo "============================================================"
