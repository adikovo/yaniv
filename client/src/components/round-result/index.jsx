import { useState, useEffect } from 'react';
import socket from '../../api/socket';
import './styles.css';

export const RoundResult = ({ winner, asaf, asafCaller, players }) => {
    const [timeLeft, setTimeLeft] = useState(15);
    const [clicked, setClicked] = useState(false);

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleReady = () => {
        if (clicked || timeLeft <= 0) return;
        setClicked(true);
        socket.emit('readyForNextRound');
    };

    return (
        <div className="round-result-overlay">
            <div className="round-result-dialog">
                <h2>{asaf ? `Asaf! ${winner.name} wins` : `${winner.name} called Yaniv!`}</h2>
                {asaf && (
                    <p className="round-result-asaf">
                        {asafCaller.name} is penalised (Asaf)
                    </p>
                )}
                <ul className="round-result-scores">
                    {Object.values(players).map((p) => (
                        <li key={p.id}>
                            <span>{p.name}</span>
                            <span>{p.score} pts</span>
                        </li>
                    ))}
                </ul>
                <button
                    className="round-result-next-btn"
                    onClick={handleReady}
                    disabled={clicked || timeLeft <= 0}
                >
                    {clicked ? 'Waiting...' : `Next Round (${timeLeft}s)`}
                </button>
            </div>
        </div>
    );
};
