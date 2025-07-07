export const POINTER: unique symbol = Symbol('ptr');
export const FINALIZATION: unique symbol = Symbol('finalization_registry');
export const CLEANUP: unique symbol = Symbol('cleanup');

// PreparedGeometry specific
export const P_POINTER: unique symbol = Symbol('prepared:ptr');
export const P_FINALIZATION: unique symbol = Symbol('prepared:finalization_registry');
export const P_CLEANUP: unique symbol = Symbol('prepared:cleanup');
