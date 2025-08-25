
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
// import { BrowserRouter } from 'react-router-dom'

// createRoot(document.getElementById('root')).render(
//   <BrowserRouter>
//     <App />
//   </BrowserRouter>,
// )



// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'
// import { BrowserRouter } from 'react-router-dom'

// createRoot(document.getElementById('root')).render(
//   <BrowserRouter>
//     <App />
//   </BrowserRouter>,
// )


import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import store from "./redux/store";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

// If you want proj4 globally available for Potree or OL
import proj4 from "proj4";
window.proj4 = proj4;

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Provider>
);
