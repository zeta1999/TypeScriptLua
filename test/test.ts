let navigator1 = 'iPad iPhone';
const _badOS = /iPad/i.test(navigator1);
const b = _badOS ? 1 : 0;
console.log(b);
