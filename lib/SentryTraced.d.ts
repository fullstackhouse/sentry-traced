import 'reflect-metadata';
import { SentryTracedParams } from './types';
/**
 * Decorator that automatically generates calls the sentry tracing related functions and registers nested aware metrics
 * @param options Decorator options related to sentry tracing namings
 * @returns Decorated function
 */
export declare const SentryTraced: (options?: SentryTracedParams) => (target: object, propertyKey: string, descriptor: PropertyDescriptor) => void;
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
export declare function SentryParam(target: any, propertyKey: string | symbol, parameterIndex: number): void;
