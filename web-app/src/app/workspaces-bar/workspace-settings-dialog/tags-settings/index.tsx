import React from 'react';
import TagsSettingsView from './tags-settings-view';
import { Workspace } from '@ovvio/cfds/lib/client/graph/vertices';
import { VertexManager } from '@ovvio/cfds/lib/client/graph/vertex-manager';

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
