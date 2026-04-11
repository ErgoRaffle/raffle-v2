import {
  And,
  FindOperator,
  FindOptionsWhere,
  Or,
} from '@rosen-bridge/extended-typeorm';

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

type Resolver<T, K extends keyof T> = (
  value: unknown,
  field: K,
) => T[K] | FindOperator<T[K]>;

type SearchFieldConfig<T> = {
  fields: readonly (keyof T)[];
  resolver: Resolver<T, keyof T>;
};

type SearchConfig<T> = Record<string, SearchFieldConfig<T>>;

export const buildWhere = <T>(
  searchInput: Record<string, unknown>,
  config: SearchConfig<T>,
): FindOptionsWhere<T>[] => {
  const where: FindOptionsWhere<T>[] = [];

  Object.entries(searchInput).forEach(([key, value]) => {
    if (value == null) return;

    const fieldConfig = config[key];
    if (!fieldConfig) return;

    const { fields, resolver } = fieldConfig;

    fields.forEach((field) => {
      const condition = resolver(value, field);
      where.push({
        [field]: condition,
      } as FindOptionsWhere<T>);
    });
  });

  return where;
};

export { orListOptions, andListOptions };
