import React from 'react';
import ReactDOM from 'react-dom/client';
import WebsiteRouter from "./pages/router";
import './index.css'


const container = document.getElementById("root") as HTMLElement;

const root = ReactDOM.createRoot(container);

root.render(
      <WebsiteRouter/>
);
