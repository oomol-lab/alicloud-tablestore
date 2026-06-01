import type { ClientConfig, CredentialProvider } from "./type";
import { Request } from "./request";

export class Client {
    public request: Request;
    public constructor(private config: ClientConfig) {
        this.request = new Request(config);
    }

    public updateCredentials(accessKeyID: string, accessKeySecret: string, stsToken?: string) {
        this.config = {
            accessKeyID,
            accessKeySecret,
            endpoint: this.config.endpoint,
            instanceName: this.config.instanceName,
            stsToken,
        };
        this.request = new Request(this.config);
    }

    public updateCredentialProvider(credentialProvider: CredentialProvider) {
        this.config = {
            credentialProvider,
            endpoint: this.config.endpoint,
            instanceName: this.config.instanceName,
        };
        this.request = new Request(this.config);
    }
}
