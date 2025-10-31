import type { ClientConfig } from "./type";
import { Request } from "./request";

export class Client {
    public request: Request;
    public constructor(public readonly config: ClientConfig) {
        this.request = new Request(config);
    }
}
