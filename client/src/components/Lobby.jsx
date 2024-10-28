import { useEffect, useState } from "react";

import { socket } from "../lib/socket";

const Lobby = () => {
    const [currentLobby, setCurrentLobby] = useState(null);
    const [error, setError] = useState(null);
    const [username, setUsername] = useState("");
    const [lobbyCode, setLobbyCode] = useState("");
    const [isConnected, setIsConnected] = useState(socket.connected);


    const handleCreateLobby = () => {
        if (username.length < 3) return setError("Username must be at least 3 characters long");
        if (username.length > 12) return setError("Username must be at most 12 characters long");

        setError(null);
        socket.emit("create_lobby", username, (lobby) => {
            setCurrentLobby(lobby);
        })
    }

    const handleJoinLobby = () => {
        if (username.length < 3) return setError("Username must be at least 3 characters long");
        if (username.length > 12) return setError("Username must be at most 12 characters long");
        if (lobbyCode.length !== 4) return setError("Lobby code must be 4 characters long")

        setError(null);

        socket.emit("join_lobby", username, lobbyCode, (lobby) => {
            setCurrentLobby(lobby);
        })
    }

    const handleUsernameChange = (e) => {
        setError(null);
        setUsername(e.target.value);
    }


    const handleLobbyCodeChange = (e) => {
        setError(null);
        setLobbyCode(e.target.value.toUpperCase());
    }

    useEffect(() => {
        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    });

    if (!isConnected) socket.connect();

    if (!currentLobby) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                    <h1 className="text-2xl font-bold mb-6 text-center">Welcome to the Game</h1>

                    {error && (
                        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Enter username"
                            value={username}
                            onChange={handleUsernameChange}
                            className="w-full p-2 border rounded"
                        />

                        <hr />

                        <div className="flex flex-col space-y-2">
                            <button
                                onClick={handleCreateLobby}
                                className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                                Create New Lobby
                            </button>

                            <div className="text-center">or</div>

                            <input
                                type="text"
                                placeholder="Enter lobby code"
                                value={lobbyCode}
                                onChange={handleLobbyCodeChange}
                                className="w-full p-2 border rounded"
                            />

                            <button
                                onClick={handleJoinLobby}
                                className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
                            >
                                Join Lobby
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Lobby;