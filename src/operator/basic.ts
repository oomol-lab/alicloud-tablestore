import type { OperatorConfig, RequestFactory } from "../type";
import { Request } from "../request";

export class Basic {
    protected request: RequestFactory;

    protected constructor(
        config: OperatorConfig,
    ) {
        if (!config.request) {
            this.request = new Request(config);
        }
        else {
            this.request = config.request;
        }
    }
}
