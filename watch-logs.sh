#!/bin/bash

# Script para monitorar logs da API em tempo real
# Uso: ./watch-logs.sh

echo "============================================================"
echo "📊 Monitorando logs da API PJE Scraper"
echo "============================================================"
echo ""
echo "Pressione Ctrl+C para parar"
echo ""

tail -f api.log
