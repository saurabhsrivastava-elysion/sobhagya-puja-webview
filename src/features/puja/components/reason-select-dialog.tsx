import { useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ReasonSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  /** The only reasons that can be chosen (no free text). */
  reasons: readonly string[];
  pending?: boolean;
  onConfirm: (reason: string) => void;
}

/** A destructive confirmation where the reason is picked from a dropdown (astrologer decline and cancel). */
export function ReasonSelectDialog({ open, reasons, onConfirm, ...props }: ReasonSelectDialogProps) {
  const [reason, setReason] = useState('');
  // Each opening starts with nothing picked (state adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setReason('');
  }

  return (
    <ConfirmDialog
      {...props}
      open={open}
      destructive
      confirmDisabled={!reason}
      onConfirm={() => reason && onConfirm(reason)}
    >
      <Select value={reason} onValueChange={setReason}>
        <SelectTrigger className="w-full" aria-label="Reason">
          <SelectValue placeholder="Select a reason" />
        </SelectTrigger>
        <SelectContent position="popper" className="w-(--radix-select-trigger-width)">
          {reasons.map((r) => (
            <SelectItem key={r} value={r} className="whitespace-normal">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ConfirmDialog>
  );
}
