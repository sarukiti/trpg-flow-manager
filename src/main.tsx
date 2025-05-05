import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ReactFlowProvider } from 'reactflow'; // ReactFlowProvider をインポート

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* App を ReactFlowProvider でラップ */}
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  </React.StrictMode>,
)
