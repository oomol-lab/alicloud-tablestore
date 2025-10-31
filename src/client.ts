import type { ClientConfig } from "./type";
import { Request } from "./request";

export class Client {
    public request: Request;
    public constructor(private config: ClientConfig) {
        this.request = new Request(config);
    }

    public updateCredentials(accessKeyID: string, accessKeySecret: string, stsToken?: string) {
        this.config = {
            ...this.config,
            accessKeyID,
            accessKeySecret,
            stsToken,
        };
        this.request = new Request(this.config);
    }
}
