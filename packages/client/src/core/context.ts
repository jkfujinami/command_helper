import * as os from "node:os";

export interface SystemContext {
  os: string;
  arch: string;
  shell: string;
  cwd: string;
  stdin?: string;
  toolUsage?: string;
}

export function getSystemContext(): SystemContext {
  return {
    os: os.platform(),
    arch: os.arch(),
    shell: process.env.SHELL || "/bin/sh",
    cwd: process.cwd(),
  };
}
