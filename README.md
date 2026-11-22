# vite-plugin-tailscale-serve

Make your Vite dev server available to your [tailnet](https://tailscale.com/kb/1136/tailnet) over HTTPS, using [`tailscale serve`](https://tailscale.com/kb/1312/serve).

The tailnet port matches the port Vite actually bound. If 3000 is taken and Vite falls back to 3001, the server is available at `https://<machine>.<tailnet>.ts.net:3001`. This means several dev servers can run at once, for example one per git worktree, and each one gets its own HTTPS address. Vite itself stays on `localhost`, so it isn't reachable from your local network.

```
  ➜  Tailnet: https://my-laptop.tail1234.ts.net:3001/
  ➜  Local:   http://localhost:3001/
```

## Install

```sh
npm install -D vite-plugin-tailscale-serve
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailscaleServe from "vite-plugin-tailscale-serve";

export default defineConfig({
  plugins: [tailscaleServe()],
});
```

## Requirements

- Tailscale is installed and connected.
- [MagicDNS and HTTPS certificates](https://tailscale.com/kb/1153/enabling-https) are enabled for your tailnet.
- Your user can run `tailscale serve` without root. On Linux, set this up once with `sudo tailscale set --operator=$USER`.

If Tailscale isn't available, the plugin logs a warning and the dev server starts normally.

## How it works

- The plugin runs only in `vite dev`, not in `vite build` or `vite preview`.
- Once the server is listening, it runs `tailscale serve --https=<port> http://localhost:<port>` in the foreground. That command stops when the dev server closes, and Tailscale then removes the serve config. Other `tailscale serve` configs you have, such as one on port 443, are left alone.
- It adds `.ts.net` to [`server.allowedHosts`](https://vite.dev/config/server-options#server-allowedhosts), so Vite accepts the proxied requests.

If the dev server is killed with `SIGKILL`, its `tailscale serve` process is left running and has to be stopped by hand.

## License

MIT
