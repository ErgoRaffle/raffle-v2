import { And, FindOperator, Or } from '@rosen-bridge/extended-typeorm';

const orListOptions = <T>(operators: Array<FindOperator<T>>) => {
  return mergeOperands(operators, Or);
};

const andListOptions = <T>(operators: Array<FindOperator<T>>) => {
  return mergeOperands(operators, And);
};

type MergeFn = <T>(...values: FindOperator<T>[]) => FindOperator<T>;

const mergeOperands = <T>(
  operators: Array<FindOperator<T>>,
  mergeFn: MergeFn,
) => {
  if (operators.length === 0) return undefined;
  if (operators.length === 1) return operators[0];
  return mergeFn(...operators);
};

export { orListOptions, andListOptions };
