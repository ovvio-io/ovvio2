import { FlatRepAtom, isDepthMarker, isElementSpacer } from './flat-rep.ts';
import { isElementNode, isTextNode } from './tree.ts';

const STREAM_DETECTION_SIZE = 6;

function replaceH1(buffer: FlatRepAtom[]): FlatRepAtom[] | undefined {
  if (buffer.length < 5) {
    return;
  }
  if (
    isElementSpacer(buffer[0]) &&
    isElementNode(buffer[1]) &&
    isDepthMarker(buffer[2]) &&
    isTextNode(buffer[3]) &&
    buffer[3].text === '#' &&
    isTextNode(buffer[4]) &&
    buffer[4].text === ' '
  ) {
    return [
      buffer[0],
      {
        children: [],
        tagName: 'h1',
      },
      buffer[2],
      {
        text: '',
      },
    ];
  }
}

function replaceH2(buffer: FlatRepAtom[]): FlatRepAtom[] | undefined {
  if (buffer.length < 6) {
    return;
  }
  if (
    isElementSpacer(buffer[0]) &&
    isElementNode(buffer[1]) &&
    isDepthMarker(buffer[2]) &&
    isTextNode(buffer[3]) &&
    buffer[3].text === '#' &&
    isTextNode(buffer[4]) &&
    buffer[4].text === '#' &&
    isTextNode(buffer[5]) &&
    buffer[5].text === ' '
  ) {
    return [
      buffer[0],
      {
        children: [],
        tagName: 'h2',
      },
      buffer[2],
      {
        text: '',
      },
    ];
  }
}

export function* applyShortcuts(
  flatRep: Iterable<FlatRepAtom>
): Generator<FlatRepAtom> {
  let buffer: FlatRepAtom[] = [];
  for (const atom of flatRep) {
    buffer.push(atom);
    // if (buffer.length === STREAM_DETECTION_SIZE) {
    let replacement = replaceH1(buffer) || replaceH2(buffer);
    if (replacement) {
      for (const a of replacement) {
        yield a;
      }
      buffer = [];
    } else if (buffer.length === STREAM_DETECTION_SIZE) {
      yield buffer[0];
      buffer.shift();
    }
    // }
  }
  for (const a of buffer) {
    yield a;
  }
}
