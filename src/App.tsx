import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from "./pages/Home";
import Controller from './pages/Controller';
import Screen from './pages/Screen';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/screen/:roomId" element={<Screen />} />
                <Route path="/controller/:roomId" element={<Controller />} />
            </Routes>
        </Router>
    )
}

export default App;