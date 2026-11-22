{ pkgs, ... }:

{
  # https://devenv.sh/languages/javascript/
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_24;
    pnpm = {
      enable = true;
      install.enable = true;
    };
  };

  # See full reference at https://devenv.sh/reference/options/
}
