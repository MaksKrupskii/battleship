import createEmptyGameBoard from '../utils/board';
import { Room, Ship, User } from '../types/types';
import { getAllReceivers, getReceiverById } from './users';

export const enum StatusCodes {
  OK = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

let id: number = 1;
let gameId: number = 1;

const rooms: Room[] = [];
// const games: Game[] = [];
const winners: { [k: string]: number } = { qqqqq: 10, ccccc: 5 };

export function getAllRooms(): Room[] {
  return rooms;
}

export function onePlayerRoomList(): Room[] {
  const list = rooms.filter((room) => room.roomUsers.length === 1);
  return list;
}

export function createRoom({ name, index }: User): Room {
  const roomId = id++;
  const newRoom: Room = { roomId, roomUsers: [{ name, index }] };
  rooms.push(newRoom);
  return newRoom;
}

export function updateRoom() {
  const data = JSON.stringify(onePlayerRoomList());
  const message = {
    type: 'update_room',
    data,
    id: 0,
  };

  return message;
}

export function addUserToRoom({ name, index }: User, indexRoom: number) {
  const room = rooms.find((room) => room.roomId === indexRoom);
  if (room) {
    room.roomUsers = [...room.roomUsers, { name, index }];
  }
}

export function createGame(user: User, indexRoom: number) {
  const room = rooms.find((room) => room.roomId === indexRoom);
  const receivers = getAllReceivers();
  const id = gameId++;
  if (room) {
    room.gameId = id;
    room.roomUsers = [
      ...room.roomUsers,
      { name: user?.name as string, index: user?.index as number },
    ];
  }

  room?.roomUsers.forEach((user) => {
    const data = JSON.stringify({
      idGame: id,
      idPlayer: user.index,
    });

    const message = {
      type: 'create_game',
      data,
      id: 0,
    };

    receivers[user.name]?.send(JSON.stringify(message));
  });
}

export function addShips(gameId: number, ships: Ship[], indexPlayer: number) {
  const room = rooms.find((room) => room.gameId === gameId);

  if (room) {
    const player = room.roomUsers.find((item) => item.index === indexPlayer);
    if (player) {
      player.ships = ships;
      player.shipsLeft = 10;
      player.board = createEmptyGameBoard(10);
    }

    if (room.roomUsers.every((item) => item.ships)) {
      startGame(room);
    }
  }
}

export function startGame(room: Room) {
  const nextTurn = turn(room.roomUsers[1]?.index as number);

  room.roomUsers.forEach((player) => {
    const ws = getReceiverById(player.index);
    if (ws) {
      const data = {
        type: 'start_game',
        data: JSON.stringify({
          ships: player.ships,
          currentPlayerIndex: player.index,
        }),
        id: 0,
      };

      ws.send(JSON.stringify(data));
      ws.send(JSON.stringify(nextTurn));
    }
  });
  return room.roomUsers[1]?.index as number;
}

// function createEmptyGameBoard(size: number): boolean[][] {
//   const board: boolean[][] = [];
//   for (let i = 0; i < size; i++) {
//     const arr = new Array(size).fill(true) as boolean[];
//     board.push(arr);
//   }
//   return board;
// }

const shipLength = {
  huge: 4,
  large: 3,
  medium: 2,
  small: 1,
};

export function randomAttack(gameId: number, userId: number) {
  const response: {
    status: 'miss' | 'killed' | 'shot';
    attackX?: number;
    attackY?: number;
  } = { status: 'miss' };
  const room = rooms.find((room) => room.gameId === gameId);

  const player = room?.roomUsers.find((player) => player.index !== userId);
  const boardLength = player?.board?.length as number;

  loop: for (let i = 0; i < boardLength; i++) {
    if (player?.board) {
      const rowLength = player?.board[i]?.length as number;
      for (let j = 0; j < rowLength; j++) {
        if ((player?.board[j] as boolean[])[i]) {
          response.attackX = j;
          response.attackY = i;
          for (const ship of player?.ships as Ship[]) {
            const shipType = ship.type as keyof typeof shipLength;
            const fullLength = shipLength[shipType];

            const { position, direction } = ship;
            let { x, y } = position;

            for (let k = 0; k < fullLength; k++) {
              if (x === j && y === i) {
                ship.length--;
                if (ship.length === 0) {
                  response.status = 'killed';
                } else if (fullLength > ship.length) {
                  response.status = 'shot';
                }
              }
              if (direction) {
                y++;
              } else {
                x++;
              }
            }
          }
          (player?.board[j] as boolean[])[i] = false;
          break loop;
        }
      }
    }
  }
  return response;
}

export function attack(
  attackX: number,
  attackY: number,
  gameId: number,
  userId: number,
) {
  const room = rooms.find((room) => room.gameId === gameId);

  const player = room?.roomUsers.find((player) => player.index !== userId);
  const boardRow = player?.board ? (player?.board[attackY] as boolean[]) : [];
  let status: 'miss' | 'killed' | 'shot' | 'repeat' | 'finish' = boardRow[
    attackX
  ]
    ? 'miss'
    : 'repeat';
  const pos = [];
  let coords: { x: number; y: number }[] = [];
  if (player && boardRow[attackX]) {
    for (const ship of player.ships as Ship[]) {
      const shipType = ship.type as keyof typeof shipLength;
      const fullLength = shipLength[shipType];

      const { position, direction } = ship;
      let { x, y } = position;

      for (let i = 0; i < fullLength; i++) {
        if (x === attackX && y === attackY) {
          ship.length--;
          if (ship.length === 0) {
            status = 'killed';

            player.shipsLeft = (player.shipsLeft as number) - 1;
            if (player?.shipsLeft === 0) {
              status = 'finish';
            }

            let { x, y } = position;
            for (let i = 0; i < fullLength; i++) {
              if (direction) {
                ((player?.board as boolean[][])[y] as boolean[])[x] = false;
                pos.push({ x, y: y++ });
              } else {
                ((player?.board as boolean[][])[y] as boolean[])[x] = false;
                pos.push({ x: x++, y });
              }
            }
            coords = getCoordsAround(position, direction, fullLength);
            break;
          } else if (fullLength > ship.length) {
            status = 'shot';
            break;
          }
        }
        if (direction) {
          y++;
        } else {
          x++;
        }
      }
    }
  }
  coords.forEach(({ x, y }) => {
    if (x >= 0 && y >= 0 && x < 10 && y < 10) {
      ((player?.board as boolean[][])[y] as boolean[])[x] = false;
    }
  });
  pos.forEach(({ x, y }) => {
    if (x >= 0 && y >= 0 && x < 10 && y < 10) {
      ((player?.board as boolean[][])[y] as boolean[])[x] = false;
    }
  });
  return { status, coords, pos };
}

export function turn(playerId: number) {
  return {
    type: 'turn',
    data: JSON.stringify({
      currentPlayer: playerId,
    }),
    id: 0,
  };
}

const getCoordsAround = (
  { x, y }: { x: number; y: number },
  direction: boolean,
  fullLength: number,
) => {
  const coords = [];
  for (let i = 0; i < fullLength; i++) {
    if (fullLength === 1) {
      coords.push(
        { x, y: y - 1 },
        { x, y: y + 1 },
        { x: x - 1, y: y - 1 },
        { x: x - 1, y: y + 1 },
        { x: x + 1, y: y - 1 },
        { x: x + 1, y: y + 1 },
        { x: x - 1, y },
        { x: x + 1, y },
      );
      return coords;
    }
    if (direction) {
      if (i === 0) {
        coords.push(
          { x: x - 1, y },
          { x: x + 1, y },
          { x: x - 1, y: y - 1 },
          { x: x + 1, y: y - 1 },
          { x, y: y - 1 },
        );
      } else if (i === fullLength - 1) {
        coords.push(
          { x: x - 1, y },
          { x: x + 1, y },
          { x: x - 1, y: y + 1 },
          { x: x + 1, y: y + 1 },
          { x, y: y + 1 },
        );
      } else {
        coords.push({ x: x - 1, y }, { x: x + 1, y });
      }
      y++;
    } else {
      if (i === 0) {
        coords.push(
          { x, y: y - 1 },
          { x, y: y + 1 },
          { x: x - 1, y: y - 1 },
          { x: x - 1, y: y + 1 },
          { x: x - 1, y },
        );
      } else if (i === fullLength - 1) {
        coords.push(
          { x, y: y - 1 },
          { x, y: y + 1 },
          { x: x + 1, y: y - 1 },
          { x: x + 1, y: y + 1 },
          { x: x + 1, y },
        );
      } else {
        coords.push({ x, y: y - 1 }, { x, y: y + 1 });
      }
      x++;
    }
  }

  return coords;
};

export function updateWinners() {
  const data = JSON.stringify(getWinners());
  const message = {
    type: 'update_winners',
    data,
    id: 0,
  };

  return message;
}

export function addWinner(name: string) {
  if (winners[name]) {
    winners[name] = (winners[name] as number) + 1;
  } else {
    winners[name] = 1;
  }
}

export function getWinners() {
  return (Object.entries(winners) as [string, number][])
    .map((value) => {
      return { name: value[0], wins: value[1] };
    }, [])
    .sort((a, b) => b.wins - a.wins);
}
