import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';

let networkConfigs = new Map();
let networkNames = [];
let countryConfigs = new Map();
let ipConfigs = new Map();
let asnOrgConfigs = new Map();
let currentCountryCode = "";
let currentIP = "";
let currentAsnOrg = "";

function fetchLocationInfo() {
    console.log('Fetching location info...');
    try {
        let [ok, out] = GLib.spawn_command_line_sync('curl -s ifconfig.co/json');
        if (ok) {
            let jsonData = JSON.parse(out.toString().trim());
            let newCountry = jsonData.country_iso || "";
            let newIP = jsonData.ip || "";
            let newAsnOrg = jsonData.asn_org || "";
            
            console.log(`Location update: ${currentCountryCode}->${newCountry}, ${currentIP}->${newIP}, ${currentAsnOrg}->${newAsnOrg}`);
            
            currentCountryCode = newCountry;
            currentIP = newIP;
            currentAsnOrg = newAsnOrg;
            return true;
        }
    } catch (e) {
        console.log('Location info fetch failed:', e);
    }
    return false;
}

function loadNetworkConfigs() {
    console.log('Loading network configs from ~/.networks.yaml');
    try {
        let filePath = GLib.get_home_dir() + '/.networks.yaml';
        console.log(`Attempting to read: ${filePath}`);
        let file = Gio.File.new_for_path(filePath);
        let [ok, data] = file.load_contents(null);
        console.log('File read result:', ok);
        if (ok) {
            networkConfigs.clear();
            networkNames = [];
            countryConfigs.clear();
            ipConfigs.clear();
            asnOrgConfigs.clear();
            
            let content = new TextDecoder().decode(data).trim();
            let lines = content.split('\n');
            let currentSection = null;
            
            lines.forEach(line => {
                let originalLine = line;
                line = line.trim();
                
                if (!line || line.startsWith('#') || originalLine.trim().startsWith('#')) {
                    return;
                }
                
                // Check for section headers (case insensitive)
                let lowerLine = line.toLowerCase();
                if (lowerLine === 'networks:') {
                    currentSection = 'networks';
                    return;
                } else if (lowerLine === 'countries:') {
                    currentSection = 'countries';
                    return;
                } else if (lowerLine === 'ips:') {
                    currentSection = 'ips';
                    return;
                } else if (lowerLine === 'asn_orgs:') {
                    currentSection = 'asn_orgs';
                    return;
                }
                
                // Parse entries (must be indented and in a valid section)
                if (currentSection && originalLine.startsWith(' ')) {
                    let cleanLine = line.replace(/^\s+/, '');
                    // Handle quoted keys (for IPv6 addresses with colons)
                    let colonIndex = -1;
                    let inQuotes = false;
                    for (let i = 0; i < cleanLine.length; i++) {
                        if (cleanLine[i] === '"') {
                            inQuotes = !inQuotes;
                        } else if (cleanLine[i] === ':' && !inQuotes) {
                            colonIndex = i;
                            break;
                        }
                    }
                    
                    if (colonIndex > 0) {
                        let name = cleanLine.substring(0, colonIndex).trim();
                        let color = cleanLine.substring(colonIndex + 1).trim();
                        
                        // Remove surrounding quotes from name if present
                        if (name.startsWith('"') && name.endsWith('"')) {
                            name = name.slice(1, -1);
                        }
                        
                        if (name && color) {
                            if (currentSection === 'networks') {
                                networkConfigs.set(name, color);
                                networkNames.push(name);
                                console.log(`Loaded network: ${name} -> ${color}`);
                            } else if (currentSection === 'countries') {
                                countryConfigs.set(name, color);
                                console.log(`Loaded country: ${name} -> ${color}`);
                            } else if (currentSection === 'ips') {
                                ipConfigs.set(name, color);
                                console.log(`Loaded IP: ${name} -> ${color}`);
                            } else if (currentSection === 'asn_orgs') {
                                asnOrgConfigs.set(name, color);
                                console.log(`Loaded ASN Org: ${name} -> ${color}`);
                            }
                        }
                    }
                } else if (currentSection && !line.startsWith(' ')) {
                    currentSection = null;
                }
            });
        }
    } catch (e) {
        console.log('YAML loading failed:', e);
    }
    
    console.log(`Config loading complete. Networks: ${networkNames.length}, Countries: ${countryConfigs.size}, IPs: ${ipConfigs.size}`);
    
    // Simple debug - change test label to show loaded count
    global.networkCount = networkNames.length;
}

const NetworkToggle = GObject.registerClass(
class NetworkToggle extends PanelMenu.Button {
    _init() {
        super._init(0.0, "Network Toggle");

        loadNetworkConfigs();

        this.label = new St.Label({
            text: "🛜 WiFi",
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this.label);

        this._lastKnownNetwork = "WiFi";
        
        // Initial location fetch
        fetchLocationInfo();
        
        this._updateLabel();
        this._createMenu();
        
        // Watch for network changes via D-Bus
        this._setupNetworkWatcher();
    }
    
    _getCurrentNetwork() {
        try {
            let [ok, out] = GLib.spawn_command_line_sync('nmcli -t -f active,ssid dev wifi');
            if (ok) {
                let activeLine = out.toString().split('\n').find(line => line.startsWith('yes:'));
                if (activeLine) {
                    let network = activeLine.substring(4).trim();
                    this._lastKnownNetwork = network;
                    return network;
                }
            }
        } catch (e) {}
        return this._lastKnownNetwork;
    }
    
    _updateLabel() {
        let current = this._getCurrentNetwork();
        let networkColor = networkConfigs.get(current) || "white";
        let textPart = current || "WiFi";
        
        // Build location part with individual colors
        let locationPart = "";
        if (currentCountryCode && currentAsnOrg && currentIP) {
            let countryColor = countryConfigs.get(currentCountryCode) || "white";
            let asnOrgColor = asnOrgConfigs.get(currentAsnOrg) || "white";
            let ipColor = ipConfigs.get(currentIP) || "white";
            let asnOrgFirstWord = currentAsnOrg.split(/[\s-]+/)[0];
            
            // Abbreviate IPv6 addresses for the widget display only
            let displayIP = currentIP;
            if (currentIP.includes(':') && currentIP.length > 15) {
                let lastPart = currentIP.split(':').pop();
                displayIP = `...${lastPart}`;
            }
            
            locationPart = `<span color="${countryColor}">${currentCountryCode}</span> | <span color="${asnOrgColor}">${asnOrgFirstWord}</span> | <span color="${ipColor}">${displayIP}</span> `;
        } else if (currentCountryCode && currentIP) {
            let countryColor = countryConfigs.get(currentCountryCode) || "white";
            let ipColor = ipConfigs.get(currentIP) || "white";
            
            // Abbreviate IPv6 addresses for the widget display only
            let displayIP = currentIP;
            if (currentIP.includes(':') && currentIP.length > 15) {
                let lastPart = currentIP.split(':').pop();
                displayIP = `...${lastPart}`;
            }
            
            locationPart = `<span color="${countryColor}">${currentCountryCode}</span> | <span color="${ipColor}">${displayIP}</span> `;
        } else if (currentCountryCode) {
            let countryColor = countryConfigs.get(currentCountryCode) || "white";
            locationPart = `<span color="${countryColor}">${currentCountryCode}</span> `;
        } else if (currentIP) {
            let ipColor = ipConfigs.get(currentIP) || "white";
            
            // Abbreviate IPv6 addresses for the widget display only
            let displayIP = currentIP;
            if (currentIP.includes(':') && currentIP.length > 15) {
                let lastPart = currentIP.split(':').pop();
                displayIP = `...${lastPart}`;
            }
            
            locationPart = `<span color="${ipColor}">${displayIP}</span> `;
        }
        
        let markup = `${locationPart}<span alpha="50%">🛜</span> <span color="${networkColor}">${textPart}</span>`;
        this.label.clutter_text.set_markup(markup);
        this.label.set_style(`font-weight: bold;`);
    }
    
    _getFullConnectionInfo() {
        let current = this._getCurrentNetwork();
        let parts = [];
        
        if (currentCountryCode) parts.push(currentCountryCode);
        if (currentAsnOrg) parts.push(currentAsnOrg);
        if (currentIP) parts.push(currentIP);
        parts.push(current || "WiFi");
        
        return parts.join(' • ');
    }
    
    _setupNetworkWatcher() {
        try {
            this._nmProxy = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SYSTEM,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.freedesktop.NetworkManager',
                '/org/freedesktop/NetworkManager',
                'org.freedesktop.NetworkManager',
                null
            );
            
            this._stateChangedId = this._nmProxy.connect('g-signal', (proxy, sender, signal, params) => {
                if (signal === 'StateChanged') {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                        this._updateLabel();
                        return false;
                    });
                    // Reload configuration and fetch new location info after network change
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
                        console.log('Network changed - reloading configuration');
                        loadNetworkConfigs();
                        this._createMenu(); // Update menu with new config
                        fetchLocationInfo();
                        this._updateLabel();
                        return false;
                    });
                }
            });
        } catch (e) {
            // Silent fallback if NetworkManager unavailable
        }
    }
    
    _createMenu() {
        this.menu.removeAll();
        
        // Add connection info as first non-clickable item
        let connectionInfo = this._getFullConnectionInfo();
        let infoItem = new PopupMenu.PopupMenuItem(connectionInfo);
        infoItem.label.set_style(`color: lightgray; font-size: 14px; font-weight: normal;`);
        infoItem.setSensitive(false);
        this.menu.addMenuItem(infoItem);
        
        if (networkNames.length === 0) {
            // No networks configured - show informational message
            let item = new PopupMenu.PopupMenuItem("No networks configured");
            item.label.set_style(`color: gray; font-style: italic;`);
            item.setSensitive(false); // Make it unclickable
            this.menu.addMenuItem(item);
            return;
        }
        
        // Add separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        
        for (let network of networkNames) {
            let item = new PopupMenu.PopupMenuItem(network);
            let color = networkConfigs.get(network) || "white";
            item.label.set_style(`color: ${color}; font-size: 16px; font-weight: bold;`);
            
            item.connect('activate', () => {
                this._switchToNetwork(network);
            });
            
            this.menu.addMenuItem(item);
        }
    }
    
    _switchToNetwork(network) {
        GLib.spawn_command_line_async(`nmcli con up "${network}"`);
        this.menu.close();
        // Let D-Bus monitoring handle the label update when network actually changes
    }
    
    destroy() {
        if (this._nmProxy && this._stateChangedId) {
            this._nmProxy.disconnect(this._stateChangedId);
        }
        this._nmProxy = null;
        super.destroy();
    }
});

export default class NetToggleExtension extends Extension {
    enable() {
        this.networkToggle = new NetworkToggle();
        Main.panel.addToStatusArea('net-toggle', this.networkToggle, 1, 'right');
    }

    disable() {
        this.networkToggle?.destroy();
        this.networkToggle = null;
    }
}