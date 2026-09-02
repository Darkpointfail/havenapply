import net from "net";
import { getEnv } from "@/lib/env";

export type ScanVerdict = "clean" | "infected" | "error";

export type VirusScanResult = {
  adapter: "clamav" | "dev-passthrough";
  /** True only when a real ClamAV daemon performed the scan. */
  isRealScan: boolean;
  verdict: ScanVerdict;
  /** Machine result label stored on Document.scanResult */
  scanResult: "clean" | "infected" | "skipped_dev" | "error";
  detail?: string;
};

export interface VirusScanner {
  scan(buffer: Buffer): Promise<VirusScanResult>;
}

/**
 * Development / test adapter. Explicitly NOT a real antivirus scan.
 * Marks files clean with scanResult=skipped_dev so UI never claims AV cleared them.
 */
export class DevPassthroughScanner implements VirusScanner {
  async scan(_buffer?: Buffer): Promise<VirusScanResult> {
    void _buffer;
    return {
      adapter: "dev-passthrough",
      isRealScan: false,
      verdict: "clean",
      scanResult: "skipped_dev",
      detail: "No ClamAV configured — passthrough only (not a real virus scan)",
    };
  }
}

/**
 * ClamAV INSTREAM over TCP (clamd).
 * Requires CLAMAV_HOST (and optional CLAMAV_PORT, default 3310).
 */
export class ClamAvScanner implements VirusScanner {
  constructor(
    private host: string,
    private port: number,
  ) {}

  async scan(buffer: Buffer): Promise<VirusScanResult> {
    try {
      const response = await this.instream(buffer);
      const infected = /FOUND/i.test(response) && !/OK$/i.test(response.trim());
      if (/ERROR/i.test(response)) {
        return {
          adapter: "clamav",
          isRealScan: true,
          verdict: "error",
          scanResult: "error",
          detail: response.trim().slice(0, 200),
        };
      }
      return {
        adapter: "clamav",
        isRealScan: true,
        verdict: infected ? "infected" : "clean",
        scanResult: infected ? "infected" : "clean",
        detail: response.trim().slice(0, 200),
      };
    } catch (error) {
      return {
        adapter: "clamav",
        isRealScan: true,
        verdict: "error",
        scanResult: "error",
        detail: error instanceof Error ? error.message.slice(0, 200) : "scan_failed",
      };
    }
  }

  private instream(buffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = net.connect({ host: this.host, port: this.port }, () => {
        // zINSTREAM protocol
        socket.write("zINSTREAM\0");
        const chunkSize = 2048;
        for (let offset = 0; offset < buffer.length; offset += chunkSize) {
          const chunk = buffer.subarray(offset, offset + chunkSize);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length, 0);
          socket.write(size);
          socket.write(chunk);
        }
        const end = Buffer.alloc(4);
        end.writeUInt32BE(0, 0);
        socket.write(end);
      });

      const chunks: Buffer[] = [];
      socket.setTimeout(15_000);
      socket.on("data", (d) => chunks.push(d));
      socket.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      socket.on("error", reject);
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("CLAMAV_TIMEOUT"));
      });
    });
  }
}

export function createVirusScanner(): VirusScanner {
  const env = getEnv();
  if (env.CLAMAV_HOST) {
    return new ClamAvScanner(env.CLAMAV_HOST, env.CLAMAV_PORT ?? 3310);
  }
  return new DevPassthroughScanner();
}
