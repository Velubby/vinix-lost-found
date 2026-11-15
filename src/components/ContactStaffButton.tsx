'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Copy, ExternalLink, Mail, MapPin, MessageCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { DEFAULT_PICKUP_LOCATION, OFFICE_ADDRESS, OFFICE_NAME, OFFICE_HOURS } from '@/lib/locations';

const CONTACT_EMAIL = 'lostfound@vinix7.id';

function normalizeWhatsAppNumber(value: string | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function buildMessage(reference?: string, itemTitle?: string) {
  const detail = [reference, itemTitle ? `(${itemTitle})` : ''].filter(Boolean).join(' ');
  return [
    'Halo Petugas Lost & Found VINIX7,',
    '',
    detail
      ? `Saya ingin menanyakan tindak lanjut untuk ${detail}.`
      : 'Saya ingin menanyakan tindak lanjut laporan saya.',
    '',
    'Terima kasih.',
  ].join('\n');
}

interface ContactStaffButtonProps {
  reference?: string;
  itemTitle?: string;
  label?: string;
  className?: string;
}

export function ContactStaffButton({
  reference,
  itemTitle,
  label = 'Hubungi Petugas',
  className,
}: ContactStaffButtonProps) {
  const [open, setOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const whatsappNumber = normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_LOST_FOUND_WHATSAPP);
  const subject = `Pertanyaan Lost & Found${reference ? ` - ${reference}` : ''}`;
  const message = buildMessage(reference, itemTitle);
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null;

  async function copyEmail() {
    let copied = false;

    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      copied = true;
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = CONTACT_EMAIL;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    setCopyStatus(copied ? 'copied' : 'failed');

    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyStatus('idle'), 2500);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setCopyStatus('idle');
      if (copyTimer.current) clearTimeout(copyTimer.current);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className={className}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="size-4" aria-hidden="true" />
        <span>{label}</span>
      </Button>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Hubungi Petugas"
        description="Pilih jalur yang paling nyaman. Sertakan nomor laporan atau tiket agar petugas cepat menemukan data Anda."
        size="md"
      >
        <div className="space-y-5">
          {reference && (
            <p className="rounded-surface border border-line bg-surface-muted px-4 py-3 text-[13px] text-body">
              Nomor referensi: <span className="font-semibold tabular-nums text-ink">{reference}</span>
            </p>
          )}

          <div className="space-y-2">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full"
              >
                <MessageCircle className="size-4" aria-hidden="true" />
                <span>Chat WhatsApp Petugas</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={gmailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={whatsappUrl ? 'btn-secondary w-full' : 'btn-primary w-full'}
              >
                <Mail className="size-4" aria-hidden="true" />
                <span>Buka Gmail</span>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              <a href={mailtoUrl} className="btn-secondary w-full">
                <Mail className="size-4" aria-hidden="true" />
                <span>Buka aplikasi email</span>
              </a>
            </div>

            <div className="rounded-surface border border-line bg-surface-muted px-4 py-3">
              <p className="text-xs text-muted">Email petugas</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <p className="break-all text-sm font-semibold text-ink">{CONTACT_EMAIL}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={copyEmail}
                >
                  {copyStatus === 'copied' ? (
                    <Check className="size-4 text-success" aria-hidden="true" />
                  ) : (
                    <Copy className="size-4" aria-hidden="true" />
                  )}
                  <span>{copyStatus === 'copied' ? 'Tersalin' : 'Salin'}</span>
                </Button>
                <span className="sr-only" aria-live="polite">
                  {copyStatus === 'copied'
                    ? 'Alamat email tersalin.'
                    : copyStatus === 'failed'
                    ? 'Gagal menyalin alamat email.'
                    : ''}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted">
                {copyStatus === 'failed'
                  ? 'Tidak bisa menyalin otomatis. Pilih alamat email di atas, lalu salin secara manual.'
                  : 'Kalau tidak ada aplikasi email, buka Gmail di browser atau tempel alamat ini di webmail kantor.'}
              </p>
            </div>
          </div>

          <div className="rounded-surface border border-line bg-surface-muted p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-semibold text-ink">Kantor dan pengambilan</h3>
                <p className="text-pretty text-[13px] leading-5 text-body">
                  {OFFICE_NAME}
                  <br />
                  {OFFICE_ADDRESS}
                </p>
                <p className="text-pretty text-[13px] leading-5 text-body">
                  Titik pengambilan: {DEFAULT_PICKUP_LOCATION}. Datang pada {OFFICE_HOURS} dengan membawa ID card/KTP.
                </p>
                <p className="text-pretty text-xs leading-5 text-muted">
                  Waktu penanganan mengikuti ketersediaan petugas.
                </p>
                <Link
                  href="/bantuan"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  Panduan pengambilan
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}