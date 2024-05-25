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

/**
 * Decorator that automatically generates calls the sentry tracing related functions and registers nested aware metrics
 * @param options Decorator options related to sentry tracing namings
 * @returns Decorated function
 */
export const SentryTraced = (options?: SentryTracedParams) => {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      const className = this.constructor.name;
      const methodName = propertyKey;
      const sentryClient = getSentryInstance();
      const sentryParams: SentryTracedParamsIndexes =
        Reflect.getOwnMetadata(sentryParamsMetadataKey, target, methodName) ||
        [];

      const intermediaryFunction = () => {
        if (!sentryClient || !sentryClient.getCurrentHub()) {
          throw new Error(`Sentry client not set`);
        }
        const spanContext = generateSpanContext(
          { className, methodName, args, sentryParams },
          options,
        );
        const scope = sentryClient.getCurrentHub().getScope();

        const inheritedSpan = scope.getSpan() || scope.getTransaction();
        const parentSpan =
          inheritedSpan ??
          sentryClient.startTransaction({
            ...spanContext,
            name: spanContext.descriptionNoArguments,
          });

        const childSpan = parentSpan.startChild(spanContext);
        sentryClient.configureScope((scope) => {
          scope.setSpan(childSpan);
        });

        function finish(status: string) {
          sentryClient.configureScope((scope) => {
            scope.setSpan(parentSpan);
          });

          childSpan.setStatus(status);
          childSpan.finish();

          if (!inheritedSpan) {
            parentSpan.setStatus(status);
            parentSpan.finish();
          }
        }

        try {
          const result = original.call(this, ...args);

          if (isGenerator(result)) {
            return wrapIterable(result, finish);
          }

          if (result?.[Symbol.asyncIterator]) {
            return wrapAsyncIterable(result, finish);
          }

          if (isPromise(result)) {
            return wrapPromise(result, finish);
          }

          finish('ok');
          return result;
        } catch (error) {
          finish('error');
          throw error;
        }
      };

      return intermediaryFunction();
    };
  };
};

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
