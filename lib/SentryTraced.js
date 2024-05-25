"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryParam = exports.SentryTraced = void 0;
const node_1 = __importDefault(require("@sentry/node"));
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
            const intermediaryFunction = async () => {
                if (!sentryClient || !sentryClient.getCurrentHub()) {
                    throw new Error(`Sentry client not set`);
                }
                const spanContext = (0, utils_1.generateSpanContext)({ className, methodName, args, sentryParams }, options);
                const scope = sentryClient.getCurrentHub().getScope();
                // get the current context, the order matters, we want to get
                // - the current span if it exists, this allows nesting if the function call is a child of a child or a leaf
                // - the current transaction if it exists, this can only happen if the function call is a child of the root node
                const contextTransaction = (scope === null || scope === void 0 ? void 0 : scope.getSpan()) || (scope === null || scope === void 0 ? void 0 : scope.getTransaction());
                // we try to get the context span or transaction and if it doesn't exist we create a new transaction
                const transactionOrSpan = contextTransaction ||
                    sentryClient.startTransaction({
                        ...spanContext,
                        name: spanContext.descriptionNoArguments,
                    });
                // start a nested child of the current transaction/span
                const newSpan = transactionOrSpan === null || transactionOrSpan === void 0 ? void 0 : transactionOrSpan.startChild(spanContext);
                // set the context of the newly create span/transaction
                sentryClient.configureScope((scope) => {
                    scope.setSpan(newSpan);
                });
                // call the function -> if the function is also annotated it will basically "recursively" create spans inside the parent span based on the context that we set
                const resultPromise = original.call(this, ...args);
                // there's a possibility that the function is a normal function or an async one so we need to check for both cases
                if ((0, utils_1.isPromise)(resultPromise)) {
                    // in case the function is a promise we need to resolve it and also reset the current context to the parent node for the next sibling function call
                    return resultPromise.then((e) => {
                        sentryClient.configureScope((scope) => {
                            scope.setSpan(transactionOrSpan);
                        });
                        newSpan === null || newSpan === void 0 ? void 0 : newSpan.finish();
                        if (!contextTransaction) {
                            transactionOrSpan.finish();
                        }
                        return e;
                    });
                }
                else {
                    // same for a normal function but we just do it before returning the value
                    node_1.default.configureScope((scope) => {
                        scope.setSpan(transactionOrSpan);
                    });
                    newSpan === null || newSpan === void 0 ? void 0 : newSpan.finish();
                    if (!contextTransaction) {
                        transactionOrSpan.finish();
                    }
                    return resultPromise;
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
