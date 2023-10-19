import React from 'react';
import { useParams } from 'react-router-dom';
import { useGraphManager } from '../core/cfds/react/graph.tsx';
import { mapIterable } from '../../../base/common.ts';
import { H1 } from '../../../styles/components/texts.tsx';
import { Repository, RepositoryType } from '../../../repo/repo.ts';

interface URLParams extends Record<string, string> {
  repoType: RepositoryType;
  repoId: string;
}

export function RepoExplorer() {
  const graph = useGraphManager();
  const { repoId, repoType } = (useParams<URLParams>() || {
    repoType: 'sys',
    repoId: 'dir',
  }) as URLParams;
  const repo = graph.repository(Repository.id(repoType, repoId));
  const keys = Array.from(repo.keys()).sort();
  return (
    <div>
      <H1>Contents of ${repoId}:</H1>
      <table>
        {keys.map((key) => (
          <tr>
            <td>{key}</td>
            <td>{repo.valueForKey(key, graph.session).scheme.namespace}</td>
          </tr>
        ))}
      </table>
    </div>
  );
}
