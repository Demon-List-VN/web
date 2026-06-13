import { writable, derived, get, type Readable } from 'svelte/store';
import { getContext, setContext } from 'svelte';

export interface ManageEntry {
    id: string;
    save: () => Promise<void>;
    reset: () => void;
}

export interface ManageDirtyStore {
    dirtyIds: Readable<string[]>;
    registerEntry(entry: ManageEntry): () => void;
    setDirty(id: string, dirty: boolean): void;
    saveAll(): Promise<void>;
    discardAll(): void;
}

const KEY = Symbol('tournament-manage-dirty');

/** Tracks which manage editor cards have unsaved changes and orchestrates save/discard. */
export function createManageDirty(): ManageDirtyStore {
    const entries = new Map<string, ManageEntry>();
    const dirty = writable<Record<string, boolean>>({});
    const dirtyIds = derived(dirty, ($dirty) =>
        Object.keys($dirty)
            .filter((id) => $dirty[id])
    );

    return {
        dirtyIds,
        registerEntry(entry) {
            entries.set(entry.id, entry);

            return () => {
                entries.delete(entry.id);
                dirty.update((current) => {
                    const next = { ...current };

                    delete next[entry.id];

                    return next;
                });
            };
        },
        setDirty(id, isDirty) {
            dirty.update((current) => {
                if (Boolean(current[id]) === isDirty) {
                    return current;
                }

                return { ...current, [id]: isDirty };
            });
        },
        async saveAll() {
            for (const id of get(dirtyIds)) {
                await entries.get(id)
                    ?.save();
            }
        },
        discardAll() {
            for (const id of get(dirtyIds)) {
                entries.get(id)
                    ?.reset();
            }
        }
    };
}

export function setManageDirty(store: ManageDirtyStore) {
    setContext(KEY, store);
}

export function getManageDirty(): ManageDirtyStore | undefined {
    return getContext<ManageDirtyStore>(KEY);
}
