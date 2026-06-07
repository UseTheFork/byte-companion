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
                version = "0.0.1";
                src = self;
                nativeBuildInputs = [ pkgs.nodejs ];
                buildPhase = ''
                  export HOME=$TMPDIR
                  npm ci
                  npm run compile
                '';
                installPhase = ''
                  mkdir -p $out/share/vscode/extensions/UseTheFork.byte-companion
                  cp -r out package.json $out/share/vscode/extensions/UseTheFork.byte-companion/
                  if [ -d node_modules ]; then
                    cp -r node_modules $out/share/vscode/extensions/UseTheFork.byte-companion/
                  fi
                '';
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
