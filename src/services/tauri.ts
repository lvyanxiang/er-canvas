import { invoke } from "@tauri-apps/api/core";
import type { ConnectionDraft, ConnectionTestResult } from "../features/connections/types";
import type { DatabaseSnapshot } from "../domain/database-model";

interface CommandError {
  code?: string;
  message?: string;
}

export async function testConnection(
  connection: ConnectionDraft,
): Promise<ConnectionTestResult> {
  return invoke<ConnectionTestResult>("test_connection", { connection });
}

export async function introspectDatabase(
  connection: ConnectionDraft,
): Promise<DatabaseSnapshot> {
  return invoke<DatabaseSnapshot>("introspect_database", { connection });
}

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export function formatCommandError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const commandError = error as CommandError;
    if (commandError.message) {
      return commandError.code
        ? `${commandError.message}（${commandError.code}）`
        : commandError.message;
    }
  }

  return "连接失败，请检查 PostgreSQL 是否运行以及连接信息是否正确";
}
