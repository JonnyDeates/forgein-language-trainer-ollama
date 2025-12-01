import { Link } from "react-router-dom";
import ai from "./assets/ai-osmosis.png"
const Footer = () => (
  <footer className="bg-slate-50 border-t border-slate-200 py-12 mt-20">
    <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-8 text-sm text-slate-500">
      <div className="col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <img src={ai} alt={'logo'} className={" rounded-lg w-10 h-10 text-white"}/>
          <span className="font-bold text-lg text-slate-900">AI Osmosis</span>
        </div>
        <p className="max-w-xs">
          The passive language learning tool for the modern web.
          Turn your browsing habits into fluency.
        </p>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 mb-4">Links</h4>
        <ul className="space-y-2">
          <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
          <li><Link to="/install" className="hover:text-blue-600">Get Started</Link></li>
          <li><Link to="/privacy" className="hover:text-blue-600">Privacy Policy</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-slate-900 mb-4">Connect</h4>
        <ul className="space-y-2">
          <li><a href="#" className="hover:text-blue-600">GitHub</a></li>
          <li><a href="#" className="hover:text-blue-600">Chrome Web Store</a></li>
          {/*<li><a href="#" className="hover:text-blue-600">Report Issue</a></li>*/}
        </ul>
      </div>
    </div>
  </footer>
);
export default Footer