# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GNOME Shell extension that provides quick WiFi network switching with visual color indicators. The extension adds a widget to the top status bar showing the current network and allows cycling through predefined networks via clicks or hover menus.

## Key Commands

### Installation & Development
```bash
# Install extension (development mode with symbolic link)
./install.sh

# Manual installation
mkdir -p ~/.local/share/gnome-shell/extensions/network-toggler
cp extension.js metadata.json styles.css ~/.local/share/gnome-shell/extensions/network-toggler/

# Enable/disable extension
gnome-extensions enable network-toggler
gnome-extensions disable network-toggler

# Check extension status
gnome-extensions list --enabled | grep network-toggler
```

### Network Management
```bash
# View available WiFi networks
nmcli dev wifi

# Connect to specific network
nmcli con up "NetworkName"

# Check current WiFi connection
nmcli -t -f active,ssid dev wifi
```

## Architecture

### Core Components
- **NetworkToggle Class**: Main extension widget extending PanelMenu.Button
- **Configuration System**: Reads from `toggler.config.yaml` file with network:color mappings
- **D-Bus Integration**: Monitors NetworkManager for network state changes
- **Hover Menu System**: Custom timer-based hover detection for menu display

### Key Files
- `extension.js` - Main extension logic, UI components, and network management
- `metadata.json` - Extension metadata and GNOME Shell version compatibility (46-49)
- `styles.css` - CSS color definitions for network indicators
- `toggler.config.yaml` - User configuration file with YAML format

### Network Configuration Format
```yaml
# toggler.config.yaml file format
networks:
  HomeWiFi: blue
  OfficeNetwork: orange

countries:
  US: green
  DE: blue

IPs:
  "192.168.1.100": yellow

asn_orgs:
  "Example ISP": purple
```

## Extension Behavior

### UI Components
- Top bar shows: `🛜 NetworkName` with wireless icon and network-specific color
- Hover reveals dropdown menu with all configured networks
- Left-click cycles through networks sequentially
- Menu item clicks switch directly to selected network

### State Management
- Auto-reloads configuration every 30 seconds
- Monitors NetworkManager D-Bus signals for network changes
- Maintains last known network state as fallback
- Updates display with 500ms delay after network events

### Error Handling
- Graceful degradation when NetworkManager unavailable
- Silent failure handling for configuration file issues
- Fallback to default colors and network names

## Development Notes

- Extension targets GNOME Shell 46-49 with Wayland/X11 compatibility
- Uses modern GNOME Shell extension architecture (ES6 modules)
- Configuration file `toggler.config.yaml` is now read from extension directory
- D-Bus proxy setup includes both StateChanged and DeviceAdded/Removed events
- Custom hover detection prevents menu flickering on mouse movement

## User Shortcuts

- **"loai"** = logged out and logged in (user shorthand for GNOME Shell restart)

## Debugging Strategy for GNOME Shell Extensions

When extension features break or don't work:

### Key Approach
1. **Start with minimal working version**: Begin with simplest possible extension that works (widget with hardcoded menu items)
2. **Incremental feature addition**: Add ONE feature at a time and test after each addition
3. **Isolate problems**: Separate file reading issues from menu functionality issues  
4. **Use hardcoded fallbacks**: When file reading fails, hardcode expected values to test if rest of logic works
5. **Build up gradually**: Only move to next feature once current one works perfectly

### Technical Points
- GNOME Shell extension menu functionality breaks easily when too many changes made at once
- File reading in GNOME Shell context may fail silently - always provide fallbacks
- D-Bus network monitoring requires proper cleanup in destroy() method
- Use `nmcli -t -f active,ssid dev wifi` to detect current network
- Update widgets both immediately and with delays (2+ seconds) after network switches

### Lesson Learned
Incremental approach saves projects when "migrate everything at once" approach fails completely.

## UI State Management Best Practice

**Principle**: Count on real changes rather than assume a button/action works

**Implementation**:
- Don't update UI immediately when user clicks an action button
- Only update UI when the actual system state change is detected
- Use system monitoring (D-Bus, file watchers, etc.) to drive UI updates
- Let the real state change trigger the UI update, not the user action

**Benefits**:
- Authentic user feedback - UI reflects reality, not assumptions
- User sees if their action actually succeeded or failed
- UI stays truthful even if commands fail silently
- Better debugging - UI problems indicate real system issues

**Example**: Network switcher only updates label when NetworkManager D-Bus signals detect actual network change, not when user clicks network in menu.