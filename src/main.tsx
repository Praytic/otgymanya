import React from 'react';
import ReactDOM from 'react-dom/client';
import {Client as Styletron} from 'styletron-engine-atomic';
import {Provider as StyletronProvider} from 'styletron-react';
import {BaseProvider, LightTheme} from 'baseui';
import App from './App';
import './styles.css';

import {initializeTelegram} from './lib/telegram';
initializeTelegram();
const engine = new Styletron();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><StyletronProvider value={engine}><BaseProvider theme={LightTheme}><App/></BaseProvider></StyletronProvider></React.StrictMode>);
