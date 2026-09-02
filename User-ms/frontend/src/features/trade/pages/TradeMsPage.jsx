import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Leaderboard from '../components/Leaderboard';
import { tradeApi } from '../../../api';
import '../../../shared/styles/Trade.css';
import toast from 'react-hot-toast'
import { clearAuthStorage } from '../../../api/httpClient';
import { getAccessToken } from '../../../api/httpClient';


const TradeMS = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);

    const [realBalance, setRealBalance] = useState(0);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [walletAddress, setWalletAddress] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");

    const [participantName, setParticipantName] = useState("");
    const [traders, setTraders] = useState([]);
    const [isRegistered, setIsRegistered] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [userBalance, setUserBalance] = useState(0);

    const userEmail = localStorage.getItem('userEmail') || 'guest';

    const fetchTraders = useCallback(async () => {
        try {
            const response = await tradeApi.getLeaderboard();
            setTraders(response.data);
            return response.data;
        } catch (error) {
            console.error("Leaderboard failed to load:", error);
            return [];
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const verifyUserStatus = async () => {
            setIsChecking(true);

            try {
                if (!userEmail || userEmail === 'guest') {
                    await fetchTraders();

                    if (isMounted) {
                        setIsRegistered(false);
                        setIsChecking(false);
                    }
                    return;
                }

                let userRes;

                try {
                    const results = await Promise.all([
                        fetchTraders(),
                        tradeApi.getCurrentUser()
                    ]);
                    userRes = results[1];
                } catch (err) {
                    if (!isMounted) return;

                    if (err?.response?.status === 401) {
                        clearAuthStorage();
                        toast.error("Session expired. Please log in again.");
                        navigate('/');
                        return;
                    }

                    if (err?.response?.status === 404) {
                        userRes = { data: null };
                    } else {
                        console.error("User fetch error:", err);
                        userRes = { data: null };
                    }
                }

                if (!isMounted) return;

                const myData = userRes.data;
                const currentMonth = new Date().toISOString().slice(0, 7);

                if (myData && myData.lastJoinedMonth === currentMonth) {
                    setIsRegistered(true);
                    setUserBalance(Number(myData.virtualBalance ?? 10000));
                    localStorage.setItem('currentUsername', myData.username);

                    tradeApi.getWithdrawBalance()
                        .then((res) => {
                            if (isMounted) {
                                setRealBalance(Number(res.data || 0));
                            }
                        })
                        .catch((err) => {
                            if (err?.response?.status === 401) {
                                clearAuthStorage();
                                toast.error("Session expired. Please log in again.");
                                navigate('/');
                                return;
                            }

                            console.log("Real balance could not be read", err);
                        });
                } else {
                    setIsRegistered(false);
                }
            } catch (err) {
                if (!isMounted) return;

                if (err?.response?.status === 401) {
                    clearAuthStorage();
                    toast.error("Session expired. Please log in again.");
                    navigate('/');
                    return;
                }

                setIsRegistered(false);
                console.error("Error checking tournament status:", err);
            } finally {
                if (isMounted) {
                    setIsChecking(false);
                }
            }
        };

        verifyUserStatus();

        return () => {
            isMounted = false;
        };
    }, [userEmail, fetchTraders, navigate]);
    const handleWithdraw = async () => {
        const wallet = walletAddress.trim();
        if (!wallet) return toast.error("Please enter a wallet address.");

        const amount = parseFloat(withdrawAmount);
        if (!amount || amount < 10) return toast.error("Minimum withdrawal is 10 USDT.");
        if (amount > realBalance) return toast.error("Insufficient balance.");

        setLoading(true);
        try {
            const response = await tradeApi.requestWithdraw({
                amount: amount,
                walletAddress: wallet
            });

            toast.success("Request recorded successfully! It will be sent after admin approval.");
            setIsWithdrawModalOpen(false);

            if (response.data && response.data.newBalance !== undefined) {
                setRealBalance(Number(response.data.newBalance));
            } else {
                const balanceResponse = await tradeApi.getWithdrawBalance();
                setRealBalance(Number(balanceResponse.data || 0));
            }

            setWithdrawAmount("");
            setWalletAddress("");
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data || "An error occurred during withdrawal. Please check your connection.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleFinalPayment = async () => {
        if (!participantName.trim()) return toast("Please enter your name", { icon: '⚠️' });

        setLoading(true);
        try {
            const response = await tradeApi.createUser({
                username: participantName.trim(),
                isPremium: true // email-i burdan sildim, onsuzda backend token-dən oxuyur
            });

            localStorage.setItem(`isRegistered_${userEmail}`, 'true');
            localStorage.setItem(`registeredName_${userEmail}`, response.data.username);
            localStorage.setItem('currentUsername', response.data.username);

            if (response.data.id) {
                localStorage.setItem('contestUserId', String(response.data.id));
            }

            setIsRegistered(true);
            setUserBalance(Number(response.data.virtualBalance ?? 10000));
            setIsModalOpen(false);
            setParticipantName("");
            await fetchTraders();

        } catch (error) {
            if (error.response?.status === 401) {
                clearAuthStorage();
                toast.error("Session expired. Please log in again.");
                navigate('/');
                return;
            }

            const backendMessage = error.response?.data?.message || error.response?.data || "An error occurred!";
            toast.error(`Unexpected error: ${backendMessage}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = getAccessToken();

        if (!token) {
            navigate('/');
        }
    }, [navigate]);

    const handleStartTrade = () => navigate('/terminal');
    const handleClose = () => navigate(-1);

    if (isChecking) return (
        <div style={{
            backgroundColor: '#080808',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px'
        }}>
            <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <svg width="56" height="56" viewBox="0 0 56 56" style={{ animation: 'ms-spin 1s linear infinite' }}>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,215,0,0.08)" strokeWidth="3"/>
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#FFD700" strokeWidth="3"
                            strokeDasharray="34 104" strokeLinecap="round"/>
                </svg>
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px'
                }}>🏆</div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '800', letterSpacing: '2px' }}>
                    MONEY <span style={{ color: '#FFD700' }}>STRATEGY</span>
                </div>
                <div style={{ color: '#444', fontSize: '11px', marginTop: '6px', letterSpacing: '1.5px' }}>
                    LOADING TOURNAMENT...
                </div>
            </div>

            <style>{`
            @keyframes ms-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
        </div>
    );

    return (
        <div className="trade-ms-container" style={{ backgroundColor: '#080808', minHeight: '100vh', color: '#fff' }}>
            <nav style={{
                height: '75px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 40px', borderBottom: '1px solid rgba(255, 215, 0, 0.15)', position: 'sticky', top: 0, zIndex: 1000, background: '#080808'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontWeight: '800', letterSpacing: '1px', fontSize: '18px' }}>
                        MONEY <span style={{ color: '#FFD700' }}>STRATEGY</span>
                    </div>

                    {isRegistered && (
                        <div style={{
                            background: 'rgba(0, 255, 163, 0.05)', border: '1px solid rgba(0, 255, 163, 0.2)',
                            padding: '6px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <div style={{ width: '6px', height: '6px', background: '#00ffa3', borderRadius: '50%', boxShadow: '0 0 10px #00ffa3' }}></div>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#00ffa3', letterSpacing: '0.5px' }}>
                                EQUITY: ${Number(userBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {realBalance > 0 && (
                        <button
                            onClick={() => setIsWithdrawModalOpen(true)}
                            style={{
                                background: 'linear-gradient(90deg, #FFD700 0%, #ff8c00 100%)',
                                border: 'none', padding: '6px 15px', borderRadius: '12px',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                color: '#000', fontWeight: '900', fontSize: '11px',
                                boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)'
                            }}>
                            💰 REWARD: ${realBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} (WITHDRAW)
                        </button>
                    )}

                    <button
                        onClick={() => setIsTournamentModalOpen(true)}
                        style={{
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            padding: '6px 15px',
                            borderRadius: '12px',
                            color: '#FFD700',
                            fontSize: '11px',
                            fontWeight: '900',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: '0.3s'
                        }}
                    >
                        🏆 TOURNAMENT RULES
                    </button>
                </div>

                <button onClick={handleClose} style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: '0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'}>
                    CLOSE
                </button>
            </nav>

            <main style={{ padding: '40px' }}>
                <Leaderboard
                    dbTraders={traders}
                    isRegistered={isRegistered}
                    onJoinClick={() => setIsModalOpen(true)}
                    onStartTrade={handleStartTrade}
                />
            </main>

            {isWithdrawModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 4000,
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        background: '#111', width: '420px', borderRadius: '24px',
                        border: '1px solid rgba(255, 215, 0, 0.3)', padding: '35px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
                    }}>
                        <h3 style={{ color: '#FFD700', marginBottom: '5px', fontSize: '22px', fontWeight: '900' }}>Withdraw Reward</h3>
                        <p style={{ color: '#888', fontSize: '12px', marginBottom: '25px' }}>
                            Withdraw your real tournament earnings (USDT TRC-20) to your wallet.
                        </p>

                        <div style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px dashed rgba(255, 215, 0, 0.2)' }}>
                            <span style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold' }}>AVAILABLE BALANCE</span>
                            <div style={{ color: '#FFD700', fontSize: '24px', fontWeight: '900' }}>${realBalance.toLocaleString()}</div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '11px', color: '#ccc', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>Amount (USDT)</label>
                            <input
                                type="number"
                                placeholder="Example: 50"
                                style={{ width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ fontSize: '11px', color: '#ccc', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>USDT (TRC-20) Wallet Address</label>
                            <input
                                type="text"
                                placeholder="T..."
                                style={{ width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', fontSize: '14px' }}
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsWithdrawModalOpen(false)} style={{ flex: 1, padding: '14px', background: 'transparent', color: '#fff', border: '1px solid #444', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            <button disabled={loading} onClick={handleWithdraw} style={{ flex: 1, padding: '14px', background: '#FFD700', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
                                {loading ? "Processing..." : "Withdraw"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isTournamentModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 3000,
                    backdropFilter: 'blur(15px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(180deg, #121212 0%, #050505 100%)',
                        width: '440px', borderRadius: '32px', border: '1px solid rgba(255, 215, 0, 0.2)',
                        padding: '40px', position: 'relative', boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ fontSize: '50px', marginBottom: '15px', filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.3))' }}>🏆</div>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '26px', fontWeight: '900', letterSpacing: '1px' }}>
                                CHAMPIONS <span style={{ color: '#FFD700' }}>LEAGUE</span>
                            </h2>
                            <p style={{ color: '#555', fontSize: '11px', marginTop: '8px', fontWeight: 'bold', letterSpacing: '2px' }}>TRADING TOURNAMENT - SEASON 1</p>
                        </div>

                        <div style={{ background: 'rgba(255, 215, 0, 0.03)', padding: '20px', borderRadius: '16px', border: '1px dashed rgba(255, 215, 0, 0.2)', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#888', fontSize: '12px', fontWeight: 'bold' }}>ENTRY FEE</span>
                            <span style={{ color: '#FFD700', fontSize: '22px', fontWeight: '900' }}>$10.00</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                            {[
                                { place: '1st PLACE', prize: '$100.00', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.05)' },
                                { place: '2nd PLACE', prize: '$50.00', color: '#C0C0C0', bg: 'rgba(192, 192, 192, 0.05)' },
                                { place: '3rd PLACE', prize: '$25.00', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.05)' }
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', justifyContent: 'space-between', padding: '15px 20px',
                                    background: item.bg, borderRadius: '14px', border: `1px solid ${item.color}15`
                                }}>
                                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: '900' }}>{item.place}</span>
                                    <span style={{ color: item.color, fontSize: '14px', fontWeight: '900' }}>{item.prize}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '35px' }}>
                            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px', border: '1px solid #111' }}>
                                <div style={{ color: '#444', fontSize: '9px', fontWeight: '900', marginBottom: '5px' }}>STARTS</div>
                                <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>MAR 06, 2026</div>
                            </div>
                            <div style={{ background: '#0a0a0a', padding: '15px', borderRadius: '15px', border: '1px solid #111' }}>
                                <div style={{ color: '#444', fontSize: '9px', fontWeight: '900', marginBottom: '5px' }}>ENDS</div>
                                <div style={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}>MAR 27, 2026</div>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsTournamentModalOpen(false)}
                            style={{
                                width: '100%', padding: '18px', background: '#FFD700', color: '#000',
                                border: 'none', borderRadius: '16px', fontWeight: '900', cursor: 'pointer',
                                fontSize: '14px', transition: '0.2s', boxShadow: '0 10px 30px rgba(255, 215, 0, 0.2)'
                            }}
                        >
                            GOT IT
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                }}>
                    <div style={{ width: '420px', background: '#111', padding: '35px', borderRadius: '24px', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                        <h3 style={{ color: '#FFD700', marginBottom: '10px', fontSize: '20px' }}>Tournament Registration</h3>
                        <input
                            type="text"
                            placeholder="Enter your name..."
                            style={{ width: '100%', padding: '12px', background: '#222', border: '1px solid #333', color: '#fff', borderRadius: '8px', marginBottom: '20px', outline: 'none' }}
                            value={participantName}
                            onChange={(e) => setParticipantName(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', background: 'transparent', color: '#fff', border: '1px solid #444', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button disabled={loading} onClick={handleFinalPayment} style={{ flex: 1, padding: '12px', background: '#FFD700', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {loading ? "Processing..." : "Pay & Join"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TradeMS;