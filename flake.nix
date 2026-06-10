{
  description = "Environnement natif Nix pour Expense Report Creator";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
  let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
    Python = pkgs.python312.withPackages (ps: with ps; [
      fastapi[standard]
      uvicorn
      python-multipart
      jinja2
      pillow
      pydantic
      pypdf
      pyjwt

      # Outils de développement
      black
      flake8
      isort
    ]);
  in {
    devShells.${system} = {
      default = pkgs.mkShell {
        packages = with pkgs; [
          Python
          tectonic
          pre-commit
        ];
      };
    };
  };
}
