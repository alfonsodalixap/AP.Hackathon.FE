import { Button, Spinner } from '@alixpartners/ui-components';
import type { AIState } from '../types';

interface Props {
  state: AIState;
  questions: string[];
  onGenerate: () => void;
  onQuestion: (q: string) => void;
}

export default function AICard({ state, questions, onGenerate, onQuestion }: Props) {
  return (
    <div className="ai-card">
      <div className="ai-card-header">
        <div className="ai-card-title">🤖 Analyst Narrative</div>
        <Button
          type="secondary"
          size="sm"
          onClick={onGenerate}
          disabled={state.loading}
        >
          {state.loading
            ? <><Spinner size="sm" color="dark" /> Analyzing…</>
            : state.text ? 'Regenerate' : 'Generate Narrative'}
        </Button>
      </div>

      {!state.text && !state.loading && (
        <div className="ai-placeholder">
          Click "Generate Narrative" to get a practitioner-ready summary of what this data is telling you.
        </div>
      )}

      {state.text && (
        <div className="ai-narrative-text">{state.text}</div>
      )}

      {state.text && (
        <div className="q-chips">
          {questions.map((q) => (
            <button key={q} className="q-chip" onClick={() => onQuestion(q)}>{q}</button>
          ))}
        </div>
      )}

      {state.chat.length > 0 && (
        <div className="chat-msgs">
          {state.chat.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role === 'user' ? 'q' : 'a'}`}>
              {msg.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
