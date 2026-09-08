import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import Overview from './pages/Overview';
import Settlements from './pages/Settlements';
import Merchants from './pages/Merchants';
import MerchantDetail from './pages/MerchantDetail';
import AuditLog from './pages/AuditLog';
import Tools from './pages/Tools';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="app-shell">
          <Sidebar />
          <main className="page-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/merchants" element={<Merchants />} />
              <Route path="/merchants/:merchantId" element={<MerchantDetail />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/tools" element={<Tools />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
