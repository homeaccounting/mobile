# Mobile — HomeAccounting iOS and Android app
# Usage: just <recipe>

default:
    @just --list

# Install pnpm dependencies
install:
    pnpm install
    @just lockfile-fix

# Rewrite private-registry URLs in pnpm-lock.yaml to public npm (CI uses public npm)
lockfile-fix:
    @sed -E -i.bak 's#https://npm\.dev\.wixpress\.com/(artifactory/)?api/npm/npm-repos/#https://registry.npmjs.org/#g' pnpm-lock.yaml
    @rm -f pnpm-lock.yaml.bak
    @if grep -q wixpress pnpm-lock.yaml; then echo "✗ Lockfile still references wixpress"; exit 1; else echo "✓ Lockfile points at public npm only"; fi

# Start the Metro dev server for an installed dev build
metro-start:
    pnpm start

# Build and launch the dev build on the iOS simulator
ios-run:
    pnpm ios

# One-time Xcode setup after install/update: licence, simulator components, iOS runtime (safe to re-run)
ios-setup:
    ./scripts/ios-setup.sh

# Build and launch the dev build on an Android emulator/device
android-run:
    pnpm android

# Create the Android emulator (first run) from the flake's system image, then start it
android-emulator:
    #!/usr/bin/env sh
    set -eu
    avd=homeaccounting
    if ! avdmanager list avd -c | grep -qx "$avd"; then
        image=$(ls -d "$ANDROID_HOME"/system-images/*/*/* | sort -V | tail -n1)
        echo no | avdmanager create avd -n "$avd" -k "$(echo "${image#"$ANDROID_HOME"/}" | tr / ';')"
    fi
    emulator -avd "$avd"

typecheck:
    pnpm exec tsc --noEmit

lint:
    pnpm exec eslint .

format:
    pnpm exec prettier --write .

format-check:
    pnpm exec prettier --check .

# Type check + lint + format check
check: typecheck lint format-check

test:
    pnpm exec jest

# Expo's project health check (dependency versions, config)
expo-doctor:
    pnpm dlx expo-doctor

# Bundle for iOS and Android without a simulator (catches Metro/resolution errors)
native-verify:
    #!/usr/bin/env sh
    set -eu
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    pnpm exec expo export --platform ios --platform android --output-dir "$out"

clean:
    rm -rf node_modules .expo ios android coverage
