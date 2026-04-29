import { Dialog } from '@alixpartners/ui-components';

interface Props {
  fiscalYear: string | null;
  onClose: () => void;
}

export default function PeriodMismatchModal({ fiscalYear, onClose }: Props) {
  const isStale = fiscalYear && (new Date().getFullYear() - parseInt(fiscalYear)) > 1;

  const description = (
    <>
      The Integrated Analysis cross-references your roster with{' '}
      <strong>FY{fiscalYear}</strong> financial data. Make sure both sources cover the same
      period — combining a recent roster with an older 10-K can skew revenue-per-employee and
      labor ratios significantly.
      {isStale && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: '#fff0f0', borderLeft: '3px solid #e53e3e', borderRadius: 4, color: '#742a2a', fontWeight: 600, fontSize: 13 }}>
          FY{fiscalYear} is more than one year behind today. Flag this gap explicitly in your analysis output.
        </div>
      )}
    </>
  );

  return (
    <Dialog
      title="Check your data periods"
      description={description}
      isOpen
      onClose={onClose}
      onConfirm={onClose}
      confirmButtonText="Understood, continue →"
      confirmButtonType="primary"
      showCloseButton={false}
      closeOnOverlayClick={false}
    />
  );
}
