# Network Toggler - GNOME Shell Extension

A GNOME Shell extension that provides quick WiFi network switching with geolocation info and visual color indicators. Compatible with Wayland and GNOME Shell versions 46-49.

## Features

- **Geolocation Widget**: Shows country code, ISP provider, IP address (abbreviated IPv6), and current WiFi network
- **Color-Coded Display**: Each element (country, ISP, IP, network) displays in predefined colors for easy identification
- **Smart Dropdown**: First line shows full connection details (non-clickable), followed by clickable network options
- **One-Click Toggle**: Left-click to cycle through networks sequentially
- **Click-to-Switch**: Click any network in the dropdown to connect immediately
- **Real-Time Updates**: Automatically detects network changes via NetworkManager D-Bus and updates geolocation info
- **Configuration Reload**: Automatically reloads configuration on every network change

## Configuration

The extension reads configurations from `~/.networks.yaml` with four sections: networks, countries, IPs, and asn_orgs.

Example `~/.networks.yaml` file:
```yaml
networks:
  HomeWiFi: cyan
  OfficeNetwork: orange
  CafeWiFi: blue
  #DisabledNetwork: red

countries:
  US: orange
  DE: blue
  JP: green

IPs:
  "2001:db8:85a3::8a2e:370:7334": green
  192.168.1.100: yellow

asn_orgs:
  "Example Telecommunications Corp": purple
  "Global Internet Provider Ltd": orange
```

**Configuration Details:**
- **networks**: WiFi networks with their display colors
- **countries**: Country ISO codes (US, DE, JP, etc.) with colors  
- **IPs**: Specific IP addresses with colors (use quotes for IPv6)
- **asn_orgs**: ISP/ASN organization names with colors (use quotes for names with special characters)
- Lines starting with `#` are ignored (comments)
- Any CSS color name is supported (blue, orange, purple, cyan, etc.)
- Elements without color configuration default to white

## Installation

### Method 1: Copy Files
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/network-toggler
cp extension.js metadata.json styles.css ~/.local/share/gnome-shell/extensions/network-toggler/
```

### Method 2: Symbolic Link (Development)
```bash
ln -sf $(pwd) ~/.local/share/gnome-shell/extensions/network-toggler
```

**Note**: After creating the symbolic link, you must log out and log back in for GNOME Shell to detect the extension, then enable it.

## Enabling the Extension

After installation (and logout/login for symbolic link method), enable the extension:

```bash
# Enable the extension
gnome-extensions enable network-toggler

# Restart GNOME Shell (X11 only - not needed on Wayland)
# On X11: Alt + F2, type 'r', press Enter
# On Wayland: log out and log back in (required for new extensions)

# Verify it's enabled
gnome-extensions list --enabled | grep network-toggler
```

## Requirements

- GNOME Shell 46, 47, 48, or 49
- NetworkManager (nmcli command)
- Wayland or X11 support

## How It Works

- **Widget Display**: Shows `Country | ISP | IP | Network` with wireless icon, each element colored per YAML config
- **IPv6 Abbreviation**: Long IPv6 addresses shown as `...last4` in widget (full IP in dropdown)
- **Smart Dropdown**: First line shows full connection details (non-clickable), separator, then clickable networks
- **Left Click**: Cycles through networks in order they appear in YAML networks section
- **Menu Click**: Directly connects to selected network
- **Network Detection**: Uses NetworkManager D-Bus signals to detect network changes
- **Geolocation Updates**: Fetches location data from ifconfig.co/json on network changes
- **Command Execution**: Uses `nmcli con up "NetworkName"` to switch networks

## Troubleshooting

1. **Extension not appearing**: Ensure GNOME Shell version is 46-49 and extension is enabled
2. **Networks not switching**: Verify NetworkManager is running and `nmcli` command works
3. **Colors not showing**: Check `~/.networks.yaml` file format and YAML syntax
4. **Geolocation not updating**: Verify internet connectivity and ifconfig.co accessibility
5. **Menu not responding**: Try disabling and re-enabling the extension
6. **IPv6 parsing issues**: Use quotes around IPv6 addresses in the IPs section

## Files Structure

- `extension.js` - Main extension logic and UI components
- `metadata.json` - Extension metadata and GNOME Shell version compatibility
- `styles.css` - CSS styling for color themes
- `README.md` - This documentation file
