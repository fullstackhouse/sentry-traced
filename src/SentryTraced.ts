import 'reflect-metadata';
import { SentryTracedParams, SentryTracedParamsIndexes } from './types';
import { generateSpanContext, getSentryInstance, isPromise } from './utils';

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
      const intermediaryFunction = async () => {
        if (!sentryClient || !sentryClient.getCurrentHub()) {
          throw new Error(`Sentry client not set`);
        }
        const spanContext = generateSpanContext(
          { className, methodName, args, sentryParams },
          options,
        );
        const scope = sentryClient.getCurrentHub().getScope();

        // get the current context, the order matters, we want to get
        // - the current span if it exists, this allows nesting if the function call is a child of a child or a leaf
        // - the current transaction if it exists, this can only happen if the function call is a child of the root node
        const contextTransaction = scope?.getSpan() || scope?.getTransaction();
        // we try to get the context span or transaction and if it doesn't exist we create a new transaction
        const parentSpan =
          contextTransaction ||
          sentryClient.startTransaction({
            ...spanContext,
            name: spanContext.descriptionNoArguments,
          });

        const childSpan = parentSpan?.startChild(spanContext);
        sentryClient.configureScope((scope) => {
          scope.setSpan(childSpan);
        });

        const result = original.call(this, ...args);

        function finishSpan() {
          sentryClient.configureScope((scope) => {
            scope.setSpan(parentSpan);
          });
          childSpan?.finish();
          if (!contextTransaction) {
            parentSpan.finish();
          }
        }

        if (isPromise(result)) {
          return result.then((e: any) => {
            finishSpan();
            return e;
          });
        }

        finishSpan();

        return result;
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
