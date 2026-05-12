export function parseContent(text) {
  if (!text) return [];

  const blocks = [];
  // Regex to match [CITATION: source:page] or [CITATION: source]
  const citationRegex = /\[CITATION:\s*([^:]+)(?::([^\]]+))?\]/g;
  
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add the preceding text as a markdown block
    if (match.index > lastIndex) {
      blocks.push({
        type: 'markdown',
        value: text.slice(lastIndex, match.index)
      });
    }

    // Add the citation block
    blocks.push({
      type: 'citation',
      source: match[1].trim(),
      page: match[2] ? match[2].trim() : undefined,
      raw: match[0]
    });

    lastIndex = citationRegex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    blocks.push({
      type: 'markdown',
      value: text.slice(lastIndex)
    });
  }

  // Merge consecutive markdown blocks if any exist
  const mergedBlocks = [];
  for (const block of blocks) {
    if (block.type === 'markdown' && mergedBlocks.length > 0 && mergedBlocks[mergedBlocks.length - 1].type === 'markdown') {
      mergedBlocks[mergedBlocks.length - 1].value += block.value;
    } else {
      mergedBlocks.push(block);
    }
  }

  return mergedBlocks;
}
