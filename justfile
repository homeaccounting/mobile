# Mobile — HomeAccounting iOS and Android app
# Usage: just <recipe>

default:
    @just --list

# Install pnpm dependencies
install:
    pnpm install
    @just lockfile-fix

# Rewrite private-registry tarball URLs in pnpm-lock.yaml to public npm (CI
# can only reach public npm; hashes match either mirror).
lockfile-fix:
    @sed -i.bak 's|https://npm.dev.wixpress.com/\(artifactory/\)\?api/npm/npm-repos/|https://registry.npmjs.org/|g' pnpm-lock.yaml
    @rm -f pnpm-lock.yaml.bak
    @if grep -q wixpress pnpm-lock.yaml; then echo "✗ Lockfile still references wixpress"; exit 1; else echo "✓ Lockfile points at public npm only"; fi

# Start the Metro dev server for an installed dev build
run:
    pnpm start

# Build and launch the dev build on the iOS simulator
ios:
    pnpm ios

# Build and launch the dev build on an Android emulator/device
android:
    pnpm android

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
doctor:
    pnpm exec expo-doctor

# Bundle for iOS and Android without a simulator (catches Metro/resolution errors)
verify-native:
    #!/usr/bin/env sh
    set -eu
    out=$(mktemp -d)
    trap 'rm -rf "$out"' EXIT
    pnpm exec expo export --platform ios --platform android --output-dir "$out"

clean:
    rm -rf node_modules .expo ios android coverage
