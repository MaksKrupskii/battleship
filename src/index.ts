import { Room, User } from 'types/types';
import {
  addShips,
  addWinner,
  attack,
  createGame,
  createRoom,
  getAllRooms,
  randomAttack,
  startGame,
  turn,
  updateRoom,
  updateWinners,
} from './bd/rooms';
import {
  addReceiver,
  addUser,
  getReceiverById,
  validateUser,
} from './bd/users';
import { httpServer } from './http_server';
import { WebSocket, WebSocketServer } from 'ws';
import { createBot } from './bot';

const HTTP_PORT: number = 8181;
const SOCKET_PORT = 3000;

const wsServer = new WebSocketServer({ port: SOCKET_PORT });
let shooter = 0;
let bot: WebSocket;
wsServer.on('connection', (ws) => {
  let user: User | undefined;
  console.log('Client connected');

  ws.on('message', (wsData) => {
    const message = JSON.parse(wsData.toString());
    console.log('message', message);
    //////////////////////
    if (message.type === 'reg') {
      const { name, password } = JSON.parse(message.data);
      user = addUser({ name, password });
      addReceiver(name, ws);

      const data = validateUser(user);

      const m = {
        type: 'reg',
        data,
        id: 0,
      };

      ws.send(JSON.stringify(m));
      ws.send(JSON.stringify(updateRoom()));
      ws.send(JSON.stringify(updateWinners()));
    }

    ///////////////////////
    if (message.type === 'create_room') {
      createRoom(user as User);
      //   ws.send(JSON.stringify(updateRoom()));
      wsServer.clients.forEach((client) =>
        client.send(JSON.stringify(updateRoom())),
      );
    }

    ///////////////////////
    if (message.type === 'add_user_to_room') {
      const { indexRoom } = JSON.parse(message.data);

      createGame(user as User, indexRoom);

      wsServer.clients.forEach((client) =>
        client.send(JSON.stringify(updateRoom())),
      );
    }

    //////////////////////
    if (message.type === 'add_ships') {
      const { gameId, ships } = JSON.parse(message.data);
      addShips(gameId, ships, user?.index as number);
      const room = getAllRooms().find((room) => room.gameId === gameId);
      if (room?.roomUsers.every((item) => item.ships)) {
        shooter = startGame(room);
      }
    }

    if (message.type === 'attack') {
      const { x, y, gameId, indexPlayer } = JSON.parse(message.data);

      if (shooter !== indexPlayer) return;
      const room = getAllRooms().find((room) => room.gameId === gameId) as Room;

      const { status, pos, coords } = attack(
        x,
        y,
        gameId,
        user?.index as number,
      );
      if (status !== 'repeat') {
        const nextTurn = turn(
          status === 'miss'
            ? (room?.roomUsers.find((u) => u.index !== shooter)
                ?.index as number)
            : shooter,
        );
        shooter =
          status === 'miss'
            ? (room?.roomUsers.find((u) => u.index !== shooter)
                ?.index as number)
            : shooter;
        room.roomUsers.forEach((player) => {
          const wss = getReceiverById(player.index);
          if (wss) {
            if (status === 'finish') {
              const feedback = {
                type: 'finish',
                data: JSON.stringify({
                  winPlayer: indexPlayer,
                }),
                id: 0,
              };
              addWinner(player.name);
              wss.send(JSON.stringify(feedback));

              wsServer.clients.forEach((client) =>
                client.send(JSON.stringify(updateWinners())),
              );
              return;
            }

            const feedback = {
              type: 'attack',
              data: JSON.stringify({
                position: {
                  x,
                  y,
                },
                currentPlayer: indexPlayer,
                status,
              }),
              id: 0,
            };

            wss.send(JSON.stringify(feedback));
            wss.send(JSON.stringify(nextTurn));

            if (status === 'killed') {
              pos.forEach(({ x, y }) => {
                const killFeedack = {
                  type: 'attack',
                  data: JSON.stringify({
                    position: {
                      x,
                      y,
                    },
                    currentPlayer: indexPlayer,
                    status: 'killed',
                  }),
                  id: 0,
                };
                wss.send(JSON.stringify(killFeedack));
              });
              coords.forEach(({ x, y }) => {
                const missFeedack = {
                  type: 'attack',
                  data: JSON.stringify({
                    position: {
                      x,
                      y,
                    },
                    currentPlayer: indexPlayer,
                    status: 'miss',
                  }),
                  id: 0,
                };
                wss.send(JSON.stringify(missFeedack));
              });
            }
          }
        });
      }
    }
    //////////////////////////
    if (message.type === 'randomAttack') {
      const { gameId, indexPlayer } = JSON.parse(message.data);
      const room = getAllRooms().find((room) => room.gameId === gameId) as Room;
      const { status, attackX, attackY } = randomAttack(
        gameId,
        user?.index as number,
      );

      const nextTurn = turn(
        status === 'miss'
          ? (room?.roomUsers.find((u) => u.index !== shooter)?.index as number)
          : shooter,
      );
      shooter =
        status === 'miss'
          ? (room?.roomUsers.find((u) => u.index !== shooter)?.index as number)
          : shooter;

      room.roomUsers.forEach((player) => {
        const wss = getReceiverById(player.index);
        // const nextTurn = turn(player.index);
        if (wss) {
          const feedback = {
            type: 'attack',
            data: JSON.stringify({
              position: {
                x: attackX,
                y: attackY,
              },
              currentPlayer: indexPlayer,
              status,
            }),
            id: 0,
          };

          wss.send(JSON.stringify(feedback));
          wss.send(JSON.stringify(nextTurn));
        }
      });
    }

    if (message.type === 'single_play') {
      const room = createRoom(user as User);

      createGame(user as User, room.roomId);
      const data = JSON.stringify({
        idGame: Math.random(),
        idPlayer: user?.index as number,
      });

      const message = {
        type: 'create_game',
        data,
        id: 0,
      };

      bot = createBot();
      console.log(bot);
      ws.send(JSON.stringify(message));
    }
  });

  ws.on('error', console.error);

  ws.on('close', () => console.log(`Client disconnected`));
});

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);
