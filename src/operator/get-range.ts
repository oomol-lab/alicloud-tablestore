import type { Client } from "../client";
import type { ConsumedCapacity, Direction, Filter, TimeRange } from "../pb/type";
import type { PlainBufferCell, PlainBufferRow } from "../plainbuffer";
import { Buffer } from "node:buffer";
import { buildFilter } from "../builder/filter";
import { OTS_API_NAME } from "../const";
import { builder } from "../pb/builder";
import { decodePlainBuffer, encodePlainBuffer, VariantType } from "../plainbuffer";
import { fixPlainBufferCellType } from "../utils";

export const ProtoGetRangeRequest = builder.lookupType("ots.GetRangeRequest");
export const ProtoGetRangeResponse = builder.lookupType("ots.GetRangeResponse");

export interface GetRangeData {
    tableName: string;
    direction: typeof Direction[keyof typeof Direction];
    columnsToGet?: string[];
    timeRange?: TimeRange;
    maxVersions?: number;
    limit?: number;
    inclusiveStartPrimaryKey: PlainBufferCell[];
    exclusiveEndPrimaryKey: PlainBufferCell[];
    filter?: Filter;
    startColumn?: string;
    endColumn?: string;
}

export interface GetRangeResponse {
    consumed: ConsumedCapacity;
    rows: Array<PlainBufferRow> | null;
    nextStartPrimaryKey: PlainBufferRow | null;
}

export class GetRange {
    public constructor(private readonly client: Client) {
    }

    public static async builder(options: GetRangeData) {
        const payload: Record<string, any> = {
            tableName: options.tableName,
            direction: options.direction,
            inclusiveStartPrimaryKey: Buffer.from(encodePlainBuffer([{
                primaryKey: options.inclusiveStartPrimaryKey.map(fixPlainBufferCellType),
                attributes: [],
            }])),
            exclusiveEndPrimaryKey: Buffer.from(encodePlainBuffer([{
                primaryKey: options.exclusiveEndPrimaryKey.map(fixPlainBufferCellType),
                attributes: [],
            }])),
        };

        if (options.limit) {
            payload.limit = options.limit;
        }

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

        if (!options.maxVersions && !options.timeRange) {
            payload.maxVersions = 1;
        }

        return ProtoGetRangeRequest.encode(ProtoGetRangeRequest.create(payload)).finish();
    }

    public async do(data: GetRangeData) {
        const body = await GetRange.builder(data);
        return await this.client.request.do({
            apiName: OTS_API_NAME.GetRange,
            body,
        });
    }

    public static response(data: Uint8Array): GetRangeResponse {
        const ret: Record<string, any> = {
            rows: null,
            nextStartPrimaryKey: null,
        };
        const raw = ProtoGetRangeResponse.toObject(ProtoGetRangeResponse.decode(data));

        ret.consumed = raw.consumed;
        const rows = raw.rows as Uint8Array | undefined;
        if (rows && rows.byteLength > 0) {
            ret.rows = decodePlainBuffer(Buffer.from(rows).buffer);
        }

        const nextStartPrimaryKey = raw.nextStartPrimaryKey as Uint8Array | undefined;
        if (nextStartPrimaryKey && nextStartPrimaryKey.byteLength > 0) {
            ret.nextStartPrimaryKey = decodePlainBuffer(Buffer.from(nextStartPrimaryKey).buffer);
        }

        return ret as GetRangeResponse;
    }
}
