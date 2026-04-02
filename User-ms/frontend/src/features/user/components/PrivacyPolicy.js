import React from 'react';
import './PrivacyPolicy.css'; // CSS faylını bura bağladıq

const PrivacyPolicy = () => {
    return (
        <div className="privacy-container">
            <div className="privacy-card">
                <div className="privacy-header">
                    <h1>Privacy Policy & Terms of Service</h1>
                    <p className="last-updated">Last updated: March 18, 2026</p>
                </div>

                <div className="privacy-content">
                    <section>
                        <h2>1. Platform Disclaimer (Paper Trading)</h2>
                        <p>
                            Welcome to our Paper Trading platform. <strong>This platform is strictly a simulation environment.</strong> All funds, balances, and trading activities are virtual and hold no real-world financial value. We do not connect to real bank accounts, nor do we facilitate the actual purchase or sale of cryptocurrencies or other assets. This service is provided solely for educational, practice, and entertainment purposes.
                        </p>
                    </section>

                    <section>
                        <h2>2. Information We Collect</h2>
                        <p>
                            To provide you with a personalized trading simulation, we collect basic registration information, including your email address and phone number. This information is used exclusively for account creation, One-Time Password (OTP) verification, and securing your account access.
                        </p>
                    </section>

                    <section>
                        <h2>3. How We Use Your Data</h2>
                        <p>
                            Your data is used to maintain your virtual portfolio, track your performance in trading tournaments, and provide AI-driven market insights based on your simulated preferences. We do not use your personal information for targeted external advertising, nor do we sell it to third-party data brokers.
                        </p>
                    </section>

                    <section>
                        <h2>4. Data Security</h2>
                        <p>
                            We implement industry-standard security protocols to protect your personal information. Passwords are cryptographically hashed, and sensitive data is encrypted in transit and at rest within our microservices architecture. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2>5. User Responsibilities</h2>
                        <p>
                            You agree not to use the platform for any unlawful purpose. Any attempt to exploit, manipulate, or artificially inflate virtual balances through bugs or malicious scripts will result in immediate account termination.
                        </p>
                    </section>
                </div>

                <div className="privacy-footer">
                    <button onClick={() => window.close()} className="close-btn">
                        I Understand, Close Tab
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;