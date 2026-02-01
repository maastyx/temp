# Flip 7 - Multiplayer Kartenspiel 🎮

Ein multiplayer-fähiges Online-Kartenspiel basierend auf dem Spiel "Flip 7". Spieler können Räume erstellen, Freunde einladen oder gegen KI-Gegner antreten.

## 🚀 Features

- **Echtes Multiplayer**: Spielen Sie online mit Freunden über Room-Codes
- **KI-Gegner**: Fügen Sie CPU-Gegner für Solo-Spiele hinzu
- **Echtzeit-Synchronisation**: Alle Spieler sehen die gleichen Karten zur gleichen Zeit
- **Modernes UI**: Retro-futuristische Casino-Ästhetik mit Neon-Effekten
- **Vollständige Spielregeln**: Alle offiziellen Flip 7 Regeln implementiert

## 📋 Voraussetzungen

- Node.js (Version 16 oder höher)
- npm oder yarn

## 🛠️ Installation

### 1. Repository klonen oder herunterladen

```bash
cd flip7-multiplayer
```

### 2. Server installieren

```bash
cd server
npm install
```

### 3. Client installieren

```bash
cd ../client
npm install
```

## 🎮 Lokale Entwicklung

### Server starten

```bash
cd server
npm start
# Oder mit Auto-Reload:
npm run dev
```

Der Server läuft auf `http://localhost:3001`

### Client starten

```bash
cd client
npm start
```

Der Client läuft auf `http://localhost:3000`

## 🌐 Deployment auf eigenem Server

### Option 1: VPS/Dedicated Server (Empfohlen)

#### Server deployment

1. **Server vorbereiten** (z.B. mit Ubuntu)
```bash
# Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 für Prozess-Management
sudo npm install -g pm2
```

2. **Dateien hochladen**
```bash
# Auf dem Server
mkdir -p /var/www/flip7
cd /var/www/flip7

# Dateien per SCP/SFTP hochladen oder git clone
```

3. **Server konfigurieren**
```bash
cd server
npm install --production

# .env Datei erstellen
echo "PORT=3001" > .env

# Mit PM2 starten
pm2 start index.js --name flip7-server
pm2 save
pm2 startup
```

4. **Nginx als Reverse Proxy** (Optional aber empfohlen)
```nginx
# /etc/nginx/sites-available/flip7
server {
    listen 80;
    server_name ihr-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/flip7 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Client deployment

1. **Build erstellen**
```bash
cd client

# .env.production erstellen
echo "REACT_APP_SOCKET_URL=https://ihr-domain.de" > .env.production

npm run build
```

2. **Build-Dateien deployen**
```bash
# Build-Ordner auf Server kopieren
scp -r build/* user@server:/var/www/flip7/client/build/

# Oder nginx direkt darauf zeigen lassen
sudo cp -r build/* /var/www/html/
```

### Option 2: Heroku Deployment

#### Server auf Heroku

```bash
cd server

# Heroku CLI installieren und einloggen
heroku login

# App erstellen
heroku create flip7-server

# Deployen
git init
git add .
git commit -m "Initial commit"
git push heroku main

# URL notieren, z.B. https://flip7-server.herokuapp.com
```

#### Client auf Netlify/Vercel

**Netlify:**
```bash
cd client

# .env.production erstellen
echo "REACT_APP_SOCKET_URL=https://flip7-server.herokuapp.com" > .env.production

# Build
npm run build

# Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

**Vercel:**
```bash
cd client

# .env.production erstellen
echo "REACT_APP_SOCKET_URL=https://flip7-server.herokuapp.com" > .env.production

# Vercel CLI
npm install -g vercel
vercel --prod
```

### Option 3: Docker Deployment

```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

```yaml
# docker-compose.yml (im Root-Verzeichnis)
version: '3.8'
services:
  server:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    restart: always

  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - server
    restart: always
```

```bash
# Starten
docker-compose up -d
```

## 🔒 Sicherheit & Produktion

### Wichtige Konfigurationen für Produktion

1. **CORS richtig konfigurieren** (server/index.js)
```javascript
const io = socketIo(server, {
  cors: {
    origin: "https://ihre-domain.de", // Nicht "*" in Produktion!
    methods: ["GET", "POST"]
  }
});
```

2. **Environment Variables**
```bash
# Server
PORT=3001
NODE_ENV=production

# Client
REACT_APP_SOCKET_URL=https://ihre-domain.de
```

3. **SSL/HTTPS aktivieren** (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d ihre-domain.de
```

## 🎯 Spielanleitung

1. **Raum erstellen**: Geben Sie Ihren Namen ein und erstellen Sie einen Raum
2. **Freunde einladen**: Teilen Sie den 6-stelligen Room-Code mit Ihren Freunden
3. **KI hinzufügen**: Optional können CPU-Gegner hinzugefügt werden
4. **Spielen**: 
   - Jeder Spieler versucht durch Kartenziehen hohe Punktzahlen zu erreichen
   - Achtung: Doppelte Zahlenwerte führen zum Ausscheiden!
   - "Flip 7": 7 verschiedene Zahlenkarten = 15 Bonuspunkte
   - Erster mit 200+ Punkten gewinnt

## 🐛 Troubleshooting

### Client kann sich nicht mit Server verbinden
- Überprüfen Sie die `REACT_APP_SOCKET_URL` in `.env`
- Stellen Sie sicher, dass der Server läuft
- Prüfen Sie Firewall-Einstellungen (Port 3001 muss offen sein)

### "CORS Error"
- Konfigurieren Sie CORS korrekt im Server (siehe Sicherheitsabschnitt)

### Spieler werden getrennt
- Überprüfen Sie WebSocket-Verbindung
- Bei Nginx: Achten Sie auf `proxy_set_header Upgrade`

## 📝 Lizenz

MIT License

## 👨‍💻 Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im Repository.

---

Viel Spaß beim Spielen! 🎲🎉
