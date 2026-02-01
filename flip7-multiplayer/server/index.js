const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Game state
const rooms = new Map();

// Utility functions
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function createDeck() {
  const cards = [];
  
  // Number cards (1-12, quantity matches value)
  for (let i = 1; i <= 12; i++) {
    for (let j = 0; j < i; j++) {
      cards.push({ type: 'number', value: i, id: `${i}-${j}` });
    }
  }
  
  // Zero card
  cards.push({ type: 'number', value: 0, id: '0-0' });
  
  // Bonus cards
  for (let i = 0; i < 3; i++) {
    cards.push({ type: 'bonus', value: 'x2', id: `x2-${i}` });
    cards.push({ type: 'bonus', value: '+5', id: `+5-${i}` });
  }
  
  // Action cards
  for (let i = 0; i < 3; i++) {
    cards.push({ type: 'action', value: 'second-chance', id: `sc-${i}` });
    cards.push({ type: 'action', value: 'flip-three', id: `ft-${i}` });
    cards.push({ type: 'action', value: 'freeze', id: `fr-${i}` });
  }
  
  return shuffleArray(cards);
}

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create room
  socket.on('createRoom', (playerName) => {
    const roomCode = generateRoomCode();
    const room = {
      code: roomCode,
      host: socket.id,
      players: [{
        id: socket.id,
        name: playerName,
        isAI: false,
        socketId: socket.id
      }],
      gameState: 'lobby',
      deck: [],
      usedCards: [],
      activeCards: {},
      scores: {},
      eliminatedPlayers: new Set(),
      passedPlayers: new Set(),
      currentPlayerIndex: 0,
      roundNumber: 1
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, room });
    console.log(`Room ${roomCode} created by ${playerName}`);
  });

  // Join room
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', 'Raum nicht gefunden!');
      return;
    }

    if (room.players.length >= 6) {
      socket.emit('error', 'Raum ist voll!');
      return;
    }

    if (room.gameState !== 'lobby') {
      socket.emit('error', 'Spiel läuft bereits!');
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      isAI: false,
      socketId: socket.id
    };

    room.players.push(player);
    socket.join(roomCode);
    
    io.to(roomCode).emit('roomUpdated', room);
    console.log(`${playerName} joined room ${roomCode}`);
  });

  // Add AI player
  socket.on('addAI', ({ roomCode, count }) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    const aiNames = ['Max', 'Sophie', 'Lukas', 'Emma', 'Felix', 'Anna'];
    
    for (let i = 0; i < count && room.players.length < 6; i++) {
      const aiName = aiNames[room.players.length - 1] || `CPU ${i + 1}`;
      room.players.push({
        id: `ai-${Date.now()}-${i}`,
        name: aiName,
        isAI: true,
        socketId: null
      });
    }

    io.to(roomCode).emit('roomUpdated', room);
  });

  // Start game
  socket.on('startGame', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    room.deck = createDeck();
    room.gameState = 'playing';
    room.activeCards = {};
    room.scores = {};
    room.eliminatedPlayers = new Set();
    room.passedPlayers = new Set();
    room.currentPlayerIndex = 0;
    room.roundNumber = 1;
    room.usedCards = [];

    // Initialize scores and cards
    room.players.forEach(p => {
      room.scores[p.id] = 0;
      room.activeCards[p.id] = [];
    });

    io.to(roomCode).emit('gameStarted', room);
    
    // Deal initial cards
    setTimeout(() => {
      dealInitialCards(roomCode);
    }, 1000);
  });

  // Deal initial cards to all players
  function dealInitialCards(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach((player) => {
      if (room.deck.length === 0) {
        room.deck = shuffleArray(room.usedCards);
        room.usedCards = [];
      }

      const card = room.deck.shift();
      room.activeCards[player.id] = [card];
    });

    io.to(roomCode).emit('initialCardsDealt', {
      activeCards: room.activeCards,
      deckCount: room.deck.length
    });

    // Start gameplay
    setTimeout(() => {
      checkAITurn(roomCode);
    }, 1500);
  }

  // Check if current player is AI
  function checkAITurn(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isAI) {
      setTimeout(() => {
        aiDecision(roomCode);
      }, 1200);
    }
  }

  // AI decision
  function aiDecision(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const currentPlayer = room.players[room.currentPlayerIndex];
    const cards = room.activeCards[currentPlayer.id] || [];
    
    const totalValue = calculateScore(cards);
    const numberCards = cards.filter(c => c.type === 'number').length;
    
    const shouldPass = totalValue > 35 || 
                       numberCards >= 6 || 
                       (totalValue > 25 && numberCards >= 4);
    
    if (shouldPass) {
      handlePass(roomCode, currentPlayer.id);
    } else {
      dealCard(roomCode);
    }
  }

  // Player draws card
  socket.on('drawCard', (roomCode) => {
    dealCard(roomCode);
  });

  function dealCard(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    if (room.deck.length === 0) {
      room.deck = shuffleArray(room.usedCards);
      room.usedCards = [];
    }

    const card = room.deck.shift();
    const currentPlayer = room.players[room.currentPlayerIndex];

    io.to(roomCode).emit('cardDrawn', { card, playerId: currentPlayer.id });

    setTimeout(() => {
      processCard(roomCode, card, currentPlayer);
    }, 800);
  }

  // Process card
  function processCard(roomCode, card, player) {
    const room = rooms.get(roomCode);
    if (!room) return;

    let message = '';

    if (card.type === 'number') {
      const hasNumber = room.activeCards[player.id].some(c => c.type === 'number' && c.value === card.value);
      
      if (hasNumber) {
        const hasSecondChance = room.activeCards[player.id].some(c => c.type === 'action' && c.value === 'second-chance');
        
        if (hasSecondChance) {
          room.activeCards[player.id] = room.activeCards[player.id].filter(c => c.value !== 'second-chance');
          message = `${player.name} nutzt Second Chance!`;
        } else {
          room.eliminatedPlayers.add(player.id);
          message = `${player.name} ist ausgeschieden! (Doppelte Zahl: ${card.value})`;
        }
      } else {
        room.activeCards[player.id].push(card);
        
        const uniqueNumbers = new Set(
          room.activeCards[player.id]
            .filter(c => c.type === 'number')
            .map(c => c.value)
        );
        
        if (uniqueNumbers.size === 7) {
          room.passedPlayers.add(player.id);
          message = `${player.name} hat FLIP 7! +15 Bonuspunkte!`;
        }
      }
    } else if (card.type === 'bonus') {
      room.activeCards[player.id].push(card);
      message = `${player.name} erhält Bonus: ${card.value}`;
    } else if (card.type === 'action') {
      if (card.value === 'second-chance') {
        room.activeCards[player.id].push(card);
        message = `${player.name} erhält Second Chance!`;
      }
    }

    io.to(roomCode).emit('cardProcessed', {
      activeCards: room.activeCards,
      eliminatedPlayers: Array.from(room.eliminatedPlayers),
      passedPlayers: Array.from(room.passedPlayers),
      message
    });

    setTimeout(() => {
      moveToNextPlayer(roomCode);
    }, 1000);
  }

  // Player passes
  socket.on('pass', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    const currentPlayer = room.players[room.currentPlayerIndex];
    handlePass(roomCode, currentPlayer.id);
  });

  function handlePass(roomCode, playerId) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.passedPlayers.add(playerId);
    const player = room.players.find(p => p.id === playerId);
    
    io.to(roomCode).emit('playerPassed', {
      playerId,
      playerName: player.name,
      passedPlayers: Array.from(room.passedPlayers)
    });

    setTimeout(() => {
      moveToNextPlayer(roomCode);
    }, 1000);
  }

  // Move to next player
  function moveToNextPlayer(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    let nextIndex = (room.currentPlayerIndex + 1) % room.players.length;
    let attempts = 0;
    
    while ((room.eliminatedPlayers.has(room.players[nextIndex].id) || 
            room.passedPlayers.has(room.players[nextIndex].id)) && 
            attempts < room.players.length) {
      nextIndex = (nextIndex + 1) % room.players.length;
      attempts++;
    }
    
    if (attempts >= room.players.length) {
      endRound(roomCode);
      return;
    }
    
    room.currentPlayerIndex = nextIndex;
    io.to(roomCode).emit('nextPlayer', {
      currentPlayerIndex: nextIndex,
      currentPlayer: room.players[nextIndex]
    });

    checkAITurn(roomCode);
  }

  // Calculate score
  function calculateScore(cards) {
    let score = 0;
    let hasX2 = false;
    let bonusPoints = 0;
    
    cards.forEach(card => {
      if (card.type === 'number') {
        score += card.value;
      } else if (card.type === 'bonus') {
        if (card.value === 'x2') {
          hasX2 = true;
        } else if (card.value === '+5') {
          bonusPoints += 5;
        }
      }
    });
    
    if (hasX2) score *= 2;
    score += bonusPoints;
    
    const uniqueNumbers = new Set(cards.filter(c => c.type === 'number').map(c => c.value));
    if (uniqueNumbers.size === 7) {
      score += 15;
    }
    
    return score;
  }

  // End round
  function endRound(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach(player => {
      if (!room.eliminatedPlayers.has(player.id)) {
        const roundScore = calculateScore(room.activeCards[player.id] || []);
        room.scores[player.id] = (room.scores[player.id] || 0) + roundScore;
      }
      
      if (room.activeCards[player.id]) {
        room.usedCards.push(...room.activeCards[player.id]);
      }
    });

    const maxScore = Math.max(...Object.values(room.scores));
    const winner = maxScore >= 200 ? room.players.find(p => room.scores[p.id] === maxScore) : null;

    room.gameState = 'roundEnd';

    io.to(roomCode).emit('roundEnded', {
      scores: room.scores,
      eliminatedPlayers: Array.from(room.eliminatedPlayers),
      winner: winner ? winner.name : null,
      maxScore
    });
  }

  // Start new round
  socket.on('newRound', (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room || room.host !== socket.id) return;

    room.roundNumber++;
    room.gameState = 'playing';
    room.activeCards = {};
    room.eliminatedPlayers = new Set();
    room.passedPlayers = new Set();
    room.currentPlayerIndex = 0;

    room.players.forEach(p => {
      room.activeCards[p.id] = [];
    });

    io.to(roomCode).emit('newRoundStarted', {
      roundNumber: room.roundNumber,
      activeCards: room.activeCards
    });

    setTimeout(() => {
      dealInitialCards(roomCode);
    }, 1000);
  });

  // Leave room
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove player from all rooms
    rooms.forEach((room, roomCode) => {
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          // Assign new host if needed
          if (room.host === socket.id) {
            room.host = room.players[0].socketId;
          }
          io.to(roomCode).emit('roomUpdated', room);
        }
      }
    });
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

server.listen(PORT, () => {
  console.log(`Flip 7 server running on port ${PORT}`);
});
