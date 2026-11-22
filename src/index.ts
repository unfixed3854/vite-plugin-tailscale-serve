import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import type { AddressInfo } from "node:net";
import type { Plugin } from "vite";

/**
 * Exposes the dev server to the tailnet over HTTPS via `tailscale serve`.
 *
 * The tailnet port mirrors whatever port Vite actually bound, so parallel dev
 * servers (e.g. one per worktree, falling back from 3000 to 3001, ...) each get
 * their own https://<machine>.<tailnet>.ts.net:<port> address. `tailscale serve`
 * runs in the foreground, so its config disappears when the process stops.
 *
 * Does nothing (beyond a warning) when Tailscale isn't installed or running.
 */
export default function tailscaleServe(): Plugin {
	return {
		name: "tailscale-serve",
		apply: "serve",
		config: () => ({
			// Proxied requests carry the MagicDNS hostname as Host, which Vite's
			// DNS-rebinding protection rejects unless allowed.
			server: { allowedHosts: [".ts.net"] },
		}),
		configureServer(server) {
			const httpServer = server.httpServer;
			if (!httpServer) return;
			const logger = server.config.logger;

			let child: ChildProcess | undefined;
			const stop = () => {
				child?.kill("SIGINT");
				child = undefined;
			};

			httpServer.once("listening", () => {
				const { port } = httpServer.address() as AddressInfo;

				let hostname: string;
				try {
					const status = JSON.parse(
						execFileSync("tailscale", ["status", "--json"], {
							encoding: "utf8",
							stdio: ["ignore", "pipe", "ignore"],
						}),
					);
					hostname = String(status.Self.DNSName).replace(/\.$/, "");
					if (!hostname) throw new Error("no MagicDNS name");
				} catch {
					logger.warn("[tailscale-serve] Tailscale unavailable, skipping.");
					return;
				}

				child = spawn(
					"tailscale",
					["serve", `--https=${port}`, `http://localhost:${port}`],
					{ stdio: ["ignore", "ignore", "pipe"] },
				);
				child.stderr?.on("data", (data: Buffer) => {
					logger.warn(`[tailscale-serve] ${data.toString().trim()}`);
				});
				child.on("error", (error) => {
					logger.warn(`[tailscale-serve] ${error.message}`);
				});
				logger.info(`  ➜  Tailnet: https://${hostname}:${port}/`);
			});

			// Vite closes the HTTP server on shutdown and on config-triggered
			// restarts; the exit hook covers paths that skip a clean close.
			httpServer.once("close", stop);
			process.once("exit", stop);
		},
	};
}
