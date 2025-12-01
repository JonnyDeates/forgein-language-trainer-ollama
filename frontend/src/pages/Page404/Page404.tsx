import './Page404.css'
import React from "react";
import {Link} from "react-router-dom";


const Page404 = () => {

    return <div className={'Page404'}>

            <h1>404</h1>
            <h2>Page Not Found</h2>
            <Link to={"/"} className={'NavButton'}>Return To Home</Link>
        </div>
};
export default Page404