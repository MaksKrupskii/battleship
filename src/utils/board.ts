export default function createEmptyGameBoard(size: number): boolean[][] {
  const board: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    const arr = new Array(size).fill(true) as boolean[];
    board.push(arr);
  }
  return board;
}
