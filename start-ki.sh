#!/bin/bash
# Startet die Anwendung (Build + Express-Server auf Port 3000) mit dem adesso-AI-Hub-Key aus dem
# macOS-Schlüsselbund. Der Key steht nie in einer Datei oder im Repository.
#
#   bash start-ki.sh              Server starten (beim ersten Mal wird der Key abgefragt)
#   bash start-ki.sh --key-neu    gespeicherten Key ersetzen, dann starten
#   bash start-ki.sh --key-loeschen   Key aus dem Schlüsselbund entfernen
#
# Optional: AI_HUB_MODEL=… (Standard: claude-opus-5-5), PORT=… (Standard: 3000)

set -euo pipefail
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"

DIENST="${AI_HUB_KEYCHAIN_SERVICE:-adesso-ai-hub}"
KONTO="${USER:-$(id -un)}"

key_lesen() { security find-generic-password -a "$KONTO" -s "$DIENST" -w 2>/dev/null; }

# Ohne Wert hinter -w fragt `security` den Key selbst unsichtbar ab (er landet nicht in der Prozessliste).
key_speichern() {
  echo "Bitte den AI-Hub-API-Key eingeben (die Eingabe ist unsichtbar, danach zur Bestätigung erneut):"
  security add-generic-password -U -a "$KONTO" -s "$DIENST" -w
}

case "${1:-}" in
  --key-loeschen)
    security delete-generic-password -a "$KONTO" -s "$DIENST" >/dev/null && echo "Key aus dem Schlüsselbund entfernt."
    exit 0
    ;;
  --key-neu)
    key_speichern
    ;;
  "" )
    ;;
  *)
    echo "Unbekannte Option: $1" >&2
    exit 2
    ;;
esac

if ! AI_HUB_API_KEY="$(key_lesen)" || [ -z "$AI_HUB_API_KEY" ]; then
  key_speichern
  AI_HUB_API_KEY="$(key_lesen)"
fi
export AI_HUB_API_KEY
export AI_HUB_MODEL="${AI_HUB_MODEL:-claude-opus-5-5}"

echo "Baue die Anwendung …"
npm run build
echo "Starte den Server (Strg+C beendet ihn) …"
exec npm start
