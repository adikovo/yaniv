import { useEffect, useState } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import { Copy, Check, Crown } from 'lucide-react';
import socket from "../../api/socket"
import { ParticleGrid } from '../../components/particle-grid';
import './styles.css'

export const Lobby = () => {
    const navigate = useNavigate();
    const { player, players, gameID, gameStarted } = useGameContext();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (gameStarted) navigate('/game');
    }, [gameStarted, navigate]);

    const startGameClicked = () => socket.emit("startGame");

    const copyGameId = async () => {
        await navigator.clipboard.writeText(gameID);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }

    const leaveLobby = () => {
        socket.emit('leaveRoom');
        navigate('/');
    }

    const isHost = (p) =>
        p.playerType === 'host' || (p.id === player.id && player.playerType === 'host');

    const lobby = () => {
        return (
            <div className="lobby-panel glass-panel">
                <h2 className="lobby-title">Lobby</h2>

                <div className="gameid-banner">
                    <div className="gameid-meta">
                        <span className="gameid-label">Game ID</span>
                        <span className="gameid-value">{gameID}</span>
                    </div>
                    <button
                        className={`copy-btn${copied ? ' copied' : ''}`}
                        aria-label="Copy game ID"
                        onClick={copyGameId}
                    >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>

                <ul className="player-list">
                    {players.map((p, index) => (
                        <li key={p.id ?? index} className={`player-row${p.id === player.id ? ' is-you' : ''}`}>
                            {isHost(p) && <Crown size={14} className="crown" />}
                            <span className="player-name">{p.name}{p.id === player.id ? ' (you)' : ''}</span>
                        </li>
                    ))}
                </ul>

                <div className="lobby-actions">
                    {player.playerType === 'host'
                        ? <button className="glow-btn glow-btn--cyan" onClick={startGameClicked} disabled={players.length < 2}>Start Game</button>
                        : <p className="lobby-waiting">Waiting for host to start the game…</p>}
                    <button className="leave-btn" onClick={leaveLobby}>Leave Lobby</button>
                </div>
            </div>
        );
    }

    return (
        <div className="menu-screen">
            <ParticleGrid />
            <div className="menu-content">
                {lobby()}
            </div>
        </div>
    )
};
