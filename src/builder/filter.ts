import type { ColumnPaginationFilter, ComparatorType, CompositeColumnValueFilter, Filter, LogicalOperator, SingleColumnValueFilter } from "../pb/type";
import { Buffer } from "node:buffer";
import { builderFilter } from "../pb/builder";
import { FilterType } from "../pb/type";
import { encodeColumnValue } from "../plainbuffer";

export const ProtoFilter = builderFilter.lookupType("filter.Filter");
export const ProtoCompositeColumnValueFilter = builderFilter.lookupType("filter.CompositeColumnValueFilter");
export const ProtoColumnPaginationFilter = builderFilter.lookupType("filter.ColumnPaginationFilter");
export const ProtoSingleColumnValueFilter = builderFilter.lookupType("filter.SingleColumnValueFilter");

export function buildFilter(filter: Filter): Uint8Array {
    let filterPayload: Uint8Array;
    switch (filter.type) {
        case FilterType.FT_SINGLE_COLUMN_VALUE:
            filterPayload = buildSingleColumnValueFilter(filter.filter as SingleColumnValueFilter);
            break;
        case FilterType.FT_COMPOSITE_COLUMN_VALUE:
            filterPayload = buildCompositeColumnValueFilter(filter.filter as CompositeColumnValueFilter);
            break;
        case FilterType.FT_COLUMN_PAGINATION:
            filterPayload = buildColumnPaginationFilter(filter.filter as ColumnPaginationFilter);
            break;
    }

    return ProtoFilter.encode(ProtoFilter.create({
        type: filter.type,
        filter: filterPayload,
    })).finish();
}

export function buildSingleColumnValueFilter(filter: SingleColumnValueFilter): Uint8Array {
    const payload: Record<string, any> = {
        comparator: filter.comparator,
        columnName: filter.columnName,
        filterIfMissing: filter.filterIfMissing,
        latestVersionOnly: filter.latestVersionOnly,
    };

    const columnValue = Buffer.from(encodeColumnValue(filter.columnValue));

    payload.columnValue = columnValue;

    if (filter.valueTransferRule) {
        payload.valueTransferRule = {
            regex: filter.valueTransferRule.regex,
            castType: filter.valueTransferRule.castType,
        };
    }

    return ProtoSingleColumnValueFilter.encode(ProtoSingleColumnValueFilter.create(payload)).finish();
}

export function buildCompositeColumnValueFilter(filter: CompositeColumnValueFilter): Uint8Array {
    const payload: Record<string, any> = {
        combinator: filter.combinator,
        subFilters: filter.subFilters.map(buildFilter),
    };

    return ProtoCompositeColumnValueFilter.encode(ProtoCompositeColumnValueFilter.create(payload)).finish();
}

export function buildColumnPaginationFilter(filter: ColumnPaginationFilter): Uint8Array {
    const payload: Record<string, any> = {
        offset: filter.offset,
        limit: filter.limit,
    };

    return ProtoColumnPaginationFilter.encode(ProtoColumnPaginationFilter.create(payload)).finish();
}

export function singleColumnCondition(columnName: string, columnValue: any, comparatorType: typeof ComparatorType[keyof typeof ComparatorType]): Filter {
    return {
        type: FilterType.FT_SINGLE_COLUMN_VALUE,
        filter: {
            columnName,
            columnValue,
            comparator: comparatorType,
            filterIfMissing: false,
            latestVersionOnly: false,
        },
    };
}

export function compositeCondition(combinator: typeof LogicalOperator[keyof typeof LogicalOperator], subFilters: Filter[]): Filter {
    return {
        type: FilterType.FT_COMPOSITE_COLUMN_VALUE,
        filter: {
            combinator,
            subFilters,
        },
    };
}

export function columnPaginationFilter(offset: number, limit: number): Filter {
    return {
        type: FilterType.FT_COLUMN_PAGINATION,
        filter: {
            offset,
            limit,
        },
    };
}
