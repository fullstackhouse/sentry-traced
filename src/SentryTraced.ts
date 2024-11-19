/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { SentryTracedParams, SentryTracedParamsIndexes } from './types';
import {
  generateSpanContext,
  getSentryInstance,
  isGenerator,
  isPromise,
  wrapAsyncIterable,
  wrapIterable,
  wrapPromise,
} from './utils';

const sentryParamsMetadataKey = Symbol('sentryParams');

const SPAN_STATUS_OK = 1;
const SPAN_STATUS_ERROR = 2;

/**
 * Decorator that automatically generates calls the sentry tracing related functions and registers nested aware metrics
 * @param options Decorator options related to sentry tracing namings
 * @returns Decorated function
 */
export function SentryTraced(options?: SentryTracedParams) {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const sentryClient = getSentryInstance();
      if (!sentryClient) {
        return original.call(this, ...args);
      }

      const className = this.constructor.name;
      const methodName = propertyKey;
      const sentryParams: SentryTracedParamsIndexes =
        Reflect.getOwnMetadata(sentryParamsMetadataKey, target, methodName) ||
        [];

      const spanContext = generateSpanContext(
        { className, methodName, args, sentryParams },
        options,
      );

      return sentryClient.withIsolationScope(() => {
        return sentryClient.startSpanManual(spanContext, (span) => {
          function onDone(error?: unknown) {
            span.setStatus(
              error
                ? {
                    code: SPAN_STATUS_ERROR,
                    message:
                      error &&
                      typeof error === 'object' &&
                      'message' in error &&
                      typeof error.message === 'string'
                        ? error.message
                        : undefined,
                  }
                : { code: SPAN_STATUS_OK },
            );
            span.end();
          }

          return invoke(original, this, args, onDone);
        });
      });
    };
  };
}

function invoke<T>(
  fn: (...args: any) => T,
  thisObj: any,
  args: any,
  onDone: (error?: unknown) => void,
): T {
  try {
    const result = fn.call(thisObj, ...args) as any;

    if (isGenerator(result)) {
      return wrapIterable(result, onDone) as T;
    }

    if (result?.[Symbol.asyncIterator]) {
      return wrapAsyncIterable(result, onDone) as T;
    }

    if (isPromise(result)) {
      return wrapPromise(result, onDone) as T;
    }

    onDone();
    return result;
  } catch (error) {
    onDone(error);
    throw error;
  }
}

/**
 * Decorator that marks a parameter as something to be included in the transaction name
 * @example
 * For a function with this signature,
 * `(param1: number, @SentryParam param2: string)`
 * doing `Reflect.getOwnMetadata(sentryParamsMetadataKey, target, propertyKey)` will return `[1]`
 *
 * for
 * `(@SentryParam param1: number, @SentryParam param2: string)` -> `[1,0]`
 */
export function SentryParam(
  target: any,
  propertyKey: string | symbol,
  parameterIndex: number,
) {
  // get the existing sentry params from the reflection metadata
  const sentryParams: SentryTracedParamsIndexes =
    Reflect.getOwnMetadata(sentryParamsMetadataKey, target, propertyKey) || [];
  // add the new parameter index to the the existing list
  sentryParams.push(parameterIndex);
  // override the metadata with the new list
  Reflect.defineMetadata(
    sentryParamsMetadataKey,
    sentryParams,
    target,
    propertyKey,
  );
}
