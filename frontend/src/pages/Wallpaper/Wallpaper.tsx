
import React, {ReactNode} from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../../components/NavBar/Navbar";
import Footer from "../../components/Footer/Footer";

type WallpaperProps = { children?: ReactNode}
const Wallpaper = ({children}: WallpaperProps)=> {

  return  <>
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-orange-100 selection:text-orange-900">
    <Navbar />
    <Outlet />
    {children}

  </div>
    <Footer />
  </>
};
export default Wallpaper;