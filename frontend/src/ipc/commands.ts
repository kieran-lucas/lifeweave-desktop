import { invoke } from "@tauri-apps/api/core";

import type { HealthCheck } from "./generated/HealthCheck";

export function healthCheck(): Promise<HealthCheck> {
  return invoke<HealthCheck>("health_check");
}
