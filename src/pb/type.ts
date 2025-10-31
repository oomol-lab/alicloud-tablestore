// https://www.alibabacloud.com/help/en/tablestore/developer-reference/timerange
export interface TimeRange {
    startTime?: number;
    endTime?: number;
    specificTime?: number;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/rowexistenceexpectation
export const RowExistenceExpectation = {
    IGNORE: 0,
    EXPECT_EXIST: 1,
    EXPECT_NOT_EXIST: 2,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/condition
export interface Condition {
    rowExistence: typeof RowExistenceExpectation[keyof typeof RowExistenceExpectation];
    columnCondition?: Filter;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/returntype
export const ReturnType = {
    RT_NONE: 0,
    RT_PK: 1,
    RT_AFTER_MODIFY: 2,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/returncontent
export interface ReturnContent {
    returnType?: typeof ReturnType[keyof typeof ReturnType];
    returnColumnNames?: string[];
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/filtertype
export const FilterType = {
    FT_SINGLE_COLUMN_VALUE: 1,
    FT_COMPOSITE_COLUMN_VALUE: 2,
    FT_COLUMN_PAGINATION: 3,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/filter-1
export interface Filter {
    type: typeof FilterType[keyof typeof FilterType];
    filter: CompositeColumnValueFilter | ColumnPaginationFilter | SingleColumnValueFilter;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/logicaloperator
export const LogicalOperator = {
    LO_NOT: 1,
    LO_AND: 2,
    LO_OR: 3,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/compositecolumnvaluefilter
export interface CompositeColumnValueFilter {
    combinator: typeof LogicalOperator[keyof typeof LogicalOperator];
    subFilters: Filter[];
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/columnpaginationfilter
export interface ColumnPaginationFilter {
    offset: number;
    limit: number;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/comparatortype
export const ComparatorType = {
    CT_EQUAL: 1,
    CT_NOT_EQUAL: 2,
    CT_GREATER_THAN: 3,
    CT_GREATER_EQUAL: 4,
    CT_LESS_THAN: 5,
    CT_LESS_EQUAL: 6,
} as const;

// https://help.aliyun.com/zh/tablestore/developer-reference/varianttype
export const CastType = {
    VT_INTEGER: 0,
    VT_DOUBLE: 1,
    VT_STRING: 3,
    VT_NULL: 6,
    VT_BLOB: 7,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/valuetransferrule
export interface ValueTransferRule {
    regex: string;
    castType?: typeof CastType[keyof typeof CastType];
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/singlecolumnvaluefilter
export interface SingleColumnValueFilter {
    comparator: typeof ComparatorType[keyof typeof ComparatorType];
    columnName: string;
    columnValue: unknown; // It will be serialized to PlainBuffer
    filterIfMissing: boolean;
    latestVersionOnly: boolean;
    valueTransferRule?: ValueTransferRule;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/error
export interface Error {
    code: string;
    message?: string;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/capacityunit
export interface CapacityUnit {
    read: number;
    write: number;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/consumedcapacity
export interface ConsumedCapacity {
    capacityUnit: CapacityUnit;
}

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/direction
export const Direction = {
    FORWARD: 0,
    BACKWARD: 1,
} as const;

// https://www.alibabacloud.com/help/en/tablestore/developer-reference/operationtype
export const OperationType = {
    PUT: 1,
    UPDATE: 2,
    DELETE: 3,
} as const;
