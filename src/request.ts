import type { ClientConfig, OTSApiName, RequestOptions } from "./type";
import { createHash, createHmac } from "node:crypto";
import ky from "ky";
import { API_VERSION, H_OTS_ACCESS_KEY_ID, H_OTS_API_VERSION, H_OTS_CONTENT_MD5, H_OTS_DATE, H_OTS_INSTANCE_NAME, H_OTS_PREFIX, H_OTS_SIGNATURE, USER_AGENT } from "./const";

const DEFAULT_REQUEST_OPTIONS = {
    retry: 2,
    timeout: 30000,
};

export class Request {
    public constructor(private readonly config: ClientConfig) {
    }

    public async do(options: RequestOptions): Promise<Uint8Array> {
        const headers: Record<string, string> = Object.assign({
            [H_OTS_ACCESS_KEY_ID]: this.config.accessKeyID,
            [H_OTS_API_VERSION]: API_VERSION,
            [H_OTS_CONTENT_MD5]: createHash("md5").update(options.body).digest("base64"),
            [H_OTS_DATE]: new Date().toISOString(),
            [H_OTS_INSTANCE_NAME]: this.config.instanceName,
        }, options.headers);

        headers[H_OTS_SIGNATURE] = this.sign(options.apiName, headers);
        headers["User-Agent"] = USER_AGENT;

        const url = `http://${this.config.endpoint}/${options.apiName}`;

        const response = await ky(url, {
            method: "POST",
            body: options.body,
            headers,
            throwHttpErrors: false,
            ...DEFAULT_REQUEST_OPTIONS,
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Failed to request: ${response.status} ${response.statusText}: ${body}`);
        }

        return await response.bytes();
    }

    private sign(apiName: OTSApiName, headers: Record<string, string>): string {
        const canonicalizedHeaders = getCanonicalizedHeaders(headers);

        const signString = `/${apiName}\nPOST\n\n${canonicalizedHeaders}\n`;

        const signature = createHmac("sha1", this.config.accessKeySecret).update(signString).digest("base64");
        return signature;
    }
}

function getCanonicalizedHeaders(headers: Record<string, string>): string {
    return Object.keys(headers)
        .filter(key => key.toLowerCase().startsWith(H_OTS_PREFIX))
        .sort()
        .map(key => `${key.toLowerCase()}:${headers[key]!}`)
        .join("\n");
}
