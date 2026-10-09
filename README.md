# HomeAccounting Mobile

The HomeAccounting iOS and Android app, built with Expo and React Native. It talks to the [HomeAccounting backend](https://github.com/homeaccounting/backend); see [tracker#84](https://github.com/homeaccounting/tracker/issues/84) for the plan.

## Prerequisites

- [Nix](https://nixos.org/). `nix develop` provides Node 22, pnpm 10, `just`, Watchman, CocoaPods, JDK 17 and the Android SDK (platforms 35 and 36, build tools, NDK, emulator and system images). The first run downloads several GB, mostly the Android SDK; later runs are fast.
- Xcode, for iOS only. It can't be packaged in a project shell, so install it system-wide (App Store); the maintainers' machines get it from their Nix system config. After installing or updating it, run `just ios-setup` (selects Xcode, accepts the licence, installs simulator components and the iOS runtime; safe to re-run).

### Installing the prerequisites from the command line

```bash
# Nix, with flakes enabled (Determinate Systems installer; the official
# nixos.org installer also works, then add
# `experimental-features = nix-command flakes` to ~/.config/nix/nix.conf)
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install

# Xcode (iOS only), without the App Store UI. mas needs you signed into the
# App Store once; xcodes asks for an Apple ID instead.
brew install mas && mas install 497799835          # or: brew install xcodes && xcodes install --latest

# Optional: load the dev shell automatically on cd
direnv allow
```

## Quick start

```bash
nix develop            # or rely on direnv
just install
just ios-setup         # once per Xcode install/update (iOS only)
just ios-run           # iOS simulator
# Android: start an emulator first, then build in another shell
just android-emulator
just android-run
```

The first `just ios-run` / `just android-run` compiles the native project and takes several minutes; after that, JS changes reload instantly.

The app runs as a dev build, not in Expo Go. Run `just --list` to see every recipe.

## Licence

[AGPL-3.0](LICENSE). Contributions require signing the [CLA](CLA.md); see [CONTRIBUTING.md](CONTRIBUTING.md).
