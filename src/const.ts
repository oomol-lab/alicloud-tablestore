// OTSClient version information
export const USER_AGENT = "alicloud-tablestore/0.1.0";
export const API_VERSION = "2015-12-31";

// OTS Internal constants
export const H_OTS_PREFIX = "x-ots";
export const H_OTS_ACCESS_KEY_ID = "x-ots-accesskeyid";
export const H_OTS_API_VERSION = "x-ots-apiversion";
export const H_OTS_CONTENT_MD5 = "x-ots-contentmd5";
export const H_OTS_DATE = "x-ots-date";
export const H_OTS_INSTANCE_NAME = "x-ots-instancename";
export const H_OTS_SIGNATURE = "x-ots-signature";

// OTS API Name
export const OTS_API_NAME = {
    PutRow: "PutRow",
    UpdateRow: "UpdateRow",
    GetRow: "GetRow",
    DeleteRow: "DeleteRow",
    GetRange: "GetRange",
    BatchGetRow: "BatchGetRow",
    BatchWriteRow: "BatchWriteRow",
} as const;
