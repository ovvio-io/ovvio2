import { uniqueId } from '../../base/common.ts';
import {
  FlatRepAtom,
  isDepthMarker,
  isElementSpacer,
  kElementSpacer,
} from './flat-rep.ts';
import { OrderedListNode } from './model.ts';
import { isElementNode, isTextNode } from './tree.ts';

const STREAM_DETECTION_SIZE = 6;

function replaceH1(buffer: FlatRepAtom[]): [number, FlatRepAtom[]] | undefined {
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
      5,
      [
        buffer[0],
        {
          children: [],
          tagName: 'h1',
        },
        buffer[2],
        {
          text: '',
        },
      ],
    ];
  }
}

function replaceH2(buffer: FlatRepAtom[]): [number, FlatRepAtom[]] | undefined {
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
      6,
      [
        buffer[0],
        {
          children: [],
          tagName: 'h2',
        },
        buffer[2],
        {
          text: '',
        },
      ],
    ];
  }
}

function replaceUL(buffer: FlatRepAtom[]): [number, FlatRepAtom[]] | undefined {
  if (buffer.length < 5) {
    return;
  }
  if (
    isElementSpacer(buffer[0]) &&
    isElementNode(buffer[1]) &&
    isDepthMarker(buffer[2]) &&
    isTextNode(buffer[3]) &&
    buffer[3].text === '*' &&
    isTextNode(buffer[4]) &&
    buffer[4].text === ' '
  ) {
    return [
      5,
      [
        buffer[0],
        {
          children: [],
          tagName: 'ul',
        },
        buffer[2],
        {
          tagName: 'li',
          children: [],
        },
        { depthMarker: buffer[2].depthMarker + 1 },
        {
          text: '',
        },
      ],
    ];
  }
}

function replaceOL(buffer: FlatRepAtom[]): [number, FlatRepAtom[]] | undefined {
  if (buffer.length < 6) {
    return;
  }
  if (
    isElementSpacer(buffer[0]) &&
    isElementNode(buffer[1]) &&
    isDepthMarker(buffer[2]) &&
    isTextNode(buffer[3]) &&
    buffer[3].text.charCodeAt(0) >= 48 &&
    buffer[3].text.charCodeAt(0) <= 57 &&
    isTextNode(buffer[4]) &&
    buffer[4].text === '.' &&
    isTextNode(buffer[5]) &&
    buffer[5].text === ' '
  ) {
    const ol: OrderedListNode = {
      tagName: 'ol',
      children: [],
    };
    if (buffer[3].text !== '1') {
      ol.start = parseInt(buffer[3].text);
    }
    return [
      6,
      [
        buffer[0],
        ol,
        buffer[2],
        {
          tagName: 'li',
          children: [],
        },
        { depthMarker: buffer[2].depthMarker + 1 },
        {
          text: '',
        },
      ],
    ];
  }
}

function replaceTask(
  buffer: FlatRepAtom[]
): [number, FlatRepAtom[]] | undefined {
  if (buffer.length < 5) {
    return;
  }
  if (
    isElementSpacer(buffer[0]) &&
    isElementNode(buffer[1]) &&
    isDepthMarker(buffer[2]) &&
    isTextNode(buffer[3]) &&
    buffer[3].text === '-' &&
    isTextNode(buffer[4]) &&
    buffer[4].text === ' '
  ) {
    return [
      5,
      [
        buffer[0],
        {
          tagName: 'ref',
          type: 'inter-doc',
          ref: uniqueId(),
          children: [],
        },
        buffer[2],
        kElementSpacer,
        {
          tagName: 'p',
          children: [],
        },
        { depthMarker: buffer[2].depthMarker + 1 },
        {
          text: '',
        },
        buffer[2],
      ],
    ];
  }
}

export function* applyShortcuts(
  flatRep: Iterable<FlatRepAtom>
): Generator<FlatRepAtom> {
  const buffer: FlatRepAtom[] = [];
  for (const atom of flatRep) {
    buffer.push(atom);
    const replacement =
      replaceH1(buffer) ||
      replaceH2(buffer) ||
      replaceUL(buffer) ||
      replaceOL(buffer) ||
      replaceTask(buffer);
    if (replacement) {
      for (const a of replacement[1]) {
        yield a;
      }
      buffer.splice(0, replacement[0]);
    } else if (buffer.length === STREAM_DETECTION_SIZE) {
      yield buffer[0];
      buffer.shift();
    }
  }
  for (const a of buffer) {
    yield a;
  }
}
