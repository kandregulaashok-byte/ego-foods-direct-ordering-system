import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';

export default function LicenseGate({ status, remoteLicense, onUnlock }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const remoteLocked = remoteLicense?.active === false;

  function submit(event) {
    event.preventDefault();
    const result = onUnlock(password);
    setMessage(result?.message || '');
    if (result?.ok) setPassword('');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f1ec] p-6 text-text-dark">
      <section className="w-full max-w-[420px] rounded-sm border border-[#eadfd7] bg-white p-6 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0e5] text-primary">
          <LockKeyhole size={28} />
        </div>
        <h1 className="mt-4 text-center text-2xl font-black">Kitchen OS Locked</h1>
        <p className="mt-2 text-center text-[14px] font-semibold text-text-muted">
          {remoteLocked
            ? remoteLicense.message || 'Subscription is not active. Contact support to continue.'
            : `Free trial expired. Enter the subscription password to unlock for 30 days.`}
        </p>
        {!remoteLocked ? (
          <form onSubmit={submit} className="mt-5 grid gap-3">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Subscription password"
              className="h-12 rounded-sm border border-[#eadfd7] px-3 text-[15px] font-bold"
            />
            <button type="submit" className="h-12 rounded-sm bg-primary text-[14px] font-black text-white">
              Unlock
            </button>
          </form>
        ) : null}
        {message ? <p className="mt-3 text-center text-[13px] font-bold text-danger">{message}</p> : null}
        <p className="mt-4 text-center text-[12px] font-semibold text-text-muted">
          Current access: {status.mode}, {status.daysLeft} day(s) left.
        </p>
      </section>
    </main>
  );
}
