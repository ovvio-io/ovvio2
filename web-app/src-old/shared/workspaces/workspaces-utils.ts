import { Logger } from '@ovvio/base';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

let lastSelectedWorkspaces: string[] | undefined;

export function getLastSelectedWorkspaces() {
  return lastSelectedWorkspaces;
}

export function loadSelectedWorkspaces(
  currentUser: any,
  allWorkspaces: VertexManager<Workspace>[]
) {
  if (allWorkspaces.length === 0) return [];
  const selectedWSs: Workspace[] = [];

  if (window.localStorage !== undefined) {
    //Load Selected Workspaces
    try {
      const selString = window.localStorage.getItem(
        'selectedWorkspaces_' + currentUser.id
      );
      Logger.debug(`loaded selected workspaces: ${selString}`);
      if (selString) {
        const selArray: string[] = JSON.parse(selString);
        lastSelectedWorkspaces = selArray;
        if (selArray && selArray.length > 0) {
          for (const wsKey of selArray) {
            const wsMng = allWorkspaces.find(x => x.key === wsKey);
            if (wsMng) {
              const ws = wsMng.getVertexProxy();
              ws.selected = true;
              selectedWSs.push(ws);
            }
          }
        }
      }
    } catch (err) {
      Logger.error('failed to read selectedWorkspaces from Local Storage', err);
    }
  }
  return selectedWSs;
}

export function saveSelectedWorkspaces(
  currentUser: any,
  selectedWorkspaces: VertexManager<Workspace>[]
) {
  //Save to Local Storage
  if (window.localStorage !== undefined) {
    try {
      const selectedWSKeys = selectedWorkspaces.map(x => x.key);
      const selWSs = JSON.stringify(selectedWSKeys);
      lastSelectedWorkspaces = selectedWSKeys;

      window.localStorage.setItem(
        'selectedWorkspaces_' + currentUser.id,
        selWSs
      );
      Logger.debug(`selected workspaces saved: ${selWSs}`);
    } catch (err) {
      Logger.error('Saving to selectedWorkspace LocalStorage failed', err);
    }
  }
}
