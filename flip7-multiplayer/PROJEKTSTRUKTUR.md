# 📁 Flip 7 - Projektstruktur

```
flip7-multiplayer/
│
├── 📄 README.md                    # Ausführliche Dokumentation
├── 📄 QUICKSTART.md               # Schnellstart-Anleitung
│
├── 🖥️ server/                     # Backend (Node.js + Socket.io)
│   ├── index.js                   # Haupt-Server-Datei mit Spiellogik
│   ├── package.json               # Server-Dependencies
│   ├── .env.example               # Umgebungsvariablen Vorlage
│   └── .gitignore
│
└── 💻 client/                     # Frontend (React)
    ├── public/
    │   └── index.html             # HTML-Template
    │
    ├── src/
    │   ├── App.jsx                # Haupt-React-Component mit UI
    │   ├── index.js               # React Entry Point
    │   └── index.css              # Tailwind CSS Import
    │
    ├── package.json               # Client-Dependencies
    ├── tailwind.config.js         # Tailwind Konfiguration
    ├── postcss.config.js          # PostCSS für Tailwind
    ├── .env.example               # Umgebungsvariablen Vorlage
    └── .gitignore

```

## 🔑 Wichtigste Dateien

### Server (Backend)

**`server/index.js`** - Das Herzstück des Servers
- Socket.io Server-Logik
- Raum-Verwaltung (erstellen, beitreten)
- Komplette Spiellogik (Karten verteilen, Züge verarbeiten)
- KI-Gegner Steuerung
- Punkteberechnung

**Wichtige Funktionen:**
- `createDeck()` - Erstellt das Kartendeck
- `dealInitialCards()` - Verteilt Startkarten
- `processCard()` - Verarbeitet gezogene Karten
- `aiDecision()` - KI-Entscheidungslogik
- `endRound()` - Rundenende und Punktevergabe

### Client (Frontend)

**`client/src/App.jsx`** - Die gesamte React-Anwendung
- Socket.io Client-Verbindung
- UI für alle Spielphasen (Menu, Lobby, Game)
- Echtzeit-Updates durch Socket-Events
- Animationen und visuelle Effekte

**Wichtige Komponenten:**
- Menu-Screen (Raum erstellen/beitreten)
- Lobby-Screen (Spieler-Verwaltung)
- Game-Screen (Hauptspiel)
- Round-End-Screen (Ergebnisse)

## 🔄 Datenfluss

```
Client 1                    Server                    Client 2
   |                          |                          |
   |---- createRoom ---------->|                          |
   |<--- roomCreated ----------|                          |
   |                           |                          |
   |                           |<---- joinRoom -----------|
   |<--- roomUpdated ----------|---- roomUpdated -------->|
   |                           |                          |
   |---- startGame ----------->|                          |
   |<--- gameStarted ----------|---- gameStarted -------->|
   |                           |                          |
   |<--- cardDrawn ------------|---- cardDrawn ---------->|
   |<--- cardProcessed --------|---- cardProcessed ------>|
   |                           |                          |
```

## 🛠️ Technologie-Stack

### Backend
- **Node.js** - Runtime
- **Express** - Web-Framework
- **Socket.io** - WebSocket-Kommunikation
- **CORS** - Cross-Origin Resource Sharing

### Frontend
- **React** - UI-Framework
- **Socket.io-client** - WebSocket-Client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 📡 Socket-Events

### Client → Server
- `createRoom` - Neuen Raum erstellen
- `joinRoom` - Raum beitreten
- `addAI` - KI-Gegner hinzufügen
- `startGame` - Spiel starten
- `drawCard` - Karte ziehen
- `pass` - Runde passen
- `newRound` - Neue Runde starten

### Server → Client
- `roomCreated` - Raum wurde erstellt
- `roomUpdated` - Raum-Status aktualisiert
- `gameStarted` - Spiel gestartet
- `initialCardsDealt` - Startkarten verteilt
- `cardDrawn` - Karte wurde gezogen
- `cardProcessed` - Karte wurde verarbeitet
- `playerPassed` - Spieler hat gepasst
- `nextPlayer` - Nächster Spieler ist dran
- `roundEnded` - Runde beendet
- `newRoundStarted` - Neue Runde gestartet

## 🎨 Styling

Das Design verwendet:
- **Farbschema**: Lila/Purple, Blau, Grün (Neon-Akzente)
- **Schriftarten**: 
  - `Orbitron` - Für Headlines und Zahlen
  - `Exo 2` - Für Body-Text
- **Effekte**: Neon-Glow, Animationen, Glassmorphismus

## 🔐 Sicherheitshinweise

Für Produktion ändern:
1. CORS-Origin von `"*"` zu Ihrer Domain
2. Sichere WebSocket-Verbindung (WSS)
3. Rate-Limiting hinzufügen
4. Input-Validierung verstärken
5. HTTPS aktivieren

## 📦 Dependencies

Siehe `package.json` Dateien für genaue Versionen.
Alle Dependencies sind MIT-lizenziert und produktionsreif.
