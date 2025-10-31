import type { OTS_API_NAME } from "./const";

export interface RequestConfig {
    endpoint: string;
    accessKeyID: string;
    accessKeySecret: string;
    instanceName: string;
}

export interface RequestOptions {
    apiName: OTSApiName;
    body: Uint8Array;
    headers?: Record<string, string>;
}

export interface RequestFactory {
    do: (options: RequestOptions) => Promise<any>;
}

export interface OperatorConfig extends RequestConfig {
    request?: RequestFactory;
}

export type OTSApiName = keyof typeof OTS_API_NAME;
