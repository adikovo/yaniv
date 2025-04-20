const { games } = require("./globals");

const NUM_OF_CARDS = 5;

//TODO add 2 joker cards
function createDeck(){
    let deck = [];
    let suits = ['H', 'C', 'D', 'S'];
    let card_values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'J', 'Q', 'K'];

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

    for(let suit of suits){
        for(let value of card_values){
            deck.push({value, suit, numeric_val: valueToNumber[value]});
        }
    }
    return deck; 
}
 
function shuffleDeck(game, deck){
    for(let i = deck.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    if (!game.game_state) {
        game.game_state = {};
    }    
    game.game_state.deck = deck; 
}

function dealCards(game){
    
    for(let playerKey in game.players){
        const hand = game.game_state.deck.splice(0, NUM_OF_CARDS);

        for(let i = 0; i < hand.length; i++){
            hand[i].index = i;
        }
        game.players[playerKey].hand = hand;
    }
}

function getCurrentPlayer(game){
    return game.players[game.game_state.current_turn];
}

function whosTurn(game){
    const players_count = Object.keys(game.players).length;
    const first_player = Math.floor(Math.random() * players_count);
    game.game_state.current_turn = first_player;
}

function nextTurn(game){
    const next_player = (game.game_state.current_turn + 1) % Object.keys(game.players).length;
    game.game_state.current_turn = next_player;
}

function drawFromDeck(game){
    if(game.game_state.deck.length === 0){
        rebuildDeck(game);
    }
    const player = getCurrentPlayer(game);
    const card = game.game_state.deck.pop();
    card.index = player.hand.length;
    player.hand.push(card);
    return card;
}

function handValue(player){
    const hand = player.hand;
    let sum = 0;
    for(let card of hand){
        if(!isNaN(card.value)){
            sum += Number(card.value);
        }
        if(['J', 'Q', 'K'].includes(card.value)){
            sum += 10;
        }
    }
    player.sum = sum;
}

function topCard(game){
    const card = game.game_state.deck.pop();
    game.game_state.top_card = [card];
}

function validYaniv(hand_sum){
    if(hand_sum <= 7){
        return true;
    }
    return false;
}
//return object- name and win type: yaniv/asaf
function yanivCall(game){
    const player = getCurrentPlayer(game);
    const yaniv_sum = player.sum;

    for(let playerKey in game.players){
        if(game.players[playerKey] !== player){
            const player = game.players[playerKey];

            if(player.sum <= yaniv_sum){
                console.log(`ASAFFFFFFFFF ${player.name} WONN!!`);
                return;
            }
        }      
    }
    console.log(`player # ${game.game_state.current_turn + 1} won!!!!!`);
    return;
}
function drawTopCard(game, side){
    const player = getCurrentPlayer(game);
    let card;
    const top = game.game_state.top_card;
    if(side === "start"){
        card = top.shift();
    }
    else{
        card = top.pop();
    }
    card.index = player.hand.length;
    player.hand.push(card);
    //game.game_state.top_card = [];

}

function updateTopCard(game, cards){
    game.game_state.top_card = cards;
}
    
//return the actual cards
function toCards(hand, indexes){
    let selected = indexes.map(i => hand[i]).filter(card => card !== undefined);
    return selected;
}

function validMove(selected_cards){

    if(selected_cards.length === 1){
        return true;
    }

    //debug
    console.log("selected", selected_cards);
    
    const firstVal = selected_cards[0].value;
    const sameVal = selected_cards.every(card => card.value === firstVal);
    if(sameVal){
        return true
    }

    const firstSuit = selected_cards[0].suit;
    const sameSuit = selected_cards.every(card => card.suit === firstSuit);
    if(sameSuit){
        const sorted = selected_cards.sort((a,b) => a.numeric_val - b.numeric_val);
        for(let i = 0; i < sorted.length - 1; i++){
            if(Math.abs(sorted[i].numeric_val - sorted[i + 1].numeric_val) !== 1){
                //debug
                console.log("not a seq!!")
                return false;
            }
        }
        //debug
        console.log("valid seq!");
        return true;
    }
}

function removeCardFromHand(hand, selected){
    for(let i = selected.length - 1; i >= 0; i--){
        hand.splice(selected[i], 1);
    }
    hand.forEach((card, i) => card.index = i);
}

function makeTurnCardFromHand(game, player, indexes){
    let selected = toCards(player.hand, indexes);
    //debug
    console.log("after to card", selected);

    if(!validMove(selected)){
        console.log("invalid move!!!");
    }else{
        removeCardFromHand(player.hand, indexes);
        handValue(player);
        updateTopCard(game, selected);
    
    }
}


function makeTurnCardFromDeck(game, player){
        drawFromDeck(game);
        handValue(player);
        nextTurn(game);
}

function makeTurnCardFromTop(game, player, side){
        drawTopCard(game, side);
        handValue(player);
        nextTurn(game);
        
}


function rebuildDeck(game){
    game.game_state.deck = createDeck();
    shuffleDeck(game, game.game_state.deck);
}





module.exports = {createDeck,
    createDeck,
    shuffleDeck,
    dealCards,
    getCurrentPlayer,
    whosTurn,
    nextTurn,
    drawFromDeck,
    handValue,
    topCard,
    validYaniv,
    yanivCall,
    drawTopCard,
    updateTopCard,
    makeTurnCardFromHand,
    toCards,
    removeCardFromHand,
    rebuildDeck,
    makeTurnCardFromDeck,
    makeTurnCardFromTop}