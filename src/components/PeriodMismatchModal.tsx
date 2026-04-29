interface Props {
  fiscalYear: string | null;
  onClose: () => void;
}

export default function PeriodMismatchModal({ fiscalYear, onClose }: Props) {
  const isStale = fiscalYear && (new Date().getFullYear() - parseInt(fiscalYear)) > 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">⚠️</div>
        <div className="modal-title">Check your data periods</div>
        <div className="modal-body">
          The Integrated Analysis cross-references your roster with{' '}
          <strong>FY{fiscalYear}</strong> financial data. Make sure both sources cover the same
          period — combining a recent roster with an older 10-K can skew revenue-per-employee and
          labor ratios significantly.
          {isStale && (
            <div style={{ marginTop: 10, padding: '8px 10px', background: '#fff0f0', borderLeft: '3px solid #e53e3e', borderRadius: 4, color: '#742a2a', fontWeight: 600, fontSize: 12 }}>
              FY{fiscalYear} is more than one year behind today. Flag this gap explicitly in your analysis output.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Understood, continue →</button>
        </div>
      </div>
    </div>
  );
}
