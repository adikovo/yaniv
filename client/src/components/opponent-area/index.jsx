import { Card } from '../card';
import { CallOut } from '../call-out';
import './styles.css';

export const OpponentArea = ({ name, handCount, score, isActive, position, callout, eliminated, leaving }) => (
    <div
        className={`opponent-area opponent-seat opponent-${position}${isActive ? ' active-turn' : ''}${eliminated ? ' eliminated' : ''}${leaving ? ' leaving' : ''}`}
    >
        {isActive && <span className="seat-turn-tag">THEIR TURN</span>}
        <span className="opponent-name">{name}</span>
        <span className="score-badge">{score ?? 0}</span>
        <div className="opponent-hand">
            {Array.from({ length: handCount ?? 0 }).map((_, i) => (
                <Card key={i} faceDown />
            ))}
        </div>
        {callout && <CallOut variant={callout.variant} penalty={callout.penalty} />}
    </div>
);
