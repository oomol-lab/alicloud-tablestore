import type { Condition, ConsumedCapacity, ReturnContent } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import type { OperatorConfig } from "../type";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { RowExistenceExpectation } from "../pb/type";
import { decodePlainBuffer, encodePlainBuffer } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";
import { Basic } from "./basic";

export const ProtoPutRowRequest = builder.lookupType("ots.PutRowRequest");
export const ProtoPutRowResponse = builder.lookupType("ots.PutRowResponse");

export interface PutRowData {
    tableName: string;
    primaryKey: PlainBufferCell[];
    attributes: PlainBufferCell[];
    condition?: Condition;
    returnContent?: ReturnContent;
    transactionID?: string;
}

export interface PutRowResponse {
    consumed: ConsumedCapacity;
    row: Array<PlainBufferRow> | null;
}
export class PutRow extends Basic {
    public constructor(config: OperatorConfig) {
        super(config);
    }

    public static async builder(options: PutRowData) {
        const payload: Record<string, any> = {
            tableName: options.tableName,
            row: Buffer.from(encodePlainBuffer([{
                primaryKey: options.primaryKey.map(fixPlainBufferCellType),
                attributes: options.attributes.map(fixPlainBufferCellType),
            }])),
        };

        if (options.condition) {
            payload.condition = options.condition;
            if (options.condition.columnCondition) {
                payload.condition.columnCondition = buildFilter(options.condition.columnCondition);
            }
        }
        else {
            payload.condition = {
                rowExistence: RowExistenceExpectation.IGNORE,
            };
        }

        if (options.returnContent) {
            payload.returnContent = options.returnContent;
        }

        if (options.transactionID) {
            payload.transactionID = options.transactionID;
        }

        return ProtoPutRowRequest.encode(ProtoPutRowRequest.create(payload)).finish();
    }

    public async do(data: PutRowData) {
        const body = await PutRow.builder(data);
        return await this.request.do({
            apiName: OTS_API_NAME.PutRow,
            body,
        });
    }

    public static response(data: Uint8Array): PutRowResponse {
        const ret: Record<string, any> = {
            row: null,
        };
        const raw = ProtoPutRowResponse.toObject(ProtoPutRowResponse.decode(data));

        ret.consumed = raw.consumed;
        const row = raw.row as Uint8Array | undefined;
        if (row && row.byteLength > 0) {
            ret.row = decodePlainBuffer(Buffer.from(row).buffer);
        }

        return ret as PutRowResponse;
    }
}
