export type SslMode = "disable" | "prefer" | "require" | "verify-ca" | "verify-full";

export interface ConnectionDraft {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: SslMode;
}

export interface ConnectionTestResult {
  serverVersion: string;
  latencyMs: number;
  sslActive: boolean;
}
