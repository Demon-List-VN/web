import { writable } from "svelte/store";

interface Item {
    productID: number;
    quantity: number;
}

interface Data {
    items: Item[];
    queryArray: () => number[];
    getItem: (id: number) => Item;
    addItem: (id: number, quantity: number) => void;
    removeItem: (id: number) => void;
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
            res.push(i.productID);
        }

        return res;
    },
    getItem: (id: number) => {
        const res = data.items.find((item) => item.productID === id);

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
            item.productID === id
        );

        if (existingItemIndex >= 0) {
            data.items[existingItemIndex].quantity += quantity;
        } else {
            data.items.push({ productID: id, quantity });
        }

        saveItems(data.items);
        cart.set(data);
    },
    removeItem: (id: number) => {
        const existingItemIndex = data.items.findIndex((item) =>
            item.productID === id
        );

        if (existingItemIndex >= 0) {
            data.items.splice(existingItemIndex, 1);
            saveItems(data.items);
            cart.set(data);
        }
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
