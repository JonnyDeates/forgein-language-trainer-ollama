import {Brain, Download, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ai from './assets/ai-osmosis.png'
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path ? "text-orange-600 font-bold" : "text-slate-600 hover:text-slate-900";

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
              <img src={ai} alt={'logo'} className={" rounded-lg w-10 h-10 text-white"}/>
            <span className="font-bold text-xl tracking-tight text-slate-900">AI Osmosis</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className={isActive("/")}>Features</Link>
            <Link to="/install" className={isActive("/install")}>Installation</Link>
            <Link to="/privacy" className={isActive("/privacy")}>Privacy</Link>
            <a
              href="https://github.com/your-repo/ai-osmosis"
              target="_blank"
              rel="noreferrer"
              className="bg-slate-900 text-white px-5 py-2 rounded-full font-medium hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-slate-600">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 p-4 flex flex-col gap-4">
          <Link to="/" onClick={() => setIsOpen(false)} className="block py-2">Features</Link>
          <Link to="/install" onClick={() => setIsOpen(false)} className="block py-2">Installation</Link>
          <Link to="/privacy" onClick={() => setIsOpen(false)} className="block py-2">Privacy</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar