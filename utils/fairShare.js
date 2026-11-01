// Splits a character budget between pieces of different lengths (the tabs of a workbook,
// for example). A short piece keeps everything it has, and whatever it leaves unused
// goes to the longer pieces, so one big tab is not cut while small tabs waste their share.
/**
 * @param {number[]} lengths the full length of each piece
 * @param {number} total the budget shared by all pieces
 * @returns {number[]} how many characters each piece may keep, in the same order
 */
function fairShare(lengths, total) {
  const order = lengths.map((_, i) => i).sort((a, b) => lengths[a] - lengths[b]);
  const allowed = new Array(lengths.length);
  let remaining = total;
  order.forEach((index, k) => {
    allowed[index] = Math.min(lengths[index], Math.floor(remaining / (order.length - k)));
    remaining -= allowed[index];
  });
  return allowed;
}

module.exports = { fairShare };
