import { useEffect, useState, useMemo } from 'react';
import { useGameContext } from '../../context/game-context';
import { useNavigate } from "react-router-dom";
import socket from "../../api/socket";
import './styles.css'
import { Card } from '../../components/card';
import { OpponentArea } from '../../components/opponent-area';
import { getOpponentPositions } from '../../utils/opponent-positions';
import { YanivOverlay } from '../../components/yaniv-overlay';
import { RoundResult } from '../../components/round-result';
import { SpectatorPrompt } from '../../components/spectator-prompt';

export const Game = () => {

    const { player, setPlayer, players, setPlayers, gameID, gameState, setGameState, sum, setSum, selectedCards, setSelectedCards, gameOverData, setGameOverData, isSpectator, setIsSpectator, handSizes, opponentScores } = useGameContext();
    const [yanivResult, setYanivResult] = useState(null);
    const [showSpectatorPrompt, setShowSpectatorPrompt] = useState(false);
    const [disconnectNotice, setDisconnectNotice] = useState(null);

    useEffect(() => {
        socket.on('roundEnd', (data) => {
            setYanivResult(data);
        });
        socket.on('nextRound', ({ top_card, current_turn, deck }) => {
            setGameState({ top_card, current_turn, deck });
            setTimeout(() => {
                setYanivResult(prev => {
                    if (prev?.eliminated?.some(e => e.id === player.id)) {
                        setShowSpectatorPrompt(true);
                    }
                    return null;
                });
            }, 1500);
        });
        socket.on('gameOver', (data) => setGameOverData(data));
        socket.on('start', () => setGameOverData(null));
        socket.on('playerDisconnected', ({ name, id }) => {
            setDisconnectNotice(`${name} has left the game`);
            setTimeout(() => setDisconnectNotice(null), 4000);
            setPlayers(prev => prev.filter(p => p.id !== id));
        });
        return () => {
            socket.off('roundEnd');
            socket.off('nextRound');
            socket.off('gameOver');
            socket.off('start');
            socket.off('playerDisconnected');
        };
    }, []);


    const yanivCall = () => {
        socket.emit("makeTurn", gameID, { type: "yaniv" });
    }

    // const getTurn = () => {
    //     if(!hasEmittedTurn.current){
    //         hasEmittedTurn.current = true;

    //         //debug
    //         console.log("inside getTurn");
    //     }
    // }

    // useEffect(() => {
    //     getTurn();
    //   }, []);

    //debug
    //   useEffect(() => {
    //     console.log("Game state updated:", gameState);
    //   }, [gameState]);
    //   //debug
    //   useEffect(() => {
    //     console.log("Player updated:", player);
    //   }, [player]);

    //not needed
    const getTopCard = () => {
        if (!gameState.top_card || gameState.top_card.length === 0) return '';
        const top = gameState.top_card[gameState.top_card.length - 1];
        return getCardImageName(top);
    }

    const selectCards = (index) => {

        const card = player.hand[index];
        const firstCard = player.hand[selectedCards[0]];
        const lastCard = player.hand[selectedCards[selectedCards.length - 1]];

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
                        />
                    ))
                }

                <div className="center-area">
                    <button onClick={drawFromDeck} disabled={selectedCards.length < 1}>DECK</button>
                    <h3>TOP CARD:</h3>
                    <div className='top_card_pile'>
                        {gameState.top_card?.map((card, index) => (
                            <Card key={index} card={card} onClick={() => drawFromTop(index)} disabled={selectedCards.length < 1} />
                        ))}
                    </div>
                </div>

                <div className={`local-player-area${gameState.current_turn === player.id ? ' active-turn' : ''}`}>
                    <span className="score-badge">{opponentScores[player.id] ?? 0}</span>
                    <h3>Your Hand:</h3>
                    <div className='hand'>
                        {player.hand?.map((card, index) => (
                            <Card key={index}
                                card={card}
                                onClick={() => selectCards(index)}
                                selected={selectedCards.includes(index)} />
                        ))}
                    </div>
                    <button
                        onClick={yanivCall}
                        disabled={player.id !== gameState.current_turn || sum > 7}>
                        YANIV
                    </button>
                    <h4>Sum:{sum}</h4>
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
        navigate('/');
    };

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
                        <button onClick={handleLeave}>Exit</button>
                    </div>
                </div>
                {yanivResult && (
                    <YanivOverlay
                        winner={yanivResult.winner}
                        asaf={yanivResult.asaf}
                        asafCaller={yanivResult.asafCaller}
                    />
                )}
            </div>
        );
    }

    return (
        <div className='home'>
            {disconnectNotice && (
                <div className='disconnect-notice'>{disconnectNotice}</div>
            )}
            {game()}
            {showSpectatorPrompt && (
                <SpectatorPrompt onWatch={handleWatch} onLeave={handleLeave} />
            )}
            {yanivResult && !showSpectatorPrompt && (
                <YanivOverlay
                    winner={yanivResult.winner}
                    asaf={yanivResult.asaf}
                    asafCaller={yanivResult.asafCaller}
                    players={yanivResult.players}
                    eliminated={yanivResult.eliminated}
                />
            )}
        </div>
    )
}