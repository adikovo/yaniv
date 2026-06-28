import { useEffect, useState, useMemo, useRef } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import socket from "../../api/socket";
import './styles.css'
import { Card } from '../../components/card';
import { OpponentArea } from '../../components/opponent-area';
import { getOpponentPositions } from '../../utils/opponent-positions';
import { CallOut } from '../../components/call-out';
import { useAsafSequence } from '../../hooks/use-asaf-sequence';
import { useEliminations } from '../../hooks/use-eliminations';
import { RoundResult } from '../../components/round-result';
import { SpectatorPrompt } from '../../components/spectator-prompt';
import { LeaveDialog } from '../../components/leave-dialog';
import { Home } from 'lucide-react';

export const Game = () => {

    const navigate = useNavigate();
    const { player, players, setPlayers, gameID, gameState, setGameState, sum, selectedCards, setSelectedCards, gameOverData, setGameOverData, isSpectator, setIsSpectator, handSizes, setHandSizes, opponentScores, resetGame } = useGameContext();
    const [yanivResult, setYanivResult] = useState(null);
    const showAsaf = useAsafSequence(yanivResult);
    const [showSpectatorPrompt, setShowSpectatorPrompt] = useState(false);
    const [disconnectNotice, setDisconnectNotice] = useState(null);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);

    // Eliminated-player sequence (FR-010): grey → fade → remove opponents so the
    // board reshuffles; the local player greys+fades, then the spectator prompt opens.
    const playersRef = useRef(players);
    playersRef.current = players;
    const remainingRef = useRef(2);

    const { greyedIds, leavingIds, eliminate } = useEliminations({
        localId: player.id,
        onRemoveOpponents: (ids) => setPlayers(prev => prev.filter(p => !ids.includes(p.id))),
        onLocalEliminated: () => {
            if (remainingRef.current >= 2) setShowSpectatorPrompt(true);
        },
    });
    // Keep the latest `eliminate` reachable from the once-registered socket
    const eliminateRef = useRef(eliminate);
    eliminateRef.current = eliminate;

    useEffect(() => {
        const handleRoundEnd = (data) => {
            setYanivResult(data);
            // Kick off the grey → fade → remove sequence for anyone eliminated.
            // Record how many players remain so a local elimination only opens the
            // spectator prompt when the game continues 
            if (data.eliminated?.length) {
                remainingRef.current = playersRef.current.length - data.eliminated.length;
                eliminateRef.current(data.eliminated);
            }
        };

        const handleNextRound = ({ top_card, current_turn, deck, hand_sizes }) => {
            setGameState({ top_card, current_turn, deck });
            if (hand_sizes) setHandSizes(hand_sizes);
            // Clear the round-end call-out after a beat
            setTimeout(() => setYanivResult(null), 1500);
        };

        const handleGameOver = (data) => {
            setGameOverData(data);
            setYanivResult(null);
        };
        const handleStart = () => setGameOverData(null);
        const handleRematchCancelled = () => { resetGame(); navigate('/'); };
        const handlePlayerDisconnected = ({ name, id }) => {
            setDisconnectNotice(`${name} has left the game`);
            setTimeout(() => setDisconnectNotice(null), 4000);
            setPlayers(prev => prev.filter(p => p.id !== id));
        };

        socket.on('roundEnd', handleRoundEnd);
        socket.on('nextRound', handleNextRound);
        socket.on('gameOver', handleGameOver);
        socket.on('start', handleStart);
        socket.on('playerDisconnected', handlePlayerDisconnected);
        socket.on('rematchCancelled', handleRematchCancelled);

        return () => {
            socket.off('roundEnd', handleRoundEnd);
            socket.off('nextRound', handleNextRound);
            socket.off('gameOver', handleGameOver);
            socket.off('start', handleStart);
            socket.off('playerDisconnected', handlePlayerDisconnected);
            socket.off('rematchCancelled', handleRematchCancelled);
        };
    }, []);


    const yanivCall = () => {
        socket.emit("makeTurn", gameID, { type: "yaniv" });
    }

    const selectCards = (index) => {

        const card = player.hand[index];
        const firstCard = player.hand[selectedCards[0]];

        console.log("Clicked card:", card);
        console.log("Currently selectedCards:", selectedCards);

        if (selectedCards.includes(index)) {
            setSelectedCards(prev => {
                const updated = prev.filter(i => i !== index);
                console.log("❎ Deselected card:", index, "Updated selection:", updated);
                return updated;

            });
            return;
        }

        if (selectedCards.length === 0) {
            console.log("✅ First card selected");
            setSelectedCards([index]);
            return;
        }
        //Same value 
        if (card.numeric_val === firstCard.numeric_val) {
            console.log("✅ Same value — added to selectedCards");
            setSelectedCards(prev => [...prev, index]);
            return;
        }
        //Seq check
        if (card.suit === firstCard.suit) {
            const cardsArray = [card];
            for (let cardIndex of selectedCards) {
                const maybeNewCard = player.hand[cardIndex];
                cardsArray.push(maybeNewCard);
            }
            const sorted = cardsArray.sort((a, b) => a.numeric_val - b.numeric_val);
            console.log("SORTEDDD", sorted);
            let seqOk = true;

            for (let i = 0; i < sorted.length - 1; i++) {
                if (Math.abs(sorted[i].numeric_val - sorted[i + 1].numeric_val) !== 1) {
                    seqOk = false;
                    //debug
                    console.log("not a seq!!")
                    break;
                }
            }
            if (seqOk) {
                console.log("✅ Valid sequence — added to selectedCards");
                setSelectedCards(prev => [...prev, index]);
            }
        }
    };


    const drawFromDeck = () => {
        socket.emit("makeTurn", gameID, { type: "cardFromDeck", selected_cards: selectedCards });
        setSelectedCards([]);
    }

    const drawFromTop = (index) => {
        if (index !== 0 && index !== gameState.top_card.length - 1) {
            console.log("INVALID DRAW FROM TOP!");
            return;
        }
        const side = index === 0 ? "start" : "end";
        socket.emit("makeTurn", gameID, { type: "cardFromTop", side, selected_cards: selectedCards });
        setSelectedCards([]);
    }

    const positionMap = useMemo(
        () => getOpponentPositions(players, player.id),
        [players, player.id]
    );

    // Returns the callout props for a player: "YANIV!" immediately, "ASAF!" after 1.5s delay
    const calloutFor = (id) =>
        !yanivResult ? null
        : id === yanivResult.yanivCaller?.id ? { variant: 'yaniv', penalty: false }
        : yanivResult.asaf && showAsaf && yanivResult.asafPlayers?.some(p => p.id === id) ? { variant: 'asaf', penalty: true }
        : null;

    const game = () => {
        return (
            <div className={`game-board players-${players.length}`}>

                {players
                    .filter(p => p.id !== player.id)
                    .map(p => (
                        <OpponentArea
                            key={p.id}
                            name={p.name}
                            handCount={handSizes[p.id] ?? 0}
                            score={opponentScores[p.id] ?? 0}
                            isActive={gameState.current_turn === p.id}
                            position={positionMap[p.id]}
                            callout={calloutFor(p.id)}
                            eliminated={greyedIds.includes(p.id)}
                            leaving={leavingIds.includes(p.id)}
                        />
                    ))
                }

                <div className="center-area">
                    <button
                        className="deck-button glow-btn glow-btn--cyan"
                        onClick={drawFromDeck}
                        disabled={selectedCards.length < 1}
                    >DECK</button>
                    <div className='top_card_pile'>
                        {gameState.top_card?.map((card, index) => (
                            <Card key={index} card={card} onClick={() => drawFromTop(index)} disabled={selectedCards.length < 1} />
                        ))}
                    </div>
                </div>

                <div className={`local-player-area${gameState.current_turn === player.id ? ' active-turn' : ''}${greyedIds.includes(player.id) ? ' eliminated' : ''}${leavingIds.includes(player.id) ? ' leaving' : ''}`}>
                    {calloutFor(player.id) && <CallOut variant={calloutFor(player.id).variant} penalty={calloutFor(player.id).penalty} />}
                    <div className="local-score">
                        <span className="local-score-label">SCORE</span>
                        <span className="score-badge">{opponentScores[player.id] ?? 0}</span>
                    </div>
                    <div className='hand'>
                        {player.hand?.map((card, index) => (
                            <Card key={index}
                                card={card}
                                onClick={() => selectCards(index)}
                                selected={selectedCards.includes(index)} />
                        ))}
                    </div>
                    <button
                        className="glow-btn glow-btn--magenta"
                        onClick={yanivCall}
                        disabled={player.id !== gameState.current_turn || sum > 7}>
                        YANIV
                    </button>
                    <span className="hand-sum">SUM {sum}</span>
                </div>

            </div>
        );
    }

    const handleWatch = () => {
        setShowSpectatorPrompt(false);
        setIsSpectator(true);
        socket.emit('spectatorJoin');
    };

    const handleLeave = () => {
        socket.emit('leaveRoom');
        navigate('/');
    };

    // Home corner button + its confirmation dialog — shared by the active game
    // view and the spectator view so leaving behaves identically in both.
    const leaveControls = (
        <>
            <button
                className="home-corner-btn"
                aria-label="Leave game"
                onClick={() => setShowLeaveDialog(true)}
            >
                <Home size={20} />
            </button>
            {showLeaveDialog && (
                <LeaveDialog onConfirm={handleLeave} onCancel={() => setShowLeaveDialog(false)} />
            )}
        </>
    );

    if (gameOverData) {
        return (
            <div className='home'>
                <RoundResult winner={gameOverData.winner} canRematch={gameOverData.reason !== 'disconnect'} />
            </div>
        );
    }

    if (isSpectator) {
        return (
            <div className='home'>
                {leaveControls}
                <div className={`game-board players-${players.length}`}>
                    {players
                        .map(p => (
                            <OpponentArea
                                key={p.id}
                                name={p.name}
                                handCount={handSizes[p.id] ?? 0}
                                score={opponentScores[p.id] ?? 0}
                                isActive={gameState.current_turn === p.id}
                                position={positionMap[p.id]}
                                callout={calloutFor(p.id)}
                            />
                        ))
                    }
                    <div className="center-area">
                        <h3>TOP CARD:</h3>
                        <div className='top_card_pile'>
                            {gameState.top_card?.map((card, index) => (
                                <Card key={index} card={card} disabled />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className='home'>
            {leaveControls}
            {disconnectNotice && (
                <div className='disconnect-notice'>{disconnectNotice}</div>
            )}
            {game()}
            {showSpectatorPrompt && (
                <SpectatorPrompt onWatch={handleWatch} onLeave={handleLeave} />
            )}
        </div>
    )
}