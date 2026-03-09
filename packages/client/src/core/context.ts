import * as os from "node:os";
import { execSync } from "node:child_process";

export interface SystemContext {
  os: string;
  arch: string;
  shell: string;
  cwd: string;
  stdin?: string;
  toolUsage?: string;
}

/**
 * 詳細なOS情報を取得する
 */
function getDetailedOS(): string {
  const platform = os.platform();
  const kernel = os.release();

  try {
    if (platform === "darwin") {
      const name = execSync("sw_vers -productName", { encoding: "utf8" }).trim();
      const version = execSync("sw_vers -productVersion", { encoding: "utf8" }).trim();
      return `${name} ${version} (kernel: ${kernel})`;
    }

    if (platform === "linux") {
      try {
        const osRelease = execSync("cat /etc/os-release", { encoding: "utf8" });
        const prettyName = osRelease.match(/PRETTY_NAME="([^"]+)"/);
        if (prettyName) return `${prettyName[1]} (kernel: ${kernel})`;
      } catch {
        // Fallback for Linux
      }
      return `Linux (kernel: ${kernel})`;
    }

    if (platform === "win32") {
      return `Windows (kernel: ${kernel})`;
    }
  } catch (e) {
    // Fallback if commands fail
  }

  return `${platform} (kernel: ${kernel})`;
}

export function getSystemContext(): SystemContext {
  return {
    os: getDetailedOS(),
    arch: os.arch(),
    shell: process.env.SHELL || "/bin/sh",
    cwd: process.cwd(),
  };
}
