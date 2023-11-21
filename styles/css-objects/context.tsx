import React, { useContext, useEffect, useRef } from 'react';
import { isServerSide } from '../utils/ssr.ts';

export interface CssClass {
  styleRules: string[];
  classes?: Record<string, CssClass>;
  isAttached?: boolean;
  basedOn?: CssClass[];
}

type CssRegistryListener = (rule: string) => void;

class CssRegistry {
  private rules: string[] = [];
  private listeners: CssRegistryListener[] = [];
  private cssQueue: string[] = [];

  private append(css: string) {
    this.rules.push(css);
    this.listeners.forEach((fn) => fn(css));
  }

  getRules() {
    return this.rules;
  }

  listen(listener: CssRegistryListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners.splice(this.listeners.indexOf(listener), 1);
    };
  }

  appendCss(css: string) {
    this.append(css);
    // this.notify();
  }

  ensureAttached = (c: CssClass) => {
    if (c.isAttached) {
      return false;
    }
    (c.basedOn || []).forEach(this.ensureAttached);
    const styles = getCss(c);
    for (let i = 0; i < styles.length; i++) {
      this.append(styles[i]);
    }
    c.isAttached = true;
    return true;
  };
}

export const __CssRegistry = new CssRegistry();

const StyleContext = React.createContext(__CssRegistry);

export interface StyleProviderProps {
  dev?: boolean;
  children: React.ReactNode;
}

function StyleTag({ dev }: StyleProviderProps) {
  const ctx = useContext(StyleContext);
  const reffedDev = useRef(dev);
  useEffect(() => {
    reffedDev.current = dev;
  }, [dev]);

  useEffect(() => {
    if (!isServerSide) {
      const ssrStyle = document.getElementById('ssr-cso-styles');
      if (ssrStyle) {
        ssrStyle.remove();
      }
    }
  }, []);
  useEffect(() => {
    if (isServerSide) {
      return;
    }
    const style = document.createElement('style');

    style.id = 'cso-objects';
    style.type = 'text/css';
    document.head.appendChild(style);

    const initialRules = ctx.getRules();
    style.appendChild(document.createTextNode(''));

    const tryAppendRule = (rule: string, index?: number) => {
      const sheet = style.sheet;
      index = typeof index === 'undefined' ? sheet!.cssRules.length : index;
      try {
        sheet!.insertRule(rule, index);
      } catch (error) {
        if (error instanceof SyntaxError && !reffedDev.current) {
          console.warn(`Received non-parsable rule: '${rule}'`);
        } else {
          throw error;
        }
      }
    };

    for (let i = 0; i < initialRules.length; i++) {
      tryAppendRule(initialRules[i], i);
    }

    return ctx.listen((rule) => {
      tryAppendRule(rule);
    });
  }, [ctx]);

  return <React.Fragment />;
}
function getCss(c: CssClass) {
  const res = [];
  if (c.styleRules) {
    res.push(...c.styleRules);
  }
  Object.values(c.classes || {}).forEach((x) => res.push(...getCss(x)));
  return res;
}

export function useEnsureAttached() {
  return useContext(StyleContext).ensureAttached;
}

export const StyleProvider: React.FC<StyleProviderProps> = ({
  children,
  dev = false,
}) => {
  // const [css, setCss] = useState('');
  // const ensureAttached = useMemo(() => createEnsureAttached(setCss), []);
  // const ctx = useMemo(
  //   () => ({
  //     ensureAttached,
  //     css,
  //   }),
  //   [css, ensureAttached]
  // );
  return (
    <React.Fragment>
      <StyleTag dev={dev} children={undefined} />
      {children}
    </React.Fragment>
  );
};
