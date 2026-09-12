import { STRINGS } from "@/config/strings";
import type { Service } from "./types";

export function nameOf(services: Service[], id: string): string {
  return services.find((s) => s.id === id)?.name ?? STRINGS.common.unknownService;
}
