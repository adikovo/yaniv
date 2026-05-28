import './styles.css';

export const RoundResult = ({ winner, asaf, asafCaller, players }) => {
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
            </div>
        </div>
    );
};
