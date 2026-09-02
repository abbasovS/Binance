import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../../api';

const cardStyle = {
    background: 'linear-gradient(180deg, rgba(17,24,39,0.96) 0%, rgba(10,14,24,0.98) 100%)',
    border: '1px solid rgba(148,163,184,0.14)',
    borderRadius: '20px',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
};

const inputStyle = {
    width: '100%',
    background: 'rgba(2,6,23,0.84)',
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: '14px',
    padding: '14px 16px',
    color: '#e2e8f0',
    outline: 'none',
    boxSizing: 'border-box'
};

const primaryButtonStyle = {
    background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '14px',
    padding: '14px 18px',
    cursor: 'pointer',
    fontWeight: 800
};

const secondaryButtonStyle = {
    background: 'rgba(15,23,42,0.85)',
    border: '1px solid rgba(148,163,184,0.18)',
    color: '#e2e8f0',
    borderRadius: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    fontWeight: 700
};

const successButtonStyle = {
    background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '14px',
    padding: '14px 18px',
    cursor: 'pointer',
    fontWeight: 800,
    flex: 1
};

const dangerButtonStyle = {
    background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
    border: 'none',
    color: '#fff',
    borderRadius: '14px',
    padding: '14px 18px',
    cursor: 'pointer',
    fontWeight: 800,
    flex: 1
};

const smallButtonStyle = {
    background: 'rgba(30,41,59,0.9)',
    border: '1px solid rgba(148,163,184,0.16)',
    color: '#e2e8f0',
    borderRadius: '10px',
    padding: '9px 12px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '12px'
};

const getErrorMessage = (err, fallback) => {
    const data = err?.response?.data;

    if (typeof data === 'string' && data.trim()) {
        return data;
    }

    if (typeof data?.message === 'string' && data.message.trim()) {
        return data.message;
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
        return err.message;
    }

    return fallback;
};

function AdminPage() {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageReady, setPageReady] = useState(false);

    const [systemMessage, setSystemMessage] = useState('');
    const [broadcastForm, setBroadcastForm] = useState({
        title: '',
        message: '',
        type: 'SYSTEM',
        alsoPublishAsGlobalMessage: true
    });

    const [selectedUserId, setSelectedUserId] = useState('');
    const [userForm, setUserForm] = useState({
        title: '',
        message: '',
        type: 'INFO'
    });

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await adminApi.getUsers();
            setUsers(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            toast.error(getErrorMessage(err, 'Users could not be loaded'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const initAdminPage = async () => {
            try {
                await adminApi.getDashboard();

                if (!active) return;

                setPageReady(true);
                await loadUsers();
            } catch (err) {
                if (!active) return;

                if (err?.response?.status === 403) {
                    toast.error('Bu səhifəyə giriş icazəniz yoxdur.');
                    navigate('/', { replace: true });
                    return;
                }

                if (err?.response?.status === 401) {
                    toast.error('Sessiyanız bitib. Yenidən daxil olun.');
                    navigate('/', { replace: true });
                    return;
                }

                toast.error(getErrorMessage(err, 'Admin məlumatları yüklənə bilmədi.'));
                navigate('/', { replace: true });
            }
        };

        initAdminPage();

        return () => {
            active = false;
        };
    }, [loadUsers, navigate]);

    const stats = useMemo(() => {
        const total = users.length;
        const admins = users.filter((u) => u.role === 'ROLE_ADMIN').length;
        const premium = users.filter((u) => u.premiumUser).length;
        const active = users.filter((u) => u.active).length;

        return { total, admins, premium, active };
    }, [users]);

    const handleTournament = async (action) => {
        try {
            const res = await adminApi.controlTournament(action);
            toast.success(
                typeof res?.data === 'string' ? res.data : `Tournament ${action} success`
            );
        } catch (err) {
            toast.error(getErrorMessage(err, 'Tournament action failed'));
        }
    };

    const handleLegacyBroadcast = async () => {
        if (!systemMessage.trim()) {
            toast.error('Write a message first');
            return;
        }

        try {
            const res = await adminApi.broadcast(systemMessage.trim());
            toast.success(
                typeof res?.data === 'string' ? res.data : 'Legacy broadcast sent'
            );
            setSystemMessage('');
        } catch (err) {
            toast.error(getErrorMessage(err, 'Legacy broadcast failed'));
        }
    };

    const handleBroadcastNotification = async () => {
        if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
            toast.error('Title and message are required');
            return;
        }

        try {
            const res = await adminApi.broadcastNotification({
                title: broadcastForm.title.trim(),
                message: broadcastForm.message.trim(),
                type: broadcastForm.type,
                alsoPublishAsGlobalMessage: broadcastForm.alsoPublishAsGlobalMessage
            });

            toast.success(res?.data?.message || 'Broadcast notification sent');

            setBroadcastForm({
                title: '',
                message: '',
                type: 'SYSTEM',
                alsoPublishAsGlobalMessage: true
            });
        } catch (err) {
            toast.error(getErrorMessage(err, 'Broadcast notification failed'));
        }
    };

    const handleUserNotification = async () => {
        if (!selectedUserId) {
            toast.error('Select a user');
            return;
        }

        if (!userForm.title.trim() || !userForm.message.trim()) {
            toast.error('Title and message are required');
            return;
        }

        try {
            const res = await adminApi.sendNotificationToUser(selectedUserId, {
                title: userForm.title.trim(),
                message: userForm.message.trim(),
                type: userForm.type
            });

            toast.success(
                typeof res?.data === 'string'
                    ? res.data
                    : res?.data?.message || 'User notification sent'
            );

            setUserForm({
                title: '',
                message: '',
                type: 'INFO'
            });
        } catch (err) {
            toast.error(getErrorMessage(err, 'User notification failed'));
        }
    };

    const handleChangeRole = async (userId, currentRole) => {
        const nextRole = currentRole === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';

        try {
            await adminApi.changeRole(userId, nextRole);
            toast.success(`Role updated to ${nextRole}`);
            await loadUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Role update failed'));
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            await adminApi.toggleStatus(userId);
            toast.success('User status updated');
            await loadUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Status update failed'));
        }
    };

    const handleTogglePremium = async (userId) => {
        try {
            await adminApi.togglePremium(userId);
            toast.success('Premium updated');
            await loadUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Premium update failed'));
        }
    };

    const handleToggleTournament = async (userId) => {
        try {
            await adminApi.toggleTournament(userId);
            toast.success('Tournament flag updated');
            await loadUsers();
        } catch (err) {
            toast.error(getErrorMessage(err, 'Tournament flag update failed'));
        }
    };

    if (!pageReady && loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                        'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%), radial-gradient(circle at top right, rgba(168,85,247,0.08), transparent 22%), #060913',
                    color: '#e5e7eb'
                }}
            >
                Admin panel loading...
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background:
                    'radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%), radial-gradient(circle at top right, rgba(168,85,247,0.08), transparent 22%), #060913',
                color: '#e5e7eb',
                padding: '32px'
            }}
        >
            <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '20px',
                        marginBottom: '28px'
                    }}
                >
                    <div>
                        <div
                            style={{
                                color: '#94a3b8',
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.18em',
                                marginBottom: '8px'
                            }}
                        >
                            Admin Control Center
                        </div>
                        <h1 style={{ margin: 0, fontSize: '34px', color: '#f8fafc' }}>
                            MockFolio Notifications
                        </h1>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        style={{
                            border: '1px solid rgba(148,163,184,0.18)',
                            background: 'rgba(15,23,42,0.9)',
                            color: '#e2e8f0',
                            borderRadius: '12px',
                            padding: '12px 18px',
                            cursor: 'pointer',
                            fontWeight: 700
                        }}
                    >
                        Back to dashboard
                    </button>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gap: '16px',
                        marginBottom: '22px'
                    }}
                >
                    {[
                        ['Total Users', stats.total],
                        ['Admins', stats.admins],
                        ['Premium', stats.premium],
                        ['Active', stats.active]
                    ].map(([label, value]) => (
                        <div key={label} style={cardStyle}>
                            <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>
                                {label}
                            </div>
                            <div style={{ fontSize: '30px', fontWeight: 800 }}>{value}</div>
                        </div>
                    ))}
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1.1fr 0.9fr',
                        gap: '18px',
                        marginBottom: '22px'
                    }}
                >
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '18px' }}>Broadcast notification</h3>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <input
                                value={broadcastForm.title}
                                onChange={(e) =>
                                    setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                                placeholder="Title"
                                style={inputStyle}
                            />

                            <textarea
                                value={broadcastForm.message}
                                onChange={(e) =>
                                    setBroadcastForm((prev) => ({ ...prev, message: e.target.value }))
                                }
                                placeholder="Message"
                                rows={5}
                                style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <select
                                    value={broadcastForm.type}
                                    onChange={(e) =>
                                        setBroadcastForm((prev) => ({ ...prev, type: e.target.value }))
                                    }
                                    style={inputStyle}
                                >
                                    <option value="INFO">INFO</option>
                                    <option value="SUCCESS">SUCCESS</option>
                                    <option value="WARNING">WARNING</option>
                                    <option value="ERROR">ERROR</option>
                                    <option value="SYSTEM">SYSTEM</option>
                                </select>

                                <label
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: '#cbd5e1'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={broadcastForm.alsoPublishAsGlobalMessage}
                                        onChange={(e) =>
                                            setBroadcastForm((prev) => ({
                                                ...prev,
                                                alsoPublishAsGlobalMessage: e.target.checked
                                            }))
                                        }
                                    />
                                    Also publish as global banner
                                </label>
                            </div>

                            <button onClick={handleBroadcastNotification} style={primaryButtonStyle}>
                                Send to all users
                            </button>
                        </div>
                    </div>

                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '18px' }}>Tournament & legacy tools</h3>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => handleTournament('start')} style={successButtonStyle}>
                                    Start tournament
                                </button>
                                <button onClick={() => handleTournament('stop')} style={dangerButtonStyle}>
                                    Stop tournament
                                </button>
                            </div>

                            <input
                                value={systemMessage}
                                onChange={(e) => setSystemMessage(e.target.value)}
                                placeholder="Legacy global message"
                                style={inputStyle}
                            />

                            <button onClick={handleLegacyBroadcast} style={secondaryButtonStyle}>
                                Send legacy banner
                            </button>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '0.95fr 1.05fr',
                        gap: '18px'
                    }}
                >
                    <div style={cardStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '18px' }}>Send to single user</h3>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">Select user</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.email}
                                    </option>
                                ))}
                            </select>

                            <input
                                value={userForm.title}
                                onChange={(e) =>
                                    setUserForm((prev) => ({ ...prev, title: e.target.value }))
                                }
                                placeholder="Title"
                                style={inputStyle}
                            />

                            <textarea
                                value={userForm.message}
                                onChange={(e) =>
                                    setUserForm((prev) => ({ ...prev, message: e.target.value }))
                                }
                                placeholder="Message"
                                rows={5}
                                style={{ ...inputStyle, resize: 'vertical', minHeight: '120px' }}
                            />

                            <select
                                value={userForm.type}
                                onChange={(e) =>
                                    setUserForm((prev) => ({ ...prev, type: e.target.value }))
                                }
                                style={inputStyle}
                            >
                                <option value="INFO">INFO</option>
                                <option value="SUCCESS">SUCCESS</option>
                                <option value="WARNING">WARNING</option>
                                <option value="ERROR">ERROR</option>
                                <option value="SYSTEM">SYSTEM</option>
                            </select>

                            <button onClick={handleUserNotification} style={primaryButtonStyle}>
                                Send to selected user
                            </button>
                        </div>
                    </div>

                    <div style={cardStyle}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '18px'
                            }}
                        >
                            <h3 style={{ margin: 0 }}>Users</h3>
                            <button onClick={loadUsers} style={secondaryButtonStyle}>
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div style={{ color: '#94a3b8' }}>Loading users...</div>
                        ) : (
                            <div
                                style={{
                                    maxHeight: '680px',
                                    overflowY: 'auto',
                                    display: 'grid',
                                    gap: '12px'
                                }}
                            >
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        style={{
                                            border: '1px solid rgba(148,163,184,0.12)',
                                            background: 'rgba(15,23,42,0.72)',
                                            borderRadius: '16px',
                                            padding: '16px'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                marginBottom: '6px',
                                                color: '#f8fafc'
                                            }}
                                        >
                                            {user.email}
                                        </div>

                                        <div
                                            style={{
                                                fontSize: '13px',
                                                color: '#94a3b8',
                                                marginBottom: '12px'
                                            }}
                                        >
                                            {user.phoneNumber || 'No phone'} • {user.role} •{' '}
                                            {user.active ? 'ACTIVE' : 'INACTIVE'}
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => handleChangeRole(user.id, user.role)}
                                                style={smallButtonStyle}
                                            >
                                                Toggle role
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(user.id)}
                                                style={smallButtonStyle}
                                            >
                                                Toggle status
                                            </button>
                                            <button
                                                onClick={() => handleTogglePremium(user.id)}
                                                style={smallButtonStyle}
                                            >
                                                Toggle premium
                                            </button>
                                            <button
                                                onClick={() => handleToggleTournament(user.id)}
                                                style={smallButtonStyle}
                                            >
                                                Toggle tournament
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;