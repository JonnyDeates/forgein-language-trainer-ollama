import {Chrome, Download, Zap } from "lucide-react";
import Step from "../../components/Step/Step";


const Install = () => {

  return <div className="pt-12 pb-20 max-w-6xl mx-auto px-4 animate-slide-up">
    <div className="text-center mb-16">
      <h1 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900">Choose Your Installation</h1>
      <p className="text-xl text-slate-600 max-w-2xl mx-auto">
        Get up and running in seconds. Choose the method that works best for you.
      </p>
    </div>

    <div className="grid md:grid-cols-2 gap-8 mb-20">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
        <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
        <div className="mb-6 bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center">
          <Chrome className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">Chrome Web Store</h3>
        <p className="text-slate-600 mb-8 flex-grow">
          The easiest way to install. Get automatic updates and secure installation directly from the Google Chrome Web Store.
        </p>
        <a
          href="#"
          className="block w-full py-4 bg-blue-600 text-white text-center rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          Add to Chrome
        </a>
      </div>
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
        <div className="mb-6 bg-orange-50 w-16 h-16 rounded-2xl flex items-center justify-center">
          <Download className="w-8 h-8 text-orange-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">Manual Install</h3>
        <p className="text-slate-600 mb-8 flex-grow">
          For developers or power users. Download the latest release package and load it as an unpacked extension.
        </p>
        <button
          onClick={() => document.getElementById('manual-steps')?.scrollIntoView({ behavior: 'smooth' })}
          className="block w-full py-4 bg-white text-slate-700 border-2 border-slate-200 text-center rounded-xl font-bold hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 transition-all"
        >
          View Instructions & Download
        </button>
      </div>
    </div>
    <div id="manual-steps" className="border-t border-slate-200 pt-16">
      <h2 className="text-3xl font-bold mb-10 text-center text-slate-900">Manual Installation Guide</h2>

      <div className="space-y-8 max-w-3xl mx-auto">
        <Step
          num="1"
          title="Download the Extension"
          desc="Get the latest version of AI Osmosis packaged as a .zip file."
        >
          <a
            href="/extension.zip"
            download="ai-osmosis-v1.0.0.zip"
            className="mt-4 px-6 py-3 bg-slate-800 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-slate-900 transition-colors w-fit"
          >
            <Download className="w-4 h-4" /> Download v1.0.0 (.zip)
          </a>
        </Step>

        <Step
          num="2"
          title="Load in Browser"
          desc="Open your browser and navigate to chrome://extensions. Toggle 'Developer Mode' in the top right corner of the screen."
        />

        <Step
          num="3"
          title="Install Unpacked"
          desc="Unzip the downloaded file. Then click 'Load Unpacked' in the top left and select the folder you just extracted."
        />
      </div>
    </div>

    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 mt-20 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <Zap className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <h3 className="font-bold text-xl mb-3 text-slate-900">
            Important: Using Local AI (Ollama)?
          </h3>
          <p className="text-slate-600 mb-4 leading-relaxed">
            If you plan to use the free, private <strong>Local Ollama</strong> provider, you must configure it to allow browser requests. This applies to both installation methods.
          </p>
          <div className="bg-slate-800 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
            <div className="mb-2 text-xs text-slate-500 uppercase tracking-wider font-bold">Terminal Command:</div>
            <span className="text-green-400">OLLAMA_ORIGINS="*" ollama serve</span>
          </div>
        </div>
      </div>
    </div>
  </div>
}
export default Install;