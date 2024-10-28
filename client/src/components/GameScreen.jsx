import { socket } from "../lib/socket";

const GameScreen = ({ lobby, setCurrentLobby }) => {

    const handleLeave = () => {
        socket.emit('leaving_lobby', lobby.code);
        setCurrentLobby(null);
    }

    const handleKick = (id) => {
        socket.emit('kick_player', lobby.code, id);
    }

    return (
        <>
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">Lobby: {lobby.code}</h1>
                        <div className="flex items-center">
                            {socket.id === lobby.host && (
                                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                                    Start Game
                                </button>
                            )}
                            <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-4" onClick={handleLeave}>
                                Leave Lobby
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-row">
                        <div className="w-1/3">
                            {/* Players */}
                            <div className="mb-6">
                                <h2 className="text-xl font-bold mb-2">Players</h2>
                                <ul className="space-y-2">
                                    {lobby.players.map((player) => (
                                        <li key={player.socketId}>
                                            <div className="flex items-center pr-4">
                                                <div className="w-10 h-10 rounded-full bg-gray-300 mr-4 flex justify-center items-center">
                                                    {/* Split username in array take the first letter of each array and limit to 2  */}
                                                    <p className="text-center text-white">{player.username.split(" ").map((word) => word[0]).join("").slice(0, 2)}</p>
                                                </div>
                                                <div>
                                                    <p className="font-bold">{player.username}</p>
                                                    {/* If player is host, show blue text host and if player simple player terxt */}
                                                    <p className={`${player.isHost ? "text-blue-500" : "text-gray-500"}`}>
                                                        {player.isHost ? "Host" : "Player"}
                                                    </p>
                                                </div>
                                                { socket.id === lobby.host && socket.id !== player.socketId && (
                                                    <div className="ml-auto">
                                                        <button className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => handleKick(player.socketId)}>
                                                            Kick
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                        <div className="w-2/3">
                            <div className="bg-gray-200 p-4 rounded-lg h-full min-h-[600px] flex items-center justify-center text-center">
                                {socket.id === lobby.host ? (
                                    <div>
                                        <h2 className="text-xl font-bold mb-2">Game Screen</h2>
                                        <p>You are the host of this lobby.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h2 className="text-xl font-bold mb-2">Game Screen</h2>
                                        <p>You are a player in this lobby.</p>
                                        <p>Wait for the host to start the game.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default GameScreen;