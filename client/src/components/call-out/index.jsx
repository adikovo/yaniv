import './styles.css';

export function CallOut({ variant, penalty }) {
    return (
        <div className={`call-out call-out-${variant}`}>
            <span className="call-out-text">{variant === 'yaniv' ? 'YANIV!' : 'ASAF!'}</span>
            {penalty && <span className="call-out-penalty">+30</span>}
        </div>
    );
}
