import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HRAdminOTP = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const requestOtp = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!email) {
      setError('Please enter your HR email address.');
      return;
    }

    setLoading(true);
    axios.post('/api/otp/request', { email })
      .then(res => {
        setDevOtp(res.data.devOtp || '');
        setInfo(`OTP sent to ${email}. For development, the code is shown below.`);
        setStep('otp');
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Could not send OTP.');
        setLoading(false);
      });
  };

  const verifyOtp = (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    axios.post('/api/otp/verify', { email, otp_code: otp })
      .then(() => {
        // Mark this session as OTP-verified
        sessionStorage.setItem('hrOtpVerified', 'true');
        sessionStorage.setItem('hrEmail', email);
        navigate('/hr-admin');
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Invalid or expired OTP.');
        setLoading(false);
      });
  };

  const resend = () => {
    setOtp('');
    setDevOtp('');
    setStep('email');
  };

  // ---------- STYLES ----------
  const page = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: '"Inter", system-ui, sans-serif',
    padding: '20px'
  };

  const card = {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '40px 36px',
    maxWidth: '460px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
  };

  const badge = {
    display: 'inline-block',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '5px 14px',
    borderRadius: '50px',
    fontSize: '0.7rem',
    fontWeight: '800',
    letterSpacing: '1.5px',
    marginBottom: '14px'
  };

  const heading = {
    margin: 0,
    fontSize: '1.7rem',
    fontWeight: '900',
    color: '#0f172a'
  };

  const sub = {
    marginTop: '6px',
    marginBottom: '26px',
    color: '#64748b',
    fontSize: '0.9rem',
    lineHeight: 1.5
  };

  const label = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: '1.2px',
    textTransform: 'uppercase',
    marginBottom: '8px'
  };

  const input = {
    width: '100%',
    padding: '13px 15px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    fontSize: '1rem',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '18px'
  };

  const otpInput = {
    ...input,
    fontSize: '1.6rem',
    letterSpacing: '12px',
    textAlign: 'center',
    fontWeight: '800',
    fontFamily: 'monospace'
  };

  const btnPrimary = {
    width: '100%',
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: '#0f172a',
    color: 'white',
    fontWeight: '800',
    fontSize: '0.95rem',
    cursor: loading ? 'wait' : 'pointer',
    opacity: loading ? 0.7 : 1,
    marginBottom: '12px'
  };

  const btnGhost = {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    background: 'white',
    color: '#334155',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer'
  };

  const alertError = {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '12px 15px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.85rem',
    marginBottom: '18px',
    border: '1px solid #fecaca'
  };

  const alertInfo = {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '12px 15px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '0.85rem',
    marginBottom: '18px',
    border: '1px solid #bfdbfe'
  };

  const devBox = {
    backgroundColor: '#fef3c7',
    color: '#78350f',
    padding: '14px 16px',
    borderRadius: '10px',
    marginBottom: '18px',
    fontSize: '0.85rem',
    fontWeight: '700',
    border: '2px dashed #f59e0b'
  };

  return (
    <div style={page}>
      <div style={card}>
        <span style={badge}>HR ADMINISTRATION</span>
        <h1 style={heading}>OTP Verification</h1>
        <p style={sub}>
          {step === 'email'
            ? 'Enter your HR email address to receive a one-time verification code.'
            : `Enter the 6-digit code we sent to ${email}.`}
        </p>

        {error && <div style={alertError}>{error}</div>}
        {info && <div style={alertInfo}>{info}</div>}

        {step === 'email' && (
          <form onSubmit={requestOtp}>
            <label style={label}>HR Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. hr@municipal.gov"
              style={input}
              required
              autoFocus
            />
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp}>
            {devOtp && (
              <div style={devBox}>
                🔧 DEV MODE — Your code is: <br />
                <span style={{ fontSize: '1.4rem', letterSpacing: '4px' }}>{devOtp}</span>
              </div>
            )}
            <label style={label}>6-Digit Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="______"
              style={otpInput}
              required
              autoFocus
            />
            <button type="submit" style={btnPrimary} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            <button type="button" style={btnGhost} onClick={resend}>
              ← Use a different email
            </button>
          </form>
        )}

        <p style={{
          marginTop: '22px',
          marginBottom: 0,
          fontSize: '0.75rem',
          color: '#94a3b8',
          textAlign: 'center'
        }}>
          OTP codes expire 10 minutes after they are issued.
        </p>
      </div>
    </div>
  );
};

export default HRAdminOTP;