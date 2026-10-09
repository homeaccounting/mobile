#!/usr/bin/env bash

set -euo pipefail

# One-time iOS setup after installing or updating Xcode: select it, accept the
# licence, install the simulator components and download the iOS runtime.
# Every step checks first, so re-running it is a no-op. Steps that change
# system state prompt for sudo.
# Usage: ./scripts/ios-setup.sh   (or: just ios-setup)

# A stale DEVELOPER_DIR, or a nixpkgs xcbuild xcrun on PATH (e.g. from an old
# apple-sdk shell), hides Xcode: clear the former and call Apple's tools by path.
unset DEVELOPER_DIR SDKROOT
xcode=/Applications/Xcode.app
dev="$xcode/Contents/Developer"
if [ ! -d "$xcode" ]; then
    echo "Xcode not found at $xcode. Install it first, e.g.:"
    echo "  mas install 497799835      # App Store (sign in once)"
    echo "  xcodes install --latest    # Apple ID"
    exit 1
fi
if [ "$(/usr/bin/xcode-select -p 2>/dev/null)" != "$dev" ]; then
    echo "→ selecting $dev"
    sudo /usr/bin/xcode-select -s "$dev"
fi
if ! /usr/bin/xcodebuild -license check >/dev/null 2>&1; then
    echo "→ accepting the Xcode licence"
    sudo /usr/bin/xcodebuild -license accept
fi
if ! /usr/bin/xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then
    echo "→ installing simulator components (~1 min)"
    sudo /usr/bin/xcodebuild -runFirstLaunch
fi
if ! /usr/bin/xcrun simctl list runtimes 2>/dev/null | grep -q '^iOS '; then
    echo "→ downloading the iOS simulator runtime (~8 GB, often 15-30 min)"
    /usr/bin/xcodebuild -downloadPlatform iOS
fi
echo "✓ iOS toolchain ready: $(/usr/bin/xcodebuild -version | head -n1), $(/usr/bin/xcrun simctl list runtimes | grep '^iOS ' | tail -n1 | cut -d' ' -f1-2)"
