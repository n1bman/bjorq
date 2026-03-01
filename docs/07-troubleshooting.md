# Troubleshooting

## Common Issues

| Problem | Solution |
|---------|----------|
| **"Node.js not found"** | Install Node.js 18+ from [nodejs.org](https://nodejs.org/) |
| **"Port in use"** | Change port: `PORT=8080 ./start.sh` (Linux) or `set PORT=8080 && start.bat` (Windows) |
| **"Permission denied"** | Run `chmod +x start.sh install.sh` |
| **Blank page** | Wait a few seconds for the server to start, then hard reload (`Ctrl+Shift+R`) |
| **Server won't start** | Check that `node_modules` exists in `server/`. Run `install.sh` or `install.bat` manually |

## Home Assistant

| Problem | Solution |
|---------|----------|
| **"Home Assistant not configured"** | Go to **Inställningar → Home Assistant** and enter your HA URL and access token |
| **Can't connect to HA** | Verify the URL is reachable from the BJORQ server (not just your browser). Try `curl http://homeassistant.local:8123/api/` from the server |
| **Token rejected** | Generate a new [long-lived access token](https://developers.home-assistant.io/docs/auth_api/#long-lived-access-tokens) from your HA profile page |
| **Devices not updating** | Check that entities exist in HA. The entity ID in BJORQ must exactly match the HA entity ID |
| **502 error from HA proxy** | The BJORQ server can't reach HA. Check network connectivity and firewall rules |

## 3D & Graphics

| Problem | Solution |
|---------|----------|
| **Black 3D scene** | Hard reload (`Ctrl+Shift+R`). If persistent, check browser WebGL support |
| **WebGL context lost** | Usually auto-recovers. If not, reload the page. Consider lowering quality settings |
| **Model not loading** | Check file size (< 50 MB recommended). Try re-exporting as GLB from Blender |
| **Model appears invisible** | Check opacity slider in Import settings. Verify the model has materials |
| **Slow/laggy 3D** | Enable **Surfplatteläge** or lower quality to Medium/Låg. Disable shadows |
| **Transparent materials gone** | Update to v0.1.8+. Earlier versions incorrectly reset material transparency |

## Data & Storage

| Problem | Solution |
|---------|----------|
| **Settings not saving** | In HOSTED mode, check that the `data/` folder is writable |
| **Data lost after restart** | You may be in DEV mode (localStorage). Switch to HOSTED mode with the server |
| **Can't restore backup** | Ensure the backup file is valid JSON. Try opening it in a text editor to check |

## Network

| Problem | Solution |
|---------|----------|
| **Can't access from other devices** | The server listens on `0.0.0.0` by default. Check firewall rules on the host |
| **Connection refused on LAN** | Verify the IP address and port. Try `http://<server-ip>:3000` |

## Performance

If the dashboard feels slow:

1. Open **Inställningar → Prestanda**
2. Check the **Belastning** score — if red ("Krävande"), lower settings
3. Enable **Surfplatteläge** for maximum optimization
4. Check the imported model's triangle count — above 500k will cause lag on most devices
5. Disable shadows and postprocessing as a first step
