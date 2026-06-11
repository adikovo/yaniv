import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../api/socket';
import { useGameContext } from '../../context/game-context';
import './styles.css';

export const RoundResult = ({ winner, canRematch = true }) => {
    const navigate = useNavigate();
    const { resetGame } = useGameContext();
    const [timeLeft, setTimeLeft] = useState(10);
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        if (!canRematch) return;
        if (timeLeft <= 0) {
            if (!clicked) {
                socket.emit('leaveRoom');
                navigate('/');
            }
            return;
        }
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, canRematch, clicked]);

    const handleRematch = () => {
        if (clicked) return;
        setClicked(true);
        socket.emit('rematchReady');
    };

    const handleGoHome = () => {
        socket.emit('leaveRoom');
        resetGame();
        navigate('/');
    };

    return (
        <div className="round-result-overlay">
            <div className="round-result-dialog">
                <h2>Game Over — {winner.name} wins!</h2>
                {canRematch ? (
                    <button
                        className="round-result-next-btn"
                        onClick={handleRematch}
                        disabled={clicked}
                    >
                        {clicked ? 'Waiting...' : `Rematch (${timeLeft}s)`}
                    </button>
                ) : (
                    <p>All other players have left the game.</p>
                )}
                <button className="round-result-home-btn" onClick={handleGoHome}>
                    Go Home
                </button>
            </div>
        </div>
    );
};
