import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AblyProvider, ChannelProvider } from 'ably/react';
import { ably } from './ably-client.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AblyProvider client={ably}>
    <ChannelProvider channelName="echo">           
    <App />
    </ChannelProvider>
    </AblyProvider>
  </StrictMode>
)
