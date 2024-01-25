import React, { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../../../../../styles/components/buttons.tsx';
import Menu, {
  MenuItem,
  MenuItemStyle,
} from '../../../../../../styles/components/menu.tsx';
import { useTypographyStyles } from '../../../../../../styles/components/typography.tsx';
import { cn, makeStyles } from '../../../../../../styles/css-objects/index.ts';
import { layout } from '../../../../../../styles/layout.ts';
import { styleguide } from '../../../../../../styles/styleguide.ts';
import {
  useGraphManager,
  usePartialRootUser,
} from '../../../../core/cfds/react/graph.tsx';
import { useExistingQuery } from '../../../../core/cfds/react/query.ts';
import { usePartialVertices } from '../../../../core/cfds/react/vertex.ts';
import { isWindowsOS } from '../../../../utils.ts';
import { useLogger } from '../../../../core/cfds/react/logger.tsx';
import { brandLightTheme as theme } from '../../../../../../styles/theme.tsx';
import { Workspace } from '../../../../../../cfds/client/graph/vertices/workspace.ts';
import { IDBRepositoryBackup } from '../../../../../../repo/idbbackup.ts';

const useStyles = makeStyles(() => ({
  headerRoot: {
    basedOn: [layout.column],
  },
  headerContent: {
    height: styleguide.gridbase * 9,
    alignItems: 'center',
    basedOn: [layout.row],
  },
  headerText: {
    marginLeft: styleguide.gridbase * 2.5,
    fontSize: 18,
    lineHeight: `${styleguide.gridbase * 3}px`,
    letterSpacing: '1px',
    basedOn: [useTypographyStyles.bold],
  },
  menu: {
    maxHeight: MenuItemStyle.rules.height * 8,
  },
  iconAvatar: {
    backgroundColor: theme.secondary.s3,
    border: '2px solid',
    borderColor: theme.secondary.s7,
    borderRadius: '24px',
    height: '40px',
    width: '40px',
  },
  group: {
    height: '24px',
    left: '12px',
    position: 'relative',
    top: '8px',
    width: '26px',
  },
  overlapGroup: {
    height: '24px',
    position: 'relative',
    width: '22px',
  },
  textWrapper: {
    color: theme.primary.p9,
    fontFamily: styleguide.textStyles['h3-headline'].fontFamily,
    // fontSize: styleguide.textStyles['h3-headline'].fontSize,
    fontSize: '18px',
    fontStyle: styleguide.textStyles['h3-headline'].fontStyle,
    // fontWeight: styleguide.textStyles['h3-headline'].fontWeight,
    fontWeight: '400',
    height: '24px',
    left: '-2px',
    letterSpacing: styleguide.textStyles['h3-headline'].letterSpacing,
    lineHeight: styleguide.textStyles['h3-headline'].lineHeight,
    opacity: 0.6,
    position: 'absolute',
    top: '0',
    whiteSpace: 'nowrap',
  },

  div: {
    color: theme.primary.p9,
    fontFamily: styleguide.textStyles['h3-headline'].fontFamily,
    // fontSize: styleguide.textStyles['h3-headline'].fontSize,
    fontStyle: styleguide.textStyles['h3-headline'].fontStyle,
    fontSize: '18px',
    // fontWeight: styleguide.textStyles['h3-headline'].fontWeight,
    fontWeight: '400',
    height: '24px',
    left: '8px',
    letterSpacing: styleguide.textStyles['h3-headline'].letterSpacing,
    lineHeight: styleguide.textStyles['h3-headline'].lineHeight,
    opacity: 0.6,
    position: 'absolute',
    top: '0',
    whiteSpace: 'nowrap',
  },
  div3: {
    color: theme.primary.p9,
    fontFamily: styleguide.textStyles['h3-headline'].fontFamily,
    // fontSize: styleguide.textStyles['h3-headline'].fontSize,
    fontSize: '18px',
    fontStyle: styleguide.textStyles['h3-headline'].fontStyle,
    // fontWeight: styleguide.textStyles['h3-headline'].fontWeight,
    fontWeight: '400',
    height: '24px',
    left: '17px',
    letterSpacing: styleguide.textStyles['h3-headline'].letterSpacing,
    lineHeight: styleguide.textStyles['h3-headline'].lineHeight,
    opacity: 0.6,
    position: 'absolute',
    top: '0',
    whiteSpace: 'nowrap',
  },
  uploadWorkspaceInput: {
    opacity: 0,
    position: 'absolute',
    top: -1000,
    right: -1000,
  },
  uploadWorkspaceLabel: {
    position: 'absolute',
  },

  oneInitial: {
    left: '16px',
  },

  twoInitials: {
    left: '10px',
  },

  threeInitials: {
    left: '7px',
  },
}));

const isWindows = isWindowsOS();
const OPEN_APP_ENABLED = isWindows; // && !isElectron();

export interface ToolbarMenuProps {
  className?: string;
}

export function ToolbarMenu({ className }: ToolbarMenuProps) {
  const styles = useStyles();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const graph = useGraphManager();

  const openSettings = useCallback(() => {
    navigate('/settings/personal-info/General');
  }, [navigate]);

  const onChange = useCallback(async () => {
    if (!inputRef.current) {
      return;
    }
    const files = inputRef.current.files;
    if (!files || !files.length) {
      return;
    }
    for (const f of files) {
      const json = JSON.parse(await f.text());
      Workspace.createFromJSON(graph, json);
    }
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        key="wsFileInput"
        className={cn(styles.uploadWorkspaceInput)}
        type="file"
        accept=".json"
        onChange={onChange}
        multiple={true}
      />
      <Menu
        className={className}
        popupClassName={cn(styles.menu)}
        renderButton={() => <IconAvatar />}
        position="bottom"
      >
        <MenuItem onClick={() => inputRef.current?.click()}>
          Upload Workspace...
        </MenuItem>
        <MenuItem onClick={openSettings}>Settings</MenuItem>
        {
          <MenuItem onClick={() => IDBRepositoryBackup.logout()}>
            Sign out of Ovvio
          </MenuItem>
        }
      </Menu>
    </div>
  );
}

export interface OvvioHeaderProps {
  className?: any;
}

export const IconAvatar: React.FC = () => {
  const styles = useStyles();
  const userData = usePartialRootUser('name', 'email');

  // const initials = getInitials(userData.name, userData.email);

  const initials = getInitials(userData.name, userData.email);
  let initialsClass = '';
  switch (initials.length) {
    case 1:
      initialsClass = styles.oneInitial;
      break;
    case 2:
      initialsClass = styles.twoInitials;

      break;
    case 3:
      initialsClass = styles.threeInitials;
      break;
    default:
    // default class or handling
  }

  return (
    <div className={styles.iconAvatar}>
      <div className={`${styles.group}  ${initialsClass}`}>
        <div className={styles.overlapGroup}>
          {initials.split('').map((initial, index) => (
            <div
              key={index}
              className={
                index === 0
                  ? styles.textWrapper
                  : index === 1
                  ? styles.div
                  : styles.div3
              }
            >
              {initial}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getInitials(name: string, email: string): string {
  if (!name && email) {
    return email.substring(0, 2).toUpperCase();
  }

  const names = name.split(' ');
  let initials = names
    .slice(0, 3)
    .map((n) => n && n[0].toUpperCase())
    .join('');

  return initials;
}

// export default function OvvioHeader({ className }: OvvioHeaderProps) {
//   const styles = useStyles();
//   const graph = useGraphManager();
//   const { results } = useExistingQuery(graph.sharedQueriesManager.workspaces);
//   const navigate = useNavigate();
//   const logger = useLogger();
//   const workspaces = usePartialVertices(results, ['name']);
//   // const selected = workspaces.filter((x) => x.selected);
//
//   const title = (function () {
//     switch (selected.length) {
//       case workspaces.length: {
//         return 'AlWWWWl Workspaces';
//       }
//       case 0: {
//         return '';
//       }
//       case 1: {
//         return selected[0].name;
//       }
//       default: {
//         return 'Multiple Workspaces';
//       }
//     }
//   })();
//
//   const ovvioHeaderClicked = useCallback(() => {
//     logger.log({
//       severity: 'EVENT',
//       event: 'Click',
//       source: 'toolbar:logo',
//     });
//     navigate('/');
//   }, [logger, navigate]);
//
//   return (
//     <div className={cn(styles.headerRoot)}>
//       <div className={cn(styles.headerContent)}>
//         <Button className={cn(styles.headerText)} onClick={ovvioHeaderClicked}>
//           {title}
//         </Button>
//       </div>
//     </div>
//   );
// }
