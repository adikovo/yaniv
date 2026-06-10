import { Card } from '../card';
import './styles.css';

export const OpponentArea = ({ name, handCount, score, isActive, position }) => (
    <div className={`opponent-area opponent-${position} ${isActive ? 'active-turn' : ''}`}>
        <div className="opponent-hand">
            {Array.from({ length: handCount ?? 0 }).map((_, i) => (
                <Card key={i} faceDown />
            ))}
        </div>
        <span className="opponent-name">{name}</span>
        <span className="score-badge">{score ?? 0}</span>
    </div>
);
