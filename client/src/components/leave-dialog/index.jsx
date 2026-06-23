import './styles.css';

export const LeaveDialog = ({ onConfirm, onCancel }) => {
    return (
        <div className="leave-dialog-overlay">
            <div className="leave-dialog">
                <h2>Leave the game?</h2>
                <div className="leave-dialog-actions">
                    <button className="leave-dialog-btn leave-dialog-btn-stay" onClick={onCancel}>
                        No
                    </button>
                    <button className="leave-dialog-btn leave-dialog-btn-leave" onClick={onConfirm}>
                        Yes
                    </button>
                </div>
            </div>
        </div>
    );
};
