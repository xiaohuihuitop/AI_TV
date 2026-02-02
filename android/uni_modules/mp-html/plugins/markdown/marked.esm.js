import './marked.min.js';

const root = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : {});
const exported = root.marked || {};
const marked = exported.marked || exported;

export { marked };
