import { Value } from "slate";

class RichTextSerializer {
    constructor(rules = [], marksMap = {}) {
        this.rules = rules;
        this.marksMap = marksMap;
        this.charToMark = Object.keys(marksMap).reduce((map, mark) => {
            map[marksMap[mark]] = mark;
            return map;
        }, {});
    }

    deserialize(
        text,
        { defaultBlock, toJson } = { defaultBlock: "paragraph", toJson: false }
    ) {
        const value = {
            object: "value",
            document: {
                object: "document",
                data: {},
                nodes: text
                    .split("\n")
                    .map(block => this.deserializeBlock(block, defaultBlock))
            }
        };

        return toJson ? value : Value.fromJSON(value);
    }

    deserializeBlock(text, defaultBlock) {
        let result = null;
        for (let i = 0; i < this.rules.length; i++) {
            let rule = this.rules[i];
            result = rule.deserialize(text);
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

        text.split("").forEach(char => {
            const mark = this.charToMark[char];
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
        });

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

    serialize(value, options = {}) {
        const result = [];
        value.document.nodes.forEach(node => this.serializeNode(node, result));
        return result.join("");
    }

    serializeNode(node, data) {
        if (node.object === "text") {
            const leaves = node.getLeaves();
            leaves.forEach(leaf => {
                const result = this.serializeLeaf(leaf);
                if (result) {
                    data.push(result);
                }
            });
            return;
        }
        let result = null;

        for (let i = this.rules.length - 1; i >= 0; i--) {
            let rule = this.rules[i];
            result = rule.serialize(node, this.serializeNode.bind(this));
            if (result) {
                data.push(result);
                break;
            }
        }

        if (!result) {
            node.nodes.forEach(child => this.serializeNode(child, data));
        }
        if (node.object === "block") {
            data.push("\n");
        }
    }

    serializeLeaf(leaf) {
        return leaf.marks.reduce((text, mark) => {
            const wrappingChar = this.marksMap[mark.type] || "";

            return wrappingChar + text + wrappingChar;
        }, leaf.text);
    }
}

export default RichTextSerializer;
