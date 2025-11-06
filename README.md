# Alibaba Cloud TableStore SDK

A clean, TypeScript-native SDK for Alibaba Cloud TableStore (OTS).

## Installation

```bash
pnpm install alicloud-tablestore
# or
bun add alicloud-tablestore
```

## Quick Start

```typescript
import { Client, GetRow, PutRow } from "alicloud-tablestore";
import { createPrimaryKey, createAttribute } from "alicloud-tablestore";

// Initialize client
const client = new Client({
  endpoint: "your-instance.cn-hangzhou.ots.aliyuncs.com",
  accessKeyID: "YOUR_ACCESS_KEY_ID",
  accessKeySecret: "YOUR_ACCESS_KEY_SECRET",
  stsToken: "YOUR_STS_TOKEN", // optional
  instanceName: "your-instance",
});

// Put a row
const putRow = new PutRow(client);
const putResult = await putRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "user123")],
  attributes: [
    createAttribute("name", "John Doe"),
    createAttribute("age", 30),
    createAttribute("score", 95.5),
  ],
});

console.log(PutRow.response(putResult));

// Get a row
const getRow = new GetRow(client);
const getResult = await getRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "user123")],
  maxVersions: 1,
});

console.log(GetRow.response(getResult));
```

## API Reference

All operators follow the same pattern: `new Operator(client)` → `operator.do(data)` → `Operator.response(result)`

### GetRow

Read a single row from table.

```typescript
import { GetRow } from "alicloud-tablestore";

const getRow = new GetRow(client);
const result = await getRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  columnsToGet: ["name", "age"], // optional
  maxVersions: 1,
});

const response = GetRow.response(result);
```

### PutRow

Insert or overwrite a row.

```typescript
import { PutRow, RowExistenceExpectation } from "alicloud-tablestore";

const putRow = new PutRow(client);
const result = await putRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  attributes: [
    createAttribute("name", "Alice"),
    createAttribute("age", 25),
  ],
  condition: {
    rowExistence: RowExistenceExpectation.IGNORE, // or EXPECT_EXIST, EXPECT_NOT_EXIST
  },
});
```

### UpdateRow

Update specific columns in an existing row.

```typescript
import { UpdateRow } from "alicloud-tablestore";

const updateRow = new UpdateRow(client);
const result = await updateRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  columnToUpdate: {
    put: [createAttribute("name", "Bob")],
    delete: [createAttribute("age", 25)],
    increment: [], // increment columns by value
  },
});
```

### DeleteRow

Remove a row from table.

```typescript
import { DeleteRow, RowExistenceExpectation } from "alicloud-tablestore";

const deleteRow = new DeleteRow(client);
const result = await deleteRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  condition: {
    rowExistence: RowExistenceExpectation.EXPECT_EXIST,
  },
});
```

### BatchGetRow

Read multiple rows in a single request (supports multiple tables).

```typescript
import { BatchGetRow } from "alicloud-tablestore";

const batchGetRow = new BatchGetRow(client);
const result = await batchGetRow.do({
  tables: [
    {
      tableName: "users",
      primaryKeys: [
        [createPrimaryKey("id", "123")],
        [createPrimaryKey("id", "456")],
      ],
      maxVersions: 1,
    },
    {
      tableName: "orders",
      primaryKeys: [[createPrimaryKey("order_id", "789")]],
      maxVersions: 1,
    },
  ],
});

const response = BatchGetRow.response(result);
```

### BatchWriteRow

Batch write operations (put, update, delete) in a single request.

```typescript
import { BatchWriteRow } from "alicloud-tablestore";

const batchWriteRow = new BatchWriteRow(client);
const result = await batchWriteRow.do({
  tables: [
    {
      tableName: "users",
      rows: [
        {
          type: "PUT",
          condition: { rowExistence: RowExistenceExpectation.IGNORE },
          primaryKey: [createPrimaryKey("id", "123")],
          attributes: [createAttribute("name", "Charlie")],
        },
        {
          type: "DELETE",
          condition: { rowExistence: RowExistenceExpectation.IGNORE },
          primaryKey: [createPrimaryKey("id", "456")],
        },
      ],
    },
  ],
});
```

### GetRange

Query rows within a range of primary keys.

```typescript
import { GetRange, Direction, INF_MIN, INF_MAX } from "alicloud-tablestore";

const getRange = new GetRange(client);
const result = await getRange.do({
  tableName: "users",
  direction: Direction.FORWARD, // or Direction.BACKWARD
  inclusiveStartPrimaryKey: [
    createPrimaryKey("id", "100")
    createPrimaryKey("age", INF_MIN),
  ],
  exclusiveEndPrimaryKey: [
    createPrimaryKey("id", "200"),
    createPrimaryKey("age", INF_MAX),
  ],
  limit: 100,
  maxVersions: 1,
});

const response = GetRange.response(result);
```

## Helper Functions

### createPrimaryKey

Create a primary key cell.

```typescript
import { createPrimaryKey } from "alicloud-tablestore";

// String primary key
createPrimaryKey("id", "user123");

// Double primary key
createPrimaryKey("timestamp", 1234567890);

// Integer primary key
createPrimaryKey("bignum", BigInt("9007199254740991"));
```

### createAttribute

Create an attribute column.

```typescript
import { createAttribute, VariantType } from "alicloud-tablestore";

// String attribute
createAttribute("name", "John");

// Double attribute
createAttribute("age", 30);

// Boolean attribute
createAttribute("isActive", true);

// Binary attribute
createAttribute("data", new Uint8Array([1, 2, 3]));

// With timestamp (for versioning)
createAttribute("name", "John", VariantType.STRING);
```

## Advanced Features

### Filters

Use filters to conditionally process rows based on column values.

```typescript
import { singleColumnCondition } from "alicloud-tablestore/builder/filter";
import { ComparatorType } from "alicloud-tablestore";

const result = await getRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  filter: singleColumnCondition("age", 18, ComparatorType.CT_GREATER_THAN),
  maxVersions: 1,
});
```

### Conditions

Set conditions for write operations.

```typescript
import { RowExistenceExpectation } from "alicloud-tablestore";

await putRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  attributes: [createAttribute("name", "Alice")],
  condition: {
    rowExistence: RowExistenceExpectation.EXPECT_NOT_EXIST, // fail if row exists
    columnCondition: singleColumnCondition("status", "active", ComparatorType.CT_EQUAL),
  },
});
```

### Transactions

All operations support `transactionID` parameter for atomic operations.

```typescript
await putRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  attributes: [createAttribute("name", "Alice")],
  transactionID: "your-transaction-id",
});
```

### Return Content

Control what data is returned from write operations.

```typescript
import { ReturnType } from "alicloud-tablestore";

await putRow.do({
  tableName: "users",
  primaryKey: [createPrimaryKey("id", "123")],
  attributes: [createAttribute("name", "Alice")],
  returnContent: {
    returnType: ReturnType.RT_PK, // RT_NONE, RT_PK, RT_AFTER_MODIFY
  },
});
```

## License

MIT
