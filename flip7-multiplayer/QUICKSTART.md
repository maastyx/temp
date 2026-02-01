# 🚀 Flip 7 - Schnellstart-Anleitung

## Schritt-für-Schritt zum laufenden Spiel

### 1️⃣ Dateien entpacken
```bash
# Navigieren Sie in den Projekt-Ordner
cd flip7-multiplayer
```

### 2️⃣ Server starten

**Terminal 1 öffnen:**
```bash
cd server
npm install
npm start
```

✅ Server läuft jetzt auf Port 3001

### 3️⃣ Client starten

**Terminal 2 öffnen:**
```bash
cd client
npm install
npm start
```

✅ Browser öffnet sich automatisch auf http://localhost:3000

### 4️⃣ Spielen!

1. **Namen eingeben**
2. **"RAUM ERSTELLEN" klicken**
3. **Room-Code kopieren** und an Freunde senden
4. **Optional**: CPU-Gegner hinzufügen
5. **"SPIEL STARTEN"**

## 🌐 Auf eigenem Server hosten

### Einfachste Variante: VPS mit Ubuntu

```bash
# 1. Auf dem Server
sudo apt update
sudo apt install nodejs npm nginx -y
sudo npm install -g pm2

# 2. Projekt hochladen (z.B. via SCP)
scp -r flip7-multiplayer user@ihr-server:~/

# 3. Server starten
cd ~/flip7-multiplayer/server
npm install
pm2 start index.js --name flip7
pm2 startup
pm2 save

# 4. Client bauen
cd ../client
npm install
echo "REACT_APP_SOCKET_URL=http://IHRE-SERVER-IP:3001" > .env.production
npm run build

# 5. Nginx konfigurieren
sudo cp -r build/* /var/www/html/
```

**Firewall öffnen:**
```bash
sudo ufw allow 80
sudo ufw allow 3001
sudo ufw enable
```

**Fertig!** Spiel läuft auf http://IHRE-SERVER-IP

## 🔥 Noch schneller: Docker

```bash
cd flip7-multiplayer

# Alles auf einmal starten
docker-compose up -d
```

Spiel läuft auf http://localhost

## ⚠️ Häufige Probleme

**Problem**: "Cannot connect to server"
- ✅ Lösung: Server läuft auf Port 3001? `netstat -an | grep 3001`

**Problem**: "CORS Error"
- ✅ Lösung: In `server/index.js` CORS-Origin auf Ihre Domain setzen

**Problem**: Port bereits belegt
- ✅ Lösung: In `server/.env` einen anderen Port setzen (z.B. 3002)

## 📞 Support

Fragen? Siehe die ausführliche [README.md](README.md) für Details!
