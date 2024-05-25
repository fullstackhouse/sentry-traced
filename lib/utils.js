"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTracing = exports.generateSpanContext = exports.fromAsync = exports.wrapPromise = exports.wrapAsyncIterable = exports.wrapIterable = exports.isGenerator = exports.isPromise = exports.getSentryInstance = exports.registerSentryInstance = void 0;
const Sentry = __importStar(require("@sentry/node"));
const registerSentryInstance = (sentryInstance) => {
    global.sentryTracedInstance = sentryInstance;
};
exports.registerSentryInstance = registerSentryInstance;
const getSentryInstance = () => {
    return global.sentryTracedInstance;
};
exports.getSentryInstance = getSentryInstance;
/**
 * This function is used to check if a value is a promise
 * @param value Value to check if it's a promise
 * @returns Returns true if the value is a promise
 */
const isPromise = (value) => {
    return (value !== null &&
        typeof value === 'object' &&
        'then' in value &&
        typeof value.then === 'function');
};
exports.isPromise = isPromise;
function isGenerator(value) {
    return /\[object Generator|GeneratorFunction\]/.test(Object.prototype.toString.call(value));
}
exports.isGenerator = isGenerator;
function* wrapIterable(iterable, onDone) {
    try {
        yield* iterable;
        onDone('ok');
    }
    catch (error) {
        onDone('error');
        throw error;
    }
}
exports.wrapIterable = wrapIterable;
async function* wrapAsyncIterable(iterable, onDone) {
    try {
        yield* iterable;
        onDone('ok');
    }
    catch (error) {
        onDone('error');
        throw error;
    }
}
exports.wrapAsyncIterable = wrapAsyncIterable;
async function wrapPromise(promise, onDone) {
    return promise
        .then((value) => {
        onDone('ok');
        return value;
    })
        .catch((error) => {
        onDone('error');
        throw error;
    });
}
exports.wrapPromise = wrapPromise;
async function fromAsync(iterable) {
    const items = [];
    for await (const item of iterable) {
        items.push(item);
    }
    return items;
}
exports.fromAsync = fromAsync;
/**
 * The data the Sentry needs to generate a span context
 * @param metadata Internal metadata used to generate the span context. It contains the class name, method name, arguments and the sentry params.
 * @param options Options related to the span context (eg. methodName, className)
 * @returns
 */
const generateSpanContext = (metadata, options) => {
    const { className, methodName, args, sentryParams } = metadata;
    // this generates a string as a list of arguments, for example (1,2,3) or (1,_,3)
    let argumentsStringList = '()';
    if (args) {
        argumentsStringList = `(${new Array(args.length)
            .fill(0)
            .map((_, index) => (sentryParams || []).includes(index) ? args[index] : '_')
            .join(',')})`;
    }
    let functionNameString = `unknown`;
    if (!methodName && className) {
        functionNameString = className;
    }
    else if (!className && methodName) {
        functionNameString = methodName;
    }
    else {
        functionNameString = `${className}.${methodName}`;
    }
    const op = (options === null || options === void 0 ? void 0 : options.op) || `${functionNameString}${argumentsStringList}`;
    const name = (options === null || options === void 0 ? void 0 : options.description) || `${functionNameString}${argumentsStringList} call`;
    return {
        op,
        name,
        data: { args },
    };
};
exports.generateSpanContext = generateSpanContext;
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
const withTracing = (traceparentData, overrides = {}) => (functionToCall) => async (...args) => {
    if (!traceparentData) {
        return await functionToCall.bind(functionToCall)(...args);
    }
    // The request headers sent by your upstream service to your backend.
    const extractedTraceparentData = Sentry.extractTraceparentData(traceparentData);
    const className = functionToCall.constructor.name;
    const methodName = functionToCall.name;
    const { op, name } = (0, exports.generateSpanContext)({
        className,
        methodName,
        args,
    });
    const transaction = Sentry.startTransaction({
        op,
        name,
        ...extractedTraceparentData,
        ...overrides,
    });
    Sentry.configureScope((scope) => {
        scope.setSpan(transaction);
    });
    const result = await functionToCall.bind(functionToCall)(...args);
    transaction.finish();
    return result;
};
exports.withTracing = withTracing;
