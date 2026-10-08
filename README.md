# HomeAccounting Mobile

The HomeAccounting iOS and Android app, built with Expo and React Native. It talks to the [HomeAccounting backend](https://github.com/homeaccounting/backend); see [tracker#84](https://github.com/homeaccounting/tracker/issues/84) for the plan.

## Prerequisites

- [Nix](https://nixos.org/) (provides Node 22, pnpm 10 and `just`), or Node 22 + pnpm 10 + `just` installed manually
- Xcode (iOS) and/or the Android SDK (Android)

## Quick start

```bash
nix develop     # or rely on direnv
just install
just ios        # or: just android
```

The app runs as a dev build, not in Expo Go. Run `just --list` to see every recipe.

## Licence

[AGPL-3.0](LICENSE). Contributions require signing the [CLA](CLA.md); see [CONTRIBUTING.md](CONTRIBUTING.md).
