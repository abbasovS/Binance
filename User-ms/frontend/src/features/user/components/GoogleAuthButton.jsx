import React from 'react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const GoogleAuthButton = React.memo(function GoogleAuthButton({
                                                                  handleGoogleLogin,
                                                              }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => toast.error('Google verification failed')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                width={320}
            />
        </div>
    );
});

export default GoogleAuthButton;