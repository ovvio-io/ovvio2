import React, { useCallback, useRef, useState } from 'react';
import { cn, makeStyles } from '../../styles/css-objects/index.ts';
import { Button } from '../../styles/components/buttons.tsx';
import { layout } from '../../styles/layout.ts';
import { styleguide } from '../../styles/styleguide.ts';
import { brandLightTheme as theme } from '../../styles/theme.tsx';
import Toolbar from '../../web-app/src/app/workspace-content/workspace-view/toolbar/index.tsx';
import { prettyJSON } from '../../base/common.ts';
import { sendJSONToEndpoint } from '../../net/rest-api.ts';
import { useTrustPool } from '../../auth/react.tsx';
import { JSONValue, ReadonlyJSONArray } from '../../base/interfaces.ts';

const useStyles = makeStyles(() => ({
  contents: {
    width: '100%',
    height: '100%',
    padding: styleguide.gridbase,
    display: 'flex',
    flexDirection: 'column',
  },
  queryField: {
    margin: '0px auto',
    marginTop: styleguide.gridbase * 2,
    marginBottom: styleguide.gridbase * 3,
  },
  textArea: {
    height: '700px',
    overflow: 'auto',
  },
}));
export function LogsQuery() {
  const styles = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queryResult, setQueryResult] = useState<ReadonlyJSONArray>([]);
  const trustPool = useTrustPool();

  const onClick = useCallback(async () => {
    if (!inputRef.current) {
      return;
    }
    const query = inputRef.current.value;
    try {
      const resp = await sendJSONToEndpoint(
        '/logs/query',
        trustPool.currentSession,
        {
          query,
        }
      );
      const result = await resp.json();
      console.log(result);
      setQueryResult(result);
    } catch (err: unknown) {
      setQueryResult([]);
    }
  }, [setQueryResult, inputRef, trustPool]);

  return (
    <div className={cn(styles.contents)}>
      <Toolbar />
      <input type="text" ref={inputRef} placeholder="SELECT * from entries" />
      <Button onClick={onClick}>Go</Button>
      <textarea
        className={cn(styles.textArea)}
        id="queryResults"
        readOnly={true}
        value={prettyJSON(
          queryResult.map((e) => {
            return { ...e, json: JSON.parse(e.json) };
          })
        )}
      />
    </div>
  );
}
