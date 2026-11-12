'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Info,
  UserRound,
  Landmark,
  MapPin,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  KeyRound,
  ChevronDown,
  Phone,
} from 'lucide-react';
import { webApi, type LandlordVerificationStatus } from '@/lib/api';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type TenureType = 'mailo' | 'freehold' | 'leasehold' | 'customary';

export interface LandlordDetailsPayload {
  landlord: {
    fullName: string;
    nin: string;
    phoneNumber: string;
  };
  search: {
    mzoDistrict: string;
    tenureType: TenureType;
    location: Record<string, string>;
  };
  meta: {
    submittedAt: string;
    purpose: 'ugnlis-title-search';
  };
}

interface MatchedBroker {
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  channel: 'email' | 'phone';
}

interface FormErrors {
  fullName?: string;
  nin?: string;
  phoneNumber?: string;
  mzoDistrict?: string;
  countyDivision?: string;
  blockNumber?: string;
  plotNumber?: string;
  volumeNumber?: string;
  folioNumber?: string;
  leaseExpiryDate?: string;
  subCountyVillage?: string;
  ccoRefNumber?: string;
}

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */

const MZO_DISTRICTS = [
  'Kampala',
  'Wakiso',
  'Mukono',
  'Jinja',
  'Masaka',
  'Gulu',
  'Mbarara',
  'Fort Portal',
  'Arua',
  'Lira',
  'Kabale',
  'Mbale',
] as const;

const TENURE_OPTIONS: { value: TenureType; label: string; hint: string }[] = [
  { value: 'mailo', label: 'Mailo', hint: 'Central region titles (Kampala, Wakiso…)' },
  { value: 'freehold', label: 'Freehold', hint: 'Perpetual ownership title' },
  { value: 'leasehold', label: 'Leasehold', hint: 'Time-bound interest (e.g. 49/99 years)' },
  { value: 'customary', label: 'Customary (CCO)', hint: 'Certificate of Customary Ownership' },
];

/** Ugandan NIN: 14 characters starting with CF/CM (e.g. CM84012100XXXX). */
const NIN_PATTERN = /^C[FM][0-9A-Z]{12}$/;

/** Ugandan mobile: +256 7XX XXX XXX. */
const UG_PHONE_PATTERN = /^\+2567\d{8}$/;

/**
 * Strips non-numeric prefixes/suffixes from numeric-ish inputs.
 * "Block 216" -> "216", "Plot no. 1408" -> "1408", "216-B" -> "216".
 */
function sanitizeNumeric(value: string): string {
  const digitsOnly = value.replace(/[^0-9]/g, '');
  return digitsOnly;
}

/** Trims free text and collapses whitespace: "  Kawempe   Division " -> "Kawempe Division". */
function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function formatNin(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
}

function normalizePhone(value: string): string {
  let v = value.replace(/[^\d+]/g, '');
  if (v.startsWith('256') && !v.startsWith('+')) v = `+${v}`;
  if (v.startsWith('0')) v = `+256${v.slice(1)}`;
  return v.slice(0, 13);
}

/* ------------------------------------------------------------------ */
/* Field atoms                                                         */
/* ------------------------------------------------------------------ */

function FieldLabel({
  htmlFor,
  children,
  required,
  tooltip,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  tooltip?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
      {children}
      {required && <span className="text-red-500">*</span>}
      {tooltip && (
        <span className="group relative inline-flex" tabIndex={0}>
          <HelpCircle className="h-3.5 w-3.5 cursor-help text-gray-400" aria-hidden />
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
          >
            {tooltip}
          </span>
        </span>
      )}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:border-[var(--zcanopy-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--zcanopy-primary)]/20 disabled:cursor-not-allowed disabled:bg-gray-50';
const errorClass = 'border-red-300 focus:border-red-400 focus:ring-red-100';

function ErrorText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {children}
    </p>
  );
}

function SectionCard({
  step,
  title,
  subtitle,
  icon: Icon,
  children,
  collapsible = false,
  open = true,
  onToggle,
}: {
  step: number;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}) {
  const header = (
    <div className="flex items-start gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
        style={{ backgroundColor: 'var(--zcanopy-primary)' }}
        aria-hidden
      >
        <Icon className="h-4.5 w-4.5" size={18} />
      </span>
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--zcanopy-card-brown)]">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--zcanopy-muted)]">Section {step}</span>
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-[var(--zcanopy-muted)]">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <section className="rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-4 shadow-[var(--zcanopy-shadow)] sm:p-6">
      {collapsible ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className={`flex w-full items-center justify-between gap-3 text-left ${open ? 'mb-5' : ''}`}
        >
          {header}
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-[var(--zcanopy-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
      ) : (
        <div className="mb-5">{header}</div>
      )}
      {collapsible && !open ? null : children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function LandlordTitleSearchForm({
  onSubmitted,
  initialStatus,
}: {
  onSubmitted?: (status: LandlordVerificationStatus) => void;
  initialStatus?: LandlordVerificationStatus | null;
}) {
  /* Section 1 — landlord identity */
  const [fullName, setFullName] = useState('');
  const [nin, setNin] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  /* Section 2 — ministry & tenure */
  const [mzoDistrict, setMzoDistrict] = useState('');
  const [tenureType, setTenureType] = useState<TenureType>('mailo');

  /* Section 3 — dynamic location fields */
  const [countyDivision, setCountyDivision] = useState('');
  const [blockNumber, setBlockNumber] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [volumeNumber, setVolumeNumber] = useState('');
  const [folioNumber, setFolioNumber] = useState('');
  const [leaseExpiryDate, setLeaseExpiryDate] = useState('');
  const [subCountyVillage, setSubCountyVillage] = useState('');
  const [ccoRefNumber, setCcoRefNumber] = useState('');

  /* Form state */
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submittedLocally, setSubmittedLocally] = useState(false);

  /* Landlord authorisation flow — triggered when the landlord's NIN is already
   * verified for another broker. The landlord must receive an OTP and the
   * requesting broker must confirm their own NIN. */
  const [landlordAuth, setLandlordAuth] = useState<{ verificationId: string; phoneMasked: string } | null>(null);
  const [landlordOtpSent, setLandlordOtpSent] = useState(false);
  const [landlordOtp, setLandlordOtp] = useState('');
  const [landlordNin, setLandlordNin] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authCollapsed, setAuthCollapsed] = useState(false);

  /* Collapse the input cards once the submission is under review or approved
   * so the rest of the dashboard is easy to scroll to. Each section can still
   * be expanded individually for reference. */
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });

  const setAllSectionsOpen = (open: boolean) =>
    setOpenSections({ 1: open, 2: open, 3: open });

  const toggleSection = (step: number) =>
    setOpenSections((prev) => ({ ...prev, [step]: !prev[step] }));

  /* Cross-broker OTP confirmation flow */
  const [matchedBrokers, setMatchedBrokers] = useState<MatchedBroker[] | null>(null);
  const [pendingPayload, setPendingPayload] = useState<LandlordDetailsPayload | null>(null);
  const [brokerOtps, setBrokerOtps] = useState<Record<string, string>>({});
  const [otpSending, setOtpSending] = useState(false);

  const status = initialStatus ?? null;

  // A landlord-authorisation requirement can be resumed after a page reload:
  // the status endpoint flags it when the landlord's NIN was already
  // verified for another broker.
  const statusRequiresAuth = !!status?.needsLandlordAuthorization && !!status?.verificationId;

  // While the current submission is being reviewed the broker must not be able
  // to save or upload another title document. `submittedLocally` covers the
  // window between a successful submit and the refreshed status arriving.
  // A pending landlord authorisation is an action the broker still has to
  // take, so it must not lock the form.
  const authRequired = !!landlordAuth || statusRequiresAuth;

  const underReview =
    (status?.status === 'pending' && !authRequired) ||
    (submittedLocally && status?.status !== 'approved' && status?.status !== 'rejected' && !authRequired);

  useEffect(() => {
    if (statusRequiresAuth && !landlordAuth) {
      setLandlordAuth({
        verificationId: status!.verificationId as string,
        phoneMasked: status!.landlordPhoneMasked || '',
      });
      setAuthCollapsed(false);
    }
  }, [statusRequiresAuth, status?.verificationId, status?.landlordPhoneMasked, landlordAuth]);

  useEffect(() => {
    if (underReview || status?.status === 'approved') {
      setAllSectionsOpen(false);
    } else if (!status || status.status === 'rejected' || status.status === 'unsubmitted') {
      setAllSectionsOpen(true);
    }
  }, [underReview, status?.status]);

  /* ------------------------- validation ------------------------- */

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!sanitizeText(fullName)) next.fullName = 'Full legal name is required.';
    else if (sanitizeText(fullName).length < 3) next.fullName = 'Please enter the full name as printed on the National ID.';

    if (!nin) next.nin = 'NIN is required.';
    else if (!NIN_PATTERN.test(nin))
      next.nin = 'Enter a valid 14-character Ugandan NIN (e.g. CM84012100XXXX or CF…).';

    if (!phoneNumber) next.phoneNumber = 'Phone number is required.';
    else if (!UG_PHONE_PATTERN.test(phoneNumber)) next.phoneNumber = 'Use Ugandan format +2567XXXXXXXX / +2567XX XXX XXX.';

    if (!mzoDistrict) next.mzoDistrict = 'Select the MZO / District where the title was issued.';

    if (tenureType === 'mailo') {
      if (!sanitizeText(countyDivision)) next.countyDivision = 'County / Division is required for Mailo titles.';
      if (!blockNumber) next.blockNumber = 'Block number is required for Mailo titles.';
      if (!plotNumber) next.plotNumber = 'Plot number is required for Mailo titles.';
    } else if (tenureType === 'freehold') {
      if (!sanitizeText(volumeNumber)) next.volumeNumber = 'Volume number is required for Freehold titles.';
      if (!folioNumber) next.folioNumber = 'Folio number is required for Freehold titles.';
    } else if (tenureType === 'leasehold') {
      if (!sanitizeText(volumeNumber)) next.volumeNumber = 'Volume number is required for Leasehold titles.';
      if (!folioNumber) next.folioNumber = 'Folio number is required for Leasehold titles.';
    } else if (tenureType === 'customary') {
      if (!sanitizeText(subCountyVillage)) next.subCountyVillage = 'Sub-County & Village is required for CCOs.';
      if (!sanitizeText(ccoRefNumber)) next.ccoRefNumber = 'CCO reference number is required.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /* ------------------------- payload ------------------------- */

  const buildPayload = (): LandlordDetailsPayload => {
    const location: Record<string, string> = {};
    if (tenureType === 'mailo') {
      location.countyDivision = sanitizeText(countyDivision);
      location.blockNumber = sanitizeNumeric(blockNumber);
      location.plotNumber = sanitizeNumeric(plotNumber);
    } else if (tenureType === 'freehold') {
      location.volumeNumber = sanitizeText(volumeNumber).toUpperCase();
      location.folioNumber = sanitizeNumeric(folioNumber);
      if (sanitizeNumeric(blockNumber)) location.blockNumber = sanitizeNumeric(blockNumber);
      if (sanitizeNumeric(plotNumber)) location.plotNumber = sanitizeNumeric(plotNumber);
    } else if (tenureType === 'leasehold') {
      location.volumeNumber = sanitizeText(volumeNumber).toUpperCase();
      location.folioNumber = sanitizeNumeric(folioNumber);
      if (leaseExpiryDate) location.leaseExpiryDate = leaseExpiryDate;
      if (sanitizeNumeric(blockNumber)) location.blockNumber = sanitizeNumeric(blockNumber);
      if (sanitizeNumeric(plotNumber)) location.plotNumber = sanitizeNumeric(plotNumber);
    } else {
      location.subCountyVillage = sanitizeText(subCountyVillage);
      location.ccoRefNumber = sanitizeText(ccoRefNumber).toUpperCase();
    }

    return {
      landlord: {
        fullName: sanitizeText(fullName),
        nin,
        phoneNumber,
      },
      search: {
        mzoDistrict,
        tenureType,
        location,
      },
      meta: {
        submittedAt: new Date().toISOString(),
        purpose: 'ugnlis-title-search',
      },
    };
  };

  /* ------------------------- submit ------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (underReview) {
      setSubmitError(
        'Your current landlord & title submission is still under review. You cannot save or upload another title document until this review is complete.',
      );
      return;
    }

    if (!validate()) {
      setSubmitError('Please correct the highlighted fields before submitting.');
      return;
    }

    const payload = buildPayload();
    // Structured JSON payload ready for DB ingestion / UgNLIS PDF parsing.
    console.log('[UgNLIS] Title search payload:', JSON.stringify(payload, null, 2));

    setSubmitting(true);
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) throw new Error('Not authenticated');

      const res: any = await webApi.submitLandlordDetails(token, payload);

      if (res?.needsLandlordAuthorization) {
        // The landlord's NIN is already verified for another broker. Offer the
        // landlord OTP + NIN path (authorise directly with the landlord) and,
        // when the server also returned matched brokers, the cross-broker OTP
        // confirmation component as an alternative.
        setLandlordAuth({
          verificationId: res.verificationId || '',
          phoneMasked: res.landlordPhoneMasked || '',
        });
        setLandlordOtpSent(false);
        setLandlordOtp('');
        setLandlordNin('');
        setAuthError('');
        setAuthNotice('');
        setAuthCollapsed(false);
        setSubmitError('');
        if (res.matchedBrokers?.length) {
          setPendingPayload(payload);
          setMatchedBrokers(res.matchedBrokers);
          setBrokerOtps({});
        }
        // Refresh the parent status so the requirement is persisted server-side
        // and can be resumed after a page reload.
        onSubmitted?.({ status: 'pending' });
      } else if (res?.needsBrokerConfirmation) {
        // Landlord details match records submitted by other brokers.
        setPendingPayload(payload);
        setMatchedBrokers(res.matchedBrokers || []);
        setBrokerOtps({});
      } else if (res?.success && res?.alreadyVerified) {
        setSubmitSuccess(res.message || 'You are already verified for this landlord.');
        setSubmittedLocally(true);
        setAllSectionsOpen(false);
        onSubmitted?.({ status: 'approved' });
      } else if (res?.success) {
        setSubmitSuccess(res.message || 'Landlord details submitted. Awaiting admin verification.');
        setSubmittedLocally(true);
        onSubmitted?.({ status: 'pending' });
      } else {
        setSubmitError(res?.message || 'Failed to submit landlord details.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAgreeToSendOtps = async () => {
    if (!pendingPayload || !matchedBrokers?.length) return;
    setOtpSending(true);
    setSubmitError('');
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) throw new Error('Not authenticated');

      const res: any = await webApi.sendLandlordBrokerOtps(token, {
        fullName: pendingPayload.landlord.fullName,
        nin: pendingPayload.landlord.nin,
        phoneNumber: pendingPayload.landlord.phoneNumber,
      });

      if (res?.success) {
        setSubmitSuccess('OTPs have been sent to the other brokers connected to this landlord. Enter them below to complete your submission.');
      } else {
        setSubmitError(res?.message || 'Failed to send confirmation OTPs.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send confirmation OTPs.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmitWithOtps = async () => {
    if (!pendingPayload || !matchedBrokers?.length) return;

    const missing = matchedBrokers.some((b) => !brokerOtps[b.brokerCode]?.trim());
    if (missing) {
      setSubmitError('Enter the OTP from every connected broker before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) throw new Error('Not authenticated');

      const res: any = await webApi.submitLandlordDetails(token, {
        ...pendingPayload,
        brokerConfirmations: matchedBrokers.map((b) => ({
          brokerCode: b.brokerCode,
          otp: brokerOtps[b.brokerCode]?.trim() || '',
        })),
      });

      if (res?.needsBrokerConfirmation) {
        setSubmitError('One or more OTPs were invalid or expired. New OTPs have been sent.');
        setBrokerOtps({});
      } else if (res?.success) {
        setMatchedBrokers(null);
        setPendingPayload(null);
        setBrokerOtps({});
        setLandlordAuth(null);
        setLandlordOtpSent(false);
        setLandlordOtp('');
        setLandlordNin('');
        setSubmitSuccess(res.message || 'Landlord details confirmed and submitted. Awaiting admin verification.');
        setSubmittedLocally(true);
        onSubmitted?.({ status: 'pending' });
      } else {
        setSubmitError(res?.message || 'Failed to submit landlord details.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendLandlordOtp = async () => {
    if (!landlordAuth) return;
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) throw new Error('Not authenticated');

      const res: any = await webApi.sendLandlordAuthorizationOtp(token, {
        verificationId: landlordAuth.verificationId,
      });

      if (res?.success) {
        setLandlordOtpSent(true);
        setAuthNotice(res.message || 'An authorisation OTP was sent to the landlord.');
      } else {
        setAuthError(res?.message || 'Failed to send the authorisation OTP.');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send the authorisation OTP.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleVerifyLandlordAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!landlordAuth) return;

    if (landlordOtp.trim().length !== 6) {
      setAuthError('Enter the 6-digit OTP the landlord received.');
      return;
    }
    if (!NIN_PATTERN.test(landlordNin)) {
      setAuthError('Enter the landlord\'s valid 14-character Ugandan NIN (starting with CF or CM).');
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    try {
      const token = localStorage.getItem('zcanopy_token');
      if (!token) throw new Error('Not authenticated');

      const res: any = await webApi.verifyLandlordAuthorization(token, {
        verificationId: landlordAuth.verificationId,
        otp: landlordOtp.trim(),
        landlordNin,
      });

      if (res?.success) {
        setSubmitSuccess(res.message || 'Landlord authorisation confirmed. You are now verified.');
        setLandlordAuth(null);
        setLandlordOtpSent(false);
        setLandlordOtp('');
        setLandlordNin('');
        setAuthNotice('');
        setAuthCollapsed(false);
        // Clear the cross-broker alternative state so only the approved state
        // remains visible.
        setMatchedBrokers(null);
        setPendingPayload(null);
        setBrokerOtps({});
        setSubmittedLocally(true);
        setAllSectionsOpen(false);
        onSubmitted?.({ status: 'approved' });
      } else {
        setAuthError(res?.message || 'The landlord authorisation could not be verified.');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'The landlord authorisation could not be verified.');
    } finally {
      setAuthBusy(false);
    }
  };

  const cancelLandlordAuth = () => {
    setLandlordOtpSent(false);
    setLandlordOtp('');
    setLandlordNin('');
    setAuthError('');
    setAuthNotice('');
    setAuthCollapsed(true);
  };

  const resumeLandlordAuth = () => {
    setAuthCollapsed(false);
    setAuthError('');
    setAuthNotice('');
  };

  /* ------------------------- derived UI state ------------------------- */

  const isMailo = tenureType === 'mailo';
  const isFreehold = tenureType === 'freehold';
  const isLeasehold = tenureType === 'leasehold';
  const isCustomary = tenureType === 'customary';
  const showBlock = isMailo || isFreehold || isLeasehold;
  const blockRequired = isMailo;
  const showPlot = isMailo || isFreehold || isLeasehold;
  const plotRequired = isMailo;

  const showVolumeFolio = isFreehold || isLeasehold;

  const verifiedBadge = useMemo(() => {
    if (!status || status.status === 'unsubmitted') {
      return { cls: 'bg-gray-100 text-gray-600', icon: AlertTriangle, text: 'Not Submitted' };
    }
    if (status.status === 'pending') {
      return { cls: 'bg-yellow-100 text-yellow-700', icon: Clock, text: 'Under Review' };
    }
    if (status.status === 'approved') {
      return { cls: 'bg-green-100 text-green-700', icon: CheckCircle, text: 'Verified' };
    }
    return { cls: 'bg-red-100 text-red-600', icon: XCircle, text: 'Rejected' };
  }, [status]);

  const BadgeIcon = verifiedBadge.icon;

  const sectionsCollapsible = underReview || status?.status === 'approved';

  const otpsSent = submitSuccess.includes('OTPs have been sent');

  /* ------------------------- render ------------------------- */

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Status banner */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-[var(--zcanopy-card-brown)]">Landlord &amp; Title Verification</h3>
          <p className="text-sm text-[var(--zcanopy-muted)]">
            Prepare a UgNLIS title search payload for the property you are listing.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${verifiedBadge.cls}`}>
          <BadgeIcon className={`h-3.5 w-3.5 ${underReview ? 'animate-spin' : ''}`} />
          {verifiedBadge.text}
        </span>
      </div>

      {/* Authorization notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--zcanopy-primary)]" />
        <p className="text-sm leading-relaxed text-[var(--zcanopy-card-brown)]">
          These details are used to confirm that you have authorization from the landlord. We verify them
          against the National Identification and Registration Authority (NIRA) and the Uganda National Land
          Information System (UgNLIS) before your listings go live and payouts are unlocked.
        </p>
      </div>

      {underReview ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4"
        >
          <Clock className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-[var(--zcanopy-primary)]" />
          <div>
            <p className="font-medium text-[var(--zcanopy-card-brown)]">Submission under review</p>
            <p className="text-sm leading-relaxed text-[var(--zcanopy-muted)]">
              Your landlord &amp; title details are being reviewed by an administrator. You cannot save or upload
              another title document until the current review is complete.
              {status?.submittedAt
                ? ` Submitted ${new Date(status.submittedAt).toLocaleDateString()}.`
                : ''}
            </p>
          </div>
        </div>
      ) : null}

      {status?.status === 'approved' ? (
        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Landlord &amp; Title Verified</p>
            <p className="text-sm text-green-600">
              Your landlord &amp; title details have been approved. You may now withdraw your earnings.
            </p>
          </div>
        </div>
      ) : status?.status === 'rejected' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4">
            <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Verification Rejected</p>
              <p className="text-sm text-red-600">
                {status.rejectionReason ||
                  'The submitted landlord details could not be validated. Please review and resubmit.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Landlord authorisation step — collapsed banner (shown alone when no matched brokers) */}
      {landlordAuth && authCollapsed && !matchedBrokers && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4">
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--zcanopy-primary)]" />
            <div>
              <p className="font-medium text-[var(--zcanopy-card-brown)]">
                Landlord authorisation still required
              </p>
              <p className="text-sm text-[var(--zcanopy-muted)]">
                Send an OTP to the landlord
                {landlordAuth.phoneMasked ? ` (${landlordAuth.phoneMasked})` : ''} and confirm it with
                the landlord&apos;s NIN to finish verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resumeLandlordAuth}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--zcanopy-primary)' }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Active authorisation requirement — cross-broker OTPs and landlord OTP+NIN as alternatives */}
      {landlordAuth || matchedBrokers ? (
        <>
          {landlordAuth && authCollapsed && matchedBrokers && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-[var(--zcanopy-primary)]" />
                <div>
                  <p className="font-medium text-[var(--zcanopy-card-brown)]">
                    Landlord authorisation still required
                  </p>
                  <p className="text-sm text-[var(--zcanopy-muted)]">
                    Send an OTP to the landlord
                    {landlordAuth.phoneMasked ? ` (${landlordAuth.phoneMasked})` : ''} and confirm it with
                    the landlord&apos;s NIN to finish verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resumeLandlordAuth}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--zcanopy-primary)' }}
              >
                Continue
              </button>
            </div>
          )}
          {landlordAuth && !authCollapsed && (
        <form
          onSubmit={handleVerifyLandlordAuthorization}
          className="space-y-5 rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-4 shadow-[var(--zcanopy-shadow)] sm:p-6"
        >
          <div className="flex items-start gap-3 rounded-xl border border-[var(--zcanopy-accent-gold)]/40 bg-[var(--zcanopy-accent-gold)]/10 p-4">
            <Phone className="mt-0.5 h-6 w-6 shrink-0 text-[var(--zcanopy-primary)]" />
            <div className="space-y-2">
              <p className="font-medium text-[var(--zcanopy-card-brown)]">
                Landlord already verified by another broker
              </p>
              <p className="text-sm leading-relaxed text-[var(--zcanopy-muted)]">
                The NIN you entered matches a landlord whose details have already been verified for another
                broker. Send an authorisation OTP to the landlord
                {landlordAuth.phoneMasked ? ` (${landlordAuth.phoneMasked})` : ''} to confirm they also
                authorised you. The OTP and the landlord&apos;s NIN together identify the landlord&apos;s
                consent — only the landlord can provide both.
              </p>
            </div>
          </div>

          {!landlordOtpSent ? (
            <button
              type="button"
              onClick={handleSendLandlordOtp}
              disabled={authBusy}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--zcanopy-primary)' }}
            >
              {authBusy ? 'Sending OTP…' : 'Send OTP to the landlord'}
            </button>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="landlord-authorization-otp" required>
                  Landlord authorisation OTP
                </FieldLabel>
                <input
                  id="landlord-authorization-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={landlordOtp}
                  onChange={(e) => setLandlordOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${inputClass} text-center tracking-[0.3em]`}
                />
                <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">
                  Obtain the code sent by SMS to the landlord&apos;s phone number.
                </p>
              </div>

              <div>
                <FieldLabel
                  htmlFor="landlord-authorization-nin"
                  required
                  tooltip="The landlord's own 14-character NIN as printed on their National ID. Together with the OTP sent to the landlord's phone, it confirms the landlord's identity and consent."
                >
                  Landlord&apos;s NIN
                </FieldLabel>
                <input
                  id="landlord-authorization-nin"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={14}
                  placeholder="CM84012100XXXX"
                  value={landlordNin}
                  onChange={(e) => setLandlordNin(formatNin(e.target.value))}
                  className={`${inputClass} font-mono uppercase tracking-wide`}
                />
                <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">
                  Must match the NIN on the landlord&apos;s National ID. Only the landlord can confirm both
                  this and the OTP.
                </p>
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--zcanopy-primary)' }}
              >
                {authBusy ? 'Verifying…' : 'Verify & complete verification'}
              </button>

              <button
                type="button"
                onClick={handleSendLandlordOtp}
                disabled={authBusy}
                className="w-full text-center text-xs font-semibold text-[var(--zcanopy-primary)] hover:underline disabled:opacity-50"
              >
                Resend the OTP to the landlord
              </button>
            </>
          )}

          {authError && (
            <div role="alert" className="rounded-xl bg-red-50 p-3">
              <ErrorText>{authError}</ErrorText>
            </div>
          )}
          {authNotice && (
            <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {authNotice}
            </div>
          )}

          <button
            type="button"
            onClick={cancelLandlordAuth}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[var(--zcanopy-muted)] transition-colors hover:border-gray-300 hover:text-[var(--zcanopy-card-brown)]"
          >
            Cancel
          </button>
        </form>
          )}
          {matchedBrokers && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitWithOtps();
          }}
          className="space-y-5 rounded-2xl border border-[var(--zcanopy-border)] bg-[var(--zcanopy-surface)] p-4 shadow-[var(--zcanopy-shadow)] sm:p-6"
        >
          <div className="flex items-start gap-3 rounded-xl bg-orange-50 p-4">
            <KeyRound className="mt-0.5 h-6 w-6 shrink-0 text-orange-500" />
            <div className="space-y-2">
              <p className="font-medium text-orange-800">Landlord already linked to other brokers</p>
              <p className="text-sm leading-relaxed text-orange-700">
                The landlord details you entered match records submitted by other brokers on ZCanopy. To prove
                you also have authorization from this landlord, confirmation OTPs must be sent to those
                brokers. You will need to obtain each OTP from them and enter it below before your submission
                is accepted.
              </p>
            </div>
          </div>

          <ul className="space-y-2">
            {matchedBrokers.map((b) => (
              <li key={b.brokerCode} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--zcanopy-card-brown)]">{b.brokerName}</p>
                    <p className="text-xs text-[var(--zcanopy-muted)]">
                      {b.brokerCode} · OTP sent via {b.channel === 'email' ? 'email' : 'SMS'}
                    </p>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit OTP"
                    value={brokerOtps[b.brokerCode] || ''}
                    onChange={(e) =>
                      setBrokerOtps((prev) => ({
                        ...prev,
                        [b.brokerCode]: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    className="w-36 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm tracking-[0.3em] shadow-sm focus:border-[var(--zcanopy-primary)] focus:outline-none"
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!otpsSent ? (
              <button
                type="button"
                onClick={handleAgreeToSendOtps}
                disabled={otpSending}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--zcanopy-primary)' }}
              >
                {otpSending ? 'Sending OTPs…' : 'I agree — send confirmation OTPs to these brokers'}
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--zcanopy-primary)' }}
              >
                {submitting ? 'Verifying…' : 'Submit with broker OTPs'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMatchedBrokers(null);
                setPendingPayload(null);
                setBrokerOtps({});
                setSubmitSuccess('');
              }}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-[var(--zcanopy-muted)] transition-colors hover:border-gray-300 hover:text-[var(--zcanopy-card-brown)]"
            >
              Cancel
            </button>
          </div>

          {submitError && <ErrorText>{submitError}</ErrorText>}
          {submitSuccess && <p className="text-xs font-medium text-green-600">{submitSuccess}</p>}
        </form>
          )}
        </>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* SECTION 1 — Landlord identity */}
          <SectionCard
            step={1}
            title="Landlord Identity Details"
            subtitle="Exactly as they appear on the landlord's NIRA National ID."
            icon={UserRound}
            collapsible={sectionsCollapsible}
            open={openSections[1]}
            onToggle={() => toggleSection(1)}
          >
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="landlord-fullname" required>
                  Full Legal Name
                </FieldLabel>
                <input
                  id="landlord-fullname"
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Nakato Mariam Bint"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`${inputClass} ${errors.fullName ? errorClass : ''}`}
                  aria-invalid={!!errors.fullName}
                />
                <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">Must match NIRA National ID exactly.</p>
                <ErrorText>{errors.fullName}</ErrorText>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel
                    htmlFor="landlord-nin"
                    required
                    tooltip="The 14-character National Identification Number printed on the front of the National ID (e.g. CM84012100XXXX)."
                  >
                    NIN (National Identification Number)
                  </FieldLabel>
                  <input
                    id="landlord-nin"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="CM84012100XXXX"
                    maxLength={14}
                    value={nin}
                    onChange={(e) => setNin(formatNin(e.target.value))}
                    className={`${inputClass} font-mono uppercase tracking-wide ${errors.nin ? errorClass : ''}`}
                    aria-invalid={!!errors.nin}
                  />
                  <ErrorText>{errors.nin}</ErrorText>
                </div>
                <div>
                  <FieldLabel htmlFor="landlord-phone" required>
                    Phone Number
                  </FieldLabel>
                  <input
                    id="landlord-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+256 7XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(normalizePhone(e.target.value))}
                    className={`${inputClass} ${errors.phoneNumber ? errorClass : ''}`}
                    aria-invalid={!!errors.phoneNumber}
                  />
                  <ErrorText>{errors.phoneNumber}</ErrorText>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* SECTION 2 — Ministry & tenure */}
          <SectionCard
            step={2}
            title="Ministry & Tenure Selection"
            subtitle="Ministry Zonal Office handling the title and the land tenure system."
            icon={Landmark}
            collapsible={sectionsCollapsible}
            open={openSections[2]}
            onToggle={() => toggleSection(2)}
          >
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="landlord-mzo" required>
                  MZO / District
                </FieldLabel>
                <select
                  id="landlord-mzo"
                  value={mzoDistrict}
                  onChange={(e) => setMzoDistrict(e.target.value)}
                  className={`${inputClass} ${errors.mzoDistrict ? errorClass : ''}`}
                  aria-invalid={!!errors.mzoDistrict}
                >
                  <option value="">Select district…</option>
                  {MZO_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ErrorText>{errors.mzoDistrict}</ErrorText>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">
                  Tenure Type <span className="text-red-500">*</span>
                </legend>
                <div role="radiogroup" aria-label="Tenure type" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TENURE_OPTIONS.map((opt) => {
                    const active = tenureType === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-3 py-2.5 text-center text-sm font-semibold transition-all ${
                          active
                            ? 'border-[var(--zcanopy-primary)] bg-[var(--zcanopy-primary)]/10 text-[var(--zcanopy-primary)] shadow-sm'
                            : 'border-gray-200 bg-white text-gray-500 hover:border-[var(--zcanopy-primary)]/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="tenureType"
                          value={opt.value}
                          checked={active}
                          onChange={() => setTenureType(opt.value)}
                          className="sr-only"
                        />
                        {opt.label}
                        <span className="text-[10px] font-normal leading-tight text-[var(--zcanopy-muted)]">{opt.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </div>
          </SectionCard>

          {/* SECTION 3 — dynamic property location */}
          <SectionCard
            step={3}
            title="Property Location on Title"
            subtitle="Fields adapt to the selected tenure type."
            icon={MapPin}
            collapsible={sectionsCollapsible}
            open={openSections[3]}
            onToggle={() => toggleSection(3)}
          >
            <div className="space-y-4">
              {isMailo && (
                <div>
                  <FieldLabel htmlFor="landlord-county" required>
                    County / Division
                  </FieldLabel>
                  <input
                    id="landlord-county"
                    type="text"
                    placeholder="e.g. Kawempe Division"
                    value={countyDivision}
                    onChange={(e) => setCountyDivision(e.target.value)}
                    className={`${inputClass} ${errors.countyDivision ? errorClass : ''}`}
                    aria-invalid={!!errors.countyDivision}
                  />
                  <ErrorText>{errors.countyDivision}</ErrorText>
                </div>
              )}

              {showVolumeFolio && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel
                      htmlFor="landlord-volume"
                      required
                      tooltip="The Volume number is printed on the front page (cover) of the white title deed, usually top-right, e.g. 'VOL 1204'. Together with the Folio number it uniquely identifies the register page for the parcel."
                    >
                      Volume Number
                    </FieldLabel>
                    <input
                      id="landlord-volume"
                      type="text"
                      placeholder="e.g. 1204"
                      value={volumeNumber}
                      onChange={(e) => setVolumeNumber(e.target.value)}
                      className={`${inputClass} ${errors.volumeNumber ? errorClass : ''}`}
                      aria-invalid={!!errors.volumeNumber}
                    />
                    <ErrorText>{errors.volumeNumber}</ErrorText>
                  </div>
                  <div>
                    <FieldLabel
                      htmlFor="landlord-folio"
                      required
                      tooltip="The Folio number appears next to the Volume number on the title deed cover (e.g. 'FOLIO 12'). It identifies the specific page within the volume where this parcel is registered."
                    >
                      Folio Number
                    </FieldLabel>
                    <input
                      id="landlord-folio"
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 12"
                      value={folioNumber}
                      onChange={(e) => setFolioNumber(sanitizeNumeric(e.target.value))}
                      className={`${inputClass} ${errors.folioNumber ? errorClass : ''}`}
                      aria-invalid={!!errors.folioNumber}
                    />
                    <ErrorText>{errors.folioNumber}</ErrorText>
                  </div>
                </div>
              )}

              {showBlock && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="landlord-block" required={blockRequired}>
                      Block Number
                    </FieldLabel>
                    <input
                      id="landlord-block"
                      type="text"
                      inputMode="numeric"
                      placeholder={isMailo ? 'e.g. 216' : 'e.g. 216 (optional)'}
                      value={blockNumber}
                      onChange={(e) => setBlockNumber(sanitizeNumeric(e.target.value))}
                      className={`${inputClass} ${errors.blockNumber ? errorClass : ''}`}
                      aria-invalid={!!errors.blockNumber}
                    />
                    <p className="mt-1 text-xs text-[var(--zcanopy-muted)]">
                      Numeric only — typing “Block 216” is cleaned to “216”.
                    </p>
                    <ErrorText>{errors.blockNumber}</ErrorText>
                  </div>
                  <div>
                    <FieldLabel htmlFor="landlord-plot" required={plotRequired}>
                      Plot Number
                    </FieldLabel>
                    <input
                      id="landlord-plot"
                      type="text"
                      inputMode="numeric"
                      placeholder={isMailo ? 'e.g. 1408' : 'e.g. 1408 (optional)'}
                      value={plotNumber}
                      onChange={(e) => setPlotNumber(sanitizeNumeric(e.target.value))}
                      className={`${inputClass} ${errors.plotNumber ? errorClass : ''}`}
                      aria-invalid={!!errors.plotNumber}
                    />
                    <ErrorText>{errors.plotNumber}</ErrorText>
                  </div>
                </div>
              )}

              {isLeasehold && (
                <div>
                  <FieldLabel htmlFor="landlord-lease-expiry" tooltip="Optional — the date the lease interest lapses, as stated on the lease document.">
                    Lease Expiry Date <span className="text-xs font-normal text-[var(--zcanopy-muted)]">(optional)</span>
                  </FieldLabel>
                  <input
                    id="landlord-lease-expiry"
                    type="date"
                    value={leaseExpiryDate}
                    onChange={(e) => setLeaseExpiryDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {isCustomary && (
                <>
                  <div>
                    <FieldLabel htmlFor="landlord-village" required>
                      Sub-County &amp; Village Name
                    </FieldLabel>
                    <input
                      id="landlord-village"
                      type="text"
                      placeholder="e.g. Bwera Sub-County, Kanyatsi Village"
                      value={subCountyVillage}
                      onChange={(e) => setSubCountyVillage(e.target.value)}
                      className={`${inputClass} ${errors.subCountyVillage ? errorClass : ''}`}
                      aria-invalid={!!errors.subCountyVillage}
                    />
                    <ErrorText>{errors.subCountyVillage}</ErrorText>
                  </div>
                  <div>
                    <FieldLabel htmlFor="landlord-cco" required>
                      Certificate of Customary Ownership (CCO) Ref Number
                    </FieldLabel>
                    <input
                      id="landlord-cco"
                      type="text"
                      placeholder="e.g. CCO/2020/00123"
                      value={ccoRefNumber}
                      onChange={(e) => setCcoRefNumber(e.target.value.toUpperCase())}
                      className={`${inputClass} font-mono ${errors.ccoRefNumber ? errorClass : ''}`}
                      aria-invalid={!!errors.ccoRefNumber}
                    />
                    <ErrorText>{errors.ccoRefNumber}</ErrorText>
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          {submitError && (
            <div role="alert" className="rounded-xl bg-red-50 p-3">
              <ErrorText>{submitError}</ErrorText>
            </div>
          )}
          {submitSuccess && (
            <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {submitSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || underReview}
            title={
              underReview
                ? 'Your current submission is under review. You cannot upload another title document until it is complete.'
                : undefined
            }
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'var(--zcanopy-primary)' }}
          >
            {submitting ? 'Submitting…' : 'Save & Generate Title Search Request'}
          </button>

          <p className="flex items-start gap-1.5 text-xs text-[var(--zcanopy-muted)]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            On submit, a structured JSON payload is generated for database ingestion and UgNLIS title-deed PDF
            parsing.
          </p>
        </form>
      )}
    </div>
  );
}
