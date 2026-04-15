declare module "php-array-reader" {
  export function fromString(
    input: string,
  ): Record<string, unknown> | Array<unknown>;
}
