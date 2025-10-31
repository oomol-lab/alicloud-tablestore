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

export const ProtoDeleteRowRequest = builder.lookupType("ots.DeleteRowRequest");
export const ProtoDeleteRowResponse = builder.lookupType("ots.DeleteRowResponse");

export interface DeleteRowData {
    tableName: string;
    primaryKey: PlainBufferCell[];
    condition?: Condition;
    returnContent?: ReturnContent;
    transactionID?: string;
}

export interface DeleteRowResponse {
    consumed: ConsumedCapacity;
    row: Array<PlainBufferRow> | null;
}

export class DeleteRow extends Basic {
    public constructor(config: OperatorConfig) {
        super(config);
    }

    public static async builder(options: DeleteRowData) {
        const payload: Record<string, any> = {
            tableName: options.tableName,
            primaryKey: Buffer.from(encodePlainBuffer([{
                primaryKey: options.primaryKey.map(fixPlainBufferCellType),
                attributes: [],
                deleteMarker: true,
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

        return ProtoDeleteRowRequest.encode(ProtoDeleteRowRequest.create(payload)).finish();
    }

    public async do(data: DeleteRowData) {
        const body = await DeleteRow.builder(data);
        return await this.request.do({
            apiName: OTS_API_NAME.DeleteRow,
            body,
        });
    }

    public static response(data: Uint8Array): DeleteRowResponse {
        const ret: Record<string, any> = {
            row: null,
        };
        const raw = ProtoDeleteRowResponse.toObject(ProtoDeleteRowResponse.decode(data));

        ret.consumed = raw.consumed;
        const row = raw.row as Uint8Array | undefined;
        if (row && row.byteLength > 0) {
            ret.row = decodePlainBuffer(Buffer.from(row).buffer);
        }

        return ret as DeleteRowResponse;
    }
}
