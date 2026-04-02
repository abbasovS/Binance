import { Routes, Route } from 'react-router-dom';
import UserPage from '../features/user/pages/UserPage';
import TradeMsPage from '../features/trade/pages/TradeMsPage';
import TradeTerminalPage from '../features/trade/pages/TradeTerminalPage';
import AdminPage from '../features/user/admin/AdminPage';
import PrivacyPolicy from '../features/user/components/PrivacyPolicy';
import AuthForm from '../features/user/components/AuthForm';

function App() {
    return (
        <Routes>
            <Route path="/" element={<UserPage />} />
            <Route path="/trade-ms" element={<TradeMsPage />} />
            <Route path="/terminal" element={<TradeTerminalPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
    );
}

export default App;
