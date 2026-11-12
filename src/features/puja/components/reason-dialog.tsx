import { useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Textarea } from '@/components/ui/textarea';

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  placeholder?: string;
  /** A reason must be typed before confirming. */
  required?: boolean;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/** A confirmation that asks for a reason or note (reject, cancel, dispute, mark done). */
export function ReasonDialog({
  required = false,
  placeholder,
  onConfirm,
  open,
  ...props
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  // Each opening starts empty (state adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason('');
  }

  return (
    <ConfirmDialog
      {...props}
      open={open}
      onConfirm={() => onConfirm(reason.trim())}
      confirmDisabled={required && !reason.trim()}
    >
      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder ?? (required ? 'Reason (required)' : 'Add a note (optional)')}
        maxLength={1000}
        rows={3}
      />
    </ConfirmDialog>
  );
}
