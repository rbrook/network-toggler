#!/bin/bash

# Network Toggler GNOME Extension Installation Script
# Creates a symbolic link for development

set -e

EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions"
EXTENSION_NAME="network-toggler"
TARGET_DIR="$EXTENSION_DIR/$EXTENSION_NAME"

echo "Installing Network Toggler GNOME Extension..."

# Create extensions directory if it doesn't exist
mkdir -p "$EXTENSION_DIR"

# Remove existing installation if present
if [ -L "$TARGET_DIR" ] || [ -d "$TARGET_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$TARGET_DIR"
fi

# Create symbolic link
echo "Creating symbolic link..."
ln -sf "$(pwd)" "$TARGET_DIR"

# Enable the extension
echo "Enabling extension..."
gnome-extensions enable "$EXTENSION_NAME"

echo "Extension installed and enabled successfully!"
echo "On Wayland systems, you may need to log out and log back in for the extension to fully take effect."