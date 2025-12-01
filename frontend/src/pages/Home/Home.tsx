import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation
} from 'react-router-dom';
import {
  Brain,
  Languages,
  Cpu,
  Volume2,
  ShieldCheck,
  Download,
  Menu,
  X,
  ChevronRight,
  Globe,
  Zap,
  Settings
} from 'lucide-react';
import FeatureCard from "../../components/FeatureCard/FeatureCard";

// --- ASSETS & MOCK DATA ---

const DEMO_TEXT = "Language learning is a journey, not a destination. Consistency is the key to mastery. By changing just a few words in your daily reading, you can absorb new vocabulary without even trying. It is like magic for your brain.";

const MOCK_DICTIONARY: Record<string, string> = {
  "Language": "Idioma",
  "learning": "aprendizaje",
  "journey": "viaje",
  "destination": "destino",
  "Consistency": "Constancia",
  "key": "clave",
  "mastery": "maestría",
  "changing": "cambiando",
  "few": "pocas",
  "words": "palabras",
  "daily": "diaria",
  "reading": "lectura",
  "absorb": "absorber",
  "new": "nuevo",
  "vocabulary": "vocabulario",
  "without": "sin",
  "trying": "intentar",
  "magic": "magia",
  "brain": "cerebro"
};

const Home = () => {
  // Interactive Demo State
  const [percentage, setPercentage] = useState(20);
  const [scope, setScope] = useState<'words' | 'sentences'>('words');

  // Render the demo text dynamically
  const renderDemoText = () => {
    if (scope === 'sentences') {
      // Mock Sentence Mode logic
      const sentences = DEMO_TEXT.split('. ');
      return sentences.map((s, i) => {
        const isTranslated = (i + 1) * 30 <= percentage; // Rough math for demo
        return (
          <span key={i} className="inline-block mr-1 mb-2">
                    {s}.
            {isTranslated && (
              <>
                <br/>
                <span className="block text-orange-600 font-bold italic text-sm mt-1">
                                (Translated text would appear here below the original...) 🔊
                            </span>
              </>
            )}
                </span>
        );
      });
    } else {
      // Mock Word Mode logic
      const words = DEMO_TEXT.split(' ');
      return words.map((word, i) => {
        // Clean punctuation
        const raw = word.replace(/[.,]/g, '');
        const punct = word.match(/[.,]/g)?.[0] || '';
        const translation = MOCK_DICTIONARY[raw];

        // Deterministic "randomness" based on percentage slider
        const shouldTranslate = translation && ((raw.length + i) % 100 < percentage);

        return (
          <span key={i} className="inline-block mr-1.5">
                    {raw}
            {shouldTranslate ? (
              <span className="text-orange-600 font-bold cursor-pointer ml-1 hover:underline" title="Click to listen">
                            ({translation})
                        </span>
            ) : null}
            {punct}
                </span>
        );
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <section className="pt-20 pb-16 md:pt-32 md:pb-24 px-4 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full font-medium text-sm mb-8 border border-blue-100">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          Now compatible with Claude & Gemini
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-6">
          Learn a Language <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
            Without Trying
          </span>
        </h1>

        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI Osmosis passively translates a percentage of the websites you already visit.
          Absorb vocabulary from Reddit, YouTube, and Twitter without changing your routine.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/install"
            className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 transition-all w-full sm:w-auto"
          >
            Get the Extension
          </Link>
          <button onClick={() => document.getElementById('demo')?.scrollIntoView({behavior:'smooth'})} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all w-full sm:w-auto">
            Try Live Demo
          </button>
        </div>
      </section>
      <section id="demo" className="py-12 px-4 bg-slate-50 border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">See It In Action</h2>
            <p className="text-slate-500">Adjust the sliders to simulate the extension experience.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Immersion: {percentage}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentage}
                  onChange={(e) => setPercentage(Number(e.target.value))}
                  className="flex-grow h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button
                  onClick={() => setScope('words')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${scope === 'words' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Word Mode
                </button>
                <button
                  onClick={() => setScope('sentences')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${scope === 'sentences' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Sentence Mode
                </button>
              </div>
            </div>
            <div className="p-8 md:p-12 min-h-[200px] flex items-center">
              <p className="text-xl md:text-2xl leading-relaxed text-slate-800 font-serif">
                {renderDemoText()}
              </p>
            </div>

            <div className="bg-blue-50 p-3 text-center text-sm text-blue-800 border-t border-blue-100">
              <span className="font-bold">Tip:</span> In the real extension, clicking any orange text plays audio pronunciation! 🔊
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">Why use AI Osmosis?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Cpu className="text-indigo-500" />}
            title="Choose Your Brain"
            desc="Use Local Ollama for complete privacy, or connect to OpenAI, Gemini, or Claude for premium translation quality."
          />
          <FeatureCard
            icon={<Volume2 className="text-pink-500" />}
            title="Native Pronunciation"
            desc="Don't just read it. Hear it. Smart Text-to-Speech integration helps you master the accent instantly."
          />
          <FeatureCard
            icon={<Settings className="text-orange-500" />}
            title="Total Control"
            desc="Ignore specific sites (like your bank), adjust immersion percentage, or switch between word/sentence modes instantly."
          />
        </div>
      </section>
    </div>
  );
};

export default Home;