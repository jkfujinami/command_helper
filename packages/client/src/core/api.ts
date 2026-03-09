export interface GenerateRequest {
  prompt: string;
  context: {
    cwd: string;
    shell: string;
    os: string;
    stdin?: string;
    toolUsage?: string;
  };
  settings?: {
    useLocal?: boolean;
    model?: string;
  };
}

export interface GenerateResponse {
  success: boolean;
  command?: string;
  explanation?: string;
  error?: string;
}
