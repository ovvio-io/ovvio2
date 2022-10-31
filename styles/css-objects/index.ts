import { useMemo, useState } from 'https://esm.sh/react@18.2.0';
import { useEnsureAttached, __CssRegistry } from './context.tsx';
import { cssTheme, Theme } from '../theme.tsx';
import { isServerSide, useIsomorphicLayoutEffect } from '../utils/ssr.ts';

function genId(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let autoId = '';
  for (let i = 0; i < 20; i++) {
    autoId += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return autoId;
}

function defaultUnitForProperty(prop: string): string {
  if (
    ['z-index', 'opacity', 'flex-shrink', 'flex-grow', 'line-height'].indexOf(
      prop
    ) !== -1
  ) {
    return '';
  }

  return 'px';
}

function getSeparatorForKey(key: string) {
  switch (key) {
    case 'transition':
    case 'font-family':
      return ',';
    default:
      return ' ';
  }
}

function stringify(key: any, val: any): string {
  if (typeof val === 'number') {
    return val + defaultUnitForProperty(key);
  }
  if (Array.isArray(val)) {
    return val.map((x) => stringify(key, x)).join(getSeparatorForKey(key));
  }

  return '' + val;
}

function formatKey(key: string): any {
  if (key.startsWith('-')) {
    return [key];
  }
  const kebab = key
    .split('')
    .map((x) => (x.toUpperCase() === x ? `-${x.toLowerCase()}` : x))
    .join('');

  return [kebab];
}

export type CssClasses<T> = {
  [K in keyof T]?: T[K] extends Record<string, any>
    ? CssDefinitions<T[K]>
    : any;
};

export interface CssDefinitions<T> {
  classes: CssClasses<T>;
  styleRules: string[];
  rules: Record<string, any>;
  basedOn: any[];
  className: string;
}

interface CssClass {
  basedOn?: any[];
}

function toCss<T extends Record<string, any> & CssClass>(
  obj: T,
  key: string,
  currentSelector: string,
  isClass: boolean,
  keepSelector: boolean,
  ns: string
): CssDefinitions<T> {
  const selector = key.startsWith(':') || keepSelector ? key : `${key}_${ns}`;
  const isMediaQuery = key.startsWith('@media');
  if (!key.endsWith('&') && !isMediaQuery) {
    currentSelector = `${currentSelector}${
      isClass && !keepSelector ? '.' : ''
    }${selector}`;
  } else {
    currentSelector = `${isClass ? '.' : ''}${
      isMediaQuery ? key.replace('&', '') : selector
    }${isMediaQuery ? ' {\n' : ''}${currentSelector}`;
  }
  let currentRuleBuilder = [`${currentSelector} {`];
  const result: Partial<CssDefinitions<T>> = {
    styleRules: [],
    rules: {},
    classes: {},
  };

  let basedOn = obj.basedOn || [];

  if (!Array.isArray(basedOn)) {
    basedOn = [basedOn];
  }
  result.basedOn = basedOn;

  if (isClass) {
    result.className = selector;
  }

  Object.keys(obj).forEach((key) => {
    if (key === 'basedOn') {
      return;
    }
    const val = obj[key];
    if (typeof val === 'object' && !Array.isArray(val)) {
      let sel = currentSelector;
      if (!key.startsWith(':') && !key.startsWith('&')) {
        sel += ' ';
      }

      const k = key.startsWith('&') ? key.substr(1) : key;
      result.classes[k as keyof T] = toCss(
        val,
        k,
        sel,
        !key.startsWith(':') && !key.startsWith('@'),
        key.startsWith('& '),
        ns
      );
    } else {
      result.rules[key] = val;
      formatKey(key).forEach((k) => {
        currentRuleBuilder.push(`  ${k}: ${stringify(k, val)};`);
      });
    }
  });

  if (currentRuleBuilder.length === 1 && !isMediaQuery) {
    currentRuleBuilder = [];
  } else {
    currentRuleBuilder.push('}');
    if (isMediaQuery) {
      currentRuleBuilder.push('}');
    }
  }
  const rule = currentRuleBuilder.join('');
  if (rule) {
    result.styleRules = [rule];
  }

  return result as CssDefinitions<T>;
}

function getStyle(object) {
  const styles = [];
  if (object.styleRules) {
    styles.push(object.styleRules.join('\n\n'));
  }

  return Object.keys(object.classes)
    .reduce((accum, x) => {
      accum.push(getStyle(object.classes[x]));
      return accum;
    }, styles)
    .join('\n\n');
}

type CssObject<T> = { [K in keyof T]: CssDefinitions<T[K]> } & {
  getCss(): string;
};

type CssObjectCreator<T> = (
  theme: Theme,
  resolveClass?: (className: string) => string
) => T;

function isCssFn<T>(x: any): x is CssObjectCreator<T> {
  return typeof x === 'function';
}

export function classnames(...arr: any[]) {
  // const arr = Array.prototype.slice.call(arguments);
  return arr
    .filter((x) => x)
    .map((x) => {
      if (typeof x === 'string') {
        return x;
      }
      if (Array.isArray(x)) {
        return classnames.apply(null, x);
      }

      return classnames.apply(null, [...(x.basedOn || []), x.className]);
    })
    .join(' ');
}

export const cn = classnames;

export interface CssObjectsOptions {
  debug?: boolean;
}

export type UseStyles<T> = {
  (): Record<keyof T, string>;
} & CssObject<T>;

function useStylesInternal<T>(obj: { [key in keyof T]: any }): Record<
  keyof T,
  string
> {
  const ctxAttach = useEnsureAttached();
  useIsomorphicLayoutEffect(() => {
    for (const val of Object.values(obj)) {
      ctxAttach(val as any);
    }
  }, [obj, ctxAttach]);
  const [styles] = useState(() =>
    (Object.entries(obj) as [keyof T, any][]).reduce((accum, [key, val]) => {
      accum[key] = cn(val);
      return accum;
    }, {} as Record<keyof T, string>)
  );

  return styles;
}

export function makeStyles<T>(
  obj: T | CssObjectCreator<T>,
  ns = genId(),
  opts?: CssObjectsOptions
): UseStyles<T> {
  if (isCssFn(obj)) {
    obj = obj(cssTheme, (cname) => `${cname}_${ns}`);
  }
  const useStyles = () => {
    return useStylesInternal(useStyles);
  };
  for (const [key, val] of Object.entries(obj)) {
    useStyles[key] = toCss(val, key, '', true, false, ns);
  }
  Object.keys(obj).reduce((accum, key) => {
    accum[key] = toCss(obj[key], key, '', true, false, ns);
    return accum;
  }, {} as CssObject<T>);

  useStyles.getCss = () =>
    Object.keys(useStyles)
      .filter((x) => x !== 'getCss')
      .map((k) => getStyle(useStyles[k]))
      .join('\n\n');

  return useStyles as unknown as UseStyles<T>;
}

export function merge(...args: any[]): any {
  // const args = Array.prototype.slice.call(arguments);
  args.unshift({});

  return Object.assign.apply(
    null,
    args.filter((x) => x)
  );
}

export function keyframes<T>(
  def: T | CssObjectCreator<T>,
  ns = genId()
): string {
  const name = `animation_${ns}`;
  if (isCssFn(def)) {
    def = def(cssTheme, (cname) => `${cname}_${ns}`);
  }

  const css = Object.keys(def).map((frame) => {
    const style = [];
    Object.keys(def[frame]).forEach((k) => {
      const val = def[frame][k];
      formatKey(k).forEach((x) => {
        style.push(`  ${x}: ${stringify(x, val)};`);
      });
    });

    return `${frame} { ${style.join('')} }`;
  });

  const animation = `@keyframes ${name} { ${css.join('\n')}}`;
  __CssRegistry.appendCss(animation);

  return name;
}
