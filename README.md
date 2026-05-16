# riopac-add-chapter

Dieses Chrome-Plugin extrahiert Metadaten aus RI OPAC und speichert sie in Zotero Desktop.

## Zotero-Connector-Anbindung

Das Plugin sendet ein `POST` an:

- `http://127.0.0.1:23124/connector/saveItems`
- Fallback: `http://127.0.0.1:23119/connector/saveItems`

mit Headern:

- `Content-Type: application/json`
- `X-Zotero-Connector-API-Version: 3`

Der gesendete Payload ist **Zotero-Item-JSON** (Connector-Format), nicht CSL-JSON.  
Interne Kapitel-Metadaten werden vor dem Senden in ein Zotero-Item (`bookSection` oder `webpage`) umgewandelt.

## Smoke-Test (manuell gegen Zotero Desktop)

```bash
curl -i -X POST http://127.0.0.1:23124/connector/saveItems \
  -H "Content-Type: application/json" \
  -H "X-Zotero-Connector-API-Version: 3" \
  -d '{
    "sessionID": "smoke-test-1",
    "items": [
      {
        "itemType": "webpage",
        "title": "Smoke Test",
        "url": "https://example.org"
      }
    ]
  }'
```

Erwartung: HTTP `201` und ein neues Item in Zotero.
