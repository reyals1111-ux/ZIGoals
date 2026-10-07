import type { EgressPolicy } from "./csp-compose.mjs";
export declare function isStaticPath(pathname: string): boolean;
export declare function staticMiss(request: Request, egress: EgressPolicy): Response | null;
