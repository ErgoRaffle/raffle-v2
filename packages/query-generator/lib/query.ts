import { FindOperator, FindOptionsWhere } from '@rosen-bridge/extended-typeorm';

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
