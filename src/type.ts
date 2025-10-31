import type { OTS_API_NAME } from "./const";

export interface ClientConfig {
    endpoint: string;
    accessKeyID: string;
    accessKeySecret: string;
    stsToken?: string;
    instanceName: string;
}

export interface RequestOptions {
    apiName: OTSApiName;
    body: Uint8Array;
    headers?: Record<string, string>;
}

export type OTSApiName = keyof typeof OTS_API_NAME;
