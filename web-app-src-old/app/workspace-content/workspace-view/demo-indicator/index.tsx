import React, { useEffect, useState } from 'react';
import { makeStyles, cn } from '@ovvio/styles/lib/css-objects';
import { layout, styleguide } from '@ovvio/styles';
import {
  RaisedButton,
  RaisedButtonColor,
} from '@ovvio/styles/lib/components/buttons';
import Layer from '@ovvio/styles/lib/components/layer';
import localization from './demo.strings.json';
import { createUseStrings } from 'core/localization';
import { useGraphManager } from 'core/cfds/react/graph';
import { Query } from '@ovvio/cfds/lib/client/graph/query';
import {
  ContentVertex,
  Note,
  User,
  Workspace,
} from '@ovvio/cfds/lib/client/graph/vertices';
import { OnboardingStep } from '@ovvio/cfds/lib/base/scheme-versions';
import { ReadonlyJSONObject } from '@ovvio/base/lib/utils/interfaces';
import { useHistoryStatic } from 'core/react-utils/history';
import { NS_NOTES, NS_WORKSPACE } from '@ovvio/cfds';
import { brandLightTheme as theme } from '@ovvio/styles/lib/theme';
import { Label, Text } from '@ovvio/styles/lib/components/typography';
import { useEventLogger } from 'core/analytics';
const Illustration = React.lazy(() => import('./demo-illustration'));

const useStyles = makeStyles(
  () => ({
    root: {
      position: 'absolute',
      bottom: styleguide.gridbase * 4,
      right: styleguide.gridbase * 4,
      alignItems: 'center',
      basedOn: [layout.column],
    },
    illustration: {
      position: 'relative',
      top: styleguide.gridbase * 2,
      zIndex: -1,
    },
    confirmation: {
      padding: [0, styleguide.gridbase * 4],
      textAlign: 'center',
      background: theme.primary.p3,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      clipPath:
        'path("M235.237 95.8789C235.068 95.1648 234.899 94.4536 234.719 93.7424C234.664 93.5142 234.609 93.286 234.551 93.0578C234.434 92.5955 234.315 92.1304 234.193 91.6677C233.066 87.2994 231.795 82.9552 230.515 78.6284C229.826 76.2932 229.102 73.9671 228.33 71.6584C225.59 63.4855 222.208 55.5282 217.367 48.1912C217.087 47.7642 216.802 47.3407 216.514 46.923C216.267 46.5642 216.021 46.2089 215.769 45.853C215.494 45.4677 215.22 45.0823 214.94 44.7033C214.666 44.3271 214.389 43.9534 214.107 43.583C214.093 43.5622 214.079 43.5443 214.065 43.5269C213.796 43.1745 213.528 42.8215 213.256 42.4748C213.217 42.4275 213.181 42.3801 213.143 42.3327C212.954 42.0895 212.763 41.8497 212.569 41.6094C212.414 41.4107 212.256 41.2153 212.093 41.0195C211.968 40.8624 211.838 40.7082 211.708 40.5515C211.545 40.3499 211.379 40.1512 211.21 39.9529C211.096 39.8166 210.979 39.6774 210.86 39.541C210.686 39.3336 210.508 39.1262 210.331 38.9217C210.051 38.5987 209.769 38.2786 209.481 37.9556C209.271 37.7158 209.055 37.4784 208.839 37.2415C208.744 37.141 208.653 37.0399 208.559 36.9364C208.376 36.7377 208.193 36.5395 208.008 36.3466C206.95 35.2113 205.858 34.1061 204.739 33.0274C204.487 32.7842 204.235 32.5415 203.978 32.3041C203.596 31.9396 203.21 31.5808 202.82 31.2283C202.712 31.1278 202.604 31.0296 202.496 30.932C202.424 30.8667 202.352 30.8014 202.28 30.7395C202.205 30.6714 202.13 30.6061 202.055 30.5408C201.72 30.2386 201.382 29.9423 201.041 29.6459C200.997 29.6043 200.95 29.5656 200.903 29.5274C200.856 29.4858 200.809 29.4472 200.765 29.409C200.665 29.3229 200.566 29.2373 200.463 29.1513C199.582 28.3985 198.688 27.6636 197.776 26.9436C188.963 19.9823 178.681 14.5058 167.666 11.2698C167.574 11.2403 167.48 11.2137 167.389 11.1866C159.564 8.91664 151.374 7.7756 143.081 8.03669C138.314 8.18802 133.644 8.7566 129.074 9.66654C128.98 9.68443 128.888 9.70231 128.797 9.72262C115.973 12.3156 103.908 17.5934 92.5127 23.8643C92.4185 23.9146 92.3271 23.9677 92.2357 24.0185C87.7349 26.5017 83.3418 29.1421 79.0458 31.8303C78.8879 31.928 78.7327 32.029 78.5748 32.1267C77.5169 32.7905 76.4643 33.4572 75.4172 34.1269C70.1046 37.52 64.8477 40.99 59.5379 44.3861C58.6849 44.9315 57.8319 45.4797 56.976 46.0188C56.879 46.0812 56.7848 46.1431 56.6878 46.2026C56.6128 46.2528 56.5355 46.3002 56.4577 46.3505C56.4441 46.3592 56.4272 46.3713 56.4108 46.38C55.5854 46.9017 54.7601 47.42 53.9291 47.933C53.0512 48.4784 52.1677 49.0146 51.281 49.542C48.6221 51.1245 45.8578 52.5291 42.7775 53.2611C39.897 53.9457 36.9442 54.2716 34.2107 55.4155C31.8453 56.4081 29.7127 57.8247 27.8098 59.4546C26.7463 60.3674 25.741 61.3392 24.7909 62.3618C24.4666 62.7114 24.1511 63.0643 23.8409 63.4226C23.5499 63.7548 23.2648 64.0922 22.985 64.436C21.1515 66.6707 19.5284 69.0679 18.052 71.48C12.5514 80.4623 9.23592 90.5736 8.28588 100.859C7.82609 105.835 7.91749 110.852 8.58492 115.81C8.60978 116.023 8.64024 116.237 8.67071 116.45C8.68995 116.589 8.7124 116.731 8.73444 116.871C8.78696 117.209 8.83987 117.546 8.898 117.884C9.71254 122.664 11.1248 127.302 12.8092 131.886C14.7894 137.277 17.0218 142.608 18.3655 148.177C19.0718 151.093 19.5148 154.065 19.5288 157.055C19.5453 160.122 19.1023 163.166 18.673 166.197C17.8893 171.709 17.1718 177.39 19.227 182.748C20.8444 186.967 23.8665 190.599 27.4871 193.514C37.986 205.443 53.2617 210.577 68.1969 212.005C76.051 212.757 83.9592 212.614 91.8361 212.633C99.8874 212.652 107.939 212.671 115.99 212.69C132.344 212.728 148.698 212.766 165.052 212.805C173.278 212.824 181.886 213.533 190.029 212.122C198.332 210.684 205.67 206.376 211.209 199.613C216.703 192.903 219.321 184.176 218.996 175.365C219.556 170.933 219.648 166.448 220.101 162.007C220.708 156.086 222.107 150.254 224.292 144.659C225.4 141.826 226.71 139.058 228.205 136.379C229.695 133.715 231.371 131.143 232.839 128.467C235.553 123.524 237.055 118.282 237.263 112.731C237.475 107.063 236.533 101.406 235.237 95.8789Z")',
      basedOn: [layout.column, layout.centerCenter],
    },
    confirmationHeader: {
      marginBottom: styleguide.gridbase,
    },
  }),
  'demo-indicator_8196ee'
);

const useStrings = createUseStrings(localization);

const kGettingStartedDataPromise: Promise<ReadonlyJSONObject> = fetch(
  '/bootstrap.json'
).then(response => response.json());

export function DemoIndicator({
  demoWorkspaces,
  className,
  setSelectedWorkspaces,
}: {
  demoWorkspaces: string[];
  className?: string;
  setSelectedWorkspaces: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const styles = useStyles();
  const strings = useStrings();
  const history = useHistoryStatic();
  const eventLogger = useEventLogger();

  const [isProcessing, setIsProcessing] = useState(false);
  const graph = useGraphManager();
  const [isInDelete, setIsInDelete] = useState(false);

  useEffect(() => {
    if (!isInDelete) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsInDelete(false);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isInDelete]);

  const cleanDemo = async () => {
    if (!isInDelete) {
      eventLogger.action('DEMO_CLEAR_STARTED', {});
      setIsInDelete(true);
      return;
    }
    if (isProcessing) {
      return;
    }
    setIsProcessing(true);

    const demoData = await Query.async(
      graph,
      x =>
        x instanceof Workspace
          ? demoWorkspaces.includes(x.key)
          : x instanceof ContentVertex
          ? demoWorkspaces.includes(x.workspaceKey)
          : false,
      undefined,
      'DeleteDemoData'
    );
    for (const manager of demoData) {
      manager.getVertexProxy().isDeleted = 1;
    }
    const data = await kGettingStartedDataPromise;

    const vertices = graph.importSubGraph(data, false);
    vertices.forEach(mgr => {
      if (mgr.namespace === NS_NOTES) {
        mgr.getVertexProxy<Note>().rewritePinsToRootUser();
      }
    });
    const newWorkspaces = vertices.filter(
      mgr => mgr.namespace === NS_WORKSPACE
    );
    const userVertex = graph.getRootVertex<User>();

    userVertex.onboardingStep = OnboardingStep.Finish;
    const userWorkspaces = new Set(userVertex.workspaces);
    newWorkspaces.forEach(x =>
      userWorkspaces.add(x.getVertexProxy() as Workspace)
    );
    userVertex.workspaces = userWorkspaces;
    const workspaceKeys = newWorkspaces.map(mgr => mgr.key);
    eventLogger.action('DEMO_CLEAR_DONE', {});
    setSelectedWorkspaces(workspaceKeys);

    history.$history.push({
      search: `?selectedWorkspaces=${workspaceKeys.join(',')}&type=note`,
    });
    setIsProcessing(false);
  };

  return (
    <Layer>
      {style => (
        <div className={cn(styles.root, className)} style={style}>
          <div className={cn(styles.illustration)}>
            <Illustration />
            {isInDelete && (
              <div className={cn(styles.confirmation)}>
                <Label className={cn(styles.confirmationHeader)}>
                  {strings.areYouFinished}
                </Label>
                <Text>{strings.areYouFinishedText}</Text>
              </div>
            )}
          </div>
          <RaisedButton
            processing={isProcessing}
            color={RaisedButtonColor.Secondary}
            onClick={cleanDemo}
          >
            {strings.startFresh}
          </RaisedButton>
        </div>
      )}
    </Layer>
  );
}
