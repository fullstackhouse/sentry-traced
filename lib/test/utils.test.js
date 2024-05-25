"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
describe('utils', () => {
    describe('isGenerator', () => {
        const generator = (function* () {
            yield 1;
            yield 2;
            yield 3;
        })();
        const nonGenerator = [1, 2, 3];
        expect((0, utils_1.isGenerator)(generator)).toEqual(true);
        expect((0, utils_1.isGenerator)(nonGenerator)).toEqual(false);
    });
    describe('generateSpanContext', () => {
        it('correctly generates context for just method name', () => {
            expect((0, utils_1.generateSpanContext)({
                methodName: 'testMethod',
            })).toEqual({
                op: 'testMethod()',
                description: 'testMethod() call',
                descriptionNoArguments: 'testMethod() call',
                data: { args: undefined },
            });
        });
        it('correctly generates context for just class name', () => {
            expect((0, utils_1.generateSpanContext)({
                className: 'testClass',
            })).toEqual({
                op: 'testClass()',
                description: 'testClass() call',
                descriptionNoArguments: 'testClass() call',
                data: { args: undefined },
            });
        });
        it('correctly generates context for class name and method name without parameters', () => {
            expect((0, utils_1.generateSpanContext)({
                className: 'testClass',
                methodName: 'testMethod',
            })).toEqual({
                op: 'testClass.testMethod()',
                description: 'testClass.testMethod() call',
                descriptionNoArguments: 'testClass.testMethod() call',
                data: { args: undefined },
            });
        });
        it('correctly generates context for class name and method name with parameters', () => {
            expect((0, utils_1.generateSpanContext)({
                className: 'testClass',
                methodName: 'testMethod',
                args: [1, 'two', true],
            })).toEqual({
                op: 'testClass.testMethod(_,_,_)',
                description: 'testClass.testMethod(_,_,_) call',
                descriptionNoArguments: 'testClass.testMethod() call',
                data: { args: [1, 'two', true] },
            });
        });
        it('correctly generates context for class name and method name with parameters and Sentry traced params', () => {
            expect((0, utils_1.generateSpanContext)({
                className: 'testClass',
                methodName: 'testMethod',
                args: [1, 'two', true],
                sentryParams: [0, 2],
            })).toEqual({
                op: 'testClass.testMethod(1,_,true)',
                description: 'testClass.testMethod(1,_,true) call',
                descriptionNoArguments: 'testClass.testMethod() call',
                data: { args: [1, 'two', true] },
            });
        });
    });
});
