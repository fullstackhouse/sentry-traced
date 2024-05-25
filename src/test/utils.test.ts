import { generateSpanContext, isGenerator } from '../utils';

describe('utils', () => {
  describe('isGenerator', () => {
    const generator = (function* () {
      yield 1;
      yield 2;
      yield 3;
    })();
    const nonGenerator = [1, 2, 3];
    expect(isGenerator(generator)).toEqual(true);
    expect(isGenerator(nonGenerator)).toEqual(false);
  });

  describe('generateSpanContext', () => {
    it('correctly generates context for just method name', () => {
      expect(
        generateSpanContext({
          methodName: 'testMethod',
        }),
      ).toEqual({
        op: 'testMethod()',
        name: 'testMethod() call',
        data: { args: undefined },
      });
    });
    it('correctly generates context for just class name', () => {
      expect(
        generateSpanContext({
          className: 'testClass',
        }),
      ).toEqual({
        op: 'testClass()',
        name: 'testClass() call',
        data: { args: undefined },
      });
    });
    it('correctly generates context for class name and method name without parameters', () => {
      expect(
        generateSpanContext({
          className: 'testClass',
          methodName: 'testMethod',
        }),
      ).toEqual({
        op: 'testClass.testMethod()',
        name: 'testClass.testMethod() call',
        data: { args: undefined },
      });
    });
    it('correctly generates context for class name and method name with parameters', () => {
      expect(
        generateSpanContext({
          className: 'testClass',
          methodName: 'testMethod',
          args: [1, 'two', true],
        }),
      ).toEqual({
        op: 'testClass.testMethod(_,_,_)',
        name: 'testClass.testMethod(_,_,_) call',
        data: { args: [1, 'two', true] },
      });
    });
    it('correctly generates context for class name and method name with parameters and Sentry traced params', () => {
      expect(
        generateSpanContext({
          className: 'testClass',
          methodName: 'testMethod',
          args: [1, 'two', true],
          sentryParams: [0, 2],
        }),
      ).toEqual({
        op: 'testClass.testMethod(1,_,true)',
        name: 'testClass.testMethod(1,_,true) call',
        data: { args: [1, 'two', true] },
      });
    });
  });
});
