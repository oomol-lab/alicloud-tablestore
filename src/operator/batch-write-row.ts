import type { Client } from "../client";
import type { Condition, ConsumedCapacity, Error, ReturnContent } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import type { UpdateRowAttributeColumns } from "./update-row";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { OperationType, RowExistenceExpectation } from "../pb/type";
import { decodePlainBuffer, encodePlainBuffer } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";
import { UpdateRow } from "./update-row";

export const ProtoBatchWriteRowRequest = builder.lookupType("ots.BatchWriteRowRequest");
export const ProtoBatchWriteRowResponse = builder.lookupType("ots.BatchWriteRowResponse");

export interface PutRowInBatchWriteRowRequest {
    type: typeof OperationType.PUT;
    attributes: PlainBufferCell[];
}

export interface DeleteRowInBatchWriteRowRequest {
    type: typeof OperationType.DELETE;
}

export interface UpdateRowInBatchWriteRowRequest {
    type: typeof OperationType.UPDATE;
    columnToUpdate: UpdateRowAttributeColumns;
}

export type RowInBatchWriteRowRequest = {
    primaryKey: PlainBufferCell[];
    condition?: Condition;
    returnContent?: ReturnContent;
} & (PutRowInBatchWriteRowRequest | DeleteRowInBatchWriteRowRequest | UpdateRowInBatchWriteRowRequest);

export interface TableInBatchWriteRowRequest {
    tableName: string;
    rows: Array<RowInBatchWriteRowRequest>;
}

export interface BatchWriteRowData {
    tables: Array<TableInBatchWriteRowRequest>;
    transactionID?: string;
    isAtomic?: boolean;
}

export interface RowInBatchWriteRowResponse {
    isOK: boolean;
    error?: Error;
    consumed?: ConsumedCapacity;
    row?: Array<PlainBufferRow> | null;
}

export interface TableInBatchWriteRowResponse {
    tableName: string;
    rows: Array<RowInBatchWriteRowResponse>;
}

export interface BatchWriteRowResponse {
    tables: Array<TableInBatchWriteRowResponse>;
}

export class BatchWriteRow {
    public constructor(private readonly client: Client) {
    }

    public static async builder(options: BatchWriteRowData) {
        const payload: Record<string, any> = {
            tables: [],
        };

        for (const table of options.tables) {
            const p: Record<string, any> = {
                tableName: table.tableName,
                rows: [],
            };

            for (const row of table.rows) {
                const r: Record<string, any> = {
                    type: row.type,
                    rowChange: Buffer.from(BatchWriteRow.buildRowChange(row)),
                };

                if (row.condition) {
                    r.condition = row.condition;
                    if (row.condition.columnCondition) {
                        r.condition.columnCondition = buildFilter(row.condition.columnCondition);
                    }
                }
                else {
                    r.condition = {
                        rowExistence: RowExistenceExpectation.IGNORE,
                    };
                }

                if (row.returnContent) {
                    r.returnContent = row.returnContent;
                }

                p.rows.push(r);
            }

            payload.tables.push(p);
        }

        return ProtoBatchWriteRowRequest.encode(ProtoBatchWriteRowRequest.create(payload)).finish();
    }

    public async do(data: BatchWriteRowData) {
        const body = await BatchWriteRow.builder(data);
        return await this.client.request.do({
            apiName: OTS_API_NAME.BatchWriteRow,
            body,
        });
    }

    public static response(data: Uint8Array): BatchWriteRowResponse {
        const raw = ProtoBatchWriteRowResponse.toObject(ProtoBatchWriteRowResponse.decode(data));

        const ret: Record<string, any> = {
            tables: [],
        };
        ret.tables = raw.tables.map((table: any) => {
            return {
                tableName: table.tableName,
                rows: table.rows.map((row: any) => {
                    return {
                        isOK: row.isOk,
                        error: row.error,
                        consumed: row.consumed,
                        row: (row.row && row.row.byteLength > 0) ? decodePlainBuffer(Buffer.from(row.row).buffer) : null,
                    };
                }),
            };
        });

        return ret as BatchWriteRowResponse;
    }

    public static buildRowChange(row: RowInBatchWriteRowRequest) {
        switch (row.type) {
            case OperationType.PUT:
                return encodePlainBuffer([{
                    primaryKey: row.primaryKey.map(fixPlainBufferCellType),
                    attributes: row.attributes.map(fixPlainBufferCellType),
                }]);
            case OperationType.DELETE:
                return encodePlainBuffer([{
                    primaryKey: row.primaryKey.map(fixPlainBufferCellType),
                    attributes: [],
                    deleteMarker: true,
                }]);
            case OperationType.UPDATE:
                return UpdateRow.buildRowChange(row.primaryKey, row.columnToUpdate);
        }
    }
}
