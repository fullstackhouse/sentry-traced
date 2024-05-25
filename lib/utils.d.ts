import * as Sentry from '@sentry/node';
import { SpanContext } from '@sentry/types';
import { InternalMetadata, SentryTracedParams } from './types';
declare global {
    var sentryTracedInstance: typeof Sentry;
}
export declare const registerSentryInstance: (sentryInstance: typeof Sentry) => void;
export declare const getSentryInstance: () => typeof Sentry;
/**
 * This function is used to check if a value is a promise
 * @param value Value to check if it's a promise
 * @returns Returns true if the value is a promise
 */
export declare const isPromise: (value: unknown) => value is Promise<unknown>;
export declare function isGenerator(value: unknown): value is Iterable<unknown>;
export declare function wrapIterable<T>(iterable: Iterable<T>, onDone: (status: string) => void): Iterable<T>;
export declare function wrapAsyncIterable<T>(iterable: AsyncIterable<T>, onDone: (status: string) => void): AsyncIterable<T>;
export declare function wrapPromise<T>(promise: Promise<T>, onDone: (status: string) => void): Promise<T>;
export declare function fromAsync<T>(iterable: AsyncIterable<T>): Promise<T[]>;
/**
 * The data the Sentry needs to generate a span context
 * @param metadata Internal metadata used to generate the span context. It contains the class name, method name, arguments and the sentry params.
 * @param options Options related to the span context (eg. methodName, className)
 * @returns
 */
export declare const generateSpanContext: (metadata: InternalMetadata, options?: SentryTracedParams) => {
    op: string;
    name: string;
    data: {
        args: unknown[] | undefined;
    };
};
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
export declare const withTracing: (traceparentData?: string, overrides?: SpanContext) => <T extends (...args: never[]) => any>(functionToCall: T) => (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
