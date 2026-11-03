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
e2e server="http://localhost:8080" *args="":
    maestro test {{args}} -e SERVER_URL={{server}} e2e

# Fake OpenAI-compatible LLM answering the E2E prompt; set the backend's LLM_BASE_URL to http://<host>:<port>/v1
e2e-fake-llm port="8090":
    PORT={{port}} node e2e/fake-llm.js

# Debug APK of the dev build, without a device (CI's E2E job installs it on its emulator)
android-build-apk:
    pnpm exec expo prebuild --platform android --no-install
    cd android && ./gradlew assembleDebug

# Hash of the native code for an EAS build profile; builds and OTA updates match on it
eas-fingerprint profile="preview" platform="android":
    @pnpm exec eas fingerprint:generate --platform {{platform}} --build-profile {{profile}} --json --non-interactive | node -p 'JSON.parse(require("fs").readFileSync(0)).hash'

# Start an EAS cloud build (returns once queued; the link is printed and on expo.dev)
eas-build profile="preview" platform="android":
    pnpm exec eas build --profile {{profile}} --platform {{platform}} --non-interactive --no-wait

# Publish the current JS as an OTA update; it reaches builds with the same fingerprint
eas-update channel="preview" platform="android":
    pnpm exec eas update --channel {{channel}} --platform {{platform}} --auto --non-interactive

# Run by CI on merge to master: a preview build if no build has this native fingerprint, else an OTA update
eas-release-preview:
    #!/usr/bin/env sh
    set -eu
    hash=$(just eas-fingerprint preview android)
    builds=$(pnpm exec eas build:list --platform android --build-profile preview --fingerprint-hash "$hash" --limit 10 --json --non-interactive)
    usable=$(echo "$builds" | node -p 'JSON.parse(require("fs").readFileSync(0)).filter(b => !["ERRORED", "CANCELED"].includes(b.status)).length')
    if [ "$usable" -gt 0 ]; then
        echo "A preview build has fingerprint $hash: publishing an OTA update"
        just eas-update preview android
    else
        echo "No preview build has fingerprint $hash: starting one"
        just eas-build preview android
    fi

# Signing keys EAS holds for the app (interactive), e.g. to read the SHA-1 for Google sign-in
eas-credentials platform="android":
    pnpm exec eas credentials --platform {{platform}}

# Expo's project health check (dependency versions, config)
expo-doctor:
    pnpm dlx expo-doctor

# Release JS bundles for iOS and Android without a simulator (catches Metro/resolution errors).
# Runs the CLI with plain node and no NODE_PATH, as Gradle and Xcode do: `pnpm exec` sets NODE_PATH,
# which hides packages missing from the project's node_modules.
native-verify:
    #!/usr/bin/env sh
    set -eu
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    cli=$(node -p "require.resolve('@expo/cli', {paths: [require.resolve('expo/package.json')]})")
    for platform in ios android; do
        mkdir -p "$out/$platform"
        env -u NODE_PATH NODE_ENV=production node "$cli" export:embed --platform "$platform" --dev false \
            --entry-file node_modules/expo-router/entry.js \
            --bundle-output "$out/$platform/index.bundle" --assets-dest "$out/$platform"
    done

clean:
    rm -rf node_modules .expo ios android coverage
