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
                isHost: true,
                role: 'SPECTATOR'
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
                isHost: false,
                role: 'SPECTATOR'
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

                io.to(lobby.code).emit('lobby_player_left', lobby);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.info(`> http://localhost:${PORT}`));