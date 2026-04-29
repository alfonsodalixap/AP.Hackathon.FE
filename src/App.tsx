import { useState } from 'react';
import type { RosterData, FinancialData, AIState } from './types';
import Navbar from './components/Navbar';
import StepBar from './components/StepBar';
import PeriodMismatchModal from './components/PeriodMismatchModal';
import Step1Roster from './steps/Step1Roster';
import Step2Financials from './steps/Step2Financials';
import Step3Integrated from './steps/Step3Integrated';

function emptyAI(): AIState {
  return { text: null, loading: false, chat: [] };
}

export default function App() {
  const [step, setStep] = useState(1);

  const [roster, setRoster] = useState<{ loaded: boolean; data: RosterData | null; fileName: string | null }>({
    loaded: false, data: null, fileName: null,
  });

  const [financials, setFinancials] = useState<{ loaded: boolean; data: FinancialData | null; error: string | null }>({
    loaded: false, data: null, error: null,
  });

  const [aiRoster, setAiRoster] = useState<AIState>(emptyAI());
  const [aiIntegrated, setAiIntegrated] = useState<AIState>(emptyAI());
  const [modalShown, setModalShown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  function goStep(n: number) {
    if (n === 3 && (!roster.loaded || !financials.loaded)) return;
    setStep(n);
    if (n === 3 && !modalShown) {
      setModalOpen(true);
      setModalShown(true);
    }
  }

  function loadRoster(data: RosterData, fileName: string) {
    setRoster({ loaded: true, data, fileName });
    setAiRoster(emptyAI());
  }

  function resetRoster() {
    setRoster({ loaded: false, data: null, fileName: null });
    setAiRoster(emptyAI());
  }

  function loadFinancials(data: FinancialData) {
    setFinancials({ loaded: true, data, error: null });
    setAiIntegrated(emptyAI());
  }

  function resetFinancials() {
    setFinancials({ loaded: false, data: null, error: null });
    setAiIntegrated(emptyAI());
  }

  function patchAiRoster(patch: Partial<AIState>) {
    setAiRoster((prev) => ({ ...prev, ...patch }));
  }

  function patchAiIntegrated(patch: Partial<AIState>) {
    setAiIntegrated((prev) => ({ ...prev, ...patch }));
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <StepBar
          step={step}
          rosterLoaded={roster.loaded}
          financialsLoaded={financials.loaded}
          onStep={goStep}
        />

        {step === 1 && (
          <Step1Roster
            roster={roster}
            ai={aiRoster}
            onLoad={loadRoster}
            onReset={resetRoster}
            onAI={patchAiRoster}
            onNext={() => goStep(2)}
          />
        )}

        {step === 2 && (
          <Step2Financials
            financials={financials}
            onLoad={loadFinancials}
            onReset={resetFinancials}
            onBack={() => goStep(1)}
            onNext={() => goStep(3)}
            rosterLoaded={roster.loaded}
          />
        )}

        {step === 3 && roster.loaded && roster.data && financials.loaded && financials.data && (
          <Step3Integrated
            roster={{ data: roster.data, fileName: roster.fileName! }}
            financials={{ data: financials.data }}
            ai={aiIntegrated}
            onAI={patchAiIntegrated}
            onBack={() => goStep(2)}
          />
        )}

        {step === 3 && (!roster.loaded || !financials.loaded) && (
          <div className="empty-state">
            <div className="empty-icon">🔗</div>
            <div className="empty-title">Load both datasets to unlock Integrated Analysis</div>
            <div className="empty-sub">Cross-analysis of workforce composition vs. financial performance</div>
            <div className="checklist">
              <div className={`check-item ${roster.loaded ? 'done' : 'todo'}`}>
                {roster.loaded ? '✓' : '○'} Roster Data
                {!roster.loaded && <span style={{ fontSize: 11 }}> — go to Roster Analysis</span>}
              </div>
              <div className={`check-item ${financials.loaded ? 'done' : 'todo'}`}>
                {financials.loaded ? '✓' : '○'} Financial Data
                {!financials.loaded && <span style={{ fontSize: 11 }}> — go to Financial Data</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <PeriodMismatchModal
          fiscalYear={financials.data?.fiscal_year || null}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
