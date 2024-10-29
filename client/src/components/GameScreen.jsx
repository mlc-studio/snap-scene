import { useEffect, useState, useRef, useCallback } from "react";
import { socket } from "../lib/socket";
import CircleCooldown from "./CircleCooldown";
import CaptureCamera from "./CaptureCamera";

const GameScreen = ({ lobby, setCurrentLobby }) => {
    const [gameState, setGameState] = useState(null);
    const [sentence, setSentence] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(null);
    const webcamRef = useRef(null);

    const handleLeave = () => {
        socket.emit('leaving_lobby', lobby.code);
        setCurrentLobby(null);
    }

    const handleKick = (id) => {
        socket.emit('kick_player', lobby.code, id);
    }

    const handleStartGame = () => {
        socket.emit('start_game', lobby.code);
    }

    const handleSubmitSentence = (sentence) => {
        socket.emit('submit_sentence', lobby.code, sentence);
        setSentence('');
    }

    const handlePhotoTaken = useCallback((photoData) => {
        socket.emit('submit_photo', {
            lobbyCode: lobby.code,
            photo: photoData
        });
    }, [lobby.code]);

    const handleSubmitVote = (player) => {
        socket.emit('submit_vote', lobby.code, player);
    }

    const handleReset = () => {
        socket.emit('reset_game', lobby.code);
    }

    useEffect(() => {
        socket.on('game_started', (state) => {
            setGameState(state);
        });

        socket.on('sentence_submitted', (state) => {
            setGameState(state);
        });

        socket.on('game_phase_changed', (state) => {
            setGameState(state);
        });

        socket.on('vote_submitted', (state) => {
            setGameState(state);
        });

        socket.on('timer_update', (timeRemaining) => {
            setTimeRemaining(timeRemaining);
        });

        socket.on('capture_now', () => {
            if (webcamRef.current) {
                webcamRef.current.capturePhoto();
            }
        });

        socket.on('game_reset', (state) => {
            setGameState(state);
        });

        return () => {
            socket.off('game_state');
            socket.off('sentence_submitted');
            socket.off('game_phase_changed');
            socket.off('timer_update');
            socket.off('capture_now');
        }
    }, []);

    if (!gameState) return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Lobby: {lobby.code}</h1>
                    <div className="flex items-center">
                        {socket.id === lobby.host && (
                            <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={handleStartGame}>
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
                                                <p className="text-center text-white">{player.username.split(" ").map((word) => word[0]).join("").slice(0, 2)}</p>
                                            </div>
                                            <div>
                                                <p className="font-bold">{player.username}</p>
                                                <p className={`${player.isHost ? "text-blue-500" : "text-gray-500"}`}>
                                                    {player.isHost ? "Host" : "Player"}
                                                </p>
                                            </div>
                                            {socket.id === lobby.host && socket.id !== player.socketId && (
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
    )

    if (gameState.phase === 'ASKING') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                    <div className="flex justify-center mb-6">
                        <CircleCooldown timeRemaining={timeRemaining} totalTime={gameState.timeRemaining} />
                    </div>

                    {gameState && gameState.sentences.length > 0 && gameState.sentences.find((sentence) => sentence.player === socket.id) ? (
                        <div className="text-center">
                            <h2 className="text-xl font-bold mb-4">Waiting for other players...</h2>
                            <p className="text-gray-600">Your sentence has been submitted</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-bold text-center mb-6">
                                Create a Pose Challenge
                            </h2>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    value={sentence}
                                    onChange={(e) => setSentence(e.target.value)}
                                    placeholder="Type a sentence for others to pose..."
                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    onClick={() => handleSubmitSentence(sentence)}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    if (gameState.phase === 'POSING') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                    <div className="flex justify-center mb-6">
                        <CircleCooldown timeRemaining={timeRemaining} totalTime={gameState.timeRemaining} />
                    </div>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Time to Pose!</h2>
                        <p className="text-lg text-gray-700 mb-4">
                            Challenge: {gameState.sentence}
                        </p>
                    </div>
                    <CaptureCamera ref={webcamRef} onPhotoTaken={handlePhotoTaken} />
                </div>
            </div>
        )
    }

    if (gameState.phase === 'VOTING') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                    <div className="flex justify-center mb-6">
                        <CircleCooldown timeRemaining={timeRemaining} totalTime={gameState.timeRemaining} />
                    </div>
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Vote for Your Favorite Pose!
                    </h2>

                    {gameState.votes.some((vote) => vote.player === socket.id) && (
                        <div className="text-center mb-6">
                            <p className="text-lg text-gray-700 mb-4">
                                You have already voted!
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                        {gameState.photos.map((photo) => (
                            <div key={photo.player} className="bg-gray-50 p-4 rounded-lg">
                                <img
                                    src={photo.photo}
                                    alt={photo.player}
                                    className="w-full h-64 object-cover rounded-lg mb-4"
                                />
                                {socket.id !== photo.player &&
                                    !gameState.votes.some((vote) => vote.player === socket.id && vote.vote === photo.player) && (
                                        <button
                                            onClick={() => handleSubmitVote(photo.player)}
                                            className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                                        >
                                            Vote for this pose
                                        </button>
                                    )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (gameState.phase === 'RESULTS') {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-4xl">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Final Results
                    </h2>
                    <div className="mb-6 bg-gray-50 p-4 rounded">
                        <h3 className="text-xl font-semibold mb-2 text-gray-900">Original Sentence:</h3>
                        <p className="text-lg text-gray-700">{gameState.sentence}</p>
                    </div>

                    {socket.id === lobby.host && (
                        <div className="text-center mb-6">
                            <button
                                onClick={handleReset}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-200"
                            >
                                Play Again
                            </button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-6">
                        {gameState.photos.map((photo) => (
                            <div key={photo.player} className="bg-gray-50 p-4 rounded-lg">
                                <img
                                    src={photo.photo}
                                    alt={photo.player}
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                                <div className="mt-2 text-center">
                                    <p className="font-bold">
                                        Votes: {gameState.votes.filter(vote => vote.player === photo.player).length}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }
};

export default GameScreen;
