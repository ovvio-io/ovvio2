import { render } from 'react-dom';
import './index.css';
import AppAsync from './app/app-async';
import { unregister as unregisterServiceWorker } from './registerServiceWorker';
import { Userpilot } from 'userpilot';
import { Features, isFeatureActive } from 'core/feature-toggle';

if (isFeatureActive(Features.Userpilot)) {
  Userpilot.initialize('NX-4b46e263');
}

render(<AppAsync />, document.getElementById('root'));
unregisterServiceWorker();

// Pre-fetch demo data so it exists in cache when we really need it
fetch('/demo.json');
fetch('/getting-started.json');
