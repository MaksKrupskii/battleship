// import { v4 as uuidV4, validate as uuidValidate } from 'uuid';
import { User } from '../types/types';
import WebSocket from 'ws';

export const enum StatusCodes {
  OK = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

export interface UserResponse {
  code: number;
  data: User | User[] | string;
}

export interface Receivers {
  [k: string]: WebSocket;
}

let index: number = 1;
const users: User[] = [];
const receivers: Receivers = {};

export function getAllUsers(): User[] {
  return users;
}

export function validateUser(user: Omit<User, 'index'>) {
  const userToValidate = users.find((u) => u.name === user.name);

  if (!userToValidate) {
    const newUser = addUser(user);
    return JSON.stringify({
      name: newUser.name,
      index: newUser.index,
      error: false,
      errorText: '',
    });
  } else if (userToValidate.password !== user.password) {
    return JSON.stringify({
      name: user.name,
      index: 0,
      error: true,
      errorText: 'Неправильный пароль',
    });
  } else {
    return JSON.stringify({
      name: userToValidate.name,
      index: userToValidate.index,
      error: false,
      errorText: '',
    });
  }
}

export function addUser(user: Omit<User, 'index'>): User {
  const newUser = { index: index++, ...user };
  users.push(newUser);

  return newUser;
}

export function addReceiver(username: string, receiver: WebSocket) {
  if (!receivers[username]) {
    receivers[username] = receiver;
  }
}

export function getAllReceivers(): Receivers {
  return receivers;
}

export function getReceiverById(id: number): WebSocket | undefined {
  const name = users.find((user) => user.index === id)?.name;

  if (name) {
    return receivers[name];
  }
}

// export function getUser(id: string): UserResponse {
//   if (!uuidValidate(id)) {
//     return {
//       code: StatusCodes.BadRequest,
//       data: 'Invalid ID! Please check the input value and try again.',
//     };
//   }

//   const user = users.find((user) => user.id == id);

//   if (!user) {
//     return {
//       code: StatusCodes.NotFound,
//       data: 'User not found! Please make sure you have entered a valid ID.',
//     };
//   }

//   return {
//     code: StatusCodes.OK,
//     data: user,
//   };
// }

// export function updateUser(newUser: Partial<User>): UserResponse {
//   if (!newUser.id || !uuidValidate(newUser.id)) {
//     return {
//       code: StatusCodes.BadRequest,
//       data: 'Invalid ID! Please check the input value and try again.',
//     };
//   }
//   const idx = users.findIndex((user) => user.id == newUser.id);
//   if (idx < 0) {
//     return {
//       code: StatusCodes.NotFound,
//       data: 'User not found! Please make sure you have entered a valid ID.',
//     };
//   }

//   if (
//     Object.keys(newUser).some(
//       (key) => !['id', 'username', 'age', 'hobbies'].includes(key),
//     )
//   ) {
//     return {
//       code: StatusCodes.BadRequest,
//       data: 'Invalid field! Only username, age, and hobbies are allowed for update.',
//     };
//   }

//   if (newUser.username) {
//     if (typeof newUser.username === 'string') {
//       users[idx].username = newUser.username;
//     } else {
//       return {
//         code: StatusCodes.BadRequest,
//         data: 'Invalid username! Please provide a valid string value for username.',
//       };
//     }
//   }

//   if (newUser.age) {
//     if (typeof newUser.age === 'number') {
//       users[idx].age = newUser.age;
//     } else {
//       return {
//         code: StatusCodes.BadRequest,
//         data: 'Invalid age! Please provide a valid number value for age.',
//       };
//     }
//   }

//   if (newUser.hobbies) {
//     if (
//       newUser.hobbies instanceof Array &&
//       newUser.hobbies.every((hobby) => typeof hobby === 'string')
//     ) {
//       if (newUser.hobbies.length) users[idx].hobbies = newUser.hobbies;
//     } else {
//       return {
//         code: StatusCodes.BadRequest,
//         data: 'Invalid hobbies! Please provide a valid array of strings for hobbies.',
//       };
//     }
//   }

//   return { code: StatusCodes.OK, data: users[idx] };
// }

// export function deleteUser(id: string): UserResponse {
//   if (!uuidValidate(id)) {
//     return {
//       code: StatusCodes.BadRequest,
//       data: 'Invalid ID! Please check the input value and try again.',
//     };
//   }

//   const idx = users.findIndex((user) => user.id == id);

//   if (idx < 0) {
//     return {
//       code: StatusCodes.NotFound,
//       data: 'User not found! Please make sure you have entered a valid ID.',
//     };
//   }

//   const user = users[idx];
//   users.splice(idx, 1);
//   return { code: StatusCodes.NoContent, data: user };
// }
