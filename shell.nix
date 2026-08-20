{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_24
  ];

  shellHook = ''
    echo "=========================================="
    echo "0.0.1"
    echo "Launch "node index.js""
    echo "=========================================="
  '';
}
