/**
 * LINEはマークダウンを描画しないため、記法をプレーンテキストへ変換する。
 *
 * @param {string} text
 * @returns {string}
 */
const stripMarkdown = (text = '') => text
  .replace(/^```[^\n]*\n?/gm, '')
  .replace(/^~~~[^\n]*\n?/gm, '')
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/__([^_]+)__/g, '$1')
  .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1$2')
  .replace(/`([^`]+)`/g, '$1')
  .replace(/^(\s*)[*-]\s+/gm, '$1・');

export default stripMarkdown;
