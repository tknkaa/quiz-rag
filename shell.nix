{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  buildInputs = with pkgs; [
    uv
    stdenv.cc.cc.lib
    cacert
  ];
  LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
}
