"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryParam = exports.SentryTraced = void 0;
require("reflect-metadata");
const utils_1 = require("./utils");
const sentryParamsMetadataKey = Symbol('sentryParams');
/**
 * Decorator that automatically generates calls the sentry tracing related functions and registers nested aware metrics
 * @param options Decorator options related to sentry tracing namings
 * @returns Decorated function
 */
const SentryTraced = (options) => {
    return (target, propertyKey, descriptor) => {
        const original = descriptor.value;
        descriptor.value = function (...args) {
            const className = this.constructor.name;
            const methodName = propertyKey;
            const sentryClient = (0, utils_1.getSentryInstance)();
            const sentryParams = Reflect.getOwnMetadata(sentryParamsMetadataKey, target, methodName) ||
                [];
            const intermediaryFunction = () => {
                if (!sentryClient || !sentryClient.getCurrentHub()) {
                    throw new Error(`Sentry client not set`);
                }
                const spanContext = (0, utils_1.generateSpanContext)({ className, methodName, args, sentryParams }, options);
                const scope = sentryClient.getCurrentHub().getScope();
                const inheritedSpan = scope.getSpan() || scope.getTransaction();
                const parentSpan = inheritedSpan !== null && inheritedSpan !== void 0 ? inheritedSpan : sentryClient.startTransaction({
                    ...spanContext,
                    name: spanContext.descriptionNoArguments,
                });
                const childSpan = parentSpan.startChild(spanContext);
                sentryClient.configureScope((scope) => {
                    scope.setSpan(childSpan);
                });
                function finish(status) {
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
                    if ((0, utils_1.isGenerator)(result)) {
                        return (0, utils_1.wrapIterable)(result, finish);
                    }
                    if (result === null || result === void 0 ? void 0 : result[Symbol.asyncIterator]) {
                        return (0, utils_1.wrapAsyncIterable)(result, finish);
                    }
                    if ((0, utils_1.isPromise)(result)) {
                        return (0, utils_1.wrapPromise)(result, finish);
                    }
                    finish('ok');
                    return result;
                }
                catch (error) {
                    finish('error');
                    throw error;
                }
            };
            return intermediaryFunction();
        };
    };
};
exports.SentryTraced = SentryTraced;
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
