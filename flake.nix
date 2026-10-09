{
  description = "Mobile — HomeAccounting iOS and Android app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config = {
            # The Android SDK is unfree and gated behind its licence.
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
        inherit (pkgs) lib stdenv;

        # The SDK lives in the read-only store, so Gradle cannot download what is
        # missing: list every version the build asks for. 35 is Expo's app-level
        # default (expo-modules-autolinking ExpoRootProjectPlugin.kt); 36 is React
        # Native's (react-native/gradle/libs.versions.toml, ReactAndroid's CMake).
        # Bump together with the Expo SDK.
        android = pkgs.androidenv.composeAndroidPackages {
          platformVersions = [
            "35"
            "36"
          ];
          buildToolsVersions = [
            "35.0.0"
            "36.0.0"
          ];
          # Google re-published platform-tools r37.0.0 under the same URL, so the
          # pinned nixpkgs hash no longer matches. Only adb comes from here.
          platformToolsVersion = "36.0.2";
          includeNDK = true;
          ndkVersions = [ "27.1.12297006" ];
          # 3.30.5 for React Native itself; 3.22.1 is AGP's default for native
          # modules that don't pin one (e.g. react-native-screens).
          cmakeVersions = [
            "3.22.1"
            "3.30.5"
          ];
          includeEmulator = true;
          includeSystemImages = true;
          systemImageTypes = [ "google_apis" ];
          abiVersions = [ (if stdenv.hostPlatform.isAarch64 then "arm64-v8a" else "x86_64") ];
        };
        androidSdk = android.androidsdk;

        devDependencies = with pkgs; [
          nodejs_22
          pnpm
          just
          watchman
          # React Native's Android Gradle plugin needs JDK 17+.
          jdk17
          androidSdk
        ] ++ lib.optionals stdenv.isDarwin [
          # Xcode itself comes from the system config (App Store); it cannot be
          # packaged in a project shell.
          cocoapods
        ];
      in {
        # NoCC: nothing is compiled by the shell itself, and the darwin cc
        # wrapper would export DEVELOPER_DIR/SDKROOT for nixpkgs' apple-sdk,
        # hiding Xcode from xcodebuild/simctl.
        devShells.default = pkgs.mkShellNoCC {
          buildInputs = devDependencies;
          JAVA_HOME = pkgs.jdk17.home;
          ANDROID_HOME = "${androidSdk}/libexec/android-sdk";
          shellHook = ''
            echo "💰 HomeAccounting Mobile Development Environment"
            echo "📦 Node version: $(node --version)"
            echo "📦 pnpm version: $(pnpm --version)"
            echo "🔧 Quick Commands (using just):"
            echo "  • just --list      - Show all available commands"
            echo "  • just install     - Install dependencies"
            echo "  • just run         - Start dev client server"
            echo "  • just ios         - Run on iOS"
            echo "  • just android     - Run on Android"
            echo "  • just emulator    - Create (if needed) and start the Android emulator"
            echo "  • just test        - Run tests"
            echo "  • just check       - typecheck + lint + format-check"
            echo "  • just verify-native - export iOS/Android bundles (no simulator)"
            echo ""
            echo "🚀 Get started: just install && just ios"
          '';
        };
      });
}
