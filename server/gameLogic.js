const { games } = require("./globals");

const NUM_OF_CARDS = 5;

//TODO add 2 joker cards
function createDeck() {
    let deck = [];
    let suits = ['H', 'C', 'D', 'S'];
    let card_values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    const valueToNumber = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
        '5': 5,
        '6': 6,
        '7': 7,
        '8': 8,
        '9': 9,
        '10': 10,
        'J': 11,
        'Q': 12,
        'K': 13
    };

    for (let suit of suits) {
        for (let value of card_values) {
            deck.push({ value, suit, numeric_val: valueToNumber[value] });
        }
    }
    return deck;
}

function shuffleDeck(game, deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (!game.game_state) {
        game.game_state = {};
    }
    game.game_state.deck = deck;
}

function dealCards(game) {

    for (let playerKey in game.players) {
        const hand = game.game_state.deck.splice(0, NUM_OF_CARDS);

        for (let i = 0; i < hand.length; i++) {
            hand[i].index = i;
        }
        game.players[playerKey].hand = hand;
    }
}

function getCurrentPlayer(game) {
    return game.players[game.game_state.current_turn];
}

function whosTurn(game) {
    const players_count = Object.keys(game.players).length;
    const first_player = Math.floor(Math.random() * players_count);
    game.game_state.current_turn = first_player;
}

function getNextPlayerId(game) {
    const keys = Object.keys(game.players).map(Number).sort((a, b) => a - b);
    const idx = keys.indexOf(game.game_state.current_turn);
    return keys[(idx + 1) % keys.length];
}

function nextTurn(game) {
    if (Object.keys(game.players).length === 0) return;
    game.game_state.current_turn = getNextPlayerId(game);
}

function drawFromDeck(game) {
    if (game.game_state.deck.length === 0) {
        rebuildDeck(game);
    }
    const player = getCurrentPlayer(game);
    const card = game.game_state.deck.pop();
    card.index = player.hand.length;
    player.hand.push(card);
    return card;
}

function handValue(player) {
    const hand = player.hand;
    let sum = 0;
    for (let card of hand) {
        sum += ['J', 'Q', 'K'].includes(card.value) ? 10 : card.numeric_val;
    }
    player.sum = sum;
}

function topCard(game) {
    const card = game.game_state.deck.pop();
    game.game_state.top_card = [card];
}

function validYaniv(hand_sum) {
    if (hand_sum <= 7) {
        return true;
    }
    return false;
}
function yanivCall(game) {
    const caller = getCurrentPlayer(game);
    let winner = caller;
    let asaf = false;

    for (const key in game.players) {
        const p = game.players[key];
        if (p === caller) continue;
        if (p.sum <= caller.sum) {
            asaf = true;
            winner = p;
        }
    }

    if (asaf) {
        caller.score = (caller.score || 0) + caller.sum + 30;
    }
    for (const key in game.players) {
        const p = game.players[key];
        if (p !== caller) {
            p.score = (p.score || 0) + p.sum;
        }
    }

    // Salvation rule: landing exactly on 100 → 50, exactly on 50 → 0
    for (const key in game.players) {
        const p = game.players[key];
        if (p.score === 100) p.score = 50;
        else if (p.score === 50) p.score = 0;
    }

    return { winner, asaf, caller };
}

function eliminatePlayers(game) {
    const eliminated = [];
    if (!game.eliminated) game.eliminated = [];
    for (const key in game.players) {
        if (game.players[key].score > 100) {
            const p = game.players[key];
            const record = { id: p.id, name: p.name, score: p.score };
            eliminated.push(record);
            game.eliminated.push(record);
            delete game.players[key];
        }
    }
    return eliminated;
}
function drawTopCard(game, side) {
    const player = getCurrentPlayer(game);
    let card;
    const top = game.game_state.top_card;
    if (side === "start") {
        card = top.shift();
    }
    else {
        card = top.pop();
    }
    card.index = player.hand.length;
    player.hand.push(card);
    //game.game_state.top_card = [];

}

function updateTopCard(game, cards) {
    game.game_state.top_card = cards;
}

//return the actual cards
function toCards(hand, indexes) {
    let selected = indexes.map(i => hand[i]).filter(card => card !== undefined);
    return selected;
}

function validMove(selected_cards) {

    if (selected_cards.length === 1) {
        return true;
    }

    const firstVal = selected_cards[0].value;
    const sameVal = selected_cards.every(card => card.value === firstVal);
    if (sameVal) {
        return true
    }

    const firstSuit = selected_cards[0].suit;
    const sameSuit = selected_cards.every(card => card.suit === firstSuit);
    if (sameSuit && selected_cards.length >= 3) {
        const sorted = selected_cards.sort((a, b) => a.numeric_val - b.numeric_val);
        for (let i = 0; i < sorted.length - 1; i++) {
            if (Math.abs(sorted[i].numeric_val - sorted[i + 1].numeric_val) !== 1) {
                return false;
            }
        }
        return true;
    }
}

function removeCardFromHand(hand, selected) {
    const descending = [...selected].sort((a, b) => b - a);
    for (const idx of descending) {
        hand.splice(idx, 1);
    }
    hand.forEach((card, i) => card.index = i);
}

function makeTurnCardFromHand(game, player, indexes) {
    let selected = toCards(player.hand, indexes);

    if (!validMove(selected)) {
        console.log("invalid move!!!");
    } else {
        removeCardFromHand(player.hand, indexes);
        handValue(player);
        updateTopCard(game, selected);

    }
}


function makeTurnCardFromDeck(game, player) {
    drawFromDeck(game);
    handValue(player);
    nextTurn(game);
}

function makeTurnCardFromTop(game, player, side) {
    drawTopCard(game, side);
    handValue(player);
    nextTurn(game);

}


function rebuildDeck(game) {
    game.game_state.deck = createDeck();
    shuffleDeck(game, game.game_state.deck);
}





module.exports = {
    createDeck,
    shuffleDeck,
    dealCards,
    getCurrentPlayer,
    whosTurn,
    getNextPlayerId,
    nextTurn,
    drawFromDeck,
    handValue,
    topCard,
    validYaniv,
    yanivCall,
    eliminatePlayers,
    drawTopCard,
    updateTopCard,
    makeTurnCardFromHand,
    toCards,
    removeCardFromHand,
    rebuildDeck,
    makeTurnCardFromDeck,
    makeTurnCardFromTop
}