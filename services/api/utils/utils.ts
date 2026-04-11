export const toArrayOrUndefined = <T>(inp: Array<T> | T | undefined) => {
  if (inp === undefined) return undefined;
  return Array.isArray(inp) ? inp : [inp];
};
