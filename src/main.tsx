import React from 'react';
import ReactDOM from 'react-dom/client';
import {AppProviders} from 'prayticland-ui-libs/providers';
import App from './App';
import 'prayticland-ui-libs/tokens.css';
import './styles.css';
import 'prayticland-ui-libs/fonts.css';

import {initializeTelegram} from './lib/telegram';
initializeTelegram();
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppProviders><App/></AppProviders></React.StrictMode>);
