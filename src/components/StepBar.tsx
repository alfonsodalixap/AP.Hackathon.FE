interface StepBarProps {
  step: number;
  rosterLoaded: boolean;
  financialsLoaded: boolean;
  onStep: (n: number) => void;
}

export default function StepBar({ step, rosterLoaded, financialsLoaded, onStep }: StepBarProps) {
  const bothLoaded = rosterLoaded && financialsLoaded;

  return (
    <div className="step-bar">
      <div
        className={`step-item ${step === 1 ? 'active' : rosterLoaded ? 'done' : ''}`}
        onClick={() => onStep(1)}
      >
        <div className="step-num-wrap">
          {rosterLoaded && step !== 1 ? '✓' : '1'}
        </div>
        <div className="step-label-text">Roster Analysis</div>
        {rosterLoaded && step !== 1 && <div className="step-status">Loaded</div>}
      </div>

      <div className={`step-connector ${rosterLoaded ? 'done' : ''}`} />

      <div
        className={`step-item ${step === 2 ? 'active' : financialsLoaded ? 'done' : ''}`}
        onClick={() => onStep(2)}
      >
        <div className="step-num-wrap">
          {financialsLoaded && step !== 2 ? '✓' : '2'}
        </div>
        <div className="step-label-text">Financial Data</div>
        {financialsLoaded && step !== 2 && <div className="step-status">Loaded</div>}
      </div>

      <div className={`step-connector ${bothLoaded ? 'done' : ''}`} />

      <div
        className={`step-item ${step === 3 ? 'active' : ''} ${!bothLoaded ? 'locked' : ''}`}
        onClick={() => onStep(3)}
      >
        <div className="step-num-wrap">3</div>
        <div className="step-label-text">Integrated Analysis</div>
        {!bothLoaded
          ? <div className="step-status" style={{ color: '#f59e0b' }}>needs data</div>
          : step !== 3 && <div className="step-status" style={{ color: '#2d6016' }}>Ready</div>}
      </div>
    </div>
  );
}
