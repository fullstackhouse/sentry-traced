"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const SentryTraced_1 = require("../SentryTraced");
const utils_1 = require("../utils");
class Foo {
    getValue() {
        return 'test value';
    }
    getError() {
        throw new Error('test error');
    }
    getPromise() {
        return Promise.resolve('test value');
    }
    getErrorPromise() {
        return Promise.reject(new Error('test error'));
    }
    *getIterable() {
        yield 1;
        yield 2;
        yield 3;
    }
    *getErrorIterable() {
        yield 1;
        throw new Error('test error');
        yield 2;
    }
    async *getAsyncIterable() {
        yield await Promise.resolve(1);
        yield await Promise.resolve(2);
        yield await Promise.resolve(3);
    }
    async *getErrorAsyncIterable() {
        yield await Promise.resolve(1);
        throw new Error('test error');
        yield await Promise.resolve(2);
    }
}
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getValue", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getError", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getPromise", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getErrorPromise", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getIterable", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getErrorIterable", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getAsyncIterable", null);
__decorate([
    (0, SentryTraced_1.SentryTraced)()
], Foo.prototype, "getErrorAsyncIterable", null);
describe('SentryTraced', () => {
    it('traces the method calls, and passes through return value', () => {
        const client = mockSentry();
        expect(new Foo().getValue()).toEqual('test value');
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getValue()',
                }),
                finished: true,
                status: 'ok',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getValue()',
                        }),
                        finished: true,
                        status: 'ok',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('passes through thrown errors', () => {
        const client = mockSentry();
        expect(() => new Foo().getError()).toThrowError(new Error('test error'));
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getError()',
                }),
                finished: true,
                status: 'error',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getError()',
                        }),
                        finished: true,
                        status: 'error',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('awaits promises', async () => {
        const client = mockSentry();
        await expect(new Foo().getPromise()).resolves.toEqual('test value');
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getPromise()',
                }),
                finished: true,
                status: 'ok',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getPromise()',
                        }),
                        finished: true,
                        status: 'ok',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('passes through errors from rejected promises', async () => {
        const client = mockSentry();
        await expect(new Foo().getErrorPromise()).rejects.toEqual(new Error('test error'));
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getErrorPromise()',
                }),
                finished: true,
                status: 'error',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getErrorPromise()',
                        }),
                        finished: true,
                        status: 'error',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('awaits iterables', () => {
        const client = mockSentry();
        const iterable = new Foo().getIterable();
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getIterable()',
                }),
                finished: false,
                status: null,
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getIterable()',
                        }),
                        finished: false,
                        status: null,
                        children: [],
                    }),
                ],
            }),
        ]);
        expect([...iterable]).toEqual([1, 2, 3]);
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getIterable()',
                }),
                finished: true,
                status: 'ok',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getIterable()',
                        }),
                        finished: true,
                        status: 'ok',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('passes through error from iterables', () => {
        const client = mockSentry();
        const iterable = new Foo().getErrorIterable();
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getErrorIterable()',
                }),
                finished: false,
                status: null,
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getErrorIterable()',
                        }),
                        finished: false,
                        status: null,
                        children: [],
                    }),
                ],
            }),
        ]);
        expect(() => [...iterable]).toThrowError(new Error('test error'));
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getErrorIterable()',
                }),
                finished: true,
                status: 'error',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getErrorIterable()',
                        }),
                        finished: true,
                        status: 'error',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('awaits async iterables', async () => {
        const client = mockSentry();
        const iterable = new Foo().getAsyncIterable();
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getAsyncIterable()',
                }),
                finished: false,
                status: null,
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getAsyncIterable()',
                        }),
                        finished: false,
                        status: null,
                        children: [],
                    }),
                ],
            }),
        ]);
        expect(await (0, utils_1.fromAsync)(iterable)).toEqual([1, 2, 3]);
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getAsyncIterable()',
                }),
                finished: true,
                status: 'ok',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getAsyncIterable()',
                        }),
                        finished: true,
                        status: 'ok',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
    it('passes through error from async iterables', async () => {
        const client = mockSentry();
        const iterable = new Foo().getErrorAsyncIterable();
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getErrorAsyncIterable()',
                }),
                finished: false,
                status: null,
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getErrorAsyncIterable()',
                        }),
                        finished: false,
                        status: null,
                        children: [],
                    }),
                ],
            }),
        ]);
        await expect(async () => await (0, utils_1.fromAsync)(iterable)).rejects.toEqual(new Error('test error'));
        expect(client.transactions).toEqual([
            expect.objectContaining({
                context: expect.objectContaining({
                    op: 'Foo.getErrorAsyncIterable()',
                }),
                finished: true,
                status: 'error',
                children: [
                    expect.objectContaining({
                        context: expect.objectContaining({
                            op: 'Foo.getErrorAsyncIterable()',
                        }),
                        finished: true,
                        status: 'error',
                        children: [],
                    }),
                ],
            }),
        ]);
    });
});
function mockSentry() {
    const scope = mockScope();
    const hub = {
        getScope() {
            return scope;
        },
    };
    function mockSpan(context) {
        const span = {
            context,
            children: [],
            status: null,
            finished: false,
            startChild: jest.fn((context) => {
                const child = mockSpan(context);
                span.children.push(child);
                return child;
            }),
            setStatus: jest.fn((status) => {
                span.status = status;
            }),
            finish: jest.fn(() => {
                span.finished = true;
            }),
        };
        return span;
    }
    function mockScope() {
        let currentTransaction;
        let currentSpan;
        return {
            getSpan: jest.fn(() => currentSpan),
            setSpan: jest.fn((span) => {
                currentSpan = span;
            }),
            getTransaction: jest.fn(() => currentTransaction),
        };
    }
    const client = {
        transactions: [],
        configureScope(fn) {
            fn(scope);
        },
        getCurrentHub() {
            return hub;
        },
        startTransaction: jest.fn((context) => {
            const transaction = mockSpan(context);
            client.transactions.push(transaction);
            return transaction;
        }),
    };
    (0, utils_1.registerSentryInstance)(client);
    return client;
}
