

// --- MODAL VƏ OVERLAY STİLLƏRİ ---
export const refinedOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(5, 5, 8, 0.8)',
    backdropFilter: 'blur(16px) saturate(180%)',
    zIndex: 11000, display: 'flex', justifyContent: 'center', alignItems: 'center'
};

export const refinedBoxStyle = {
    background: 'rgba(18, 18, 22, 0.7)',
    padding: '40px',
    borderRadius: '28px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    width: '380px',
    textAlign: 'center',
    position: 'relative'
};

export const refinedInputStyle = {
    width: '100%',
    padding: '16px 16px 16px 48px',
    borderRadius: '14px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box'
};

export const inputIconStyle = {
    position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)',
    color: '#10b981', fontSize: '16px', opacity: 0.8, pointerEvents: 'none', zIndex: 2
};

// --- DÜYMƏLƏR ---
export const proConfirmBtn = {
    flex: 2, padding: '14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px',
    fontWeight: '800', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer'
};

export const proCancelBtn = {
    flex: 1, padding: '14px', background: 'rgba(148, 163, 184, 0.05)', color: '#94a3b8',
    border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '14px',
    fontWeight: '700', fontSize: '11px', cursor: 'pointer'
};

// --- CHART MODAL ---
export const chartModalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(2, 2, 5, 0.85)', backdropFilter: 'blur(20px)',
    zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center'
};

export const chartContainerStyle = {
    background: 'rgba(15, 15, 20, 0.7)', width: '95%', maxWidth: '1200px', height: '85vh',
    borderRadius: '30px', border: '1px solid rgba(16, 185, 129, 0.2)',
    display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden'
};

// Çatışmayan 1: refinedTitleStyle
export const refinedTitleStyle = {
    color: 'white', fontSize: '14px', fontWeight: '900', letterSpacing: '4px',
    marginBottom: '10px', textTransform: 'uppercase', opacity: 0.9
};

// Çatışmayan 2: modalOverlayStyle
export const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000
};
// Çatışmayan 3: itemRowStyle
export const itemRowStyle = {
    display: 'flex', justifyContent: 'space-between', padding: '14px',
    background: 'rgba(255,255,255,0.02)', borderRadius: '15px',
    marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s'
};

export const deleteBtnStyle = { background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' };
export const closeBtnStyle = { position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', color: '#64748b', fontSize: '18px', cursor: 'pointer' };