export type Citation = {
	documentId: string;
	filename: string;
	chunkId: string;
	chunkIndex: number;
	snippet: string;
	similarity: number;
};

export type AttachedFile = {
	name: string;
	chunkCount: number;
};

export type ChatNode = {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	children: ChatNode[];
	activeChildIndex: number;
	dbId?: string;
	citations?: Citation[];
	createdAt?: string;
	attachedFile?: AttachedFile;
};

export type DBMessage = {
	id: string;
	conversationId: string;
	parentId: string | null;
	role: string;
	content: string;
	citations: Citation[] | null;
	attachedFile: AttachedFile | null;
	activeChildIndex: number;
	createdAt: string;
};

export function createRootNode(): ChatNode {
	return {
		id: 'root',
		role: 'assistant',
		content: '',
		children: [],
		activeChildIndex: 0
	};
}

export function createNode(role: 'user' | 'assistant', content: string): ChatNode {
	return {
		id: crypto.randomUUID(),
		role,
		content,
		children: [],
		activeChildIndex: 0,
		createdAt: new Date().toISOString()
	};
}

export type DisplayEntry = {
	node: ChatNode;
	siblingCount: number;
	siblingIndex: number;
};

/** Walk the active branch of the tree and return a flat display path */
export function getDisplayPath(root: ChatNode): DisplayEntry[] {
	const result: DisplayEntry[] = [];
	let current = root;
	while (current.children.length > 0) {
		const idx = clampIndex(current.activeChildIndex, current.children.length);
		const child = current.children[idx];
		result.push({
			node: child,
			siblingCount: current.children.length,
			siblingIndex: idx
		});
		current = child;
	}
	return result;
}

/** Get the active path as an array of nodes (no sibling metadata) */
export function getActivePath(root: ChatNode): ChatNode[] {
	const path: ChatNode[] = [];
	let current = root;
	while (current.children.length > 0) {
		const idx = clampIndex(current.activeChildIndex, current.children.length);
		current = current.children[idx];
		path.push(current);
	}
	return path;
}

/** Get the leaf node of the active path */
export function getActiveLeaf(root: ChatNode): ChatNode {
	let current = root;
	while (current.children.length > 0) {
		const idx = clampIndex(current.activeChildIndex, current.children.length);
		current = current.children[idx];
	}
	return current;
}

/** Find a node by ID in the tree */
export function findNode(nodeId: string, current: ChatNode): ChatNode | null {
	if (current.id === nodeId) return current;
	for (const child of current.children) {
		const found = findNode(nodeId, child);
		if (found) return found;
	}
	return null;
}

/** Find the parent of a node by ID */
export function findParent(nodeId: string, current: ChatNode): ChatNode | null {
	for (const child of current.children) {
		if (child.id === nodeId) return current;
		const found = findParent(nodeId, child);
		if (found) return found;
	}
	return null;
}

/** Navigate to a sibling branch. Returns true if navigation occurred. */
export function navigateSibling(
	root: ChatNode,
	nodeId: string,
	direction: 'prev' | 'next'
): boolean {
	const parent = findParent(nodeId, root);
	if (!parent) return false;
	const delta = direction === 'prev' ? -1 : 1;
	const newIndex = parent.activeChildIndex + delta;
	if (newIndex >= 0 && newIndex < parent.children.length) {
		parent.activeChildIndex = newIndex;
		return true;
	}
	return false;
}

/** Attach a new child node to a parent and set it as active. Returns the proxied child. */
export function attachChild(parent: ChatNode, child: ChatNode): ChatNode {
	parent.children.push(child);
	parent.activeChildIndex = parent.children.length - 1;
	return parent.children[parent.activeChildIndex];
}

function clampIndex(index: number, length: number): number {
	return Math.min(Math.max(0, index), length - 1);
}

/** Reconstruct a ChatNode tree from flat DB messages */
export function treeFromMessages(dbMessages: DBMessage[]): ChatNode {
	const root = createRootNode();

	if (dbMessages.length === 0) return root;

	// Build lookup maps
	const nodeMap = new Map<string, ChatNode>();
	for (const msg of dbMessages) {
		nodeMap.set(msg.id, {
			id: msg.id,
			role: msg.role as 'user' | 'assistant',
			content: msg.content,
			children: [],
			activeChildIndex: msg.activeChildIndex,
			dbId: msg.id,
			citations: msg.citations || undefined,
			attachedFile: msg.attachedFile || undefined,
			createdAt: msg.createdAt
		});
	}

	// Build parent-child relationships
	for (const msg of dbMessages) {
		const node = nodeMap.get(msg.id)!;
		if (msg.parentId && nodeMap.has(msg.parentId)) {
			const parent = nodeMap.get(msg.parentId)!;
			parent.children.push(node);
		} else {
			// Root-level message (no parent = child of root)
			root.children.push(node);
		}
	}

	// Set active child indices
	for (const msg of dbMessages) {
		const node = nodeMap.get(msg.id)!;
		if (node.children.length > 0) {
			node.activeChildIndex = clampIndex(msg.activeChildIndex, node.children.length);
		}
	}

	if (root.children.length > 0) {
		root.activeChildIndex = 0;
	}

	return root;
}

/** Parse citations from the stream content marker */
export function parseCitations(content: string): { cleanContent: string; citations: Citation[] } {
	const marker = '<!--CITATIONS:';
	const markerIndex = content.lastIndexOf(marker);

	if (markerIndex === -1) {
		return { cleanContent: content, citations: [] };
	}

	const cleanContent = content.slice(0, markerIndex).trimEnd();
	const citationStr = content.slice(markerIndex + marker.length, content.lastIndexOf('-->'));

	try {
		const citations = JSON.parse(citationStr) as Citation[];
		return { cleanContent, citations };
	} catch {
		return { cleanContent, citations: [] };
	}
}
