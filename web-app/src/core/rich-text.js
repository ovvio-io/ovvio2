import {
	TreeBuilder,
	RichText,
} from '@ovvio/cfds/primitives/richtext2';
import {
	TYPE_BLOCK,
	TYPE_DYNAMIC,
	TYPE_EMBED,
} from '@ovvio/cfds/primitives/richtext-tree';
import { MarkerSet } from '@ovvio/cfds/primitives/marker-set';

function filterData(data) {
	const { size, ...data } = data;
	return data;
}
class EmbedBuilder {
	canBuildEmbed(props, parent, local) {
		return false;
	}

	buildEmbed(props, parent, local) {}
}

class MentionsAnchorBuilder extends EmbedBuilder {
	canBuildEmbed(props, parent, local) {
		return (
			props.type.startsWith('mentions-anchor') && local
		);
	}

	buildEmbed(props, parent, local) {
		parent.nodes.push({
			object: 'inline',
			type: props.type,
			key: props.key,
			nodes: [
				{
					object: 'text',
					key: `${props.key}-t`,
					leaves: [
						{
							object: 'leaf',
							text: props.anchorText,
							marks: [],
						},
					],
				},
			],
		});
		parent.nodes.push({
			object: 'text',
			key: `ui-${parent.key}-ws`,
			leaves: [
				{
					object: 'leaf',
					text: '',
					marks: [],
				},
			],
		});
	}
}

class TaskEmbedBuilder extends EmbedBuilder {
	constructor() {
		super();
		this.taskBuilder = new TaskBuilder();
	}
	canBuildEmbed(props, parent, local) {
		return props.type === 'task';
	}
	buildEmbed(props, parent, local) {
		const task = this.taskBuilder.walk(props.text);
		task.object = 'block';
		parent.nodes.push(task);
	}
}

class SlateDocumentBuilder extends TreeBuilder {
	constructor(embedBuilders = []) {
		super();
		this.embedBuilders = embedBuilders;
	}

	createRoot() {
		return {
			object: 'document',
			data: {},
			nodes: [],
		};
	}

	createNode(nodeType, props, parent, local) {
		const { key, type, ...data } = props;
		const node = {
			object: 'block',
			type,
			key,
			data,
		};
		if (nodeType !== TYPE_EMBED) {
			node.nodes = [];
		}

		parent.nodes.push(node);
	}

	appendText(text, markerSet, parent) {
		const leaves = [];
		let lastEnd = 0;

		markerSet.fragments((range, data) => {
			if (range.start > lastEnd) {
				leaves.push({
					object: 'leaf',
					text: text.substring(lastEnd, range.start),
				});
			}
			lastEnd = range.end;
			const currentText = text.substring(
				range.start,
				range.end
			);
			const leaf = {
				object: 'leaf',
				text: currentText,
				marks: [],
			};

			for (let i = 0; i < data.length; i++) {
				const marker = data[i];
				let type = marker.name;
				if (marker.props.$key) {
					type = `${type}:${marker.props.$key}`;
				}

				const markData = {};
				Object.keys(marker.props).forEach(key => {
					markData[key] = marker.props[key];
				});

				leaf.marks.push({
					object: 'mark',
					type,
					data: markData,
				});
			}
			leaves.push(leaf);
		});

		if (lastEnd < text.length) {
			leaves.push({
				object: 'leaf',
				text: text.substring(lastEnd, text.length),
			});
		}

		const index =
			parent.nodes.filter(x => x.object === 'text').length +
			1;

		parent.nodes.push({
			object: 'text',
			key: `${parent.key}-t${index}`,
			leaves,
		});
	}

	appendEmbed(props, parent, local) {
		for (let builder of this.embedBuilders) {
			if (builder.canBuildEmbed(props, parent, local)) {
				builder.buildEmbed(props, parent, local);
				return;
			}
		}
		const { type, key, ...data } = props;
		parent.nodes.push({
			object: 'block',
			key,
			type,
			data,
		});
	}
}

export class TaskBuilder extends SlateDocumentBuilder {
	constructor() {
		super([new MentionsAnchorBuilder()]);
	}
}

export class NoteBuilder extends SlateDocumentBuilder {
	constructor() {
		super([new TaskEmbedBuilder()]);
	}
}

