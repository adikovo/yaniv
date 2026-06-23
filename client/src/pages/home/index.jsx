import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from 'lucide-react';
import { sendHost, sendJoin } from '../../api/api';

import './styles.css'
import { useGameContext } from '../../context/game-context';
import { ParticleGrid } from '../../components/particle-grid';
import socket from "../../api/socket";

export const Home = () => {
    const navigate = useNavigate();
    const [hostName, setHostName] = useState('');
    const [joinName, setJoinName] = useState('');
    const [gameMode, setGameMode] = useState('welcome');
    const [joinError, setJoinError] = useState('');

    const { setGameID, gameID, setPlayer, resetGame } = useGameContext();

    const hostGameClicked = async () => {
        resetGame();
        const result = await sendHost(hostName);
        socket.emit("joinRoom", {player: result.data.player, room: result.data.gameID});
        setGameID(result.data.gameID);
        setPlayer(result.data.player);
        navigate('/lobby');
    }

    const joinGameClicked = async () => {
        resetGame();
        const result = await sendJoin(joinName, gameID);
        if (result.status === 200) {
            socket.emit("joinRoom", {player: result.data.player, room: gameID});
            setGameID(gameID); // resetGame() cleared it; restore so makeTurn targets the room
            setPlayer(result.data.player);
            navigate('/lobby');

        } else {
            setJoinError(result.data.error)
        }
        
    }

    const hostGame = () => {
        return (
            <div className="form-panel glass-panel">
                <button className="back-btn" onClick={() => setGameMode('welcome')}>
                    <ChevronLeft size={14} /> Back
                </button>
                <h2 className="form-title">Host a Game</h2>
                <label className="form-field">
                    <span className="form-label">Name</span>
                    <input className="neon-input" type="text" name="name" onChange={(event) => setHostName(event.target.value)} />
                </label>
                <button className="glow-btn glow-btn--cyan form-submit" onClick={hostGameClicked}>Start Game</button>
            </div>
        );
    }

    const joinGame = () => {
        return (
            <div className="form-panel glass-panel">
                <button className="back-btn" onClick={() => setGameMode('welcome')}>
                    <ChevronLeft size={14} /> Back
                </button>
                <h2 className="form-title">Join a Game</h2>
                <label className="form-field">
                    <span className="form-label">Name</span>
                    <input className="neon-input" type="text" name="name" onChange={(event) => setJoinName(event.target.value)} />
                </label>
                <label className="form-field">
                    <span className="form-label">Game ID</span>
                    <input className="neon-input" type="text" name="GameID" onChange={(event) => setGameID(event.target.value)} />
                </label>
                <button className="glow-btn glow-btn--magenta form-submit" onClick={joinGameClicked}>Join Game</button>
                {joinError && <p className="form-error">{joinError}</p>}
            </div>
        )
    }

    return (
        <div className="menu-screen">
            <ParticleGrid />
            <div className="menu-content">
                {gameMode === 'welcome' && (
                    <div className="welcome">
                        <div className="wordmark">
                            <h1 className="wordmark-title">YANIV</h1>
                            <div className="wordmark-underline" />
                        </div>
                        <div className="welcome-actions">
                            <button className="glow-btn glow-btn--cyan" onClick={() => setGameMode('host')}>Host a Game</button>
                            <button className="glow-btn glow-btn--magenta" onClick={() => setGameMode('join')}>Join a Game</button>
                        </div>
                    </div>
                )}
                {gameMode === 'host' && hostGame()}
                {gameMode === 'join' && joinGame()}
            </div>
        </div>
    )
};
