# Mobile — HomeAccounting iOS and Android app
# Usage: just <recipe>

default:
    @just --list

# Install pnpm dependencies
install:
    pnpm install
    @just lockfile-fix

# Make pnpm-lock.yaml registry-neutral: drop explicit registry tarball URLs (pnpm
# derives them from the configured registry: the org mirror locally, public npm in CI)
lockfile-fix:
    @sed -E -i.bak 's#https://npm\.dev\.wixpress\.com/(artifactory/)?api/npm/npm-repos/#https://registry.npmjs.org/#g; s#, tarball: https://registry\.npmjs\.org/[^}]*##' pnpm-lock.yaml
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
    # -c omits an AVD whose system image is gone (e.g. after an SDK bump); --force recreates it.
    if ! avdmanager list avd -c | grep -qx "$avd"; then
        image=$(ls -d "$ANDROID_HOME"/system-images/*/*/* | sort -V | tail -n1)
        echo no | avdmanager create avd --force -n "$avd" -k "$(echo "${image#"$ANDROID_HOME"/}" | tr / ';')"
        # avdmanager disables the host keyboard.
        sed -i.bak 's/^hw.keyboard=.*/hw.keyboard=yes/' "$HOME/.android/avd/$avd.avd/config.ini"
        rm -f "$HOME/.android/avd/$avd.avd/config.ini.bak"
    fi
    # Host rendering gives the WebView behind Google's sign-in no OpenGL ES and it crashes
    # (Chrome needs ANGLE); SwiftShader provides ANGLE. hw.gpu.mode in config.ini is not honoured.
    emulator -avd "$avd" -gpu swiftshader_indirect

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

# Maestro E2E flows on the booted simulator/emulator, against a local backend with LLM_API_KEY
# set and the dev build running. Android reaches the host at 10.0.2.2: just e2e http://10.0.2.2:8080
e2e server="http://localhost:8080":
    maestro test -e SERVER_URL={{server}} e2e

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
