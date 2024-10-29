const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});

const Lobbies = new Map();

// Timer durations in milliseconds
const PHASE_TIMERS = {
    ASKING: 30000,  // 30 seconds
    POSING: 15000,  // 15 seconds
    VOTING: 20000   // 20 seconds
};

const getRandomSentences = () => {
    const sentences = [
        "Pretend you're stuck in a box",
        "Act like you just won the lottery",
        "Show us your best superhero pose",
        "Imitate a famous painting",
        "React to finding a spider",
        "Pose like you're about to sneeze"
    ];

    return sentences[Math.floor(Math.random() * sentences.length)];
}

io.on('connection', (socket) => {

    socket.on('create_lobby', (username) => {
        let lobbyCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        while (Lobbies.has(lobbyCode)) {
            lobbyCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        }

        const lobby = {
            host: socket.id,
            code: lobbyCode,
            players: [{
                username,
                socketId: socket.id,
                isHost: true
            }],
        }

        Lobbies.set(lobbyCode, lobby);

        socket.join(lobbyCode);
        socket.emit('lobby_created', lobby);
    });

    socket.on('join_lobby', (username, lobbyCode) => {
        const lobby = Lobbies.get(lobbyCode);

        if (lobby) {
            lobby.players.push({
                username,
                socketId: socket.id,
                isHost: false
            });

            socket.join(lobbyCode);
            io.to(lobbyCode).emit('lobby_player_joined', lobby);
        }

        if (!lobby) {
            socket.emit('error', 'Lobby not found');
        }
    });

    socket.on('leaving_lobby', (lobbyCode) => {
        const lobby = Lobbies.get(lobbyCode);

        if (lobby) {
            const playerIndex = lobby.players.findIndex((player) => player.socketId === socket.id);

            if (playerIndex !== -1) {
                lobby.players.splice(playerIndex, 1);

                if (lobby.host === socket.id) {
                    if (lobby.players.length === 0) {
                        Lobbies.delete(lobby.code);
                    } else {
                        lobby.host = lobby.players[0].socketId;
                        lobby.players[0].isHost = true;
                    }
                }

                socket.disconnect();
                io.to(lobby.code).emit('lobby_player_left', lobby);
            }
        }
    });

    socket.on('kick_player', (lobbyCode, playerId) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');

        if (socket.id === playerId) return socket.emit('error', 'You cannot kick yourself');

        const player = lobby.players.find((player) => player.socketId === playerId);
        if (!player) return socket.emit('error', 'Player not found');
        if (player.isHost) return socket.emit('error', 'Host cannot be kicked');

        const playerIndex = lobby.players.findIndex((player) => player.socketId === playerId);
        if (playerIndex === -1) return socket.emit('error', 'Player not found');

        lobby.players.splice(playerIndex, 1);

        io.sockets.sockets.get(playerId).disconnect();
        io.to(lobby.code).emit('lobby_player_kicked', lobby);
    })


    socket.on('disconnect', () => {
        Lobbies.forEach((lobby) => {
            const playerIndex = lobby.players.findIndex((player) => player.socketId === socket.id);

            if (playerIndex !== -1) {
                lobby.players.splice(playerIndex, 1);

                if (lobby.host === socket.id) {
                    if (lobby.players.length === 0) {
                        Lobbies.delete(lobby.code);
                    } else {
                        lobby.host = lobby.players[0].socketId;
                        lobby.players[0].isHost = true;
                    }
                }

                lobby.gameState.players = lobby.players;
                io.to(lobby.code).emit('lobby_player_left', lobby);
            }
        });
    });

    // Game events
    // Helper function to start timer for current phase
    function startPhaseTimer(lobby) {
        // Clear any existing timer
        if (lobby.phaseTimer) {
            clearInterval(lobby.phaseTimer.interval);
            clearTimeout(lobby.phaseTimer.timeout);
        }

        const phase = lobby.gameState.phase;
        const duration = PHASE_TIMERS[phase];

        // Set up countdown interval
        const interval = setInterval(() => {
            lobby.gameState.timeRemaining -= 1000;
            io.to(lobby.code).emit('timer_update', lobby.gameState.timeRemaining);
        }, 1000);

        // Set up timeout to end phase
        const timeout = setTimeout(() => {
            clearInterval(interval);
            advancePhase(lobby);
        }, duration);

        // Store timer references
        lobby.phaseTimer = { interval, timeout };
    }

    // Helper function to advance to next phase
    function advancePhase(lobby) {
        const currentPhase = lobby.gameState.phase;

        switch (currentPhase) {
            case 'ASKING':
                lobby.gameState.phase = 'POSING';
                lobby.gameState.timeRemaining = PHASE_TIMERS.POSING;

                if (!lobby.gameState.sentences.length > 0) {
                    lobby.gameState.sentence = getRandomSentences();
                } else {
                    // Randomly select a sentence from the submitted sentences
                    const randomIndex = Math.floor(Math.random() * lobby.gameState.sentences.length);
                    lobby.gameState.sentence = lobby.gameState.sentences[randomIndex].sentence;
                }

                break;
            case 'POSING':
                io.to(lobby.code).emit('capture_now');
                break;
            case 'VOTING':
                lobby.gameState.phase = 'RESULTS';
                lobby.gameState.timeRemaining = 0;
                break;
        }

        const phasesNoTimer = ['RESULTS']
        if (!phasesNoTimer.includes(lobby.gameState.phase)) {
            startPhaseTimer(lobby);
        }

        io.to(lobby.code).emit('game_phase_changed', lobby.gameState);
    }

    socket.on('start_game', (lobbyCode) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');

        if (socket.id !== lobby.host) return socket.emit('error', 'You are not the host');

        lobby.gameState = {
            phase: 'ASKING',
            sentence: null,
            sentences: [],
            photos: [],
            votes: [],
            players: lobby.players,
            timeRemaining: PHASE_TIMERS.ASKING
        }

        startPhaseTimer(lobby);

        io.to(lobby.code).emit('game_started', lobby.gameState);
    });

    socket.on('submit_sentence', (lobbyCode, sentence) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');
        if (lobby.gameState.phase !== 'ASKING') return socket.emit('error', 'Game is not in asking phase')

        const player = lobby.players.find((player) => player.socketId === socket.id);
        if (!player) return socket.emit('error', 'Player not found');

        if (lobby.gameState.sentences.some((sentence) => sentence.player === player.socketId)) return socket.emit('error', 'You have already submitted a sentence');

        lobby.gameState.sentences.push({ sentence, player: player.socketId })
        io.to(lobby.code).emit('sentence_submitted', lobby.gameState);

        if (lobby.gameState.sentences.length === lobby.players.length) {
            const randomSentence = lobby.gameState.sentences[Math.floor(Math.random() * lobby.gameState.sentences.length)];
            lobby.gameState.sentence = randomSentence.sentence || getRandomSentences();
            clearInterval(lobby.phaseTimer.interval);
            clearTimeout(lobby.phaseTimer.timeout);
            advancePhase(lobby);
        }
    });

    socket.on('submit_photo', ({ lobbyCode, photo }) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');
        if (lobby.gameState.phase !== 'POSING') return socket.emit('error', 'Game is not in posing phase')

        const player = lobby.players.find((player) => player.socketId === socket.id);
        if (!player) return socket.emit('error', 'Player not found');

        if (lobby.gameState.photos.some((photo) => photo.player === player.socketId)) return socket.emit('error', 'You have already submitted a photo');

        lobby.gameState.photos.push({ photo, player: player.socketId })
        io.to(lobby.code).emit('photo_submitted', lobby.gameState);

        if (lobby.gameState.photos.length === lobby.players.length) {
            clearInterval(lobby.phaseTimer.interval);
            clearTimeout(lobby.phaseTimer.timeout);

            lobby.gameState.phase = 'VOTING'
            lobby.gameState.timeRemaining = PHASE_TIMERS.VOTING
            startPhaseTimer(lobby);
            io.to(lobby.code).emit('game_phase_changed', lobby.gameState);
        }
    });

    socket.on('submit_vote', (lobbyCode, vote) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');
        if (lobby.gameState.phase !== 'VOTING') return socket.emit('error', 'Game is not in voting phase')

        const player = lobby.players.find((player) => player.socketId === socket.id);
        if (!player) return socket.emit('error', 'Player not found');

        if (lobby.gameState.votes.some((vote) => vote.player === player.socketId)) return socket.emit('error', 'You have already voted');

        lobby.gameState.votes.push({ vote, player: player.socketId })
        io.to(lobby.code).emit('vote_submitted', lobby.gameState);

        if (lobby.gameState.votes.length === lobby.players.length) {
            clearInterval(lobby.phaseTimer.interval);
            clearTimeout(lobby.phaseTimer.timeout);
            advancePhase(lobby);
        }
    });

    socket.on('reset_game', (lobbyCode) => {
        const lobby = Lobbies.get(lobbyCode);
        if (!lobby) return socket.emit('error', 'Lobby not found');

        if (socket.id !== lobby.host) return socket.emit('error', 'You are not the host');

        lobby.gameState = null;
        io.to(lobby.code).emit('game_reset', lobby.gameState);

        // Clear any existing timer
        if (lobby.phaseTimer) {
            clearInterval(lobby.phaseTimer.interval);
            clearTimeout(lobby.phaseTimer.timeout);
        }
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.info(`> http://localhost:${PORT}`));