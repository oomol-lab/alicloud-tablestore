import { describe, expect, test } from "bun:test";
import { createOIDCCredentialProvider } from "../src/credentials";

describe("OIDC credential provider", () => {
    test("exchanges an OIDC token for STS credentials", async () => {
        const requests: URLSearchParams[] = [];
        const urls: string[] = [];
        const restoreFetch = mockSTSFetch((params, request) => {
            requests.push(params);
            urls.push(request.url);
            return createSTSResponse({
                accessKeyID: "access-key-id",
                accessKeySecret: "access-key-secret",
                stsToken: "security-token",
            });
        });

        try {
            const credentialProvider = createOIDCCredentialProvider({
                durationSeconds: 900,
                oidcProviderArn: "acs:ram::1234567890123456:oidc-provider/example",
                oidcToken: "oidc-token",
                policy: JSON.stringify({
                    Statement: [],
                    Version: "1",
                }),
                roleArn: "acs:ram::1234567890123456:role/example",
                roleSessionName: "tablestore-test",
                stsEndpoint: "https://sts.example.com?source=test",
            });

            const credentials = await credentialProvider();

            expect(credentials).toEqual({
                accessKeyID: "access-key-id",
                accessKeySecret: "access-key-secret",
                expiration: expect.any(Date),
                stsToken: "security-token",
            });
            expect(requests).toHaveLength(1);
            expect(urls).toEqual(["https://sts.example.com/?source=test"]);
            expect(requests[0]!.get("Action")).toBe("AssumeRoleWithOIDC");
            expect(requests[0]!.get("Version")).toBe("2015-04-01");
            expect(requests[0]!.get("OIDCToken")).toBe("oidc-token");
            expect(requests[0]!.get("RoleArn")).toBe("acs:ram::1234567890123456:role/example");
            expect(requests[0]!.get("OIDCProviderArn")).toBe("acs:ram::1234567890123456:oidc-provider/example");
            expect(requests[0]!.get("RoleSessionName")).toBe("tablestore-test");
            expect(requests[0]!.get("DurationSeconds")).toBe("900");
            expect(requests[0]!.get("Timestamp")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(requests[0]!.get("SignatureNonce")).toMatch(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/);
        }
        finally {
            restoreFetch();
        }
    });

    test("caches credentials and shares concurrent refreshes", async () => {
        let hits = 0;
        const restoreFetch = mockSTSFetch(async () => {
            hits += 1;
            await sleep(20);
            return createSTSResponse({
                accessKeyID: `access-key-id-${hits}`,
                accessKeySecret: `access-key-secret-${hits}`,
                stsToken: `security-token-${hits}`,
            });
        });

        try {
            const credentialProvider = createOIDCCredentialProvider({
                oidcProviderArn: "provider",
                oidcToken: "oidc-token",
                roleArn: "role",
                stsEndpoint: "https://sts.example.com",
            });

            const [first, second, third] = await Promise.all([
                credentialProvider(),
                credentialProvider(),
                credentialProvider(),
            ]);
            const cached = await credentialProvider();

            expect(hits).toBe(1);
            expect(first.accessKeyID).toBe("access-key-id-1");
            expect(second.accessKeyID).toBe("access-key-id-1");
            expect(third.accessKeyID).toBe("access-key-id-1");
            expect(cached.accessKeyID).toBe("access-key-id-1");
        }
        finally {
            restoreFetch();
        }
    });

    test("refreshes credentials before expiration", async () => {
        let hits = 0;
        const restoreFetch = mockSTSFetch(() => {
            hits += 1;
            const expiresIn = hits === 1 ? 1000 : 3600_000;
            return createSTSResponse({
                accessKeyID: `access-key-id-${hits}`,
                accessKeySecret: `access-key-secret-${hits}`,
                expiration: new Date(Date.now() + expiresIn),
                stsToken: `security-token-${hits}`,
            });
        });

        try {
            const credentialProvider = createOIDCCredentialProvider({
                oidcProviderArn: "provider",
                oidcToken: "oidc-token",
                refreshBeforeExpirationSeconds: 300,
                roleArn: "role",
                stsEndpoint: "https://sts.example.com",
            });

            const first = await credentialProvider();
            const second = await credentialProvider();
            const cached = await credentialProvider();

            expect(hits).toBe(2);
            expect(first.accessKeyID).toBe("access-key-id-1");
            expect(second.accessKeyID).toBe("access-key-id-2");
            expect(cached.accessKeyID).toBe("access-key-id-2");
        }
        finally {
            restoreFetch();
        }
    });

    test("keeps using unexpired credentials when refresh fails", async () => {
        let hits = 0;
        const restoreFetch = mockSTSFetch(() => {
            hits += 1;
            if (hits === 2) {
                throw new Error("temporary STS failure");
            }

            return createSTSResponse({
                accessKeyID: "access-key-id",
                accessKeySecret: "access-key-secret",
                expiration: new Date(Date.now() + 1000),
                stsToken: "security-token",
            });
        });

        try {
            const credentialProvider = createOIDCCredentialProvider({
                oidcProviderArn: "provider",
                oidcToken: "oidc-token",
                refreshBeforeExpirationSeconds: 300,
                roleArn: "role",
                stsEndpoint: "https://sts.example.com",
            });

            const first = await credentialProvider();
            const fallback = await credentialProvider();
            const backedOff = await credentialProvider();

            expect(hits).toBe(2);
            expect(first.accessKeyID).toBe("access-key-id");
            expect(fallback.accessKeyID).toBe("access-key-id");
            expect(fallback.stsToken).toBe("security-token");
            expect(backedOff.accessKeyID).toBe("access-key-id");
        }
        finally {
            restoreFetch();
        }
    });
});

interface STSResponseOptions {
    accessKeyID: string;
    accessKeySecret: string;
    expiration?: Date;
    stsToken: string;
}

function mockSTSFetch(handler: (params: URLSearchParams, request: Request) => unknown | Promise<unknown>): () => void {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
        const request = input instanceof Request ? input : new Request(String(input), init);
        const params = new URLSearchParams(await request.text());
        return Response.json(await handler(params, request));
    }) as typeof fetch;

    return () => {
        globalThis.fetch = originalFetch;
    };
}

function createSTSResponse(options: STSResponseOptions) {
    return {
        Credentials: {
            AccessKeyId: options.accessKeyID,
            AccessKeySecret: options.accessKeySecret,
            Expiration: (options.expiration ?? new Date(Date.now() + 3600_000)).toISOString(),
            SecurityToken: options.stsToken,
        },
    };
}

function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}
