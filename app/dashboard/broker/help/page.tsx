'use client';

import { useState } from 'react';
import { webApi } from '@/lib/api';
import { Panel } from '@/components/ui';
import TermsContent from './terms-content';

export default function BrokerHelpPage() {
  const [activeTab, setActiveTab] = useState('faq');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', category: 'General', subject: '', message: '' });

  const faqs = [
    {
      question: 'What is ZCanopy?',
      answer:
        'ZCanopy is a property platform that lets anyone list a property for rent or sale with nothing more than a phone and a few photos - no special skills, no agency experience and no paperwork beyond what the law already asks of a landlord.\n\n' +
        'The landlord himself can post his own property and deal with the customer directly. That is the point: when the customer talks to the person who actually owns the building, there is no room for a broker to talk the price up, swap the property or take a cut that was never agreed. It removes a whole layer of brokerage, and with it most of the fraud that goes with it.\n\n' +
        'The wider vision is to connect landlords directly to the people who want to rent or buy. A landlord is always free to post his own property. Anyone else - a broker, a relative, a property manager - can also post a property and earn a small fee, but only when the landlord has authorised them to do so. So the platform does not take the broker out of the picture: it puts the landlord back in charge of who acts on their behalf, and makes the customer deal with the real owner.',
    },
    {
      question: 'How do I list a property?',
      answer:
        'Go to Properties, click "Add Property", fill in the details and upload photos. Your listing will be reviewed by our team.',
    },
    {
      question: 'How many properties can I list?',
      answer:
        'The limit depends on your subscription tier:\n\n- Free (Prop) tier: up to 3 properties, 15 photos and 1 video per property.\n- Fibrous tier: up to 8 properties, 25 photos and 2 videos per property.\n- Buttress tier: up to 12 properties, 50 photos and 4 videos per property.\n\n' +
        'The limit is applied when you publish, and the current count and limit are shown on the Subscription page.',
    },
    {
      question: 'How do I upgrade my subscription?',
      answer:
        'Visit the Subscription page to view available plans and select the one that fits your needs.',
    },
    {
      question: 'How do I withdraw my earnings?',
      answer:
        'Go to Wallet, enter the amount and your mobile money details, then submit the withdrawal request.\n\n' +
        'Withdrawals are authorised by the landlord named on the property: when you start a withdrawal we send an OTP to the landlord, and the money only moves once that OTP is confirmed. This has been made to avoid frauds in brokerage without the landlord consent.',
    },
    {
      question: 'How does the automatic customer refund work?',
      answer:
        'When a customer books a property, the booking fee is not paid out to you straight away. It is held in escrow on your held balance while the customer has a chance to approve the booking.\n\n' +
        'There are only two ways the money moves:\n\n1. The customer approves the booking from their dashboard, or the countdown they set expires. When the countdown expires, the platform automatically reverses the payment back to the customer\'s mobile money number and takes the amount off your held balance.\n2. The customer declines the booking before the countdown ends. The amount is reversed straight away.\n\n' +
        'The automatic sweep runs every 15 minutes, so a refund normally reaches the customer within about 15 minutes of the countdown ending. You do not have to do anything for it to happen, and you must not refund a customer manually - a manual refund on top of the automatic one pays the customer twice and the amount is still deducted from your held balance.',
    },
    {
      question: 'Who pays the inspection fee, and what happens if the customer is not happy with the property?',
      answer:
        'The inspection fee is paid by the customer, not by you and not by the landlord. It covers the viewing and inspection of the property before the booking is confirmed, and it is collected with the booking fee when the customer books.\n\n' +
        'If the customer inspects the property and is not satisfied, they can have their funds returned: the money is not released to you, it is reversed back to the customer through the same escrow process, so you are not left holding a fee for a viewing that did not happen.\n\n' +
        'The practical point for you is that the inspection fee is not yours to keep unless the customer accepted the property, and you should not treat it as income until the booking is approved.',
    },
    {
      question: 'How do I change my own password?',
      answer:
        'Go to Settings, scroll to Change Password and request the OTP. We email the code to the address on your broker account, and the new password is only applied once that code is confirmed.',
    },
    {
      question: 'How does a landlord change their phone number?',
      answer:
        'A landlord account cannot be changed from this console. The landlord has to email support@support.zcanopy.com from the email address on the account and ask for the phone number to be changed.\n\n' +
        'Support verifies the request first - we confirm the landlord\'s identity and the property on file - and only then update the number, so the change is not applied instantly and can take a little time.\n\n' +
        'Two things to keep in mind: the landlord must write from the address registered on the account, and support will never ask anyone for a password or a PIN. If a customer sends you a request to change a landlord phone number, send it to support@support.zcanopy.com instead of doing it yourself.\n\n' +
        'The phone number matters more than it looks: it is where the booking and the withdrawal OTPs are sent, so if it is wrong the customer and the landlord both get stuck.',
    },
    {
      question: 'How do I delete my account?',
      answer:
        'Go to Settings, scroll to Account Actions, type DELETE to confirm, and submit. We email you an OTP and the account is only deleted once that code is confirmed.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) {
        setErrorMsg('Session expired. Please log in again.');
        setSending(false);
        return;
      }
      const res: any = await webApi.brokerHelp(token, {
        email: form.email,
        phone: '',
        name: form.name,
        content: `[${form.category}] ${form.subject}: ${form.message}`,
      });
      if (res?.success !== false) {
        setSent(true);
        setForm({ name: '', email: '', category: 'General', subject: '', message: '' });
      } else {
        setErrorMsg(res?.message || 'Failed to submit request. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit request. Please try again.');
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
        {['faq', 'contact', 'terms'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab ? 'border-b-2 border-[var(--zcanopy-primary)] text-[var(--zcanopy-primary)]' : 'text-gray-500'
            }`}
          >
            {tab === 'faq' ? 'FAQ' : tab === 'contact' ? 'Contact Support' : 'Terms of Agreement'}
          </button>
        ))}
      </div>

      {activeTab === 'faq' && (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <details key={idx} className="group rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-4 shadow-[var(--zcanopy-shadow)]">
              <summary className="cursor-pointer font-semibold text-[var(--zcanopy-card-brown)]">{faq.question}</summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--zcanopy-muted)]">{faq.answer}</p>
            </details>
          ))}
        </div>
      )}

      {activeTab === 'terms' && (
        <Panel title="Terms of Agreement">
          <TermsContent />
        </Panel>
      )}

      {activeTab === 'contact' && (
        <Panel title="Contact Support">
          {sent ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-green-50 p-4 text-sm text-green-700">Your support request has been submitted. We will get back to you shortly.</div>
              <button
                onClick={() => setSent(false)}
                className="text-sm text-[var(--zcanopy-primary)] hover:underline"
              >
                Submit another request
              </button>
            </div>
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
              {errorMsg && (
                <p className="text-sm text-red-600">{errorMsg}</p>
              )}
            </form>
          )}
        </Panel>
      )}
    </div>
  );
}
