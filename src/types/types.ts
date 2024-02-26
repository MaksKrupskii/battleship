export type User = {
  index: number;
  name: string;
  password: string;
};

export interface UserResponse {
  code: number;
  data: User | User[] | string;
}

export interface RoomUser {
  name: string;
  index: number;
  ships?: Ship[];
  board?: boolean[][];
  shipsLeft?: number;
}

export interface Room {
  roomId: number;
  gameId?: number;
  roomUsers: RoomUser[];
}

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: 'small' | 'medium' | 'large' | 'huge';
}

export interface Player {
  indexPlayer: number;
  ships: Ship[];
  board: boolean[][];
}
