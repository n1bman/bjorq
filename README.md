# bjorQ Dashboard

A 3D smart home dashboard that runs locally alongside Home Assistant.

## Quick Start

**Krav:** Node.js 18+ — [nodejs.org](https://nodejs.org/)

### Windows

1. Ladda ner `bjorq-dashboard-windows.zip` från [Releases](../../releases/latest)
2. Packa upp
3. Dubbelklicka **`start.bat`** (PowerShell: `.\start.bat`)
4. Webbläsaren öppnas automatiskt till `http://localhost:3000`

### Linux / Raspberry Pi

1. Ladda ner `bjorq-dashboard-linux.zip` från [Releases](../../releases/latest)
2. Packa upp och kör:
   ```bash
   chmod +x start.sh && ./start.sh
   ```
3. Öppna adressen som skrivs ut (t.ex. `http://192.168.1.x:3000`)

### Anpassad port

```bash
# Linux / macOS
PORT=8080 ./start.sh

# Windows
set PORT=8080
start.bat
```

## Data

All data sparas i `data/`-mappen bredvid servern. Kopiera den för backup.

| Fil | Innehåll |
|-----|----------|
| `data/config.json` | HA-anslutning, UI-inställningar |
| `data/profiles.json` | Tema, prestanda, standby |
| `data/projects/` | Byggnadsmodeller, assets, scener |

## Home Assistant

1. Öppna **Inställningar → Home Assistant** i dashboarden
2. Ange din HA-URL (t.ex. `http://homeassistant.local:8123`)
3. Ange en [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-tokens)

Token lagras enbart på servern. Alla HA-anrop proxas via `/api/ha/*`.

## Nätverksåtkomst

Servern lyssnar på `0.0.0.0` — alla enheter på LAN når den. För fjärråtkomst, använd samma reverse proxy / VPN som för Home Assistant.

## Felsökning

| Problem | Lösning |
|---------|---------|
| "Node.js not found" | Installera Node.js 18+ |
| "Port in use" | Sätt annan port: `PORT=8080 ./start.sh` |
| "Permission denied" | `chmod +x start.sh` |
| Blank sida | Vänta några sekunder, hårdladda (`Ctrl+Shift+R`) |

## Autostart (Linux systemd)

```ini
# /etc/systemd/system/bjorq-dashboard.service
[Unit]
Description=bjorQ Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/bjorq-dashboard
ExecStart=/usr/bin/node server/server.js
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable bjorq-dashboard
sudo systemctl start bjorq-dashboard
```

## Development

```bash
npm install
npm run dev
```

**Import convention:** Använd alltid relativa imports (`./`, `../`) — aldrig `@/`.

## Tech Stack

React · TypeScript · Vite · Three.js / React Three Fiber · Tailwind CSS · shadcn/ui · Zustand · Express
