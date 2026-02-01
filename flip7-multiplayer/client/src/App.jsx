import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { Users, Plus, Copy, Check, Zap, Shield, Snowflake, Star, Award } from 'lucide-react';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

const Flip7Game = () => {
  const [socket, setSocket] = useState(null);
  const [gameMode, setGameMode] = useState('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [room, setRoom] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [message, setMessage] = useState('');
  const [myPlayerId, setMyPlayerId] = useState('');

  // Initialize socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    setMyPlayerId(newSocket.id);

    return () => newSocket.close();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('roomCreated', ({ roomCode, room }) => {
      setRoomCode(roomCode);
      setRoom(room);
      setGameMode('lobby');
      setMessage('Raum erstellt!');
    });

    socket.on('roomUpdated', (updatedRoom) => {
      setRoom(updatedRoom);
    });

    socket.on('gameStarted', (updatedRoom) => {
      setRoom(updatedRoom);
      setGameMode('game');
      setMessage('Spiel gestartet!');
    });

    socket.on('initialCardsDealt', ({ activeCards, deckCount }) => {
      setRoom(prev => ({ ...prev, activeCards, deckCount }));
      setMessage('Startkarten ausgeteilt!');
    });

    socket.on('cardDrawn', ({ card, playerId }) => {
      setCurrentCard(card);
      setIsAnimating(true);
      
      setTimeout(() => {
        setIsAnimating(false);
        setCurrentCard(null);
      }, 800);
    });

    socket.on('cardProcessed', ({ activeCards, eliminatedPlayers, passedPlayers, message }) => {
      setRoom(prev => ({
        ...prev,
        activeCards,
        eliminatedPlayers: new Set(eliminatedPlayers),
        passedPlayers: new Set(passedPlayers)
      }));
      setMessage(message);
    });

    socket.on('playerPassed', ({ playerId, playerName, passedPlayers }) => {
      setRoom(prev => ({
        ...prev,
        passedPlayers: new Set(passedPlayers)
      }));
      setMessage(`${playerName} passt.`);
    });

    socket.on('nextPlayer', ({ currentPlayerIndex, currentPlayer }) => {
      setRoom(prev => ({ ...prev, currentPlayerIndex }));
    });

    socket.on('roundEnded', ({ scores, eliminatedPlayers, winner, maxScore }) => {
      setRoom(prev => ({
        ...prev,
        scores,
        eliminatedPlayers: new Set(eliminatedPlayers),
        gameState: 'roundEnd'
      }));
      
      if (winner) {
        setMessage(`🎉 ${winner} gewinnt mit ${maxScore} Punkten!`);
      } else {
        setMessage('Runde beendet!');
      }
    });

    socket.on('newRoundStarted', ({ roundNumber, activeCards }) => {
      setRoom(prev => ({
        ...prev,
        roundNumber,
        activeCards,
        gameState: 'playing',
        eliminatedPlayers: new Set(),
        passedPlayers: new Set()
      }));
      setMessage('Neue Runde!');
    });

    socket.on('error', (errorMessage) => {
      setMessage(errorMessage);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomUpdated');
      socket.off('gameStarted');
      socket.off('initialCardsDealt');
      socket.off('cardDrawn');
      socket.off('cardProcessed');
      socket.off('playerPassed');
      socket.off('nextPlayer');
      socket.off('roundEnded');
      socket.off('newRoundStarted');
      socket.off('error');
    };
  }, [socket]);

  // Actions
  const createRoom = () => {
    if (!playerName.trim()) {
      setMessage('Bitte gib deinen Namen ein!');
      return;
    }
    socket.emit('createRoom', playerName);
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      setMessage('Bitte gib deinen Namen und Raum-Code ein!');
      return;
    }
    socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), playerName });
    setGameMode('lobby');
  };

  const addAIPlayers = (count) => {
    socket.emit('addAI', { roomCode, count });
  };

  const startGame = () => {
    socket.emit('startGame', roomCode);
  };

  const drawCard = () => {
    if (isAnimating) return;
    socket.emit('drawCard', roomCode);
  };

  const pass = () => {
    socket.emit('pass', roomCode);
  };

  const startNewRound = () => {
    socket.emit('newRound', roomCode);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const resetGame = () => {
    setGameMode('menu');
    setRoomCode('');
    setRoom(null);
    setMessage('');
  };

  // Helper functions
  const calculateScore = (cards) => {
    if (!cards) return 0;
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
  };

  const getCardIcon = (card) => {
    if (card.type === 'action') {
      if (card.value === 'second-chance') return <Shield className="w-6 h-6" />;
      if (card.value === 'flip-three') return <Zap className="w-6 h-6" />;
      if (card.value === 'freeze') return <Snowflake className="w-6 h-6" />;
    }
    if (card.type === 'bonus') {
      return <Star className="w-6 h-6" />;
    }
    return null;
  };

  const getCardText = (card) => {
    if (card.type === 'number') return card.value;
    if (card.type === 'bonus') return card.value;
    if (card.type === 'action') {
      if (card.value === 'second-chance') return 'Second Chance';
      if (card.value === 'flip-three') return 'Flip Three';
      if (card.value === 'freeze') return 'Freeze';
    }
    return '';
  };

  const isMyTurn = () => {
    if (!room || !room.players) return false;
    const currentPlayer = room.players[room.currentPlayerIndex];
    return currentPlayer && currentPlayer.id === socket?.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white font-sans overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600&display=swap');
        
        body {
          font-family: 'Exo 2', sans-serif;
        }
        
        .neon-border {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.5),
                      inset 0 0 20px rgba(139, 92, 246, 0.1);
          border: 2px solid rgba(139, 92, 246, 0.5);
        }
        
        .neon-text {
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.8),
                       0 0 20px rgba(139, 92, 246, 0.6),
                       0 0 30px rgba(139, 92, 246, 0.4);
        }
        
        .neon-green {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.5),
                      inset 0 0 20px rgba(34, 197, 94, 0.1);
          border: 2px solid rgba(34, 197, 94, 0.5);
        }
        
        .card-flip {
          animation: cardFlip 0.8s ease-out;
        }
        
        @keyframes cardFlip {
          0% {
            transform: rotateY(0deg) scale(0.8);
            opacity: 0;
          }
          50% {
            transform: rotateY(90deg) scale(1);
          }
          100% {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        
        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.8);
          }
        }
        
        .slide-in {
          animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="p-6 text-center border-b border-purple-500/30">
          <h1 className="text-6xl font-black neon-text tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            FLIP 7
          </h1>
          <p className="text-purple-300 mt-2 text-lg tracking-wide">Multiplayer Kartenspiel</p>
        </header>

        {/* Main Menu */}
        {gameMode === 'menu' && (
          <div className="max-w-2xl mx-auto mt-20 p-8 slide-in">
            <div className="neon-border rounded-2xl bg-slate-900/80 backdrop-blur-lg p-8 space-y-6">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Dein Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-800/80 border border-purple-500/50 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 text-lg"
                  style={{ fontFamily: 'Exo 2, sans-serif' }}
                />
                
                {message && (
                  <div className="text-yellow-400 text-center py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/30">
                    {message}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={createRoom}
                  className="neon-green rounded-xl bg-green-600/20 hover:bg-green-600/30 px-8 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  <Plus className="w-6 h-6" />
                  RAUM ERSTELLEN
                </button>

                <button
                  onClick={() => {
                    if (!playerName.trim()) {
                      setMessage('Bitte gib deinen Namen ein!');
                      return;
                    }
                    setGameMode('join');
                  }}
                  className="neon-border rounded-xl bg-purple-600/20 hover:bg-purple-600/30 px-8 py-6 text-xl font-bold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  <Users className="w-6 h-6" />
                  RAUM BEITRETEN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Room */}
        {gameMode === 'join' && (
          <div className="max-w-2xl mx-auto mt-20 p-8 slide-in">
            <div className="neon-border rounded-2xl bg-slate-900/80 backdrop-blur-lg p-8 space-y-6">
              <h2 className="text-3xl font-bold text-center neon-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                RAUM BEITRETEN
              </h2>
              
              <input
                type="text"
                placeholder="Raum-Code eingeben"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-6 py-4 bg-slate-800/80 border border-purple-500/50 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-400 text-lg text-center tracking-widest"
                style={{ fontFamily: 'Orbitron, sans-serif' }}
                maxLength={6}
              />

              {message && (
                <div className="text-yellow-400 text-center py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/30">
                  {message}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setGameMode('menu')}
                  className="flex-1 px-6 py-4 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg text-lg font-bold transition-all"
                >
                  Zurück
                </button>
                <button
                  onClick={joinRoom}
                  className="flex-1 neon-green rounded-lg bg-green-600/20 hover:bg-green-600/30 px-6 py-4 text-lg font-bold transition-all"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  Beitreten
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lobby */}
        {gameMode === 'lobby' && room && (
          <div className="max-w-4xl mx-auto mt-20 p-8 slide-in">
            <div className="neon-border rounded-2xl bg-slate-900/80 backdrop-blur-lg p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-bold neon-text mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  LOBBY
                </h2>
                <div className="flex items-center justify-center gap-3 bg-slate-800/80 rounded-lg px-6 py-4 inline-flex">
                  <span className="text-purple-300 text-lg">Raum-Code:</span>
                  <span className="text-3xl font-bold tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {roomCode}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    className="ml-2 p-2 hover:bg-purple-600/30 rounded-lg transition-all"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {message && (
                <div className="text-yellow-400 text-center py-2 bg-yellow-400/10 rounded-lg border border-yellow-400/30">
                  {message}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-purple-300">Spieler ({room.players?.length || 0}/6)</h3>
                <div className="space-y-2">
                  {room.players?.map((player, i) => (
                    <div key={player.id} className="bg-slate-800/60 rounded-lg px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${player.isAI ? 'bg-blue-400' : 'bg-green-400'}`}></div>
                        <span className="text-lg font-semibold">{player.name}</span>
                        {player.isAI && <span className="text-sm text-blue-400">(CPU)</span>}
                        {i === 0 && <span className="text-sm text-yellow-400">(Host)</span>}
                        {player.id === socket?.id && <span className="text-sm text-green-400">(Du)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {room.host === socket?.id && (
                <div className="border-t border-purple-500/30 pt-6 space-y-4">
                  <h3 className="text-xl font-bold text-purple-300">CPU-Gegner hinzufügen</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => addAIPlayers(1)}
                      disabled={room.players.length >= 6}
                      className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +1 CPU
                    </button>
                    <button
                      onClick={() => addAIPlayers(2)}
                      disabled={room.players.length >= 5}
                      className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +2 CPU
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={resetGame}
                  className="flex-1 px-6 py-4 bg-slate-700/50 hover:bg-slate-700/70 rounded-lg text-lg font-bold transition-all"
                >
                  Verlassen
                </button>
                {room.host === socket?.id && (
                  <button
                    onClick={startGame}
                    className="flex-1 neon-green rounded-lg bg-green-600/20 hover:bg-green-600/30 px-6 py-4 text-lg font-bold transition-all"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                  >
                    SPIEL STARTEN
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {gameMode === 'game' && room && (
          <div className="max-w-7xl mx-auto p-8 space-y-6">
            {/* Game Header */}
            <div className="neon-border rounded-2xl bg-slate-900/80 backdrop-blur-lg p-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-sm text-purple-300">Runde</div>
                  <div className="text-3xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>{room.roundNumber || 1}</div>
                </div>
                <div className="h-12 w-px bg-purple-500/30"></div>
                <div>
                  <div className="text-sm text-purple-300">Karten im Deck</div>
                  <div className="text-3xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>{room.deckCount || room.deck?.length || 0}</div>
                </div>
              </div>
              
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-lg font-bold transition-all"
              >
                Spiel beenden
              </button>
            </div>

            {message && (
              <div className="text-center text-xl font-bold text-yellow-400 bg-yellow-400/10 rounded-lg border border-yellow-400/30 py-4 slide-in">
                {message}
              </div>
            )}

            {/* Current Card Animation */}
            {isAnimating && currentCard && (
              <div className="flex justify-center">
                <div className="card-flip neon-border rounded-xl bg-gradient-to-br from-purple-600/30 to-blue-600/30 backdrop-blur-lg p-8 w-48 h-64 flex flex-col items-center justify-center">
                  {getCardIcon(currentCard)}
                  <div className="text-5xl font-black mt-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {getCardText(currentCard)}
                  </div>
                  <div className="text-sm text-purple-300 mt-2">
                    {currentCard.type === 'number' ? 'Zahl' : currentCard.type === 'bonus' ? 'Bonus' : 'Aktion'}
                  </div>
                </div>
              </div>
            )}

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {room.players?.map((player, index) => {
                const isCurrentPlayer = index === room.currentPlayerIndex && room.gameState === 'playing';
                const isEliminated = room.eliminatedPlayers?.has(player.id);
                const hasPassed = room.passedPlayers?.has(player.id);
                const playerCards = room.activeCards?.[player.id] || [];
                const playerScore = calculateScore(playerCards);
                const totalScore = room.scores?.[player.id] || 0;

                return (
                  <div
                    key={player.id}
                    className={`rounded-xl p-6 transition-all ${
                      isCurrentPlayer ? 'neon-green pulse-glow' : 'neon-border'
                    } ${isEliminated ? 'opacity-50' : ''} bg-slate-900/80 backdrop-blur-lg`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${player.isAI ? 'bg-blue-400' : 'bg-green-400'} ${isCurrentPlayer ? 'animate-pulse' : ''}`}></div>
                        <div>
                          <div className="font-bold text-lg">
                            {player.name}
                            {player.id === socket?.id && <span className="ml-2 text-sm text-green-400">(Du)</span>}
                          </div>
                          <div className="text-sm text-purple-300">Gesamt: {totalScore}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                          {playerScore}
                        </div>
                        <div className="text-xs text-purple-300">
                          {isEliminated ? 'Ausgeschieden' : hasPassed ? 'Gepasst' : 'Aktiv'}
                        </div>
                      </div>
                    </div>

                    {/* Player Cards */}
                    <div className="flex flex-wrap gap-2">
                      {playerCards.map((card, i) => (
                        <div
                          key={`${card.id}-${i}`}
                          className={`rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-1 ${
                            card.type === 'number' ? 'bg-purple-600/30 border border-purple-500/50' :
                            card.type === 'bonus' ? 'bg-yellow-600/30 border border-yellow-500/50' :
                            'bg-blue-600/30 border border-blue-500/50'
                          }`}
                        >
                          {getCardIcon(card)}
                          <span>{getCardText(card)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            {room.gameState === 'playing' && isMyTurn() && (
              <div className="flex justify-center gap-6">
                <button
                  onClick={pass}
                  disabled={isAnimating}
                  className="px-12 py-6 bg-red-600/20 hover:bg-red-600/30 border-2 border-red-500/50 rounded-xl text-2xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  PASSEN
                </button>
                <button
                  onClick={drawCard}
                  disabled={isAnimating}
                  className="px-12 py-6 neon-green bg-green-600/20 hover:bg-green-600/30 rounded-xl text-2xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                  KARTE ZIEHEN
                </button>
              </div>
            )}

            {/* Round End */}
            {room.gameState === 'roundEnd' && (
              <div className="neon-border rounded-2xl bg-slate-900/80 backdrop-blur-lg p-8 text-center space-y-6 slide-in">
                <h2 className="text-4xl font-bold neon-text" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                  RUNDE BEENDET
                </h2>
                
                <div className="space-y-3">
                  {room.players?.map(player => {
                    const wasEliminated = room.eliminatedPlayers?.has(player.id);
                    const roundScore = wasEliminated ? 0 : calculateScore(room.activeCards?.[player.id] || []);
                    const maxScore = Math.max(...Object.values(room.scores || {}));
                    
                    return (
                      <div key={player.id} className={`flex items-center justify-between rounded-lg px-6 py-4 ${
                        wasEliminated ? 'bg-red-900/30 border border-red-500/30' : 'bg-slate-800/60'
                      }`}>
                        <div className="flex items-center gap-3">
                          <Award className={`w-6 h-6 ${
                            room.scores?.[player.id] === maxScore ? 'text-yellow-400' : 
                            wasEliminated ? 'text-red-400' : 'text-purple-400'
                          }`} />
                          <div>
                            <span className="text-lg font-semibold">{player.name}</span>
                            {wasEliminated && (
                              <span className="ml-2 text-sm text-red-400">(Ausgeschieden)</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            {room.scores?.[player.id] || 0}
                          </div>
                          <div className={`text-sm ${wasEliminated ? 'text-red-300' : 'text-purple-300'}`}>
                            {wasEliminated ? '+0 diese Runde' : `+${roundScore} diese Runde`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {room.host === socket?.id && (
                  <div>
                    {Math.max(...Object.values(room.scores || {})) >= 200 ? (
                      <button
                        onClick={resetGame}
                        className="neon-green rounded-xl bg-green-600/20 hover:bg-green-600/30 px-12 py-6 text-2xl font-bold transition-all hover:scale-105"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        NEUES SPIEL
                      </button>
                    ) : (
                      <button
                        onClick={startNewRound}
                        className="neon-green rounded-xl bg-green-600/20 hover:bg-green-600/30 px-12 py-6 text-2xl font-bold transition-all hover:scale-105"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                      >
                        NÄCHSTE RUNDE
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Flip7Game;
