import { Value, Node } from "slate";
import { Note } from "core/note";

const EmptyDoc = {
    object: "value",
    document: {
        object: "document",
        data: {},
        nodes: [
            {
                ...Node.createProperties("line"),
                object: "block",
                data: {},
                nodes: [
                    {
                        object: "text",
                        leaves: [
                            {
                                object: "leaf",
                                text: "",
                                marks: []
                            }
                        ]
                    }
                ]
            }
        ]
    }
};

function slateKeyFromRefKey(key) {
    const parts = key.split("/");
    return parts[parts.length - 1];
}

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
        const key = node.key;
        const note = Note.get("notes/" + key, { type: node.type });
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

function extractReferences(slateValue) {
    if (!slateValue) {
        return {};
    }
    const result = {};
    slateValue.document.nodes.forEach(node => _refsDataFromNode(node, result));
    return result;
}

function _refsDataFromNode(node, outData) {
    if (node.type === "task" || node.type === "note") {
        const key = node.key;
        outData[key] = Note.get("notes/" + key, { type: node.type });
    } else if (node.nodes) {
        node.nodes.forEach(child => _refsDataFromNode(child, outData));
    }
}

function serialize(value) {
    if (!value) {
        return null;
    }
    const desc = {
        nodes: value.document.nodes.toArray().map(n => _serializeNode(n)),
        key: value.document.key
    };
    // debugger;
    return JSON.stringify(desc);
}

function _serializeNode(node) {
    // debugger;
    if (node.type === "task" || node.type === "note") {
        return {
            type: node.type,
            key: slateKeyFromRefKey(node.key),
            data: node.data.toJSON()
        };
    }
    const obj = {
        object: node.object,
        type: node.type,
        key: node.key,
        data: node.data ? node.data.toJSON() : {},
        nodes: node.nodes
            ? node.nodes.toArray().map(n => _serializeNode(n))
            : []
    };

    if (node.object === "text") {
        obj.leaves = node
            .getLeaves()
            .toArray()
            .map(l => l.toJSON());
    }
    return obj;
}

function deserialize(text, selection = null) {
    let json = null;
    try {
        json = JSON.parse(text);
    } catch (e) {}
    let desc = EmptyDoc;
    if (json) {
        desc = {
            object: "value",
            document: {
                object: "document",
                data: {},
                key: json.key,
                nodes: json.nodes.map(node => _deserializeNode(node))
            }
        };
    }

    let value = Value.fromJSON(desc);
    // debugger;
    if (selection) {
        value = value.setSelection(selection);
    }
    return value;
}

function _deserializeNode(node) {
    if (node.type === "task" || node.type === "note") {
        const note = Note.get("notes/" + node.key);
        const slateKey = slateKeyFromRefKey(note.key);
        return {
            type: "task",
            object: "block",
            key: slateKey,
            nodes: [
                {
                    object: "text",
                    key: slateKey + "-title",
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
    node.nodes = node.nodes.map(n => _deserializeNode(n));
    return node;
}

export {
    serialize,
    deserialize,
    updateReferences,
    extractReferences,
    EmptyDoc
};
