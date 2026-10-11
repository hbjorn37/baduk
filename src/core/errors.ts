export type SgfErrorCode =
  | 'not-sgf'
  | 'unterminated-value'
  | 'unterminated-variation'
  | 'no-nodes'
  | 'unsupported-size'
  | 'illegal-move';

/**
 * Error raised while reading an SGF file. The English `message` is a fallback for logs;
 * the UI translates `code` and fills in `params`.
 */
export class SgfError extends Error {
  constructor(
    readonly code: SgfErrorCode,
    message: string,
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = 'SgfError';
  }
}
