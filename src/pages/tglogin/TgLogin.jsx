// src/pages/tglogin/TgLogin.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { auth } from '../../services/api';
import styles from './TgLogin.module.css';

export default function TgLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Invalid login link. No token provided.');
      setLoading(false);
      return;
    }

    // If already logged in, redirect immediately
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      window.location.href = '/discover';
      return;
    }

    auth.telegramVerify(token)
      .then((res) => {
        if (res.token) {
          localStorage.setItem('token', res.token);
          // Redirect after a short delay for visual feedback
          window.location.href = '/discover';
        } else {
          throw new Error('No token received from server');
        }
      })
      .catch((err) => {
        console.error('Telegram login error:', err);
        const stored = localStorage.getItem('token');
        if (stored) {
          window.location.href = '/discover';
        } else {
          setError(err.message || 'Login failed. Please try again.');
          setLoading(false);
        }
      });
  }, [params, navigate]);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>❌</div>
          <h2 className={styles.title}>Login Failed</h2>
          <p className={styles.message}>{error}</p>
          <button className={styles.button} onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinner} />
        <h2 className={styles.title}>Authenticating</h2>
        <p className={styles.message}>Please wait while we log you in...</p>
        <p className={styles.note}>You will be redirected automatically.</p>
      </div>
    </div>
  );
}