import './styles.css';

export const YanivOverlay = ({ winner, asaf, asafCaller, players, eliminated = [] }) => {
    return (
        <div className="yaniv-overlay">
            <div className="yaniv-overlay-badges">
                <div className="yaniv-badge">
                    <span className="yaniv-badge-label">YANIV!</span>
                    <span className="yaniv-badge-name">{winner.name}</span>
                </div>
                {asaf && asafCaller && (
                    <div className="asaf-badge">
                        <span className="asaf-badge-label">ASAF!</span>
                        <span className="asaf-badge-name">{asafCaller.name} +30</span>
                    </div>
                )}
            </div>
            <ul className="yaniv-overlay-scores">
                {Object.values(players).map(p => (
                    <li key={p.id}>
                        <span>{p.name}</span>
                        <span>{p.score} pts</span>
                    </li>
                ))}
                {eliminated.map(p => (
                    <li key={p.id} className="yaniv-overlay-eliminated">
                        <span>{p.name}</span>
                        <span>{p.score} pts — Eliminated</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
