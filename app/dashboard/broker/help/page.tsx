'use client';

import { useEffect, useState } from 'react';
import { webApi } from '@/lib/api';
import { LoadingState, ErrorState, Panel } from '@/components/ui';

export default function BrokerHelpPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', category: 'General', subject: '', message: '' });

  const faqs = [
    { question: 'What is ZCanopy?', answer: 'ZCanopy is a property listing platform that connects brokers with customers across Uganda.' },
    { question: 'How do I list a property?', answer: 'Go to Properties, click "Add Property", fill in the details and upload photos. Your listing will be reviewed by our team.' },
    { question: 'How do I upgrade my subscription?', answer: 'Visit the Subscription page to view available plans and select the one that fits your needs.' },
    { question: 'How do I withdraw my earnings?', answer: 'Go to Wallet, enter the amount and your mobile money details, then submit the withdrawal request.' },
    { question: 'How do I change my password?', answer: 'Go to Settings, scroll to Change Password, enter your current and new password.' },
    { question: 'How do I delete my account?', answer: 'Go to Settings, scroll to Account Actions, type DELETE to confirm, and submit.' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await webApi.brokerHelp(undefined as any, {
        email: form.email,
        phone: '',
        message: `[${form.category}] ${form.subject}: ${form.message}`,
      });
      setSent(true);
      setForm({ name: '', email: '', category: 'General', subject: '', message: '' });
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--zcanopy-card-brown)]">Help Center</h2>
        <p className="text-gray-500">Find answers and get support.</p>
      </div>

      <div className="flex gap-2 border-b border-[var(--zcanopy-border)]">
        {['faq', 'contact'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab ? 'border-b-2 border-[var(--zcanopy-primary)] text-[var(--zcanopy-primary)]' : 'text-gray-500'
            }`}
          >
            {tab === 'faq' ? 'FAQ' : 'Contact Support'}
          </button>
        ))}
      </div>

      {activeTab === 'faq' && (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-4 shadow-[var(--zcanopy-shadow)]">
              <summary className="cursor-pointer font-semibold text-[var(--zcanopy-card-brown)]">{faq.question}</summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--zcanopy-muted)]">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}

      {activeTab === 'contact' && (
        <Panel title="Contact Support">
          {sent ? (
            <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">Your support request has been submitted. We will get back to you shortly.</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                >
                  <option>General</option>
                  <option>Account</option>
                  <option>Service</option>
                  <option>Payment</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-colors focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl bg-[var(--zcanopy-primary)] py-2.5 text-white shadow-md transition-all hover:bg-[var(--zcanopy-primary-alt)] disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Submit Request'}
              </button>
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}
