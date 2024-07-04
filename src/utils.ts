import * as Sentry from '@sentry/node';
import { InternalMetadata, SentryTracedParams } from './types';
import { extractTraceparentData } from '@sentry/utils';

declare global {
  // eslint-disable-next-line no-var
  var sentryTracedInstance: typeof Sentry;
}

export const registerSentryInstance = (sentryInstance: typeof Sentry) => {
  global.sentryTracedInstance = sentryInstance;
};

export const getSentryInstance = (): typeof Sentry => {
  return global.sentryTracedInstance;
};

/**
 * This function is used to check if a value is a promise
 * @param value Value to check if it's a promise
 * @returns Returns true if the value is a promise
 */
export const isPromise = (value: unknown): value is Promise<unknown> => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'then' in value &&
    typeof value.then === 'function'
  );
};

export function isGenerator(value: unknown): value is Iterable<unknown> {
  return /\[object Generator|GeneratorFunction\]/.test(
    Object.prototype.toString.call(value),
  );
}

export function* wrapIterable<T>(
  iterable: Iterable<T>,
  onDone: (error?: unknown) => void,
): Iterable<T> {
  try {
    yield* iterable;
    onDone();
  } catch (error) {
    onDone(error);
    throw error;
  }
}

export async function* wrapAsyncIterable<T>(
  iterable: AsyncIterable<T>,
  onDone: (error?: unknown) => void,
): AsyncIterable<T> {
  try {
    yield* iterable;
    onDone();
  } catch (error) {
    onDone(error);
    throw error;
  }
}

export async function wrapPromise<T>(
  promise: Promise<T>,
  onDone: (error?: unknown) => void,
): Promise<T> {
  return promise
    .then((value) => {
      onDone();
      return value;
    })
    .catch((error: unknown) => {
      onDone(error);
      throw error;
    });
}

export async function fromAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

/**
 * The data the Sentry needs to generate a span context
 * @param metadata Internal metadata used to generate the span context. It contains the class name, method name, arguments and the sentry params.
 * @param options Options related to the span context (eg. methodName, className)
 * @returns
 */
export const generateSpanContext = (
  metadata: InternalMetadata,
  options?: SentryTracedParams,
) => {
  const { className, methodName, args, sentryParams } = metadata;
  // this generates a string as a list of arguments, for example (1,2,3) or (1,_,3)
  let argumentsStringList = '()';
  if (args) {
    argumentsStringList = `(${new Array(args.length)
      .fill(0)
      .map((_, index) =>
        (sentryParams || []).includes(index) ? args[index] : '_',
      )
      .join(',')})`;
  }
  let functionNameString = `unknown`;
  if (!methodName && className) {
    functionNameString = className;
  } else if (!className && methodName) {
    functionNameString = methodName;
  } else {
    functionNameString = `${className}.${methodName}`;
  }

  const op = options?.op || `${functionNameString}${argumentsStringList}`;
  const name =
    options?.description || `${functionNameString}${argumentsStringList} call`;

  return {
    op,
    name,
    data: { args },
  };
};

export type StartSpanOptions = Parameters<typeof Sentry.startSpan>[0];

/**
 * This function is used to connect a method annotated with `@SentryTraced` to an existing transaction based on the traceparentData string
 * See https://docs.sentry.io/platforms/node/performance/connect-services/
 * @param traceparentData The traceparentData string
 * @param overrides Options to pass to the transaction
 * @returns Returns a function that will wrap the original function that needs to be called
 * @example
 * ```typescript
 * const result = withTracing(sentryTrace)(secondService.myMethod)('some param1', 'some param2');
 * ```
 */
export const withTracing =
  (traceparentData?: string, overrides: Partial<StartSpanOptions> = {}) =>
  <T extends (...args: never[]) => any>(functionToCall: T) =>
  async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (!traceparentData) {
      return await functionToCall.bind(functionToCall)(...args);
    }
    // The request headers sent by your upstream service to your backend.
    const extractedTraceparentData = extractTraceparentData(traceparentData);
    const className = functionToCall.constructor.name;
    const methodName = functionToCall.name;
    const { op, name } = generateSpanContext({
      className,
      methodName,
      args,
    });
    return Sentry.startSpan(
      {
        op,
        name,
        ...extractedTraceparentData,
        ...overrides,
      },
      () => {
        return functionToCall.bind(functionToCall)(...args);
      },
    );
  };
