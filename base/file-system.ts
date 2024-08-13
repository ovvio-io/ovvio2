import { readAll } from 'https://deno.land/std/io/read_all.ts';

// Deno-specific type
type DenoFileSystem = {
  type: 'deno';
  readFile: (path: string) => Promise<Uint8Array>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
};

// OPFS-specific type
type OPFSFileSystem = {
  type: 'opfs';
  root: FileSystemDirectoryHandle;
  readFile: (path: string) => Promise<Uint8Array>;
  writeFile: (path: string, data: Uint8Array) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
};

// Union type for FileSystem
export type FileSystem = DenoFileSystem | OPFSFileSystem;

const createDenoFileSystem = (): DenoFileSystem => ({
  type: 'deno',
  readFile: async (path: string): Promise<Uint8Array> => {
    const file = await Deno.open(path, { read: true });
    const data = await readAll(file);
    file.close();
    return data;
  },
  writeFile: async (path: string, data: Uint8Array): Promise<void> => {
    await Deno.writeFile(path, data);
  },
  deleteFile: async (path: string): Promise<void> => {
    await Deno.remove(path);
  },
});

const createOPFSFileSystem = (
  root: FileSystemDirectoryHandle
): OPFSFileSystem => ({
  type: 'opfs',
  root,
  readFile: async (path: string): Promise<Uint8Array> => {
    const fileHandle = await root.getFileHandle(path);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  },
  writeFile: async (path: string, data: Uint8Array): Promise<void> => {
    const fileHandle = await root.getFileHandle(path, { create: true });
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(data);
    await writableStream.close();
  },
  deleteFile: async (path: string): Promise<void> => {
    await root.removeEntry(path);
  },
});

// Function to create the appropriate file system based on the environment
const createFileSystem = async (): Promise<FileSystem> => {
  if (typeof Deno !== 'undefined') {
    return createDenoFileSystem();
  } else if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    const root = await navigator.storage.getDirectory();
    return createOPFSFileSystem(root);
  } else {
    throw new Error('Unsupported environment');
  }
};

// Helper function to perform operations based on the file system type
const performFileOperation = async <T>(
  fs: FileSystem,
  denoOp: (fs: DenoFileSystem) => T | Promise<T>,
  opfsOp: (fs: OPFSFileSystem) => T | Promise<T>
): Promise<T> => {
  if (fs.type === 'deno') {
    return denoOp(fs);
  } else {
    return opfsOp(fs);
  }
};

export { createFileSystem, performFileOperation };
