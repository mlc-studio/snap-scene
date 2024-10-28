import { useEffect, useState } from 'react';
import Lobby from './components/Lobby';
import { socket } from './lib/socket';
import Error from './components/Error';
import { ToastContainer } from 'react-toastify';
import GameScreen from './components/GameScreen';

function App() {
  const [currentLobby, setCurrentLobby] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    socket.on('lobby_created', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('lobby_player_joined', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('lobby_player_left', (lobby) => {
      setCurrentLobby(lobby);
    });

    socket.on('lobby_player_kicked', (lobby) => {
      setCurrentLobby(lobby);
    })

    socket.on('error', (error) => {
      setError(error);
    })

    socket.on('disconnect', () => {
      setCurrentLobby(null);
      setError('You have been disconnected from the server');
    })

    return () => {
      socket.off('lobby_created');
      socket.off('lobby_player_joined');
      socket.off('lobby_player_left');
      socket.off('lobby_player_kicked');
      socket.off('error');
    }
  }, []);

  return (
    <>
      {!currentLobby && <Lobby />}
      {currentLobby && <GameScreen lobby={currentLobby} setCurrentLobby={setCurrentLobby} />}
      {error && <Error error={error} setError={setError} />}
      <ToastContainer />
    </>
  );
}

export default App