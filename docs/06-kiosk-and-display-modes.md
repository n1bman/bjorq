# Kiosk & Display Modes

BJORQ is designed to run on wall-mounted displays and kiosks. There are several ways to achieve a clean, full-screen experience.

## App Mode

Launch the browser with the `--app` flag to hide the address bar, tabs, and browser chrome. The dashboard looks like a native application.

### Chrome / Edge (Windows)

```cmd
start chrome --app=http://localhost:3000
```

### Chromium (Linux / Raspberry Pi)

```bash
chromium-browser --app=http://localhost:3000 --start-fullscreen
```

These commands are also available in the dashboard under **Inställningar → Skärm** with a copy button for convenience.

## Browser Fullscreen

Toggle fullscreen directly from the dashboard:

1. Go to **Inställningar → Skärm**
2. Tap **Gå Fullscreen**

Press **ESC** to exit fullscreen.

## OS Kiosk Mode

For a locked-down kiosk where users cannot exit the browser:

### Windows

Use **Settings → Accounts → Assigned Access** to lock the PC to Chrome or Edge showing the dashboard URL.

Exit: `Ctrl+Alt+Del`

### Linux / Raspberry Pi

```bash
chromium-browser --kiosk http://localhost:3000
```

Exit: `Alt+F4`

## Admin Unlock

When running in kiosk or fullscreen mode, you can access exit instructions by **long-pressing the bottom navigation bar for 5 seconds**. This reveals tips for exiting the current display mode.

## Recommended Setup for Wall Tablet

1. Install BJORQ on a Raspberry Pi 4 (4 GB+) or mini-PC
2. Connect a touchscreen display
3. Set up autostart with systemd (see [Installation](./02-installation.md#autostart-linux-systemd))
4. Use Chromium in `--kiosk` or `--app` mode
5. Enable **Surfplatteläge** in Performance settings
6. Enable **Standby** with a 2-minute idle timeout for screen dimming
7. Optionally set the dashboard background to the 3D scene for an always-on smart home view

## Autostart on Boot

See the systemd service example in the [Installation Guide](./02-installation.md#autostart-linux-systemd).

For automatic browser launch, add to your `.bashrc` or use a desktop autostart entry:

```bash
# ~/.config/autostart/bjorq-kiosk.desktop
[Desktop Entry]
Type=Application
Name=BJORQ Dashboard
Exec=chromium-browser --kiosk http://localhost:3000
X-GNOME-Autostart-enabled=true
```
