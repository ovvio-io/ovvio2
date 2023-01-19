import React from 'https://esm.sh/react@18.2.0';
import TagsSettingsView from './tags-settings-view.tsx';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { VertexManager } from '../../../../../../cfds/client/graph/vertex-manager.ts';

// const styles = cssObjects(theme => ({
//   root: {},
//   loader: {
//     basedOn: [layout.flex, layout.column, layout.centerCenter],
//   },
// }));

// function TagLoading({ className, ...props }) {
//   return (
//     <div className={cn(styles.loader, className)} {...props}>
//       <SpinnerView />
//     </div>
//   );
// }

// function ErrorView({ error, reload }) {
//   return null;
// }

interface TagsSettingsProps {
  workspaceManager: VertexManager<Workspace>;
}
export default function TagsSettings({
  workspaceManager,
  ...props
}: TagsSettingsProps) {
  return <TagsSettingsView workspaceManager={workspaceManager} {...props} />;
}
