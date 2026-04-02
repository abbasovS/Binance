import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // YENİ: Toast import edildi
import { adminApi } from '../../../api';

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState(null);
    const [broadcastText, setBroadcastText] = useState("");

    const navigate = useNavigate();

    // Datanı çəkən funksiyanı useCallback ilə əhatə edirik
    const fetchAdminData = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/');
                return;
            }

            setLoading(true);

            const [dashRes, usersRes] = await Promise.all([
                adminApi.getDashboard().catch(() => ({ data: 'SYSTEM ONLINE' })),
                adminApi.getUsers().catch(() => ({ data: [] })) // <--- BUNU ƏLAVƏ ETMƏLİSƏN
            ]);
            const safeMessage = typeof dashRes.data === 'string' ? dashRes.data : JSON.stringify(dashRes.data);
            setMessage(safeMessage);

            const safeUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
            setUsers(safeUsers);

        } catch (err) {
            console.error("Admin məlumatları çəkilərkən xəta:", err);

            // Əgər istifadəçinin Admin səlahiyyəti yoxdursa (403)
            if (err.response?.status === 403) {
                toast.error("Giriş qadağandır! Sizin Admin səlahiyyətiniz yoxdur.");
                navigate('/');
            } else {
                setError(err.response?.data?.message || err.message || "Sistem xətası baş verdi.");
                toast.error("Sistem xətası baş verdi. Databaza yüklənə bilmir.");
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchAdminData();
    }, [fetchAdminData]);

    // --- FUNKSİYALAR ---

    // 1. STATUSU DƏYİŞ (Ban/Unban)
    const handleToggleStatus = async (userId) => {
        if (!window.confirm("Bu istifadəçinin statusunu dəyişmək istədiyinizə əminsiniz?")) return;

        try {
            await adminApi.toggleStatus(userId);
            toast.success("İstifadəçi statusu yeniləndi!");
            fetchAdminData();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || "Status dəyişdirilərkən xəta baş verdi.";
            toast.error(errorMsg);
        }
    };

    // 2. ROLU DƏYİŞ (Admin/User)
    const handleChangeRole = async (userId, currentRole) => {
        const newRole = currentRole === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
        if (!window.confirm(`İstifadəçiyə ${newRole} səlahiyyəti verilsin?`)) return;

        try {
            await adminApi.changeRole(userId, newRole);
            toast.success(`İstifadəçi rolu ${newRole} olaraq təyin edildi.`);
            fetchAdminData();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || "Rol dəyişdirilərkən xəta baş verdi.";
            toast.error(errorMsg);
        }
    };

    // 3. PREMIUM STATUSUNU DƏYİŞ
    const handleTogglePremium = async (userId) => {
        try {
            await adminApi.togglePremium(userId);
            toast.success("Premium status uğurla dəyişdirildi.");
            fetchAdminData();
        } catch (err) {
            toast.error("Premium status dəyişdirilərkən xəta baş verdi!");
        }
    };

    // 4. TURNİRƏ İSTİFADƏÇİ ƏLAVƏ ET / ÇIXAR
    const handleToggleTournament = async (userId) => {
        try {
            await adminApi.toggleTournament(userId);
            toast.success("Turnir iştirakı yeniləndi.");
            fetchAdminData();
        } catch (err) {
            toast.error("Turnir statusu dəyişdirilə bilmədi.");
        }
    };

    // 5. TURNİR İDARƏETMƏSİ (Başlat/Bitir)
    const handleTournament = async (action) => {
        if (!window.confirm(`Turniri ${action === 'start' ? 'başlatmaq' : 'bitirmək'} istəyirsiniz?`)) return;

        try {
            await adminApi.controlTournament(action);
            toast.success(`Turnir uğurla ${action === 'start' ? 'başladıldı' : 'bitirildi'}!`);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data || "Turnir əməliyyatı uğursuz oldu.";
            toast.error(errorMsg);
        }
    };

    // 6. QLOBAL MESAJ GÖNDƏR
    const handleBroadcast = async () => {
        if(!broadcastText.trim()) {
            toast("Mətn xanası boşdur. Mesaj daxil edin.", { icon: '⚠️' });
            return;
        }

        try {
            await adminApi.broadcast(broadcastText);
            toast.success("Mesaj bütün istifadəçilərə göndərildi!");
            setBroadcastText("");
        } catch (err) {
            toast.error("Mesaj göndərilə bilmədi. Server bağlantısını yoxlayın.");
        }
    };

    if (error) {
        return (
            <div style={{ minHeight: '100vh', background: '#0b0e11', color: '#f84960', padding: '50px', textAlign: 'center' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>⚠️</div>
                <h2 style={{ color: '#fff' }}>Sistem Xətası Baş Verdi!</h2>
                <p style={{ color: '#848e9c' }}>{error}</p>
                <button onClick={() => navigate('/')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 25px', borderRadius: '8px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}>Sistemə Qayıt</button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#080a0c', color: '#fff', padding: '40px' }}>

            {/* HEADER HİSSƏSİ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
                <div>
                    <h1 style={{ color: '#fff', fontSize: '36px', margin: '0 0 8px 0', letterSpacing: '-1px' }}>
                        NEXUS <span style={{ color: '#fcd535' }}>Command Center</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#02c076', boxShadow: '0 0 10px #02c076', animation: 'pulse 2s infinite' }}></div>
                        <p style={{ color: '#848e9c', fontSize: '13px', margin: 0, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {message || 'SYSTEM ONLINE'}
                        </p>
                    </div>
                </div>
                <button onClick={() => navigate('/')} style={{
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6',
                    padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '800', transition: 'all 0.2s ease', letterSpacing: '0.5px'
                }} onMouseOver={(e) => { e.target.style.background='rgba(59, 130, 246, 0.2)'; e.target.style.transform='translateY(-2px)'}} onMouseOut={(e) => { e.target.style.background='rgba(59, 130, 246, 0.1)'; e.target.style.transform='translateY(0)'}}>
                    ← EXIT TERMINAL
                </button>
            </div>

            {/* TURNİR VƏ SİSTEM İDARƏETMƏSİ */}
            <div style={{ display: 'flex', gap: '24px', marginBottom: '40px' }}>
                <div style={{ flex: 1, background: 'linear-gradient(145deg, #161a1e 0%, #0b0e11 100%)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(252, 213, 53, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, color: '#fcd535', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>🏆</span> Tournament Engine
                        </h4>
                        <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#848e9c', fontWeight: 'bold' }}>GLOBAL EVENT</span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>Paper Trading turnirini başlatmaq və ya dondurmaq üçün idarəetmə paneli.</p>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={() => handleTournament('start')} style={{ flex: 1, background: 'linear-gradient(90deg, #02c076 0%, #00a563 100%)', color: '#fff', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 15px rgba(2, 192, 118, 0.3)' }} onMouseOver={(e)=>e.target.style.transform='translateY(-2px)'} onMouseOut={(e)=>e.target.style.transform='translateY(0)'}>INITIATE</button>
                        <button onClick={() => handleTournament('stop')} style={{ flex: 1, background: 'transparent', color: '#f84960', border: '1px solid rgba(248, 73, 96, 0.5)', padding: '14px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e)=>{e.target.style.background='rgba(248, 73, 96, 0.1)'; e.target.style.transform='translateY(-2px)'}} onMouseOut={(e)=>{e.target.style.background='transparent'; e.target.style.transform='translateY(0)'}}>TERMINATE</button>
                    </div>
                </div>

                <div style={{ flex: 1, background: 'linear-gradient(145deg, #161a1e 0%, #0b0e11 100%)', padding: '25px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.15)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '24px' }}>📢</span>
                        <h4 style={{ margin: 0, color: '#3b82f6', fontSize: '18px' }}>Global Broadcast</h4>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px', lineHeight: '1.5' }}>Bütün istifadəçilərin terminalında görünəcək təcili sistem mesajı göndərin.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            value={broadcastText}
                            onChange={(e) => setBroadcastText(e.target.value)}
                            placeholder="Mesajı bura yazın..."
                            style={{ flex: 1, background: '#080a0c', border: '1px solid #2b3139', padding: '14px', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px' }}
                        />
                        <button onClick={handleBroadcast} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0 25px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }} onMouseOver={(e)=>e.target.style.transform='translateY(-2px)'} onMouseOut={(e)=>e.target.style.transform='translateY(0)'}>SEND</button>
                    </div>
                </div>
            </div>

            {/* İSTİFADƏÇİLƏRİN SİYAHISI */}
            <div style={{
                background: '#12161a', border: '1px solid #2b3139',
                borderRadius: '20px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h3 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '22px' }}>User Database</h3>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Manage access, roles, tournaments and premium subscriptions.</p>
                    </div>
                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '800', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        TOTAL REGISTRATIONS: {users ? users.length : 0}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#848e9c', fontSize: '16px', fontWeight: '600' }}>DATABAZA YÜKLƏNİR...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', textAlign: 'left' }}>
                            <thead>
                            <tr style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Email Address</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Phone</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Clearance (Role)</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Telegram</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Arena</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700' }}>Subscription</th>
                                <th style={{ padding: '0 15px 15px 15px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {/* DÜZƏLİŞ: Təhlükəsiz massiv yoxlanışı edildi */}
                            {(users || []).map(user => (
                                <tr key={user.id} style={{ background: '#161a1e', transition: 'all 0.2s ease' }}>

                                    {/* EMAİL */}
                                    <td style={{ padding: '16px 15px', borderRadius: '12px 0 0 12px', fontWeight: '700', color: '#e2e8f0', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139', borderLeft: '1px solid #2b3139' }}>
                                        {user.email}
                                    </td>

                                    {/* NÖMRƏ */}
                                    <td style={{ padding: '16px 15px', color: '#94a3b8', fontSize: '14px', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139' }}>
                                        {user.phoneNumber || 'Unverified'}
                                    </td>

                                    {/* ROL */}
                                    <td style={{ padding: '16px 15px', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139' }}>
                                        <span
                                            onClick={() => handleChangeRole(user.id, user.role)}
                                            style={{
                                                background: user.role === 'ROLE_ADMIN' ? 'rgba(252, 213, 53, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                                color: user.role === 'ROLE_ADMIN' ? '#fcd535' : '#94a3b8',
                                                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800',
                                                border: `1px solid ${user.role === 'ROLE_ADMIN' ? 'rgba(252, 213, 53, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`,
                                                cursor: 'pointer', transition: '0.2s'
                                            }} title="Rolu dəyişmək üçün klikləyin" onMouseOver={(e)=>e.target.style.transform='scale(1.05)'} onMouseOut={(e)=>e.target.style.transform='scale(1)'}>
                                            {user.role ? user.role.replace('ROLE_', '') : 'USER'}
                                        </span>
                                    </td>

                                    {/* TELEGRAM */}
                                    <td style={{ padding: '16px 15px', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139' }}>
                                        {user.telegramChatId ?
                                            <span style={{background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '6px', borderRadius: '6px', fontSize: '14px', border: '1px solid rgba(34, 197, 94, 0.3)'}}>🔗</span> :
                                            <span style={{color: '#475569', fontSize: '18px'}}>—</span>}
                                    </td>

                                    {/* ARENA */}
                                    <td style={{ padding: '16px 15px', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139' }}>
                                        <button
                                            onClick={() => handleToggleTournament(user.id)}
                                            style={{
                                                background: user.inTournament ? 'rgba(2, 192, 118, 0.1)' : 'transparent',
                                                color: user.inTournament ? '#02c076' : '#64748b',
                                                border: user.inTournament ? '1px solid rgba(2, 192, 118, 0.4)' : '1px solid #334155',
                                                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: '0.2s'
                                            }} onMouseOver={(e)=>e.target.style.transform='scale(1.05)'} onMouseOut={(e)=>e.target.style.transform='scale(1)'}>
                                            {user.inTournament ? '🏆 IN ARENA' : 'ADD TO ARENA'}
                                        </button>
                                    </td>

                                    {/* SUBSCRIPTION */}
                                    <td style={{ padding: '16px 15px', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139' }}>
                                        <button
                                            onClick={() => handleTogglePremium(user.id)}
                                            style={{
                                                background: user.premium ? 'linear-gradient(90deg, #d4af37 0%, #fcd535 100%)' : 'transparent',
                                                color: user.premium ? '#000' : '#64748b',
                                                border: user.premium ? 'none' : '1px solid #334155',
                                                padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: '0.2s',
                                                boxShadow: user.premium ? '0 0 15px rgba(252, 213, 53, 0.4)' : 'none'
                                            }} onMouseOver={(e)=>e.target.style.transform='scale(1.05)'} onMouseOut={(e)=>e.target.style.transform='scale(1)'}>
                                            {user.premium ? 'PRO TIER' : 'FREE TIER'}
                                        </button>
                                    </td>

                                    {/* İDARƏ (BLOCK/RESTORE) */}
                                    <td style={{ padding: '16px 15px', textAlign: 'right', borderRadius: '0 12px 12px 0', borderTop: '1px solid #2b3139', borderBottom: '1px solid #2b3139', borderRight: '1px solid #2b3139' }}>
                                        <button
                                            onClick={() => handleToggleStatus(user.id)}
                                            style={{
                                                background: 'transparent', border: `1px solid ${user.active ? 'rgba(248, 73, 96, 0.4)' : 'rgba(2, 192, 118, 0.4)'}`,
                                                color: user.active ? '#f84960' : '#02c076',
                                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '800', transition: '0.2s'
                                            }} onMouseOver={(e)=>e.target.style.background = user.active ? 'rgba(248, 73, 96, 0.1)' : 'rgba(2, 192, 118, 0.1)'} onMouseOut={(e)=>e.target.style.background = 'transparent'}>
                                            {user.active ? 'BLOCK ACCESS' : 'RESTORE ACCESS'}
                                        </button>
                                    </td>

                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>
                {`
                    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
                `}
            </style>
        </div>
    );
};

export default AdminPage;