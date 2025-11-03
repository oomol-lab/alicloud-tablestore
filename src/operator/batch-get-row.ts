import type { Client } from "../client";
import type { ConsumedCapacity, Error, Filter, TimeRange } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { decodePlainBuffer, encodePlainBuffer } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";

export const ProtoBatchGetRowRequest = builder.lookupType("ots.BatchGetRowRequest");
export const ProtoBatchGetRowResponse = builder.lookupType("ots.BatchGetRowResponse");

export interface TableInBatchGetRowRequest {
    tableName: string;
    primaryKeys: PlainBufferCell[][];
    tokens?: ArrayBuffer[]; // Tablestore currently not supported
    columnsToGet?: string[];
    timeRange?: TimeRange;
    maxVersions?: number;
    filter?: Filter;
    startColumn?: string;
    endColumn?: string;
}

export interface BatchGetRowData {
    tables: Array<TableInBatchGetRowRequest>;
}

export interface RowInBatchGetRowResponse {
    isOK: boolean;
    error?: Error;
    consumed?: ConsumedCapacity;
    row?: Array<PlainBufferRow> | null;
    nextToken?: ArrayBuffer | null;
}

export interface TableInBatchGetRowResponse {
    tableName: string;
    rows: Array<RowInBatchGetRowResponse>;
}

export interface BatchGetRowResponse {
    tables: Array<TableInBatchGetRowResponse>;
}

export class BatchGetRow {
    public constructor(private readonly client: Client) {
    }

    public static async builder(options: BatchGetRowData) {
        const payload: Record<string, any> = {
            tables: options.tables.map((table) => {
                const p: Record<string, any> = {
                    tableName: table.tableName,
                    primaryKey: [],
                };

                for (const pk of table.primaryKeys) {
                    p.primaryKey.push(Buffer.from(encodePlainBuffer([{
                        primaryKey: pk.map(fixPlainBufferCellType),
                        attributes: [],
                    }])));
                }

                if (table.columnsToGet) {
                    p.columnsToGet = table.columnsToGet;
                }
                if (table.timeRange) {
                    p.timeRange = table.timeRange;
                }
                if (table.maxVersions) {
                    p.maxVersions = table.maxVersions;
                }
                if (table.filter) {
                    p.filter = buildFilter(table.filter);
                }
                if (table.startColumn) {
                    p.startColumn = table.startColumn;
                }
                if (table.endColumn) {
                    p.endColumn = table.endColumn;
                }

                if (!table.maxVersions && !table.timeRange) {
                    p.maxVersions = 1;
                }

                return p;
            }),
        };

        return ProtoBatchGetRowRequest.encode(ProtoBatchGetRowRequest.create(payload)).finish();
    }

    public async do(data: BatchGetRowData) {
        const body = await BatchGetRow.builder(data);
        return await this.client.request.do({
            apiName: OTS_API_NAME.BatchGetRow,
            body,
        });
    }

    public static response(data: Uint8Array): BatchGetRowResponse {
        const raw = ProtoBatchGetRowResponse.toObject(ProtoBatchGetRowResponse.decode(data));

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
                        nextToken: null,
                    };
                }),
            };
        });

        return ret as BatchGetRowResponse;
    }
}
