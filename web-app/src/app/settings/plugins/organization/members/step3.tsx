import React from 'react';
import {
  cn,
  keyframes,
  makeStyles,
} from '../../../../../../../styles/css-objects/index.ts';
import { styleguide } from '../../../../../../../styles/index.ts';
import Dialog from '../../../../../../../styles/components/dialog/index.tsx';
import { DialogContent } from '../../../../../../../styles/components/dialog/index.tsx';
import { H2 } from '../../../../../../../styles/components/typography.tsx';
import { Button } from '../../../../../../../styles/components/buttons.tsx';
import {
  useVertexByKey,
  useVertices,
} from '../../../../../core/cfds/react/vertex.ts';
import { User } from '../../../../../../../cfds/client/graph/vertices/user.ts';
import { Workspace } from '../../../../../../../cfds/client/graph/vertices/workspace.ts';
import { useSharedQuery } from '../../../../../core/cfds/react/query.ts';

const showAnim = keyframes({
  '0%': {
    opacity: 0,
  },
  '99%': {
    opacity: 0,
  },
  '100%': {
    opacity: 1,
  },
});
const useStyles = makeStyles((theme) => ({
  wsSeparator: {
    alignSelf: 'center',
    height: styleguide.gridbase * 2,
    width: 1,
    backgroundColor: theme.background.placeholderText,
    opacity: 0.7,
    marginRight: styleguide.gridbase,
    marginLeft: styleguide.gridbase * 0.5,
  },
  wsArrow: {
    position: 'relative',
    top: 1,
    animation: `${showAnim} ${styleguide.transition.duration.short}ms backwards linear`,
    cursor: 'pointer',
  },
  hide: {
    display: 'none',
  },
  dialogTitle: {
    marginBottom: styleguide.gridbase * 2,
  },
  selectedWs: {
    backgroundColor: theme.background[400],
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontSize: '18px',
    fontWeight: 400,
    lineHeight: '24px',
    letterSpacing: '0.086px',
    textAlign: 'center',
    marginBottom: '1em',
    width: '440px',
    flexShrink: 0,
  },
  imgContainer: {
    position: 'relative',
    flexShrink: 0,
    margin: 'auto',
  },
  doneText: {
    color: '#1960CF',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '21px',
    letterSpacing: ' 0.1px',
    textDecorationLine: 'underline',
  },
  doneContainer: {
    display: 'flex',
    position: 'relative',
    justifyContent: 'center',
    zIndex: 1000,
  },
}));

type Step3Props = {
  setStep: (step: number) => void;
  selectedUsers: Set<string>;
  setSelectedUsers: (users: Set<string>) => void;
  selectedWorkspaces: Workspace[];
  setSelectedWorkspaces: (workspaces: Workspace[]) => void;
};

export const Step3: React.FC<Step3Props> = ({
  setStep,
  selectedUsers,
  selectedWorkspaces,
  setSelectedUsers,
  setSelectedWorkspaces,
}) => {
  const styles = useStyles();
  const workspacesQuery = useSharedQuery('workspaces');
  const workspaces = useVertices(workspacesQuery.results) as Workspace[];

  const isSelectAll =
    workspaces.length === selectedWorkspaces.length ? true : false;

  const onClose = () => {
    setStep(0);
    setSelectedUsers(new Set());
    setSelectedWorkspaces([]);
  };
  const usersData = new Map<string, User>();

  selectedUsers.forEach((user) => {
    const userData: User = useVertexByKey(user);
    usersData.set(user, userData);
  });

  return (
    <Dialog open={true} onClose={onClose} onClickOutside={onClose}>
      <DialogContent className={cn(styles.dialogContent)}>
        <H2 className={cn(styles.dialogTitle)}>Assigned!</H2>
        <div className={cn(styles.content)}>
          {[...selectedUsers].map((user, index) => (
            <span key={user}>
              {index > 0 ? ', ' : ''}
              {usersData.get(user)?.name}
            </span>
          ))}{' '}
          added to: <br />
          {isSelectAll ? (
            <span> All Workspaces</span>
          ) : (
            selectedWorkspaces.map((ws, index) => (
              <span key={ws.key}>
                {index > 0 ? ' ; ' : ''}
                {ws.name}
              </span>
            ))
          )}
        </div>
        <div className={cn(styles.imgContainer)}>
          <img
            key="emailSentPhotoSettings"
            src="/icons/settings/emailSentPhoto.svg"
          />
        </div>
      </DialogContent>
      <div className={cn(styles.doneContainer)}>
        <Button className={cn(styles.doneText)} onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  );
};
