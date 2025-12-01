import {Route, createBrowserRouter, createRoutesFromElements, RouterProvider} from "react-router-dom";
import React from "react";
import Wallpaper from "./Wallpaper/Wallpaper";
import Page404 from "./Page404/Page404";
import { LinkType } from "../types/LinkType";
import Home from "./Home/Home";
import PrivacyPolicy from "./PrivacyPolicy/PrivacyPolicy";
import Install from "./Install/Install";

const router = () => createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={
      <Wallpaper/>
    }
           errorElement={<Wallpaper>
             <Page404/>
           </Wallpaper>
           }>
      <Route path='' element={<Home/>}/>
            <Route path="/install" element={<Install />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
    </Route>
  )
)


const WebsiteRouter = ()=> {
  return <RouterProvider router={router()}/>

}
export default WebsiteRouter;