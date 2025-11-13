TODO: use this endpoint to query ASN provider/IP every minutes and on network change: https://ifconfig.co/asn-org https://ifconfig.co/city

# Network Toggle - GNOME Shell Extension

A GNOME Shell extension that provides quick WiFi network switching with visual color indicators. Compatible with Wayland and GNOME Shell versions 46-49.

## Features

- **Top Bar Widget**: Shows current WiFi network with wireless icon (🛜) in the top status bar
- **Color-Coded Networks**: Each network displays in a predefined color for easy identification
- **Hover Dropdown**: Hover over the widget to see a dropdown menu with all configured networks
- **One-Click Toggle**: Left-click to cycle through networks sequentially
- **Click-to-Switch**: Click any network in the dropdown to connect immediately
- **Auto-Update**: Automatically detects network changes and updates the display
- **Configuration Reload**: Automatically reloads network configuration every 30 seconds

## Configuration

The extension reads network configurations from `~/.networks`. Each line should contain:
```
NetworkName:color
```

Example `~/.networks` file:
```
# WiFi networks and their display colors
HomeWiFi:blue
OfficeNetwork:orange
PublicWiFi:red
MobileHotspot:green
CafeWiFi:purple
GuestNetwork:yellow
BackupConnection:cyan
```

- Lines starting with `#` are ignored (comments)
- Any CSS color name or hex value is supported (e.g., blue, #FF5733, rgba(255,0,0,0.5))
- Networks without color configuration default to white

## Installation

### Method 1: Copy Files
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/net-toggle@rob
cp extension.js metadata.json styles.css ~/.local/share/gnome-shell/extensions/net-toggle@rob/
```

### Method 2: Symbolic Link (Development)
```bash
ln -sf $(pwd) ~/.local/share/gnome-shell/extensions/net-toggle@rob
```

## Enabling the Extension

After installation, enable the extension:

```bash
# Enable the extension
gnome-extensions enable net-toggle@rob

# Restart GNOME Shell (X11 only - not needed on Wayland)
# On X11: Alt + F2, type 'r', press Enter
# On Wayland: log out and log back in, or restart session

# Verify it's enabled
gnome-extensions list --enabled | grep net-toggle
```

## Requirements

- GNOME Shell 46, 47, 48, or 49
- NetworkManager (nmcli command)
- Wayland or X11 support

## How It Works

- **Display**: Shows current WiFi network name with wireless icon in configurable color
- **Hover Menu**: Hover to see dropdown with all configured networks in their assigned colors
- **Left Click**: Cycles through networks in order they appear in `~/.networks`
- **Menu Click**: Directly connects to selected network
- **Network Detection**: Uses NetworkManager D-Bus signals to detect network changes
- **Command Execution**: Uses `nmcli con up "NetworkName"` to switch networks

## Troubleshooting

1. **Extension not appearing**: Ensure GNOME Shell version is 46-49 and extension is enabled
2. **Networks not switching**: Verify NetworkManager is running and `nmcli` command works
3. **Colors not showing**: Check `~/.networks` file format and color syntax
4. **Menu not responding**: Try disabling and re-enabling the extension

## Files Structure

- `extension.js` - Main extension logic and UI components
- `metadata.json` - Extension metadata and GNOME Shell version compatibility
- `styles.css` - CSS styling for color themes
- `README.md` - This documentation file
