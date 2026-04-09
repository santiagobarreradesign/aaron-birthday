import { useState, useEffect, forwardRef } from 'react';
import {
  isFirebaseConfigured,
  subscribeToGuestbook,
  addGuestbookEntry,
} from './firebase';

const STORAGE_KEY = 'aaron-guestbook-v1';

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocal(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(entry) {
  if (entry.createdAt?.toDate) {
    return entry.createdAt.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  if (entry.date) return entry.date;
  return 'just now';
}

const Guestbook = forwardRef(function Guestbook(_props, ref) {
  const [entries, setEntries] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [useCloud] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (useCloud) {
      return subscribeToGuestbook(setEntries);
    }
    setEntries(loadLocal());
  }, [useCloud]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!name.trim() || !message.trim() || submitting) return;

    setSubmitting(true);

    if (useCloud) {
      try {
        await addGuestbookEntry(name.trim(), message.trim());
      } catch (err) {
        console.error('Guestbook write failed:', err);
      }
    } else {
      const entry = {
        id: Date.now(),
        name: name.trim(),
        message: message.trim(),
        date: new Date().toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
      };
      setEntries(prev => {
        const next = [entry, ...prev];
        saveLocal(next);
        return next;
      });
    }

    setName('');
    setMessage('');
    setSubmitting(false);
  };

  return (
    <div ref={ref} className="guestbook glass-panel" onClick={(e) => e.stopPropagation()}>
      <h2>📝 Sign Aaron&apos;s Guestbook!</h2>
      {!useCloud && (
        <p style={{ fontSize: 10, color: '#999', textAlign: 'center', marginBottom: 6 }}>
          (local mode — set up Firebase to share across visitors)
        </p>
      )}
      <form className="guestbook-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
        <textarea
          placeholder="Write a birthday wish!"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="btn-y2k btn-bounce" disabled={submitting}>
          {submitting ? '⏳ Signing...' : '✍️ Sign Guestbook!'}
        </button>
      </form>
      <div className="guestbook-entries">
        {entries.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#888', fontSize: 13 }}>
            Be the first to sign! ⬆️
          </p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="guestbook-entry">
            <span className="entry-name">{entry.name}</span>
            <span className="entry-date"> — {formatDate(entry)}</span>
            <p>{entry.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

export default Guestbook;
