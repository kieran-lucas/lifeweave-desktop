import type { JSX as ReactJSX } from "react";

// dnd-kit 6 ships declarations against React's pre-19 global JSX namespace.
// React 19 moved JSX types under React.JSX; this narrow compatibility bridge
// changes types only and can be removed when dnd-kit publishes React-19 declarations.
declare global {
  namespace JSX {
    interface Element extends ReactJSX.Element {}
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
    type ElementType = ReactJSX.ElementType;
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
  }
}

export {};
