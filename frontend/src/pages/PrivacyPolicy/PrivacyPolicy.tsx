import {Brain, Cpu, ShieldCheck } from "lucide-react";

const PrivacyPolicy = () => (
  <div className="pt-12 pb-20 max-w-3xl mx-auto px-4 animate-fade-in">
    <div className="mb-10 border-b border-slate-200 pb-8">
      <h1 className="text-4xl font-bold mb-4 flex items-center gap-3 text-slate-900">
        <ShieldCheck className="w-10 h-10 text-green-600" />
        Privacy Policy
      </h1>
      <p className="text-xl text-slate-600">
        AI Osmosis is built on a "Local-First" architecture. We believe you shouldn't have to sacrifice privacy to learn a language.
      </p>
    </div>

    <div className="space-y-12">
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. How We Handle Your Data</h2>
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <ul className="space-y-4 text-slate-700">
            <li className="flex gap-3">
              <div className="min-w-[24px] pt-1"><Cpu className="w-5 h-5 text-blue-600"/></div>
              <div>
                <strong className="block text-slate-900">No Tracking or Analytics</strong>
                We do not track your browsing history, clicks, or usage time. We do not have a backend server, database, or analytics dashboard. The extension runs entirely on your device.
              </div>
            </li>
            <li className="flex gap-3">
              <div className="min-w-[24px] pt-1"><Brain className="w-5 h-5 text-orange-600"/></div>
              <div>
                <strong className="block text-slate-900">AI Processing</strong>
                <ul>
                  <li className="mb-2"><strong>Local Ollama (Default):</strong> Your text never leaves your computer. It is processed locally on your machine.</li>
                  <li><strong>Cloud Providers (Optional):</strong> If you choose OpenAI, Gemini, or Claude, snippets of text are sent directly from your browser to their official APIs. We do not act as a middleman and cannot see this traffic.</li>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Permissions Explained</h2>
        <p className="text-slate-600 mb-6">
          We request only the permissions strictly necessary for the extension to function. Here is a transparent breakdown of why we need each one:
        </p>

        <div className="grid gap-4">
          <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
            <h3 className="font-bold text-slate-900 font-mono text-sm mb-1 bg-slate-100 inline-block px-2 py-0.5 rounded">Read and change all your data on all websites</h3>
            <p className="text-sm text-slate-600 mt-2">
              <strong>Why needed?</strong> To provide a passive immersion experience, the extension needs to scan the text on the pages you visit (like Reddit or Wikipedia) to identify words to translate. It then modifies the DOM (Document Object Model) to insert the translated text next to the original. This happens locally in your browser tab.
            </p>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
            <h3 className="font-bold text-slate-900 font-mono text-sm mb-1 bg-slate-100 inline-block px-2 py-0.5 rounded">storage</h3>
            <p className="text-sm text-slate-600 mt-2">
              <strong>Why needed?</strong> Used to save your preferences (Immersion %, Language settings) and your API keys locally on your device. This data is not synced to us.
            </p>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
            <h3 className="font-bold text-slate-900 font-mono text-sm mb-1 bg-slate-100 inline-block px-2 py-0.5 rounded">tts (Text-to-Speech)</h3>
            <p className="text-sm text-slate-600 mt-2">
              <strong>Why needed?</strong> Allows the extension to access your operating system's native speech engine to read translated words aloud when you click them.
            </p>
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Your Control</h2>
        <p className="text-slate-600 mb-4">You have full control over when and where the extension runs.</p>
        <ul className="list-disc pl-5 space-y-2 text-slate-600">
          <li>You can disable the extension globally with a single toggle.</li>
          <li>You can use the <strong>Blocklist</strong> feature to prevent the extension from running on specific domains (e.g., banking sites, code repositories).</li>
          <li>The extension only runs when the browser is open and you are actively browsing.</li>
        </ul>
      </section>

      <div className="text-sm text-slate-400 pt-8 border-t border-slate-100">
        Last updated: {new Date().toLocaleDateString()}
      </div>
    </div>
  </div>
);
export default PrivacyPolicy