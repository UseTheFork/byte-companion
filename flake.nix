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
            { pkgs, inputs', ... }:
            {
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
