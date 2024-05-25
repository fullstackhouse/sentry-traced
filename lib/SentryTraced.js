"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryParam = exports.SentryTraced = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
require("reflect-metadata");
const utils_1 = require("./utils");
const sentryParamsMetadataKey = Symbol('sentryParams');
/**
 * Decorator that automatically generates calls the sentry tracing related functions and registers nested aware metrics
 * @param options Decorator options related to sentry tracing namings
 * @returns Decorated function
 */
function SentryTraced(options) {
    return (target, propertyKey, descriptor) => {
        const original = descriptor.value;
        descriptor.value = function (...args) {
            const className = this.constructor.name;
            const methodName = propertyKey;
            const sentryClient = (0, utils_1.getSentryInstance)();
            const sentryParams = Reflect.getOwnMetadata(sentryParamsMetadataKey, target, methodName) ||
                [];
            const intermediaryFunction = () => {
                if (!sentryClient) {
                    return original.call(this, ...args);
                }
                const spanContext = (0, utils_1.generateSpanContext)({ className, methodName, args, sentryParams }, options);
                return sentryClient.withIsolationScope(() => {
                    return sentryClient.startSpanManual(spanContext, (span, finish) => {
                        function onDone(status) {
                            span === null || span === void 0 ? void 0 : span.setStatus(status);
                            span === null || span === void 0 ? void 0 : span.end();
                            finish();
                        }
                        return invoke(original, this, args, onDone);
                    });
                });
            };
            return intermediaryFunction();
        };
    };
}
exports.SentryTraced = SentryTraced;
function invoke(fn, thisObj, args, onDone) {
    try {
        const result = fn.call(thisObj, ...args);
        if ((0, utils_1.isGenerator)(result)) {
            return (0, utils_1.wrapIterable)(result, onDone);
        }
        if (result === null || result === void 0 ? void 0 : result[Symbol.asyncIterator]) {
            return (0, utils_1.wrapAsyncIterable)(result, onDone);
        }
        if ((0, utils_1.isPromise)(result)) {
            return (0, utils_1.wrapPromise)(result, onDone);
        }
        onDone('ok');
        return result;
    }
    catch (error) {
        onDone('error');
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
function SentryParam(target, propertyKey, parameterIndex) {
    // get the existing sentry params from the reflection metadata
    const sentryParams = Reflect.getOwnMetadata(sentryParamsMetadataKey, target, propertyKey) || [];
    // add the new parameter index to the the existing list
    sentryParams.push(parameterIndex);
    // override the metadata with the new list
    Reflect.defineMetadata(sentryParamsMetadataKey, sentryParams, target, propertyKey);
}
exports.SentryParam = SentryParam;
