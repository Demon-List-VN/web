import { writable } from "svelte/store";

interface ProductItem {
    type?: 'product';
    productID: number;
    quantity: number;
}

export interface RecordCardItem {
    type: 'record-card';
    levelID: number;
    template: 1 | 2 | 3;
    material: 'paper' | 'plastic';
    customImageDataUrl?: string;
    customAvatarDataUrl?: string;
    levelName?: string;
    creator?: string;
    progress?: number | null;
}

type Item = ProductItem | RecordCardItem;

interface Data {
    items: Item[];
    queryArray: () => number[];
    getItem: (id: number) => ProductItem;
    addItem: (id: number, quantity: number) => void;
    removeItem: (id: number) => void;
    addRecordCard: (item: RecordCardItem) => void;
    removeRecordCard: (index: number) => void;
    getRecordCards: () => RecordCardItem[];
    refresh: () => void;
    clear: () => void;
}

const STORAGE_KEY = "cartItems";

const getStoredItems = (): Item[] => {
    if (typeof localStorage === "undefined") {
        return [];
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveItems = (items: Item[]): void => {
    if (typeof localStorage === "undefined") {
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        return;
    }
};

const data: Data = {
    items: getStoredItems(),
    queryArray: () => {
        const res = [];

        for (const i of data.items) {
            if (i.type !== 'record-card') {
                res.push((i as ProductItem).productID);
            }
        }

        return res;
    },
    getItem: (id: number) => {
        const res = data.items.find((item) => item.type !== 'record-card' && (item as ProductItem).productID === id) as ProductItem | undefined;

        if (!res) {
            return {
                productID: -1,
                quantity: 0,
            };
        }

        return res;
    },
    addItem: (id: number, quantity: number = 1) => {
        const existingItemIndex = data.items.findIndex((item) =>
            item.type !== 'record-card' && (item as ProductItem).productID === id
        );

        if (existingItemIndex >= 0) {
            (data.items[existingItemIndex] as ProductItem).quantity += quantity;
        } else {
            data.items.push({ productID: id, quantity });
        }

        saveItems(data.items);
        cart.set(data);
    },
    removeItem: (id: number) => {
        const existingItemIndex = data.items.findIndex((item) =>
            item.type !== 'record-card' && (item as ProductItem).productID === id
        );

        if (existingItemIndex >= 0) {
            data.items.splice(existingItemIndex, 1);
            saveItems(data.items);
            cart.set(data);
        }
    },
    addRecordCard: (item: RecordCardItem) => {
        data.items.push(item);
        saveItems(data.items);
        cart.set(data);
    },
    removeRecordCard: (index: number) => {
        const recordCards = data.items
            .map((item, i) => ({ item, i }))
            .filter(({ item }) => item.type === 'record-card');

        if (index >= 0 && index < recordCards.length) {
            data.items.splice(recordCards[index].i, 1);
            saveItems(data.items);
            cart.set(data);
        }
    },
    getRecordCards: () => {
        return data.items.filter((item): item is RecordCardItem => item.type === 'record-card');
    },
    refresh: () => {
        data.items = getStoredItems();
        cart.set(data);
    },
    clear: () => {
        data.items = [];
        saveItems(data.items);
        cart.set(data);
    }
};

export const cart = writable(data);
