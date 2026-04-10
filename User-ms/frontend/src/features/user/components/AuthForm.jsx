import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

const AuthForm = ({
                      view,
                      setView,
                      handleSignup,
                      handleGoogleLogin,
                      handleLogin,
                      handleVerify,
                      handleChange,
                      formData,
                      message,
                      setMessage,
                      authLoading,
                  }) => {
    const isSignup = view === 'signup';
    const [showPassword, setShowPassword] = useState(false);

    const [countryCode, setCountryCode] = useState('+994');

    const switchAuthView = (nextView) => {
        setView(nextView);
        if (typeof setMessage === 'function') {
            setMessage({ text: '', type: '' });
        }
        setShowPassword(false);
    };

    const onFormSubmit = (e) => {
        e.preventDefault();

        if (isSignup) {
            let purePhone = formData.phoneNumber || '';

            // boşluqları sil
            purePhone = purePhone.replace(/\s/g, '');

            // əgər user + ilə yazmayıbsa əlavə et
            let fullPhoneNumber = purePhone.startsWith('+')
                ? purePhone
                : countryCode + purePhone;

            const phoneRegex = /^\+[1-9]\d{6,14}$/;

            if (!phoneRegex.test(fullPhoneNumber)) {
                toast.error("Enter valid phone number (e.g., +994501234567)");
                return;
            }

            if (formData.password.length < 8) {
                toast.error("Password must be at least 8 characters long");
                return;
            }

            const passwordRegex = /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).*$/;
            if (!passwordRegex.test(formData.password)) {
                toast.error("Password must contain uppercase, lowercase and number");
                return;
            }

            handleSignup(e, fullPhoneNumber);
        } else {
            handleLogin(e);
        }
    };
    return (
        <div className="App auth-screen-locked">
            {/* OTP STATE */}
            {view === 'otp' ? (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 9999,
                    backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a1a 0%, #0f0f0f 100%)',
                        width: '380px', borderRadius: '24px',
                        border: '1px solid rgba(0, 255, 163, 0.2)',
                        padding: '40px 30px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(0, 255, 163, 0.05)',
                        textAlign: 'center', animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ marginBottom: '25px' }}>
                            <div style={{
                                width: '64px', height: '64px',
                                background: 'linear-gradient(135deg, rgba(0, 255, 163, 0.2) 0%, rgba(0, 255, 163, 0.05) 100%)',
                                borderRadius: '50%', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 20px',
                                color: '#00ffa3', fontSize: '28px',
                                border: '1px solid rgba(0, 255, 163, 0.3)',
                                boxShadow: '0 0 20px rgba(0, 255, 163, 0.2)'
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </div>
                            <h2 style={{ color: '#fff', fontSize: '24px', fontWeight: '900', margin: '0 0 10px', letterSpacing: '0.5px' }}>Verify Email</h2>
                            <p style={{ color: '#888', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                                For security, please enter the 6-digit code sent to <b>{formData.email || 'your email address'}</b>.
                            </p>
                        </div>

                        {message.text && (
                            <div style={{
                                background: message.type === 'error' ? 'rgba(255, 77, 77, 0.1)' : 'rgba(0, 255, 163, 0.1)',
                                color: message.type === 'error' ? '#ff4d4d' : '#00ffa3',
                                border: `1px solid ${message.type === 'error' ? 'rgba(255, 77, 77, 0.2)' : 'rgba(0, 255, 163, 0.2)'}`,
                                padding: '12px', borderRadius: '12px', fontSize: '12px', marginBottom: '20px', fontWeight: 'bold'
                            }}>
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if(handleVerify) handleVerify(e); else handleSignup(e);
                        }}>
                            <input
                                name="verificationCode"
                                type="text"
                                inputMode="numeric"
                                placeholder="••••••"
                                maxLength="6"
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    handleChange({ target: { name: 'verificationCode', value: val } });
                                }}
                                value={formData.verificationCode || ''}
                                required
                                style={{
                                    width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid #333',
                                    padding: '18px 10px', borderRadius: '16px', color: '#fff', fontSize: '32px',
                                    fontWeight: '900', textAlign: 'center', letterSpacing: '14px',
                                    outline: 'none', marginBottom: '25px', transition: 'all 0.3s ease',
                                    fontFamily: 'monospace'
                                }}
                            />

                            <button
                                type="submit"
                                disabled={authLoading || (formData.verificationCode?.length !== 6)}
                                style={{
                                    width: '100%', padding: '16px',
                                    background: (formData.verificationCode?.length === 6 && !authLoading) ? 'linear-gradient(90deg, #00ffa3 0%, #00d186 100%)' : '#222',
                                    color: (formData.verificationCode?.length === 6 && !authLoading) ? '#000' : '#666',
                                    border: 'none', borderRadius: '14px', fontWeight: '900', cursor: (formData.verificationCode?.length === 6 && !authLoading) ? 'pointer' : 'not-allowed',
                                    fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px',
                                    transition: 'all 0.3s ease',
                                    boxShadow: (formData.verificationCode?.length === 6 && !authLoading) ? '0 8px 20px rgba(0, 255, 163, 0.3)' : 'none'
                                }}
                            >
                                {authLoading ? "Verifying..." : "VERIFY"}
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={() => switchAuthView('signup')}
                            style={{
                                background: 'transparent', border: 'none', color: '#888',
                                fontSize: '13px', marginTop: '25px', cursor: 'pointer', fontWeight: '600',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                width: '100%', transition: 'all 0.2s ease'
                            }}
                        >
                            <span style={{fontSize: '16px'}}>←</span> Go back
                        </button>
                    </div>
                </div>
            ) : (
                /* --- LOGIN AND SIGNUP STATE --- */
                <div className="premium-layout premium-auth-shell fade-in">

                    {/* SOL PANEL */}
                    <div className="auth-visual-side">
                        <div className="auth-hero-glow glow-top" />
                        <div className="auth-hero-glow glow-bottom" />

                        <div className="visual-content-wrapper">
                            <div className="visual-header">
                                <h1 style={{ fontSize: '42px', fontWeight: '800', color: '#fff', lineHeight: '1.15', marginBottom: '16px', letterSpacing: '-1px' }}>
                                    Elevate your <br/>
                                    <span style={{ background: 'linear-gradient(90deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trading Experience</span>
                                </h1>
                                <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: '1.6', maxWidth: '90%' }}>
                                    Join the ultimate platform for learning, competing, and analyzing the crypto market without financial risk.
                                </p>
                            </div>

                            <div className="feature-cards-container">
                                {/* 1. Portfolio Card */}
                                <div className="feature-info-card">
                                    <div className="feature-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                        </svg>
                                    </div>
                                    <div className="feature-text-content">
                                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#fff', fontWeight: '600' }}>Smart Portfolio</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>Track your virtual assets with real-time market data and charts.</p>
                                    </div>
                                </div>

                                {/* 2. Tournament Card */}
                                <div className="feature-info-card">
                                    <div className="feature-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                                            <path d="M4 22h16"></path>
                                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                                        </svg>
                                    </div>
                                    <div className="feature-text-content">
                                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#fff', fontWeight: '600' }}>Trading Tournaments</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>Compete in risk-free arenas, climb the leaderboard, and win.</p>
                                    </div>
                                </div>

                                {/* 3. AI News Card */}
                                <div className="feature-info-card">
                                    <div className="feature-icon-box" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2v20"></path>
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                                        </svg>
                                    </div>
                                    <div className="feature-text-content">
                                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: '#fff', fontWeight: '600' }}>AI Market Insights</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>Get AI-powered sentiment analysis tailored to your assets.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ PANEL */}
                    <div className="form-side auth-form-side form-scroll-lock">
                        <div className="form-static-wrapper" style={{ marginTop: isSignup ? '2%' : '12%' }}>

                            <div className="form-header modern-form-header">
                                <div className="auth-nav segmented-nav">
                                    <button
                                        type="button"
                                        className={`segment-btn ${!isSignup ? 'active' : ''}`}
                                        onClick={() => switchAuthView('login')}
                                        disabled={authLoading}
                                    >
                                        Login
                                    </button>
                                    <button
                                        type="button"
                                        className={`segment-btn ${isSignup ? 'active' : ''}`}
                                        onClick={() => switchAuthView('signup')}
                                        disabled={authLoading}
                                    >
                                        Register
                                    </button>
                                </div>
                                <h2 className="premium-title">
                                    {isSignup ? 'Create account' : 'Welcome back'}
                                </h2>
                            </div>

                            <form onSubmit={onFormSubmit} className="auth-content form-content-wrapper">

                                <div className="inputs-static-container" style={{ gap: isSignup ? '8px' : '12px' }}>
                                    <div className="input-group">
                                        <label className="field-label">Email address</label>
                                        <input
                                            name="email"
                                            type="email"
                                            className="premium-input"
                                            placeholder="name@example.com"
                                            onChange={handleChange}
                                            value={formData.email}
                                            required
                                        />
                                    </div>

                                    {isSignup && (
                                        <div className="input-group">
                                            <label className="field-label">Phone number</label>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={countryCode}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '' || val === '+' || /^\+[0-9]{1,4}$/.test(val)) {
                                                            setCountryCode(val);
                                                        }
                                                    }}
                                                    className="premium-input"
                                                    style={{ width: '80px', textAlign: 'center', padding: '12px 8px' }}
                                                    placeholder="+994"
                                                />
                                                <input
                                                    name="phoneNumber"
                                                    type="tel"
                                                    className="premium-input"
                                                    placeholder="501234567"
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/[^0-9]/g, '');
                                                        if (val.startsWith('994') && val.length > 10) {
                                                            setCountryCode('+994');
                                                            val = val.substring(3);
                                                        }
                                                        else if (val.startsWith('0') && val.length > 8) {
                                                            val = val.substring(1);
                                                        }
                                                        handleChange({
                                                            target: { name: 'phoneNumber', value: val }
                                                        });
                                                    }}
                                                    value={(formData.phoneNumber || '').replace(countryCode, '')}
                                                    required
                                                    style={{ flex: 1 }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <div className="label-row">
                                            <label className="field-label">Password</label>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                className="premium-input"
                                                placeholder="••••••••"
                                                onChange={handleChange}
                                                value={formData.password}
                                                required
                                                style={{ paddingRight: '40px' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{
                                                    position: 'absolute', right: '12px', top: '50%',
                                                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                                                    cursor: 'pointer', fontSize: '16px', opacity: '0.7'
                                                }}
                                            >
                                                {showPassword ? '👁️' : '🙈'}
                                            </button>
                                        </div>
                                    </div>

                                    {message.text && <div className={`message-banner ${message.type}`} style={{marginTop: '10px'}}>{message.text}</div>}
                                </div>

                                <div className="actions-static-container" style={{
                                    marginTop: isSignup ? '4px' : '15px', /* Buton grubunu yukarı çektik */
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: isSignup ? '2px' : '4px' /* Kendi aralarındaki boşluğu daralttık */
                                }}>
                                    <button
                                        type="submit"
                                        className="premium-btn main-btn"
                                        disabled={authLoading}
                                        style={{
                                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', width: '100%',
                                            padding: isSignup ? '12px' : '14px', /* Register'da butonu biraz daha ince yaptık */
                                            borderRadius: '12px', background: '#3b82f6', color: '#fff', fontWeight: '700', border: 'none', cursor: 'pointer'
                                        }}
                                    >
                                        {authLoading ? (
                                            <>
                                                <svg width="20" height="20" viewBox="0 0 50 50" style={{ animation: 'spin 1s linear infinite' }}>
                                                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray="90, 150" opacity="0.8" />
                                                </svg>
                                                Please wait...
                                            </>
                                        ) : (
                                            isSignup ? 'Create Account' : 'Sign In'
                                        )}
                                    </button>



                                    {/* --- GOOGLE LOGIN HİSSƏSİ --- */}
                                    <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                        <span style={{ padding: '0 10px', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>OR</span>
                                        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <GoogleLogin
                                            onSuccess={handleGoogleLogin}
                                            onError={() => toast.error('Google verification failed')}
                                            theme="filled_black"
                                            shape="pill"
                                            size="large"
                                            text={isSignup ? "signup_with" : "signin_with"}
                                            width={320}
                                        />
                                    </div>

                                    <div className="auth-footer-links" style={{
                                        textAlign: 'center',
                                        marginTop: isSignup ? '2px' : '6px' /* OTP yazısını butona yaklaştırdık */
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => switchAuthView(isSignup ? 'otp' : 'signup')}
                                            className="inline-link-btn"
                                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px', padding: '4px' }}
                                        >
                                            {isSignup ? 'Switch to OTP verification' : 'Create a new account'}
                                        </button>
                                    </div>

                                    {/* MƏXFİLİK VƏ XƏBƏRDARLIQ HİSSƏSİ */}
                                    <div style={{
                                        marginTop: isSignup ? '0px' : '8px', /* Privacy yazısını en yukarı, OTP'nin hemen altına çektik */
                                        textAlign: 'center',
                                        fontSize: '11px',
                                        color: '#64748b',
                                        lineHeight: '1.5',
                                        padding: '0 10px'
                                    }}>
                                        By continuing, you agree to our <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>Privacy Policy</Link>.<br/>
                                        <strong style={{color: '#94a3b8'}}>Disclaimer:</strong> All funds and trading activities on this platform are strictly virtual and hold no real financial value.
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                    body, html {
                        margin: 0;
                        padding: 0;
                        overflow: hidden !important; 
                        height: 100vh;
                        width: 100vw;
                        background-color: #020617;
                    }

                    .auth-screen-locked {
                        height: 100vh;
                        width: 100vw;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        box-sizing: border-box;
                        overflow: hidden;
                    }

                    .premium-auth-shell {
                        display: flex;
                        width: 100%;
                        max-width: 1000px;
                        height: 85vh;
                        max-height: 700px;
                        background: #0f172a;
                        border-radius: 24px;
                        overflow: hidden;
                        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }

                    /* SOL PANEL */
                    .auth-visual-side {
                        flex: 1.1;
                        background: linear-gradient(180deg, #090e17 0%, #020617 100%);
                        position: relative;
                        padding: 60px 50px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        border-right: 1px solid rgba(255, 255, 255, 0.05);
                        overflow: hidden;
                    }

                    .visual-content-wrapper {
                        position: relative;
                        z-index: 10;
                        display: flex;
                        flex-direction: column;
                        gap: 40px;
                    }

                    .auth-hero-glow {
                        position: absolute;
                        border-radius: 50%;
                        filter: blur(80px);
                        z-index: 1;
                        opacity: 0.6;
                    }
                    .glow-top {
                        top: -20%; left: -10%; width: 400px; height: 400px;
                        background: radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%);
                    }
                    .glow-bottom {
                        bottom: -20%; right: -10%; width: 400px; height: 400px;
                        background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
                    }

                    .feature-cards-container {
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .feature-info-card {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.04);
                        padding: 16px 20px;
                        border-radius: 16px;
                        transition: all 0.3s ease;
                    }

                    .feature-info-card:hover {
                        background: rgba(255, 255, 255, 0.04);
                        border-color: rgba(255, 255, 255, 0.1);
                        transform: translateX(5px);
                    }

                    .feature-icon-box {
                        width: 48px;
                        height: 48px;
                        min-width: 48px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    /* SAĞ PANEL */
                    .form-scroll-lock {
                        flex: 1;
                        padding: 30px 50px;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        background: #0f172a;
                        overflow-y: auto; 
                    }

                    .form-static-wrapper {
                        width: 100%;
                        display: flex;
                        flex-direction: column;
                        margin-top: 10%; 
                    }

                    .modern-form-header {
                        margin-bottom: 15px; 
                    }
                    
                    .segmented-nav {
                        margin-bottom: 15px !important; 
                    }

                    .premium-title {
                        margin-bottom: 0px !important; 
                        margin-top: 5px !important;
                    }

                    .form-content-wrapper {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                        margin-top: 0px; 
                    }

                    .inputs-static-container {
                        display: flex;
                        flex-direction: column;
                        gap: 12px; 
                    }

                    .actions-static-container {
                        display: flex;
                        flex-direction: column;
                        gap: 4px; 
                        margin-top: 15px; 
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}
            </style>
        </div>
    );
};

export default AuthForm;