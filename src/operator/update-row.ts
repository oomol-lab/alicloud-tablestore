import type { Client } from "../client";
import type { Condition, ConsumedCapacity, ReturnContent } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { RowExistenceExpectation } from "../pb/type";
import { CellOp, decodePlainBuffer, encodePlainBuffer } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";

export const ProtoUpdateRowRequest = builder.lookupType("ots.UpdateRowRequest");
export const ProtoUpdateRowResponse = builder.lookupType("ots.UpdateRowResponse");

export interface UpdateRowAttributeColumns {
    put?: PlainBufferCell[];
    delete?: PlainBufferCell[];
    increment?: PlainBufferCell[];
}

export interface UpdateRowData {
    tableName: string;
    primaryKey: PlainBufferCell[];
    condition?: Condition;
    columnToUpdate: UpdateRowAttributeColumns;
    returnContent?: ReturnContent;
    transactionID?: string;
}

export interface UpdateRowResponse {
    consumed: ConsumedCapacity;
    row: Array<PlainBufferRow> | null;
}

export class UpdateRow {
    public constructor(private readonly client: Client) {
    }

    public static async builder(options: UpdateRowData) {
        const payload: Record<string, any> = {
            tableName: options.tableName,
            rowChange: Buffer.from(UpdateRow.buildRowChange(options.primaryKey, options.columnToUpdate)),
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

        return ProtoUpdateRowRequest.encode(ProtoUpdateRowRequest.create(payload)).finish();
    }

    public async do(data: UpdateRowData) {
        const body = await UpdateRow.builder(data);
        return await this.client.request.do({
            apiName: OTS_API_NAME.UpdateRow,
            body,
        });
    }

    public static response(data: Uint8Array): UpdateRowResponse {
        const ret: Record<string, any> = {
            row: null,
        };
        const raw = ProtoUpdateRowResponse.toObject(ProtoUpdateRowResponse.decode(data));

        ret.consumed = raw.consumed;
        const row = raw.row as Uint8Array | undefined;
        if (row && row.byteLength > 0) {
            ret.row = decodePlainBuffer(Buffer.from(row).buffer);
        }

        return ret as UpdateRowResponse;
    }

    public static buildRowChange(primaryKey: PlainBufferCell[], options: UpdateRowAttributeColumns) {
        const rowChange: PlainBufferRow = {
            primaryKey: primaryKey.map(fixPlainBufferCellType),
            attributes: [],
        };

        for (const column of options.put ?? []) {
            rowChange.attributes.push(fixPlainBufferCellType({
                name: column.name,
                value: column.value,
                type: column.type,
                ts: column.ts,
            }));
        }

        // ref: https://github.com/aliyun/aliyun-tablestore-go-sdk/blob/4eb2d3519dce89c43a9ed4bf8a26e36dfb1d8b84/tablestore/util.go#L811-L821
        for (const column of options.delete ?? []) {
            let op = CellOp.DeleteAllVersions;
            if (column.ts) {
                op = CellOp.DeleteOneVersion;
            }

            rowChange.attributes.push({
                name: column.name,
                ts: column.ts,
                op,
            });
        }

        for (const column of options.increment ?? []) {
            rowChange.attributes.push(fixPlainBufferCellType({
                name: column.name,
                value: column.value,
                type: column.type,
                op: CellOp.Increment,
            }));
        }

        return encodePlainBuffer([rowChange]);
    }
}
