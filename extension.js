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

function loadNetworkConfigs() {
    try {
        let [ok, data] = GLib.file_get_contents('/home/rob/.networks');
        if (ok) {
            networkConfigs.clear();
            networkNames = [];
            new TextDecoder().decode(data).trim().split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    let [name, color] = line.split(':');
                    if (name && color) {
                        networkConfigs.set(name, color.trim());
                        networkNames.push(name);
                    }
                }
            });
        }
    } catch (e) {}
}

const NetworkToggle = GObject.registerClass(
class NetworkToggle extends PanelMenu.Button {
    _init() {
        super._init(0.0, "Network Toggle", false); // false = don't create default menu

        loadNetworkConfigs();
        
        this.label = new St.Label({
            text: "WiFi",
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this.label);

        this.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) { // Left click only
                this._toggleNetwork();
                this.menu.close(); // Close menu after network toggle
            }
            return true; // Always consume events to prevent default menu behavior
        });
        
        // Show menu on hover
        this.connect('enter-event', () => {
            this._clearCloseTimer();
            this.menu.open();
            this._startHoverCheck();
        });
        
        this.connect('leave-event', () => {
            this._startHoverCheck();
        });

        this._lastKnownNetwork = networkNames[0] || "WiFi";
        this._updateLabel();
        this._createMenu();
        
        // Watch for network changes via D-Bus
        this._setupNetworkWatcher();
        
        // Reload config every 30 seconds
        this._configTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
            loadNetworkConfigs();
            this._updateMenu();
            return true;
        });
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
                }
            });
            
            // Also watch for device state changes
            this._deviceProxy = Gio.DBusProxy.new_for_bus_sync(
                Gio.BusType.SYSTEM,
                Gio.DBusProxyFlags.NONE,
                null,
                'org.freedesktop.NetworkManager',
                '/org/freedesktop/NetworkManager',
                'org.freedesktop.NetworkManager',
                null
            );
            
            this._deviceStateId = this._deviceProxy.connect('g-signal', (proxy, sender, signal, params) => {
                if (signal === 'DeviceAdded' || signal === 'DeviceRemoved') {
                    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
                        this._updateLabel();
                        return false;
                    });
                }
            });
            
        } catch (e) {
            console.log('NetworkManager D-Bus setup failed:', e);
        }
    }

    _clearCloseTimer() {
        if (this._closeTimer) {
            GLib.source_remove(this._closeTimer);
            this._closeTimer = null;
        }
    }

    _startHoverCheck() {
        this._clearCloseTimer();
        this._closeTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
            if (!this._isMouseOverWidget()) {
                this.menu.close();
                this._closeTimer = null;
                return false;
            }
            return true; // Keep checking
        });
    }

    _isMouseOverWidget() {
        let [x, y] = global.get_pointer();
        
        // Check if over button
        let [buttonX, buttonY] = this.get_transformed_position();
        let [buttonW, buttonH] = this.get_transformed_size();
        if (x >= buttonX && x <= buttonX + buttonW && y >= buttonY && y <= buttonY + buttonH) {
            return true;
        }
        
        // Check if over menu
        if (this.menu.isOpen) {
            let menuActor = this.menu.actor;
            let [menuX, menuY] = menuActor.get_transformed_position();
            let [menuW, menuH] = menuActor.get_transformed_size();
            if (x >= menuX && x <= menuX + menuW && y >= menuY && y <= menuY + menuH) {
                return true;
            }
        }
        
        return false;
    }

    _createMenu() {
        this.menu.removeAll();
        
        for (let network of networkNames) {
            let item = new PopupMenu.PopupMenuItem(network);
            let color = networkConfigs.get(network) || "white";
            item.label.set_style(`color: ${color};`);
            
            item.connect('activate', () => {
                this._switchToNetwork(network);
            });
            
            this.menu.addMenuItem(item);
        }
    }

    _updateMenu() {
        this._createMenu();
    }

    _switchToNetwork(network) {
        this._lastKnownNetwork = network;
        GLib.spawn_command_line_async(`nmcli con up "${network}"`);
        this._updateLabel();
        this.menu.close(); // Close menu after selection
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
            this._updateLabel();
            return false;
        });
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

    _toggleNetwork() {
        let current = this._getCurrentNetwork();
        let nextIndex = (networkNames.indexOf(current) + 1) % networkNames.length;
        let target = networkNames[nextIndex] || networkNames[0];
        
        this._lastKnownNetwork = target;
        GLib.spawn_command_line_async(`nmcli con up "${target}"`);
        this._updateLabel();
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => (this._updateLabel(), false));
    }

    _updateLabel() {
        let current = this._getCurrentNetwork();
        let color = networkConfigs.get(current) || "white";
        let textPart = current || "WiFi";
        
        // Use wireless symbol with half transparency
        let markup = `<span alpha="50%">🛜</span> ${textPart}`;
        this.label.clutter_text.set_markup(markup);
        this.label.set_style(`font-weight: bold; color: ${color};`);
    }

    destroy() {
        this._configTimer && GLib.source_remove(this._configTimer);
        this._closeTimer && GLib.source_remove(this._closeTimer);
        
        if (this._nmProxy && this._stateChangedId) {
            this._nmProxy.disconnect(this._stateChangedId);
        }
        if (this._deviceProxy && this._deviceStateId) {
            this._deviceProxy.disconnect(this._deviceStateId);
        }
        
        this._nmProxy = null;
        this._deviceProxy = null;
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

