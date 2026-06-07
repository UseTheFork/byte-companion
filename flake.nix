{
  inputs = {
    systems.url = "github:nix-systems/default-linux";
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    byte.url = "/home/sincore/source/byte";
  };

  outputs =
    inputs@{
      flake-parts,
      nixpkgs,
      ...
    }:
    flake-parts.lib.mkFlake
      {
        inherit inputs;
      }
      (
        {
          withSystem,
          flake-parts-lib,
          inputs,
          self,
          ...
        }:
        {
          systems = import inputs.systems;
          perSystem =
            {
              pkgs,
              inputs',
              self',
              ...
            }:
            {
              packages.byte-companion = pkgs.stdenv.mkDerivation {
                pname = "byte-companion";
                version = "2026.6.7";
                src = pkgs.fetchurl {
                  url = "https://github.com/UseTheFork/byte-companion/releases/download/v2026.6.7/byte-companion-2026.6.7.vsix";
                  sha256 = "sha256-f4vLSNGf0gASdiZQgfC4HlGZE5EEawIol+rUy6sSz0M=";
                };

                dontUnpack = true;

                vscodeExtPublisher = "use-the-fork";
                vscodeExtName = "byte-companion";
                vscodeExtUniqueId = "use-the-fork.byte-companion";

              };

              packages.default = self'.packages.byte-companion;

              devShells.default = pkgs.mkShellNoCC {
                name = "nix";

                # Tell Direnv to shut up.
                DIRENV_LOG_FORMAT = "";

                packages = [
                  # Packages from nixpkgs, for Nix, Flakes or local tools.

                  pkgs.pre-commit # Git Hooks
                  pkgs.just # Command Runner
                  pkgs.process-compose # Process Orchestration

                  # Langauges
                  pkgs.nodejs

                  # Tools / Formaters Linters etc
                  pkgs.alejandra # Nix
                  pkgs.yamlfmt # YAML
                  pkgs.keep-sorted # General Sorting tool

                  inputs'.byte.packages.default
                ];
              };
            };
        }
      );
}
