import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Home } from "./pages/home";
import { Lobby } from "./pages/lobby";
import { Game } from "./pages/game";

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="/game" element={<Game />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;
