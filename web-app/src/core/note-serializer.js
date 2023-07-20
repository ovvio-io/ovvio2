import { Value } from "slate";
import { Note } from "core/note";
import { createKey } from "core/persistent-model";

const MARKS_MAP = {
    bold: "\uE001"
};

function updateReferences(slateValue) {
    if (!slateValue) {
        return false;
    }
    let result = false;
    slateValue.document.nodes.forEach(node => {
        result = _updateNotesInNode(node) || result;
    });
    return result;
}

function _updateNotesInNode(node) {
    if (node.type === "task" || node.type === "note") {
        let key = node.data.get("noteKey");
        if (!key) {
            key = createKey("notes");
        }
        const note = Note.get(key, { type: node.type });
        if (note.isReady() && !node.data.get("notReady")) {
            return note.set("title", node.text);
        }
    }
    if (node.nodes) {
        let result = false;
        node.nodes.forEach(child => {
            result = _updateNotesInNode(child) || result;
        });
        return result;
    }
    return false;
}

function shouldUpdateReferences(slateValue) {
    if (!slateValue) {
        return false;
    }
    let result = false;
    slateValue.document.nodes.forEach(node => {
        result = _shouldUpdateNotesInNode(node) || result;
    });
    return result;
}

function _shouldUpdateNotesInNode(node) {
    if (node.type === "task" || node.type === "note") {
        let key = node.data.get("noteKey");
        if (!key) {
            key = createKey("notes");
        }
        const note = Note.get(key, { type: node.type });
        if (note.isReady() && !node.data.get("notReady")) {
            return note.get("title") !== node.text;
        }
    }
    return node.nodes.forEach(child => _shouldUpdateNotesInNode(child));
}

function extractRefsData(slateValue) {
    if (!slateValue) {
        return {};
    }
    const result = {};
    slateValue.document.nodes.forEach(node => _refsDataFromNode(node, result));
    return result;
}

function _refsDataFromNode(node, outData) {
    if (node.type === "task" || node.type === "note") {
        let key = node.data.get("noteKey");
        if (!key) {
            key = createKey("notes");
        }
        const note = Note.get(key, { type: node.type });
        if (note.isReady()) {
            let data = outData[key];
            if (!data) {
                data = {};
                outData[key] = data;
            }
            data.title = node.text;
        }
    } else if (node.nodes) {
        node.nodes.forEach(child => _refsDataFromNode(child, outData));
    }
}

function serializeValue(value, updateRefs = true) {
    if (!value) {
        return "";
    }
    const result = [];
    value.document.nodes.forEach(node =>
        serializeNode(node, result, updateRefs)
    );
    if (result.length && result[result.length - 1] == "\n") {
        result.pop();
    }
    return result.join("");
}

function serializeNode(node, data, updateRefs) {
    if (node.object === "text") {
        const leaves = node.getLeaves();
        leaves.forEach(leaf => {
            const result = serializeLeaf(leaf);
            if (result) {
                data.push(result);
            }
        });
        return;
    }

    if (node.type === "task" || node.type === "note") {
        serializeNoteRef(node, data, updateRefs);
    } else {
        node.nodes.forEach(child => serializeNode(child, data, updateRefs));
    }

    if (node.object === "block") {
        data.push("\n");
        return;
    }
}

function serializeLeaf(leaf) {
    return leaf.marks.reduce((text, mark) => {
        const wrappingChar = MARKS_MAP[mark.type] || "";

        return wrappingChar + text + wrappingChar;
    }, leaf.text);
}

function serializeNoteRef(node, textFragments, updateRefs) {
    let key = node.data.get("noteKey");
    if (!key) {
        key = createKey("notes");
    }
    // if (updateRefs) {
    const note = Note.get(key, { type: node.type });
    // debugger;
    // if (note.isReady() && !node.data.get("notReady")) {
    //     note.set("title", node.text);
    //     // note.flush();
    // }
    key = note.key;
    // }
    // TODO: update various fields, less frequent flushes
    if (!key) {
        debugger;
    }
    textFragments.push(`\uE000${key}\uE000`);
}

function deserializeText(
    text,
    selection = null,
    { defaultBlock, toJson } = {
        defaultBlock: "paragraph",
        toJson: false
    }
) {
    if (!defaultBlock) {
        defaultBlock = "paragraph";
    }

    let parts = text.split("\n");
    if (!parts.length) {
        parts = ["\n"];
    }

    const value = {
        object: "value",
        document: {
            object: "document",
            data: {},
            nodes: parts.map(block => deserializeBlock(block, defaultBlock))
        }
    };

    if (selection) {
        value.selection = selection;
    }

    const r = toJson ? value : Value.fromJSON(value);
    return r;
    // return toJson ? value : Value.fromJSON(value);
}

function deserializeBlock(text, defaultBlock) {
    if (text[0] == "\uE000" && text[text.length - 1] == "\uE000") {
        const result = deserializeNoteRef(text.substring(1, text.length - 1));
        if (result) {
            return result;
        }
    }

    const leaves = [];
    let leaf = {
        object: "leaf",
        text: "",
        marks: []
    };

    const marksStack = [];

    for (let i = 0; i < text.length; ++i) {
        const char = text[i];
        const mark = MARKS_MAP[char];
        if (mark) {
            if (marksStack[0] && marksStack[0].type === mark) {
                marksStack.shift();
            } else {
                marksStack.unshift({ type: mark });
            }
            if (leaf.text) {
                leaves.push(leaf);
                leaf = {
                    object: "leaf",
                    text: ""
                };
            }
            leaf.marks = [...marksStack];
            return;
        }

        leaf.text += char;
    }
    // text.split("").forEach(char => {
    //     const mark = MARKS_MAP[char];
    //     if (mark) {
    //         if (marksStack[0] && marksStack[0].type === mark) {
    //             marksStack.shift();
    //         } else {
    //             marksStack.unshift({ type: mark });
    //         }
    //         if (leaf.text) {
    //             leaves.push(leaf);
    //             leaf = {
    //                 object: "leaf",
    //                 text: ""
    //             };
    //         }
    //         leaf.marks = [...marksStack];
    //         return;
    //     }

    //     leaf.text += char;
    // });

    if (leaf.text) {
        leaves.push(leaf);
    }

    return {
        type: defaultBlock,
        object: "block",
        data: {},
        nodes: [
            {
                object: "text",
                leaves: leaves
            }
        ]
    };
}

function deserializeNoteRef(key) {
    if (!key) {
        return;
    }
    const note = Note.get(key);
    return {
        type: "task",
        object: "block",
        data: {
            noteKey: note.key,
            notReady: !note.isReady()
        },
        nodes: [
            {
                object: "text",
                leaves: [
                    {
                        object: "leaf",
                        text: note.isLoaded()
                            ? note.get("title")
                            : "<Loading...>"
                    }
                ]
            }
        ]
    };
}

export {
    serializeValue,
    deserializeText,
    shouldUpdateReferences,
    updateReferences,
    extractRefsData
};
