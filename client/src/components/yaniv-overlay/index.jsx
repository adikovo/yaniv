import './styles.css';

export const YanivOverlay = ({ winner, asaf, asafCaller }) => {
    return (
        <div className="yaniv-overlay">
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
    );
};
