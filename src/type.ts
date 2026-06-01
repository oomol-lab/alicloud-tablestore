import type { OTS_API_NAME } from "./const";

export interface Credentials {
    accessKeyID: string;
    accessKeySecret: string;
    stsToken?: string;
    expiration?: Date | number | string;
}

export type CredentialProvider = () => Credentials | Promise<Credentials>;

interface BaseClientConfig {
    endpoint: string;
    instanceName: string;
}

export interface StaticClientConfig extends BaseClientConfig {
    accessKeyID: string;
    accessKeySecret: string;
    stsToken?: string;
    credentialProvider?: never;
}

export interface ProviderClientConfig extends BaseClientConfig {
    credentialProvider: CredentialProvider;
    accessKeyID?: never;
    accessKeySecret?: never;
    stsToken?: never;
}

export type ClientConfig = StaticClientConfig | ProviderClientConfig;

export interface RequestOptions {
    apiName: OTSApiName;
    body: Uint8Array;
    headers?: Record<string, string>;
}

export type OTSApiName = keyof typeof OTS_API_NAME;
