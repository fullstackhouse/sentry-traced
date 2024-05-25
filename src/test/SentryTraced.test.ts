/* eslint-disable @typescript-eslint/no-explicit-any */
import { SentryTraced } from '../SentryTraced';
import { fromAsync, registerSentryInstance } from '../utils';

class Foo {
  @SentryTraced()
  getValue() {
    return 'test value';
  }

  @SentryTraced()
  getError() {
    throw new Error('test error');
  }

  @SentryTraced()
  getPromise() {
    return Promise.resolve('test value');
  }

  @SentryTraced()
  getErrorPromise() {
    return Promise.reject(new Error('test error'));
  }

  @SentryTraced()
  *getIterable() {
    yield 1;
    yield 2;
    yield 3;
  }

  @SentryTraced()
  *getErrorIterable() {
    yield 1;
    throw new Error('test error');
    yield 2;
  }

  @SentryTraced()
  async *getAsyncIterable() {
    yield await Promise.resolve(1);
    yield await Promise.resolve(2);
    yield await Promise.resolve(3);
  }

  @SentryTraced()
  async *getErrorAsyncIterable() {
    yield await Promise.resolve(1);
    throw new Error('test error');
    yield await Promise.resolve(2);
  }
}

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

    await expect(new Foo().getErrorPromise()).rejects.toEqual(
      new Error('test error'),
    );

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

    expect(await fromAsync(iterable)).toEqual([1, 2, 3]);

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

    await expect(async () => await fromAsync(iterable)).rejects.toEqual(
      new Error('test error'),
    );

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

  interface SpanMock {
    context: unknown;
    children: SpanMock[];
    status: string | null;
    finished: boolean;
    startChild: jest.Mock<SpanMock>;
    setStatus: jest.Mock<void, [status: string]>;
    finish: jest.Mock<void, []>;
  }

  function mockSpan(context: unknown): SpanMock {
    const span: SpanMock = {
      context,
      children: [],
      status: null,
      finished: false,
      startChild: jest.fn((context) => {
        const child = mockSpan(context);
        span.children.push(child);
        return child;
      }),
      setStatus: jest.fn((status: string) => {
        span.status = status;
      }),
      finish: jest.fn(() => {
        span.finished = true;
      }),
    };
    return span;
  }

  function mockScope() {
    let currentTransaction: any;
    let currentSpan: any;

    return {
      getSpan: jest.fn(() => currentSpan),
      setSpan: jest.fn((span) => {
        currentSpan = span;
      }),

      getTransaction: jest.fn(() => currentTransaction),
    };
  }

  const client = {
    transactions: [] as SpanMock[],
    configureScope(fn: any) {
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

  registerSentryInstance(client as any);
  return client;
}
