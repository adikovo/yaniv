import './styles.css';

export const SpectatorPrompt = ({ onLeave, onWatch }) => {
    return (
        <div className="spectator-prompt-overlay">
            <div className="spectator-prompt-dialog">
                <h2>You&apos;ve been eliminated</h2>
                <p>What would you like to do?</p>
                <div className="spectator-prompt-actions">
                    <button className="spectator-btn spectator-btn-watch" onClick={onWatch}>
                        Watch
                    </button>
                    <button className="spectator-btn spectator-btn-leave" onClick={onLeave}>
                        Leave
                    </button>
                </div>
            </div>
        </div>
    );
};
