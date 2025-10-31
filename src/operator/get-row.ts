import type { ConsumedCapacity, Filter, TimeRange } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import type { OperatorConfig } from "../type";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { decodePlainBuffer, encodePlainBuffer } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";
import { Basic } from "./basic";

export const ProtoGetRowRequest = builder.lookupType("ots.GetRowRequest");
export const ProtoGetRowResponse = builder.lookupType("ots.GetRowResponse");

export interface GetRowData {
    tableName: string;
    primaryKey: PlainBufferCell[];
    columnsToGet?: string[];
    timeRange?: TimeRange;
    maxVersions?: number;
    filter?: Filter;
    startColumn?: string;
    endColumn?: string;
    token?: ArrayBuffer; // Tablestore currently not supported
    transactionID?: string;
}

export interface GetRowResponse {
    consumed: ConsumedCapacity;
    row: Array<PlainBufferRow> | null;
    nextToken: ArrayBuffer | null; // Tablestore currently not supported
}

export class GetRow extends Basic {
    public constructor(config: OperatorConfig) {
        super(config);
    }

    public static async builder(options: GetRowData) {
        const payload: Record<string, any> = {
            tableName: options.tableName,
            primaryKey: Buffer.from(encodePlainBuffer([{
                primaryKey: options.primaryKey.map(fixPlainBufferCellType),
                attributes: [],
            }])),
        };

        if (options.columnsToGet) {
            payload.columnsToGet = options.columnsToGet;
        }

        if (options.timeRange) {
            payload.timeRange = options.timeRange;
        }

        if (options.maxVersions) {
            payload.maxVersions = options.maxVersions;
        }

        if (options.filter) {
            payload.filter = buildFilter(options.filter);
        }

        if (options.startColumn) {
            payload.startColumn = options.startColumn;
        }

        if (options.endColumn) {
            payload.endColumn = options.endColumn;
        }

        if (options.transactionID) {
            payload.transactionID = options.transactionID;
        }

        if (!options.maxVersions && !options.timeRange) {
            options.maxVersions = 1;
        }

        return ProtoGetRowRequest.encode(ProtoGetRowRequest.create(payload)).finish();
    }

    public async do(data: GetRowData) {
        const body = await GetRow.builder(data);
        return await this.request.do({
            apiName: OTS_API_NAME.GetRow,
            body,
        });
    }

    public static response(data: Uint8Array): GetRowResponse {
        const ret: Record<string, any> = {
            row: null,
            nextToken: null,
        };
        const raw = ProtoGetRowResponse.toObject(ProtoGetRowResponse.decode(data));

        ret.consumed = raw.consumed;
        const row = raw.row as Uint8Array | undefined;
        if (row && row.byteLength > 0) {
            ret.row = decodePlainBuffer(Buffer.from(row).buffer);
        }

        return ret as GetRowResponse;
    }
}
